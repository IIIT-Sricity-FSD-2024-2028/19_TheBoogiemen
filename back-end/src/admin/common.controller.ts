import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Query,
  Patch,
  Delete,
  Req,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { InMemoryDbService } from '../database/in-memory-db.service';
import { Roles } from '../auth/roles.guard';
import {
  CurrentUserId,
  CurrentUserRole,
} from '../common/decorators/current-user.decorator';
import { PasswordService } from '../auth/password.service';
import { ErrorCode, errorBody } from '../common/errors/error-codes';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import {
  ATTENDANCE_STATUS,
  isAtRisk,
  normalizeAttendanceStatus,
  normalizeLeaveType,
  riskReasons,
  summariseAttendance,
} from '../common/academic-rules';
import { syncLeaveAttendance } from '../common/leave-attendance.sync';
import {
  CreateUserDto,
  ResetUserPasswordDto,
  UpdateUserDto,
  UpdateUserRoleDto,
  canAssignRole,
  rolesAssignableBy,
} from '../common/dto/user.dto';

/**
 * Rejects any body property not declared on the DTO instead of silently
 * stripping it, so an attempt to smuggle `role`/`password`/`user_id` through a
 * profile update fails loudly rather than appearing to succeed (audit C-04).
 */
const StrictBody = () =>
  UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

/**
 * Fields that must never be settable through a general update route.
 *
 * The global ValidationPipe runs before any route-scoped pipe and silently
 * strips unknown keys, so `forbidNonWhitelisted` alone never sees them and the
 * caller gets a misleading 200. Checking the untouched `request.body` makes the
 * refusal explicit and keeps the rule visible at the call site.
 */
const PROTECTED_USER_FIELDS = ['role', 'password', 'password_hash', 'user_id'];

function rejectProtectedFields(
  rawBody: any,
  fields: string[] = PROTECTED_USER_FIELDS,
) {
  const offending = fields.filter(
    (f) => rawBody && Object.prototype.hasOwnProperty.call(rawBody, f),
  );
  if (offending.length) {
    throw new BadRequestException(
      errorBody(
        ErrorCode.IMMUTABLE_FIELD,
        `The following fields cannot be changed here: ${offending.join(', ')}. ` +
          `Use PATCH /users/:id/role or PATCH /users/:id/password.`,
        { fields: offending },
      ),
    );
  }
}

/**
 * Copy only the keys the caller actually supplied.
 *
 * A validated DTO instance carries every optional property as an own key with
 * value `undefined`, so a plain `Object.assign` would erase stored values the
 * request never mentioned.
 */
function pickDefined<T extends object>(source: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [key, value] of Object.entries(source ?? {})) {
    if (value !== undefined) out[key] = value;
  }
  return out;
}

/**
 * Strip credential material before a user record leaves the server.
 *
 * The previous `{ ...u, password: undefined }` only covered the legacy plaintext
 * field; now that credentials live in `password_hash`, that spread would have
 * shipped the bcrypt digest to every caller of GET /users. Deleting the keys
 * outright is safer than relying on JSON.stringify dropping `undefined`.
 */
function sanitizeUser<T extends Record<string, any>>(user: T): Partial<T> {
  const { password, password_hash, ...safe } = user ?? {};
  return safe as Partial<T>;
}

@ApiTags('Admin/Reports')
@Controller()
export class CommonController {
  constructor(
    private db: InMemoryDbService,
    private passwordService: PasswordService,
  ) {}

  // ── Courses ──────────────────────────────────────────────────────────────────

  @Get('courses')
  @ApiOperation({ summary: 'Get all courses' })
  @ApiResponse({ status: 200, description: 'Array of all courses' })
  async getCourses() {
    return this.db.courses;
  }

  @Post('courses')
  @Roles('faculty', 'head', 'admin', 'superadmin')
  @ApiOperation({ summary: 'Create a new course' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  async createCourse(@Body() body: any, @CurrentUserId() userId: string) {
    if (!body.course_name || !body.course_code)
      throw new BadRequestException(
        errorBody(
          ErrorCode.BUSINESS_RULE_VIOLATION,
          'course_name and course_code are required',
        ),
      );
    if (this.db.courses.find((c) => c.course_code === body.course_code))
      throw new BadRequestException(
        errorBody(ErrorCode.DUPLICATE_RESOURCE, 'Course code already exists'),
      );
    const faculty = this.db.faculty.find((f) => f.user_id === userId);
    const facultyName = faculty
      ? `${faculty.first_name} ${faculty.last_name}`.trim()
      : 'Faculty';
    const newCourse = {
      course_id: `c${Date.now()}`,
      faculty_id: body.faculty_id || userId,
      faculty_name: facultyName,
      ...body,
    };
    this.db.courses.push(newCourse);
    return { success: true, data: newCourse };
  }

  // ── Timetable ────────────────────────────────────────────────────────────────

  @Get('timetable')
  @ApiOperation({ summary: 'Get timetable grid for a section' })
  async getTimetable(@Query('section') section: string = 'A') {
    const slots = this.db.timetable.filter((t) => t.section === section);
    const grid = slots.reduce((acc: any, curr) => {
      if (!acc[curr.day]) acc[curr.day] = {};
      if (!acc[curr.day][curr.time]) acc[curr.day][curr.time] = curr;
      else {
        if (!Array.isArray(acc[curr.day][curr.time]))
          acc[curr.day][curr.time] = [acc[curr.day][curr.time]];
        acc[curr.day][curr.time].push(curr);
      }
      return acc;
    }, {});
    return {
      grid,
      days: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
      times: ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'],
    };
  }

  @Get('timetable/faculty')
  @Roles('faculty')
  @ApiOperation({ summary: 'Get timetable grid for the logged-in faculty' })
  async getFacultyTimetable(@CurrentUserId() userId: string) {
    const facultyCourseIds = this.db.courses
      .filter((c) => c.faculty_id === userId)
      .map((c) => c.course_id);
    const slots = this.db.timetable.filter((t) =>
      facultyCourseIds.includes(t.course_id),
    );
    const grid = slots.reduce((acc: any, curr) => {
      if (!acc[curr.day]) acc[curr.day] = {};
      if (!acc[curr.day][curr.time]) acc[curr.day][curr.time] = curr;
      else {
        if (!Array.isArray(acc[curr.day][curr.time]))
          acc[curr.day][curr.time] = [acc[curr.day][curr.time]];
        acc[curr.day][curr.time].push(curr);
      }
      return acc;
    }, {});
    return {
      grid,
      days: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
      times: ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'],
    };
  }

  // ── Assessments ──────────────────────────────────────────────────────────────

  @Get('assessments')
  @ApiOperation({
    summary: 'Get all assessments, optionally filtered by faculty_id',
  })
  async getAssessments(@Query('faculty_id') facultyId?: string) {
    const list = facultyId
      ? this.db.assessments.filter((a) => a.faculty_id === facultyId)
      : this.db.assessments;
    return list.map((a) => {
      const course = this.db.courses.find((c) => c.course_id === a.course_id);
      return {
        ...a,
        course_name: course?.course_name,
        course_code: course?.course_code,
      };
    });
  }

  @Post('assessments')
  @Roles('faculty', 'admin', 'head', 'superadmin')
  @ApiOperation({ summary: 'Create a new assessment' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  async createAssessment(@Body() body: any, @CurrentUserId() userId: string) {
    const id = `a${Date.now()}`;
    const newAssessment = {
      assessment_id: id,
      faculty_id: userId,
      weightage: body.weightage || 10,
      ...body,
    };
    this.db.assessments.push(newAssessment);
    return { success: true, data: newAssessment };
  }

  // ── Marks ────────────────────────────────────────────────────────────────────

  @Get('marks')
  @Roles('faculty', 'admin', 'head', 'superadmin')
  @ApiOperation({
    summary: 'Get all marks entries, optionally filtered by assessment_id',
  })
  async getMarks(@Query('assessment_id') assessmentId?: string) {
    const list = assessmentId
      ? this.db.marks_entry.filter((m) => m.assessment_id === assessmentId)
      : this.db.marks_entry;
    return list.map((m) => {
      const student = this.db.students.find((s) => s.user_id === m.student_id);
      return {
        ...m,
        student_name: student
          ? `${student.first_name} ${student.last_name}`.trim()
          : m.student_id,
      };
    });
  }

  @Post('marks')
  @Roles('faculty', 'admin', 'head', 'superadmin')
  @ApiOperation({ summary: 'Record marks for a student (locked once entered)' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  async recordMarks(@Body() body: any) {
    if (!body.student_id || !body.assessment_id)
      throw new BadRequestException(
        errorBody(
          ErrorCode.BUSINESS_RULE_VIOLATION,
          'student_id and assessment_id required',
        ),
      );
    // Marks lock: reject if already entered
    const existing = this.db.marks_entry.find(
      (m) =>
        m.student_id === body.student_id &&
        m.assessment_id === body.assessment_id,
    );
    if (existing)
      throw new BadRequestException(
        errorBody(
          ErrorCode.DUPLICATE_RESOURCE,
          'Marks already entered and locked for this student. Cannot update.',
        ),
      );
    const id = `m${Date.now()}`;
    const entry = { entry_id: id, ...body };
    this.db.marks_entry.push(entry);
    return { success: true, data: entry };
  }

  // ── Submissions (online assessments) ─────────────────────────────────────────

  @Get('submissions')
  @ApiOperation({
    summary: 'Get submissions — own for student, all for faculty',
  })
  async getSubmissions(
    @CurrentUserId() userId: string,
    @CurrentUserRole() role: string,
  ) {
    if (role === 'student')
      return this.db.submissions.filter((s) => s.student_id === userId);
    return this.db.submissions;
  }

  @Post('submissions')
  @ApiOperation({ summary: 'Student submits work for an online assessment' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  async createSubmission(@Body() body: any, @CurrentUserId() userId: string) {
    if (!body.assessment_id)
      throw new BadRequestException(
        errorBody(ErrorCode.BUSINESS_RULE_VIOLATION, 'assessment_id required'),
      );
    // Upsert — allow re-submission
    const existing = this.db.submissions.find(
      (s) => s.student_id === userId && s.assessment_id === body.assessment_id,
    );
    if (existing) {
      existing.submitted_at = new Date().toISOString();
      existing.notes = body.notes || existing.notes;
      if (body.file_id !== undefined) existing.file_id = body.file_id;
      existing.status = 'submitted';
      return { success: true, data: existing };
    }
    const newSub = {
      submission_id: `sub${Date.now()}`,
      student_id: userId,
      assessment_id: body.assessment_id,
      notes: body.notes || '',
      // Set when the student attached a document via POST /uploads.
      file_id: body.file_id ?? null,
      submitted_at: new Date().toISOString(),
      status: 'submitted',
    };
    this.db.submissions.push(newSub as any);
    return { success: true, data: newSub };
  }

  // ── Attendance ────────────────────────────────────────────────────────────────

  @Get('attendance/today/:courseId')
  @Roles('faculty')
  @ApiOperation({ summary: 'Get enrolled students for today attendance' })
  async getTodayAttendance(@Param('courseId') courseId: string) {
    const enrollment = this.db.enrollment.filter(
      (e) => e.course_id === courseId,
    );
    const students = this.db.students
      .filter((s) => enrollment.map((e) => e.student_id).includes(s.user_id))
      .map((s) => ({ ...s, today_status: 'present' }));
    return { students, date: new Date().toISOString().split('T')[0] };
  }

  @Post('attendance')
  @Roles('faculty')
  @ApiOperation({
    summary:
      'Record bulk attendance for a course session (idempotent per student/course/date)',
  })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  async recordAttendance(@Body() body: any) {
    const { course_id, date, records } = body;
    if (!course_id || !date || !records)
      throw new BadRequestException(
        errorBody(
          ErrorCode.BUSINESS_RULE_VIOLATION,
          'course_id, date, and records required',
        ),
      );

    // M-01: re-submitting the same session updates the existing rows rather than
    // appending duplicates. A double-click previously logged the same absence
    // twice and permanently skewed the student's attendance percentage.
    // H-07: identifiers are UUIDs — the old `al${length + idx + 1}` scheme both
    // skipped values and re-minted ids that already existed.
    const saved: any[] = [];
    let created = 0;
    let updated = 0;

    for (const r of records || []) {
      if (!r?.student_id) continue;
      const status = normalizeAttendanceStatus(r.status);
      const existing = this.db.attendance_log.find(
        (a) =>
          a.student_id === r.student_id &&
          a.course_id === course_id &&
          a.date === date,
      );

      if (existing) {
        // Never silently discard an excused absence granted by approved leave.
        if (
          normalizeAttendanceStatus(existing.status) ===
            ATTENDANCE_STATUS.EXCUSED &&
          status === ATTENDANCE_STATUS.ABSENT
        ) {
          saved.push(existing);
          continue;
        }
        existing.status = status;
        updated++;
        saved.push(existing);
      } else {
        const log = {
          log_id: uuidv4(),
          student_id: r.student_id,
          course_id,
          date,
          status,
        };
        this.db.attendance_log.push(log as any);
        created++;
        saved.push(log);
      }
    }

    if (updated) this.db.persist();
    return { saved: saved.length, created, updated, records: saved };
  }

  // ── Discussions ───────────────────────────────────────────────────────────────

  @Get('discussions')
  @ApiOperation({ summary: 'Get all discussion posts with reply counts' })
  async getDiscussions() {
    return this.db.discussion_posts.map((p) => {
      const replies = this.db.discussion_replies.filter(
        (r) => r.post_id === p.post_id,
      );
      return { ...p, reply_count: replies.length };
    });
  }

  @Get('discussions/:postId')
  @ApiOperation({ summary: 'Get a single discussion post with all replies' })
  async getDiscussionDetail(@Param('postId') postId: string) {
    const post = this.db.discussion_posts.find((p) => p.post_id === postId);
    if (!post)
      throw new NotFoundException(
        errorBody(ErrorCode.RESOURCE_NOT_FOUND, 'Post not found'),
      );
    const replies = this.db.discussion_replies.filter(
      (r) => r.post_id === postId,
    );
    return { ...post, replies };
  }

  @Post('discussions')
  @ApiOperation({ summary: 'Create a new discussion post' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  async createDiscussion(@Body() body: any, @CurrentUserId() userId: string) {
    const user = this.db.users.find((u) => u.user_id === userId);
    const student = this.db.students.find((s) => s.user_id === userId);
    const faculty = this.db.faculty.find((f) => f.user_id === userId);
    const authorName = student
      ? `${student.first_name} ${student.last_name || ''}`.trim()
      : faculty
        ? `${faculty.first_name} ${faculty.last_name || ''}`.trim()
        : user?.username || 'Anonymous';
    const id = `p${Date.now()}`;
    const newPost = {
      post_id: id,
      title: body.title,
      content: body.content,
      author_id: userId,
      author_name: authorName,
      author_role: user?.role || 'student',
      tag: body.tag || 'general',
      course_id: body.course_id,
      created_at: new Date().toISOString(),
      reply_count: 0,
    };
    this.db.discussion_posts.push(newPost as any);
    return newPost;
  }

  @Post('discussions/:postId/replies')
  @ApiOperation({ summary: 'Reply to a discussion post' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  async createReply(
    @Param('postId') postId: string,
    @Body() body: any,
    @CurrentUserId() userId: string,
  ) {
    const user = this.db.users.find((u) => u.user_id === userId);
    const student = this.db.students.find((s) => s.user_id === userId);
    const faculty = this.db.faculty.find((f) => f.user_id === userId);
    const authorName = student
      ? `${student.first_name} ${student.last_name || ''}`.trim()
      : faculty
        ? `${faculty.first_name} ${faculty.last_name || ''}`.trim()
        : user?.username || 'Anonymous';
    const post = this.db.discussion_posts.find((p) => p.post_id === postId);
    if (!post)
      throw new NotFoundException(
        errorBody(ErrorCode.RESOURCE_NOT_FOUND, 'Post not found'),
      );
    const id = `r${Date.now()}`;
    const newReply = {
      reply_id: id,
      post_id: postId,
      author_id: userId,
      author_name: authorName,
      author_role: user?.role,
      content: body.content,
      created_at: new Date().toISOString(),
    };
    this.db.discussion_replies.push(newReply as any);
    post.reply_count = (post.reply_count || 0) + 1;
    return newReply;
  }

  // ── Research ─────────────────────────────────────────────────────────────────

  @Get('research')
  @ApiOperation({ summary: 'Get research projects filtered by role' })
  async getResearch(
    @CurrentUserId() userId: string,
    @CurrentUserRole() role: string,
  ) {
    const enrich = (p: any) => {
      const sup = this.db.faculty.find((f) => f.user_id === p.supervisor_id);
      const stuList = (p.students || []).map((s: any) => {
        const stu = this.db.students.find((st) => st.user_id === s.user_id);
        return {
          ...s,
          first_name: stu?.first_name || s.first_name,
          last_name: stu?.last_name || s.last_name || '',
        };
      });
      return {
        ...p,
        supervisor_name: sup
          ? `${sup.first_name} ${sup.last_name}`.trim()
          : p.supervisor_name,
        students: stuList,
      };
    };
    if (role === 'faculty')
      return this.db.research_projects
        .filter((p) => p.supervisor_id === userId)
        .map(enrich);
    if (role === 'student')
      return this.db.research_projects
        .filter((p) => p.students.some((s) => s.user_id === userId))
        .map(enrich);
    return this.db.research_projects.map(enrich);
  }

  @Patch('research/:id/status')
  @Roles('faculty', 'admin', 'head', 'superadmin')
  @ApiOperation({ summary: 'Update research project status' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  async updateResearchStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    const project = this.db.research_projects.find((p) => p.project_id === id);
    if (!project)
      throw new NotFoundException(
        errorBody(ErrorCode.RESOURCE_NOT_FOUND, 'Project not found'),
      );
    project.status = body.status;
    return project;
  }

  @Patch('research/:id/progress')
  @Roles('student', 'faculty', 'admin', 'head', 'superadmin')
  @ApiOperation({
    summary:
      'Update research project progress, submission notes, or faculty feedback',
  })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  async updateResearchProgress(@Param('id') id: string, @Body() body: any) {
    const project = this.db.research_projects.find((p) => p.project_id === id);
    if (!project)
      throw new NotFoundException(
        errorBody(ErrorCode.RESOURCE_NOT_FOUND, 'Project not found'),
      );
    // Only update progress if explicitly provided (don't zero it out)
    if (body.progress !== undefined && body.progress !== null)
      project.progress = Number(body.progress);
    if (body.submission_notes !== undefined)
      project.submission_notes = body.submission_notes;
    if (body.faculty_feedback !== undefined)
      project.faculty_feedback = body.faculty_feedback;

    // research_projects.uploads already exists as an array in the schema, so a
    // milestone document is appended rather than overwriting the previous one.
    if (body.file_id) {
      const uploads = (project.uploads ??= []);
      if (!uploads.some((u: any) => u?.file_id === body.file_id)) {
        uploads.push({
          file_id: body.file_id,
          original_name: body.file_name ?? null,
          uploaded_at: new Date().toISOString(),
        });
      }
    }

    this.db.persist();
    return project;
  }

  @Post('research')
  @Roles('faculty', 'admin', 'head', 'superadmin')
  @ApiOperation({
    summary: 'Create a new research/BTP project and assign to a student',
  })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  async createResearch(@Body() body: any, @CurrentUserId() userId: string) {
    if (!body.student_id || !body.title)
      throw new BadRequestException(
        errorBody(
          ErrorCode.BUSINESS_RULE_VIOLATION,
          'student_id and title are required',
        ),
      );
    const student = this.db.students.find((s) => s.user_id === body.student_id);
    if (!student)
      throw new NotFoundException(
        errorBody(ErrorCode.RESOURCE_NOT_FOUND, 'Student not found'),
      );
    const faculty = this.db.faculty.find((f) => f.user_id === userId);
    const supervisorName = faculty
      ? `${faculty.first_name} ${faculty.last_name}`.trim()
      : 'Faculty';
    const studentName =
      `${student.first_name} ${student.last_name || ''}`.trim();
    const id = `rp${Date.now()}`;
    const newProject = {
      project_id: id,
      title: body.title,
      abstract: body.abstract || '',
      supervisor_id: userId,
      supervisor_name: supervisorName,
      student_id: body.student_id,
      student_name: studentName,
      status: body.status || 'active',
      progress: body.progress || 0,
      students: [{ user_id: body.student_id, first_name: student.first_name }],
      uploads: [],
      milestones: [],
    };
    this.db.research_projects.push(newProject as any);
    return { success: true, data: newProject };
  }

  // ── Events ────────────────────────────────────────────────────────────────────

  @Get('events')
  @ApiOperation({ summary: 'Get all scheduled events' })
  @ApiResponse({ status: 200, description: 'Array of events' })
  async getEvents() {
    return this.db.events;
  }

  @Post('events')
  @Roles('admin', 'superadmin', 'head', 'faculty')
  @ApiOperation({ summary: 'Create a new institutional event' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  async createEvent(@Body() body: any) {
    if (!body.event_name || !body.date || !body.venue)
      throw new BadRequestException(
        errorBody(
          ErrorCode.BUSINESS_RULE_VIOLATION,
          'event_name, date, and venue are required',
        ),
      );
    const id = `ev${Date.now()}`;
    const newEvent = { event_id: id, ...body };
    this.db.events.push(newEvent);
    return { success: true, data: newEvent };
  }

  @Put('events/:id')
  @Roles('admin', 'superadmin', 'head', 'faculty')
  @ApiOperation({ summary: 'Update an existing event' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  async updateEvent(@Param('id') id: string, @Body() body: any) {
    const event = this.db.events.find((e) => e.event_id === id);
    if (!event)
      throw new NotFoundException(
        errorBody(ErrorCode.RESOURCE_NOT_FOUND, 'Event not found'),
      );
    Object.assign(event, body);
    return { success: true, data: event };
  }

  @Delete('events/:id')
  @Roles('admin', 'superadmin', 'head', 'faculty')
  @ApiOperation({ summary: 'Delete an event' })
  async deleteEvent(@Param('id') id: string) {
    const index = this.db.events.findIndex((e) => e.event_id === id);
    if (index === -1)
      throw new NotFoundException(
        errorBody(ErrorCode.RESOURCE_NOT_FOUND, 'Event not found'),
      );
    this.db.events.splice(index, 1);
    return { success: true, message: 'Event deleted' };
  }

  // ── Leave ─────────────────────────────────────────────────────────────────────

  @Get('leave')
  @ApiOperation({
    summary: 'Get leave applications — own for student, all for admin/faculty',
  })
  async getLeaves(
    @CurrentUserId() userId: string,
    @CurrentUserRole() role: string,
  ) {
    if (role === 'student')
      return this.db.leave_applications.filter((l) => l.student_id === userId);
    // Faculty see ALL student leaves (for approval)
    return this.db.leave_applications;
  }

  @Post('leave')
  @Roles('student', 'faculty')
  @ApiOperation({ summary: 'Submit a new leave application' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  async applyLeave(@Body() body: any, @CurrentUserId() userId: string) {
    if (
      !body.leave_type ||
      !body.start_date ||
      !body.end_date ||
      !body.reason
    ) {
      throw new BadRequestException(
        errorBody(
          ErrorCode.BUSINESS_RULE_VIOLATION,
          'leave_type, start_date, end_date, and reason are required',
        ),
      );
    }
    const user = this.db.users.find((u) => u.user_id === userId);
    const student = this.db.students.find((s) => s.user_id === userId);
    const studentName = student
      ? `${student.first_name} ${student.last_name || ''}`.trim()
      : user?.username || 'Unknown';
    const id = `l${Date.now()}`;
    const newLeave = {
      leave_id: id,
      student_id: userId,
      student_name: studentName,
      status: 'pending',
      applied_on: new Date().toISOString().split('T')[0],
      ...body,
      // M-09: canonicalise on write. The student form posts lowercase ("medical")
      // while seed data was capitalised ("Medical"), so exact-match filters
      // downstream matched nothing. One vocabulary from here on.
      leave_type: normalizeLeaveType(body.leave_type),
    };
    this.db.leave_applications.push(newLeave);
    return { success: true, data: newLeave };
  }

  @Patch('leave/:id')
  @Roles('admin', 'head', 'superadmin')
  @ApiOperation({
    summary: 'Approve or reject a leave application (syncs excused attendance)',
  })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  async updateLeave(@Param('id') id: string, @Body() body: { status: string }) {
    const leave = this.db.leave_applications.find((l) => l.leave_id === id);
    if (!leave)
      throw new NotFoundException(
        errorBody(ErrorCode.RESOURCE_NOT_FOUND, 'Leave application not found'),
      );

    const status = String(body?.status ?? '')
      .trim()
      .toLowerCase();
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      throw new BadRequestException(
        errorBody(
          ErrorCode.BUSINESS_RULE_VIOLATION,
          'status must be one of: pending, approved, rejected',
        ),
      );
    }

    leave.status = status;
    this.db.persist();

    // M-02: approved leave now writes EXCUSED sessions across the leave window so
    // the student is not marked absent for time the institution authorised.
    // Reverting the approval removes exactly what it added.
    const attendance = syncLeaveAttendance(this.db, leave, status);

    return { success: true, data: leave, attendance };
  }

  // ── Users ─────────────────────────────────────────────────────────────────────

  @Get('users')
  @Roles('admin', 'superadmin', 'head')
  @ApiOperation({ summary: 'Get all system users' })
  async getUsers() {
    return this.db.users.map(sanitizeUser);
  }

  @Get('admin/users')
  @Roles('admin', 'head', 'superadmin', 'faculty')
  @ApiOperation({ summary: 'Get all users for admin management panel' })
  async getAllUsers() {
    return this.db.users.map(sanitizeUser);
  }

  @Post('users')
  @Roles('admin', 'superadmin', 'head')
  @StrictBody()
  @ApiOperation({ summary: 'Create a new system user' })
  @ApiBody({ type: CreateUserDto })
  async createUser(
    @Body() body: CreateUserDto,
    @CurrentUserRole() actorRole: string,
  ) {
    // C-04: a privilege ceiling now applies. Previously any of admin/head/superadmin
    // could create an account with any role, contradicting the documented rule that
    // an Academic Head cannot create Academic Heads or Super Admins.
    if (!canAssignRole(actorRole, body.role)) {
      throw new ForbiddenException(
        errorBody(
          ErrorCode.PRIVILEGE_CEILING,
          `Your role (${actorRole || 'unknown'}) may only create users with role: ${rolesAssignableBy(actorRole).join(', ') || 'none'}`,
          { actorRole, assignable: rolesAssignableBy(actorRole) },
        ),
      );
    }
    if (this.db.users.find((u) => u.email === body.email))
      throw new BadRequestException(
        errorBody(ErrorCode.DUPLICATE_RESOURCE, 'Email already exists'),
      );
    if (!body.password) {
      throw new BadRequestException(
        errorBody(
          ErrorCode.BUSINESS_RULE_VIOLATION,
          'An initial password is required when creating a user',
        ),
      );
    }

    const id = `u${Date.now()}`;
    const firstName = body.first_name || body.username || 'New';
    const newUser = {
      user_id: id,
      username: body.username || body.first_name || body.email.split('@')[0],
      first_name: firstName,
      last_name: body.last_name || '',
      email: body.email,
      phone: body.phone || '',
      role: body.role,
      // Hashed, never stored in the clear. The previous default of the literal
      // string 'password' meant any account created without one shipped with a
      // known credential.
      password_hash: await this.passwordService.hash(body.password),
    };
    this.db.users.push(newUser);

    if (body.role === 'student') {
      this.db.students.push({
        user_id: id,
        first_name: firstName,
        last_name: body.last_name || '',
        branch: 'CSE',
        batch: '2024-2028',
        cgpa: 7.0,
        section: 'A',
        email: body.email,
        join_date: new Date().toISOString().split('T')[0],
        dob: '2005-01-01',
        phone: body.phone || '',
      });
    } else if (body.role === 'faculty') {
      this.db.faculty.push({
        user_id: id,
        first_name: firstName,
        last_name: body.last_name || '',
        designation: 'Assistant Professor',
        department_id: 'dept1',
        email: body.email,
        phone: body.phone || '',
      });
    }
    return { success: true, data: sanitizeUser(newUser) };
  }

  @Put('users/:id')
  @Roles('admin', 'superadmin', 'head')
  @StrictBody()
  @ApiOperation({
    summary: 'Update a user profile (role and password are not accepted here)',
  })
  @ApiBody({ type: UpdateUserDto })
  async updateUser(
    @Param('id') id: string,
    @Body() body: UpdateUserDto,
    @Req() req: any,
  ) {
    // C-04: refuse privilege-bearing fields outright. The old
    // `Object.assign(user, body)` let a caller escalate privileges, seize an
    // account, or corrupt the primary key from this one endpoint.
    rejectProtectedFields(req?.body);

    const user = this.db.users.find((u) => u.user_id === id);
    if (!user)
      throw new NotFoundException(
        errorBody(ErrorCode.RESOURCE_NOT_FOUND, 'User not found'),
      );

    if (
      body.email &&
      body.email !== user.email &&
      this.db.users.find((u) => u.email === body.email && u.user_id !== id)
    ) {
      throw new BadRequestException(
        errorBody(
          ErrorCode.DUPLICATE_RESOURCE,
          'Email already in use by another account',
        ),
      );
    }

    const changes = pickDefined(body);
    Object.assign(user, changes);
    this.db.persist();
    this.syncProfileRecords(id, changes);
    return { success: true, data: sanitizeUser(user) };
  }

  @Patch('users/:id/role')
  @Roles('admin', 'superadmin', 'head')
  @StrictBody()
  @ApiOperation({
    summary: 'Change a user role (subject to the caller privilege ceiling)',
  })
  @ApiBody({ type: UpdateUserRoleDto })
  async updateUserRole(
    @Param('id') id: string,
    @Body() body: UpdateUserRoleDto,
    @CurrentUserRole() actorRole: string,
    @CurrentUserId() actorId: string,
  ) {
    const user = this.db.users.find((u) => u.user_id === id);
    if (!user)
      throw new NotFoundException(
        errorBody(ErrorCode.RESOURCE_NOT_FOUND, 'User not found'),
      );

    if (actorId && actorId === id) {
      throw new ForbiddenException(
        errorBody(
          ErrorCode.PRIVILEGE_CEILING,
          'You cannot change your own role',
        ),
      );
    }
    // The caller must be permitted to grant the new role AND to manage the role
    // the account currently holds, so a head cannot demote or hijack a superadmin.
    if (!canAssignRole(actorRole, body.role)) {
      throw new ForbiddenException(
        errorBody(
          ErrorCode.PRIVILEGE_CEILING,
          `Your role (${actorRole || 'unknown'}) may only assign: ${rolesAssignableBy(actorRole).join(', ') || 'none'}`,
          { actorRole, assignable: rolesAssignableBy(actorRole) },
        ),
      );
    }
    if (!canAssignRole(actorRole, user.role)) {
      throw new ForbiddenException(
        errorBody(
          ErrorCode.PRIVILEGE_CEILING,
          `Your role (${actorRole || 'unknown'}) may not modify a ${user.role} account`,
          { actorRole, targetRole: user.role },
        ),
      );
    }

    user.role = body.role;
    this.db.persist();
    return { success: true, data: sanitizeUser(user) };
  }

  @Patch('users/:id/password')
  @Roles('admin', 'superadmin')
  @StrictBody()
  @ApiOperation({ summary: 'Administrative password reset' })
  @ApiBody({ type: ResetUserPasswordDto })
  async resetUserPassword(
    @Param('id') id: string,
    @Body() body: ResetUserPasswordDto,
    @CurrentUserRole() actorRole: string,
  ) {
    const user = this.db.users.find((u) => u.user_id === id);
    if (!user)
      throw new NotFoundException(
        errorBody(ErrorCode.RESOURCE_NOT_FOUND, 'User not found'),
      );
    if (!canAssignRole(actorRole, user.role)) {
      throw new ForbiddenException(
        errorBody(
          ErrorCode.PRIVILEGE_CEILING,
          `Your role (${actorRole || 'unknown'}) may not reset a ${user.role} password`,
          { actorRole, targetRole: user.role },
        ),
      );
    }
    user.password_hash = await this.passwordService.hash(body.new_password);
    delete user.password; // drop any legacy plaintext field left on the record
    this.db.persist();
    return { success: true, message: 'Password reset successfully' };
  }

  /** Keep the denormalised student/faculty profile rows in step with the user record. */
  private syncProfileRecords(userId: string, changes: Partial<UpdateUserDto>) {
    const fields = ['first_name', 'last_name', 'email', 'phone'] as const;
    let touched = false;
    for (const collection of [this.db.students, this.db.faculty]) {
      const profile = collection.find((p: any) => p.user_id === userId);
      if (!profile) continue;
      for (const f of fields) {
        if (changes[f] !== undefined) {
          profile[f] = changes[f];
          touched = true;
        }
      }
    }
    if (touched) this.db.persist();
  }

  @Delete('users/:id')
  @Roles('admin', 'superadmin', 'head')
  @ApiOperation({ summary: 'Delete a user' })
  async deleteUser(@Param('id') id: string) {
    const index = this.db.users.findIndex((u) => u.user_id === id);
    if (index === -1)
      throw new NotFoundException(
        errorBody(ErrorCode.RESOURCE_NOT_FOUND, 'User not found'),
      );
    this.db.users.splice(index, 1);
    return { success: true, message: 'User deleted' };
  }

  // ── Reports ───────────────────────────────────────────────────────────────────

  @Get('reports/overview')
  @Roles('admin', 'head', 'superadmin')
  @ApiOperation({ summary: 'Get high-level institutional overview metrics' })
  async getOverview() {
    const totalFees = this.db.fees.reduce((s, f) => s + f.amount, 0);
    const paidFees = this.db.fees
      .filter((f) => f.status === 'paid')
      .reduce((s, f) => s + f.amount, 0);
    return {
      summary: {
        total_students: this.db.students.length,
        total_faculty: this.db.faculty.length,
        total_courses: this.db.courses.length,
        active_research: this.db.research_projects.filter(
          (p) => p.status === 'active',
        ).length,
        overall_attendance: '82%',
        fee_compliance:
          totalFees > 0 ? `${Math.round((paidFees / totalFees) * 100)}%` : '0%',
        avg_co_attainment: '3.4/4.0',
      },
      kpis: { placement_rate: '94%', student_satisfaction: '4.2/5' },
    };
  }

  @Get('reports/at-risk')
  @Roles('admin', 'head', 'superadmin', 'faculty')
  @ApiOperation({ summary: 'Get at-risk students list' })
  async getAtRisk() {
    // M-04: uses the shared isAtRisk() predicate. This endpoint previously used
    // `cgpa < 6.5` while the faculty dashboard used `cgpa < 6`, so the same
    // student appeared at-risk on one screen and healthy on the other.
    // M-02: EXCUSED sessions count as attended via summariseAttendance().
    return this.db.students
      .map((s) => {
        const records = this.db.attendance_log.filter(
          (a) => a.student_id === s.user_id,
        );
        const attendance = summariseAttendance(records);
        // No attendance data means unknown, not a fabricated 65%.
        const attendance_pct =
          attendance.total > 0 ? attendance.percentage : null;
        return {
          ...s,
          attendance_pct,
          excused_sessions: attendance.excused,
          is_at_risk: isAtRisk({ cgpa: s.cgpa, attendancePct: attendance_pct }),
          risk_reasons: riskReasons({
            cgpa: s.cgpa,
            attendancePct: attendance_pct,
          }),
        };
      })
      .filter((s) => s.is_at_risk);
  }

  // ── Resources ─────────────────────────────────────────────────────────────────

  @Get('resources')
  @ApiOperation({ summary: 'Get all resources' })
  async getResources() {
    return this.db.resources;
  }

  @Post('resources')
  @Roles('admin', 'superadmin', 'head')
  @ApiOperation({ summary: 'Add a new resource' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  async createResource(@Body() body: any) {
    const id = `res${Date.now()}`;
    const newRes = { resource_id: id, status: 'available', ...body };
    this.db.resources.push(newRes);
    return { success: true, data: newRes };
  }

  @Put('resources/:id')
  @Roles('admin', 'head', 'superadmin', 'faculty')
  @ApiOperation({ summary: 'Update resource status or details' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  async updateResource(@Param('id') id: string, @Body() body: any) {
    const res = this.db.resources.find((r) => r.resource_id === id);
    if (!res)
      throw new NotFoundException(
        errorBody(ErrorCode.RESOURCE_NOT_FOUND, 'Resource not found'),
      );
    Object.assign(res, body);
    return { success: true, data: res };
  }

  // ── Fees ──────────────────────────────────────────────────────────────────────

  @Get('fees')
  @Roles('admin', 'head', 'superadmin')
  @ApiOperation({ summary: 'Get all fee records with compliance summary' })
  async getFees() {
    return {
      fees: this.db.fees,
      summary: {
        total: this.db.fees.length,
        overdue: this.db.fees.filter((f) => f.status === 'overdue').length,
        paid: this.db.fees.filter((f) => f.status === 'paid').length,
        pending: this.db.fees.filter((f) => f.status === 'pending').length,
        compliance_rate: `${Math.round((this.db.fees.filter((f) => f.status === 'paid').length / this.db.fees.length) * 100)}%`,
      },
    };
  }

  @Patch('fees/:id/pay')
  @Roles('admin', 'head', 'superadmin')
  @ApiOperation({ summary: 'Mark a fee record as paid' })
  async payFee(@Param('id') id: string) {
    const fee = this.db.fees.find((f) => f.fee_id === id);
    if (!fee)
      throw new NotFoundException(
        errorBody(ErrorCode.RESOURCE_NOT_FOUND, 'Fee record not found'),
      );
    fee.status = 'paid';
    fee.paid_date = new Date().toLocaleDateString();
    return { success: true, data: fee };
  }

  @Post('fees')
  @Roles('admin', 'head', 'superadmin')
  @ApiOperation({ summary: 'Add a new fee record for a student' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  async createFee(@Body() body: any) {
    if (!body.student_id || !body.fee_type || !body.amount || !body.due_date) {
      throw new BadRequestException(
        errorBody(
          ErrorCode.BUSINESS_RULE_VIOLATION,
          'student_id, fee_type, amount, and due_date are required',
        ),
      );
    }
    const id = `f${Date.now()}`;
    const newFee = {
      fee_id: id,
      status: 'pending',
      ...body,
      amount: Number(body.amount),
    };
    this.db.fees.push(newFee);
    return { success: true, data: newFee };
  }

  @Put('fees/:id')
  @Roles('admin', 'head', 'superadmin')
  @ApiOperation({ summary: 'Update an existing fee record' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  async updateFee(@Param('id') id: string, @Body() body: any) {
    const fee = this.db.fees.find((f) => f.fee_id === id);
    if (!fee)
      throw new NotFoundException(
        errorBody(ErrorCode.RESOURCE_NOT_FOUND, 'Fee record not found'),
      );
    Object.assign(fee, { ...body, amount: Number(body.amount || fee.amount) });
    return { success: true, data: fee };
  }

  // ── Enrollment (Faculty assigns student to course) ─────────────────────────

  @Post('enrollment')
  @Roles('faculty', 'admin', 'head', 'superadmin')
  @ApiOperation({
    summary: 'Enroll a student in a course (faculty/admin action)',
  })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  async enrollStudentByCourse(@Body() body: any) {
    const { student_id, course_id } = body;
    if (!student_id || !course_id)
      throw new BadRequestException(
        errorBody(
          ErrorCode.BUSINESS_RULE_VIOLATION,
          'student_id and course_id are required',
        ),
      );
    const student = this.db.students.find((s) => s.user_id === student_id);
    if (!student)
      throw new NotFoundException(
        errorBody(ErrorCode.RESOURCE_NOT_FOUND, 'Student not found'),
      );
    const course = this.db.courses.find((c) => c.course_id === course_id);
    if (!course)
      throw new NotFoundException(
        errorBody(ErrorCode.RESOURCE_NOT_FOUND, 'Course not found'),
      );
    const existing = this.db.enrollment.find(
      (e) => e.student_id === student_id && e.course_id === course_id,
    );
    if (existing)
      throw new BadRequestException(
        errorBody(
          ErrorCode.DUPLICATE_RESOURCE,
          'Student is already enrolled in this course',
        ),
      );
    const id = `e${Date.now()}`;
    const newEnrollment = {
      enrollment_id: id,
      student_id,
      course_id,
      year_id: new Date().getFullYear().toString(),
      status: 'active',
      section: student.section || 'A',
    };
    this.db.enrollment.push(newEnrollment as any);
    return { success: true, data: newEnrollment };
  }

  // ── Meetings ──────────────────────────────────────────────────────────────────

  @Post('meetings')
  @Roles('faculty', 'admin', 'head')
  @ApiOperation({ summary: 'Schedule a meeting with a student' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  async scheduleMeeting(@Body() body: any) {
    return {
      success: true,
      message: 'Meeting scheduled successfully',
      meeting: {
        meeting_id: `mt${Date.now()}`,
        ...body,
        created_at: new Date().toISOString(),
      },
    };
  }

  // ── Syllabus Progress ──────────────────────────────────────────────────────────

  @Get('syllabus-progress')
  @ApiOperation({
    summary: 'Get syllabus completion progress, optionally filtered by section',
  })
  async getSyllabusProgress(@Query('section') section?: string) {
    const list = section
      ? this.db.syllabus_progress.filter((s) => s.section === section)
      : this.db.syllabus_progress;
    return list.map((sp) => {
      const course = this.db.courses.find((c) => c.course_id === sp.course_id);
      return {
        ...sp,
        course_name: course?.course_name,
        course_code: course?.course_code,
      };
    });
  }

  @Patch('syllabus-progress')
  @Roles('faculty', 'admin', 'head', 'superadmin')
  @ApiOperation({ summary: 'Update syllabus completion for a course+section' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  async updateSyllabusProgress(
    @Body() body: any,
    @CurrentUserId() userId: string,
  ) {
    if (!body.course_id || !body.section || body.progress === undefined)
      throw new BadRequestException(
        errorBody(
          ErrorCode.BUSINESS_RULE_VIOLATION,
          'course_id, section, and progress required',
        ),
      );
    const existing = this.db.syllabus_progress.find(
      (s) => s.course_id === body.course_id && s.section === body.section,
    );
    if (existing) {
      existing.progress = Math.min(100, Math.max(0, Number(body.progress)));
      existing.updated_by = userId;
      existing.updated_at = new Date().toISOString().split('T')[0];
      return { success: true, data: existing };
    }
    const newEntry = {
      course_id: body.course_id,
      section: body.section,
      progress: Number(body.progress),
      updated_by: userId,
      updated_at: new Date().toISOString().split('T')[0],
    };
    this.db.syllabus_progress.push(newEntry as any);
    return { success: true, data: newEntry };
  }

  // ── Attendance Requests (Student → Admin → Faculty) ────────────────────────────

  @Post('attendance-request')
  @Roles('student')
  @ApiOperation({ summary: 'Student requests attendance correction' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  async createAttendanceRequest(
    @Body() body: any,
    @CurrentUserId() userId: string,
  ) {
    if (!body.course_id || !body.date || !body.reason)
      throw new BadRequestException(
        errorBody(
          ErrorCode.BUSINESS_RULE_VIOLATION,
          'course_id, date, and reason required',
        ),
      );
    // Allow past and today dates (student requests attendance for a day they were absent)
    const today = new Date().toISOString().split('T')[0];
    if (body.date > today)
      throw new BadRequestException(
        errorBody(
          ErrorCode.BUSINESS_RULE_VIOLATION,
          'Attendance requests cannot be made for future dates',
        ),
      );
    const student = this.db.students.find((s) => s.user_id === userId);
    const course = this.db.courses.find((c) => c.course_id === body.course_id);
    const id = `ar${Date.now()}`;
    const request = {
      request_id: id,
      student_id: userId,
      student_name: student
        ? `${student.first_name} ${student.last_name || ''}`.trim()
        : userId,
      course_id: body.course_id,
      course_code: course?.course_code || body.course_id,
      date: body.date,
      reason: body.reason,
      // The supporting document (medical certificate etc.) this request rests on.
      file_id: body.file_id ?? null,
      admin_status: 'pending',
      faculty_status: 'pending',
      created_at: new Date().toISOString(),
    };
    this.db.attendance_requests.push(request);
    return { success: true, data: request };
  }

  @Get('attendance-requests')
  @Roles('student', 'faculty', 'admin', 'head', 'superadmin')
  @ApiOperation({ summary: 'Get attendance requests' })
  async getAttendanceRequests(
    @CurrentUserId() userId: string,
    @CurrentUserRole() role: string,
  ) {
    if (role === 'student')
      return this.db.attendance_requests.filter((r) => r.student_id === userId);
    if (role === 'faculty') {
      const facultyCourseIds = this.db.courses
        .filter((c) => c.faculty_id === userId)
        .map((c) => c.course_id);
      return this.db.attendance_requests.filter((r) =>
        facultyCourseIds.includes(r.course_id),
      );
    }
    return this.db.attendance_requests;
  }

  @Patch('attendance-request/:id')
  @Roles('admin', 'head', 'superadmin')
  @ApiOperation({ summary: 'Admin approves or rejects an attendance request' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  async updateAttendanceRequest(@Param('id') id: string, @Body() body: any) {
    const req = this.db.attendance_requests.find((r) => r.request_id === id);
    if (!req)
      throw new NotFoundException(
        errorBody(ErrorCode.RESOURCE_NOT_FOUND, 'Attendance request not found'),
      );
    req.admin_status = body.status || 'approved';
    req.admin_reason = body.admin_reason || '';
    return { success: true, data: req };
  }

  @Patch('attendance-request/:id/mark')
  @Roles('faculty')
  @ApiOperation({ summary: 'Faculty marks attendance after admin approval' })
  async markAttendanceRequest(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
  ) {
    const req = this.db.attendance_requests.find((r) => r.request_id === id);
    if (!req)
      throw new NotFoundException(
        errorBody(ErrorCode.RESOURCE_NOT_FOUND, 'Attendance request not found'),
      );
    if (req.admin_status !== 'approved')
      throw new BadRequestException(
        errorBody(
          ErrorCode.BUSINESS_RULE_VIOLATION,
          'Admin has not approved this request',
        ),
      );
    if (req.faculty_status === 'granted')
      throw new BadRequestException(
        errorBody(
          ErrorCode.BUSINESS_RULE_VIOLATION,
          'This request has already been granted',
        ),
      );
    req.faculty_status = 'granted';

    // H-07: UUID instead of `al${length + 1}`, which minted ids that already existed.
    // M-01: correcting an existing record rather than appending a second one.
    const existing = this.db.attendance_log.find(
      (a) =>
        a.student_id === req.student_id &&
        a.course_id === req.course_id &&
        a.date === req.date,
    );
    if (existing) {
      existing.status = ATTENDANCE_STATUS.PRESENT;
    } else {
      this.db.attendance_log.push({
        log_id: uuidv4(),
        student_id: req.student_id,
        course_id: req.course_id,
        date: req.date,
        status: ATTENDANCE_STATUS.PRESENT,
      } as any);
    }
    this.db.persist();
    return { success: true, data: req };
  }

  // ── Resource Bookings (Faculty → Admin) ────────────────────────────────────────

  @Post('resource-booking')
  @Roles('faculty', 'admin', 'head', 'superadmin')
  @ApiOperation({ summary: 'Faculty requests a resource booking' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  async createResourceBooking(
    @Body() body: any,
    @CurrentUserId() userId: string,
  ) {
    if (!body.resource_id || !body.date || !body.purpose)
      throw new BadRequestException(
        errorBody(
          ErrorCode.BUSINESS_RULE_VIOLATION,
          'resource_id, date, and purpose required',
        ),
      );
    const resource = this.db.resources.find(
      (r) => r.resource_id === body.resource_id,
    );
    const faculty = this.db.faculty.find((f) => f.user_id === userId);
    const id = `rb${Date.now()}`;
    const booking = {
      booking_id: id,
      resource_id: body.resource_id,
      resource_name: resource?.name || body.resource_id,
      requested_by: userId,
      requester_name: faculty
        ? `${faculty.first_name} ${faculty.last_name || ''}`.trim()
        : userId,
      date: body.date,
      time_slot: body.time_slot || 'Full Day',
      purpose: body.purpose,
      status: 'pending',
      created_at: new Date().toISOString(),
    };
    this.db.resource_bookings.push(booking);
    return { success: true, data: booking };
  }

  @Get('resource-bookings')
  @Roles('faculty', 'admin', 'head', 'superadmin')
  @ApiOperation({ summary: 'Get resource bookings' })
  async getResourceBookings(
    @CurrentUserId() userId: string,
    @CurrentUserRole() role: string,
  ) {
    if (role === 'faculty')
      return this.db.resource_bookings.filter((b) => b.requested_by === userId);
    return this.db.resource_bookings;
  }

  @Patch('resource-booking/:id')
  @Roles('admin', 'head', 'superadmin')
  @ApiOperation({ summary: 'Admin approves or rejects a resource booking' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  async updateResourceBooking(@Param('id') id: string, @Body() body: any) {
    const booking = this.db.resource_bookings.find((b) => b.booking_id === id);
    if (!booking)
      throw new NotFoundException(
        errorBody(ErrorCode.RESOURCE_NOT_FOUND, 'Booking not found'),
      );
    booking.status = body.status || 'approved';
    return { success: true, data: booking };
  }

  // ── Student Timetable by Enrollment ──────────────────────────────────────────

  @Get('student-timetable')
  @Roles('student')
  @ApiOperation({
    summary: 'Get timetable filtered by student enrolled courses',
  })
  async getStudentTimetable(@CurrentUserId() userId: string) {
    const student = this.db.students.find((s) => s.user_id === userId);
    const section = student?.section || 'A';
    const enrolledCourseIds = this.db.enrollment
      .filter((e) => e.student_id === userId && e.status === 'active')
      .map((e) => e.course_id);
    const slots = this.db.timetable.filter(
      (t) => t.section === section && enrolledCourseIds.includes(t.course_id),
    );
    const grid = slots.reduce((acc: any, curr) => {
      if (!acc[curr.day]) acc[curr.day] = {};
      if (!acc[curr.day][curr.time]) acc[curr.day][curr.time] = curr;
      else {
        if (!Array.isArray(acc[curr.day][curr.time]))
          acc[curr.day][curr.time] = [acc[curr.day][curr.time]];
        acc[curr.day][curr.time].push(curr);
      }
      return acc;
    }, {});
    return {
      grid,
      days: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
      times: ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'],
    };
  }
}
