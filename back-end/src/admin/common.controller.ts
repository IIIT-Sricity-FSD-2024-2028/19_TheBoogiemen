import { Controller, Get, Post, Body, Headers, Param, Put, Query, Patch, Delete, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InMemoryDbService } from '../database/in-memory-db.service';
import { Roles } from '../auth/roles.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiBody } from '@nestjs/swagger';

@ApiTags('Admin/Reports')
@Controller()
export class CommonController {
  constructor(private db: InMemoryDbService) {}

  // ── Courses ──────────────────────────────────────────────────────────────────

  @Get('courses')
  @ApiOperation({ summary: 'Get all courses' })
  @ApiResponse({ status: 200, description: 'Array of all courses' })
  async getCourses() { return this.db.courses; }

  @Post('courses')
  @Roles('faculty', 'head', 'admin', 'superadmin')
  @ApiOperation({ summary: 'Create a new course' })
  @ApiHeader({ name: 'role', description: 'Role: faculty|head|admin|superadmin' })
  @ApiHeader({ name: 'user-id', description: 'Creator user ID' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  async createCourse(@Body() body: any, @Headers('user-id') userId: string) {
    if (!body.course_name || !body.course_code) throw new BadRequestException('course_name and course_code are required');
    if (this.db.courses.find(c => c.course_code === body.course_code)) throw new BadRequestException('Course code already exists');
    const faculty = this.db.faculty.find(f => f.user_id === userId);
    const facultyName = faculty ? `${faculty.first_name} ${faculty.last_name}`.trim() : 'Faculty';
    const newCourse = { course_id: `c${Date.now()}`, faculty_id: body.faculty_id || userId, faculty_name: facultyName, ...body };
    this.db.courses.push(newCourse as any);
    return { success: true, data: newCourse };
  }

  // ── Timetable ────────────────────────────────────────────────────────────────

  @Get('timetable')
  @ApiOperation({ summary: 'Get timetable grid for a section' })
  async getTimetable(@Query('section') section: string = 'A') {
    const slots = this.db.timetable.filter(t => t.section === section);
    const grid = slots.reduce((acc: any, curr) => {
      if (!acc[curr.day]) acc[curr.day] = {};
      if (!acc[curr.day][curr.time]) acc[curr.day][curr.time] = curr;
      else {
        if (!Array.isArray(acc[curr.day][curr.time])) acc[curr.day][curr.time] = [acc[curr.day][curr.time]];
        acc[curr.day][curr.time].push(curr);
      }
      return acc;
    }, {});
    return { grid, days: ['MON', 'TUE', 'WED', 'THU', 'FRI'], times: ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'] };
  }

  @Get('timetable/faculty')
  @Roles('faculty')
  @ApiOperation({ summary: 'Get timetable grid for the logged-in faculty' })
  @ApiHeader({ name: 'role', description: 'Must be: faculty' })
  @ApiHeader({ name: 'user-id', description: 'Faculty user ID' })
  async getFacultyTimetable(@Headers('user-id') userId: string) {
    const facultyCourseIds = this.db.courses.filter(c => c.faculty_id === userId).map(c => c.course_id);
    const slots = this.db.timetable.filter(t => facultyCourseIds.includes(t.course_id));
    const grid = slots.reduce((acc: any, curr) => {
      if (!acc[curr.day]) acc[curr.day] = {};
      if (!acc[curr.day][curr.time]) acc[curr.day][curr.time] = curr;
      else {
        if (!Array.isArray(acc[curr.day][curr.time])) acc[curr.day][curr.time] = [acc[curr.day][curr.time]];
        acc[curr.day][curr.time].push(curr);
      }
      return acc;
    }, {});
    return { grid, days: ['MON', 'TUE', 'WED', 'THU', 'FRI'], times: ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'] };
  }

  // ── Assessments ──────────────────────────────────────────────────────────────

  @Get('assessments')
  @ApiOperation({ summary: 'Get all assessments, optionally filtered by faculty_id' })
  async getAssessments(@Query('faculty_id') facultyId?: string) {
    const list = facultyId ? this.db.assessments.filter(a => a.faculty_id === facultyId) : this.db.assessments;
    return list.map(a => {
      const course = this.db.courses.find(c => c.course_id === a.course_id);
      return { ...a, course_name: course?.course_name, course_code: course?.course_code };
    });
  }

  @Post('assessments')
  @Roles('faculty', 'admin', 'head', 'superadmin')
  @ApiOperation({ summary: 'Create a new assessment' })
  @ApiHeader({ name: 'role', description: 'Role: faculty|admin|head|superadmin' })
  @ApiHeader({ name: 'user-id', description: 'Faculty user ID' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  async createAssessment(@Body() body: any, @Headers('user-id') userId: string) {
    const id = `a${Date.now()}`;
    const newAssessment = { assessment_id: id, faculty_id: userId, weightage: body.weightage || 10, ...body };
    this.db.assessments.push(newAssessment as any);
    return { success: true, data: newAssessment };
  }

  // ── Marks ────────────────────────────────────────────────────────────────────

  @Get('marks')
  @Roles('faculty', 'admin', 'head', 'superadmin')
  @ApiOperation({ summary: 'Get all marks entries, optionally filtered by assessment_id' })
  async getMarks(@Query('assessment_id') assessmentId?: string) {
    const list = assessmentId ? this.db.marks_entry.filter(m => m.assessment_id === assessmentId) : this.db.marks_entry;
    return list.map(m => {
      const student = this.db.students.find(s => s.user_id === m.student_id);
      return { ...m, student_name: student ? `${student.first_name} ${student.last_name}`.trim() : m.student_id };
    });
  }

  @Post('marks')
  @Roles('faculty', 'admin', 'head', 'superadmin')
  @ApiOperation({ summary: 'Record marks for a student (locked once entered)' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  async recordMarks(@Body() body: any) {
    if (!body.student_id || !body.assessment_id) throw new BadRequestException('student_id and assessment_id required');
    // Marks lock: reject if already entered
    const existing = this.db.marks_entry.find(m => m.student_id === body.student_id && m.assessment_id === body.assessment_id);
    if (existing) throw new BadRequestException('Marks already entered and locked for this student. Cannot update.');
    const id = `m${Date.now()}`;
    const entry = { entry_id: id, ...body };
    this.db.marks_entry.push(entry as any);
    return { success: true, data: entry };
  }

  // ── Submissions (online assessments) ─────────────────────────────────────────

  @Get('submissions')
  @ApiOperation({ summary: 'Get submissions — own for student, all for faculty' })
  async getSubmissions(@Headers('user-id') userId: string, @Headers('role') role: string) {
    if (role === 'student') return this.db.submissions.filter(s => s.student_id === userId);
    return this.db.submissions;
  }

  @Post('submissions')
  @ApiOperation({ summary: 'Student submits work for an online assessment' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  async createSubmission(@Body() body: any, @Headers('user-id') userId: string) {
    if (!body.assessment_id) throw new BadRequestException('assessment_id required');
    // Upsert — allow re-submission
    const existing = this.db.submissions.find(s => s.student_id === userId && s.assessment_id === body.assessment_id);
    if (existing) {
      existing.submitted_at = new Date().toISOString();
      existing.notes = body.notes || existing.notes;
      existing.status = 'submitted';
      return { success: true, data: existing };
    }
    const newSub = {
      submission_id:  `sub${Date.now()}`,
      student_id:     userId,
      assessment_id:  body.assessment_id,
      notes:          body.notes || '',
      submitted_at:   new Date().toISOString(),
      status:         'submitted',
    };
    this.db.submissions.push(newSub as any);
    return { success: true, data: newSub };
  }

  // ── Attendance ────────────────────────────────────────────────────────────────

  @Get('attendance/today/:courseId')
  @Roles('faculty')
  @ApiOperation({ summary: 'Get enrolled students for today attendance' })
  @ApiHeader({ name: 'role', description: 'Must be: faculty' })
  async getTodayAttendance(@Param('courseId') courseId: string) {
    const enrollment = this.db.enrollment.filter(e => e.course_id === courseId);
    const students = this.db.students
      .filter(s => enrollment.map(e => e.student_id).includes(s.user_id))
      .map(s => ({ ...s, today_status: 'present' }));
    return { students, date: new Date().toISOString().split('T')[0] };
  }

  @Post('attendance')
  @Roles('faculty')
  @ApiOperation({ summary: 'Record bulk attendance for a course session' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  async recordAttendance(@Body() body: any) {
    const { course_id, date, records } = body;
    if (!course_id || !date || !records) throw new BadRequestException('course_id, date, and records required');
    const newLogs = (records || []).map((r: any, idx: number) => {
      const log = { log_id: `al${this.db.attendance_log.length + idx + 1}`, student_id: r.student_id, course_id, date, status: r.status };
      this.db.attendance_log.push(log as any);
      return log;
    });
    return { saved: newLogs.length, records: newLogs };
  }

  // ── Discussions ───────────────────────────────────────────────────────────────

  @Get('discussions')
  @ApiOperation({ summary: 'Get all discussion posts with reply counts' })
  async getDiscussions() {
    return this.db.discussion_posts.map(p => {
      const replies = this.db.discussion_replies.filter(r => r.post_id === p.post_id);
      return { ...p, reply_count: replies.length };
    });
  }

  @Get('discussions/:postId')
  @ApiOperation({ summary: 'Get a single discussion post with all replies' })
  async getDiscussionDetail(@Param('postId') postId: string) {
    const post = this.db.discussion_posts.find(p => p.post_id === postId);
    if (!post) throw new NotFoundException('Post not found');
    const replies = this.db.discussion_replies.filter(r => r.post_id === postId);
    return { ...post, replies };
  }

  @Post('discussions')
  @ApiOperation({ summary: 'Create a new discussion post' })
  @ApiHeader({ name: 'user-id', description: 'Author user ID' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  async createDiscussion(@Body() body: any, @Headers('user-id') userId: string) {
    const user = this.db.users.find(u => u.user_id === userId);
    const student = this.db.students.find(s => s.user_id === userId);
    const faculty = this.db.faculty.find(f => f.user_id === userId);
    const authorName = student ? `${student.first_name} ${student.last_name || ''}`.trim()
      : faculty ? `${faculty.first_name} ${faculty.last_name || ''}`.trim()
      : user?.username || 'Anonymous';
    const id = `p${Date.now()}`;
    const newPost = { post_id: id, title: body.title, content: body.content, author_id: userId, author_name: authorName, author_role: user?.role || 'student', tag: body.tag || 'general', course_id: body.course_id, created_at: new Date().toISOString(), reply_count: 0 };
    this.db.discussion_posts.push(newPost as any);
    return newPost;
  }

  @Post('discussions/:postId/replies')
  @ApiOperation({ summary: 'Reply to a discussion post' })
  @ApiHeader({ name: 'user-id', description: 'Replier user ID' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  async createReply(@Param('postId') postId: string, @Body() body: any, @Headers('user-id') userId: string) {
    const user = this.db.users.find(u => u.user_id === userId);
    const student = this.db.students.find(s => s.user_id === userId);
    const faculty = this.db.faculty.find(f => f.user_id === userId);
    const authorName = student ? `${student.first_name} ${student.last_name || ''}`.trim()
      : faculty ? `${faculty.first_name} ${faculty.last_name || ''}`.trim()
      : user?.username || 'Anonymous';
    const post = this.db.discussion_posts.find(p => p.post_id === postId);
    if (!post) throw new NotFoundException('Post not found');
    const id = `r${Date.now()}`;
    const newReply = { reply_id: id, post_id: postId, author_id: userId, author_name: authorName, author_role: user?.role, content: body.content, created_at: new Date().toISOString() };
    this.db.discussion_replies.push(newReply as any);
    post.reply_count = (post.reply_count || 0) + 1;
    return newReply;
  }

  // ── Research ─────────────────────────────────────────────────────────────────

  @Get('research')
  @ApiOperation({ summary: 'Get research projects filtered by role' })
  @ApiHeader({ name: 'user-id', description: 'User ID' })
  @ApiHeader({ name: 'role', description: 'User role' })
  async getResearch(@Headers('user-id') userId: string, @Headers('role') role: string) {
    const enrich = (p: any) => {
      const sup = this.db.faculty.find(f => f.user_id === p.supervisor_id);
      const stuList = (p.students || []).map((s: any) => {
        const stu = this.db.students.find(st => st.user_id === s.user_id);
        return { ...s, first_name: stu?.first_name || s.first_name, last_name: stu?.last_name || s.last_name || '' };
      });
      return { ...p, supervisor_name: sup ? `${sup.first_name} ${sup.last_name}`.trim() : p.supervisor_name, students: stuList };
    };
    if (role === 'faculty') return this.db.research_projects.filter(p => p.supervisor_id === userId).map(enrich);
    if (role === 'student') return this.db.research_projects.filter(p => p.students.some(s => s.user_id === userId)).map(enrich);
    return this.db.research_projects.map(enrich);
  }

  @Patch('research/:id/status')
  @Roles('faculty', 'admin', 'head', 'superadmin')
  @ApiOperation({ summary: 'Update research project status' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  async updateResearchStatus(@Param('id') id: string, @Body() body: { status: string }) {
    const project = this.db.research_projects.find(p => p.project_id === id);
    if (!project) throw new NotFoundException('Project not found');
    project.status = body.status;
    return project;
  }

  @Patch('research/:id/progress')
  @Roles('student', 'faculty', 'admin', 'head', 'superadmin')
  @ApiOperation({ summary: 'Update research project progress, submission notes, or faculty feedback' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  async updateResearchProgress(@Param('id') id: string, @Body() body: any) {
    const project = this.db.research_projects.find(p => p.project_id === id);
    if (!project) throw new NotFoundException('Project not found');
    // Only update progress if explicitly provided (don't zero it out)
    if (body.progress !== undefined && body.progress !== null) project.progress = Number(body.progress);
    if (body.submission_notes !== undefined) (project as any).submission_notes = body.submission_notes;
    if (body.faculty_feedback !== undefined) (project as any).faculty_feedback = body.faculty_feedback;
    return project;
  }

  @Post('research')
  @Roles('faculty', 'admin', 'head', 'superadmin')
  @ApiOperation({ summary: 'Create a new research/BTP project and assign to a student' })
  @ApiHeader({ name: 'role', description: 'Role: faculty|admin|head|superadmin' })
  @ApiHeader({ name: 'user-id', description: 'Faculty user ID (supervisor)' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  async createResearch(@Body() body: any, @Headers('user-id') userId: string) {
    if (!body.student_id || !body.title) throw new BadRequestException('student_id and title are required');
    const student = this.db.students.find(s => s.user_id === body.student_id);
    if (!student) throw new NotFoundException('Student not found');
    const faculty = this.db.faculty.find(f => f.user_id === userId);
    const supervisorName = faculty ? `${faculty.first_name} ${faculty.last_name}`.trim() : 'Faculty';
    const studentName = `${student.first_name} ${student.last_name || ''}`.trim();
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
  async getEvents() { return this.db.events; }

  @Post('events')
  @Roles('admin', 'superadmin', 'head', 'faculty')
  @ApiOperation({ summary: 'Create a new institutional event' })
  @ApiHeader({ name: 'role', description: 'Role: admin|superadmin|head|faculty' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  async createEvent(@Body() body: any) {
    if (!body.event_name || !body.date || !body.venue) throw new BadRequestException('event_name, date, and venue are required');
    const id = `ev${Date.now()}`;
    const newEvent = { event_id: id, ...body };
    this.db.events.push(newEvent as any);
    return { success: true, data: newEvent };
  }

  @Put('events/:id')
  @Roles('admin', 'superadmin', 'head', 'faculty')
  @ApiOperation({ summary: 'Update an existing event' })
  @ApiHeader({ name: 'role', description: 'Role: admin|superadmin|head|faculty' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  async updateEvent(@Param('id') id: string, @Body() body: any) {
    const event = this.db.events.find(e => e.event_id === id);
    if (!event) throw new NotFoundException('Event not found');
    Object.assign(event, body);
    return { success: true, data: event };
  }

  @Delete('events/:id')
  @Roles('admin', 'superadmin', 'head', 'faculty')
  @ApiOperation({ summary: 'Delete an event' })
  async deleteEvent(@Param('id') id: string) {
    const index = this.db.events.findIndex(e => e.event_id === id);
    if (index === -1) throw new NotFoundException('Event not found');
    this.db.events.splice(index, 1);
    return { success: true, message: 'Event deleted' };
  }

  // ── Leave ─────────────────────────────────────────────────────────────────────

  @Get('leave')
  @ApiOperation({ summary: 'Get leave applications — own for student, all for admin/faculty' })
  @ApiHeader({ name: 'user-id', description: 'User ID' })
  @ApiHeader({ name: 'role', description: 'User role' })
  async getLeaves(@Headers('user-id') userId: string, @Headers('role') role: string) {
    if (role === 'student') return this.db.leave_applications.filter(l => l.student_id === userId);
    // Faculty see ALL student leaves (for approval)
    return this.db.leave_applications;
  }

  @Post('leave')
  @Roles('student', 'faculty')
  @ApiOperation({ summary: 'Submit a new leave application' })
  @ApiHeader({ name: 'role', description: 'Role: student|faculty' })
  @ApiHeader({ name: 'user-id', description: 'Applicant user ID' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  async applyLeave(@Body() body: any, @Headers('user-id') userId: string) {
    if (!body.leave_type || !body.start_date || !body.end_date || !body.reason) {
      throw new BadRequestException('leave_type, start_date, end_date, and reason are required');
    }
    const user = this.db.users.find(u => u.user_id === userId);
    const student = this.db.students.find(s => s.user_id === userId);
    const studentName = student ? `${student.first_name} ${student.last_name || ''}`.trim() : user?.username || 'Unknown';
    const id = `l${Date.now()}`;
    const newLeave = { leave_id: id, student_id: userId, student_name: studentName, status: 'pending', applied_on: new Date().toISOString().split('T')[0], ...body };
    this.db.leave_applications.push(newLeave as any);
    return { success: true, data: newLeave };
  }

  @Patch('leave/:id')
  @Roles('admin', 'head', 'superadmin')
  @ApiOperation({ summary: 'Approve or reject a leave application' })
  @ApiHeader({ name: 'role', description: 'Role: admin|head|superadmin' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  async updateLeave(@Param('id') id: string, @Body() body: { status: string }) {
    const leave = this.db.leave_applications.find(l => l.leave_id === id);
    if (!leave) throw new NotFoundException('Leave application not found');
    leave.status = body.status;
    return { success: true, data: leave };
  }

  // ── Users ─────────────────────────────────────────────────────────────────────

  @Get('users')
  @Roles('admin', 'superadmin', 'head')
  @ApiOperation({ summary: 'Get all system users' })
  @ApiHeader({ name: 'role', description: 'Role: admin|superadmin|head' })
  async getUsers() { return this.db.users.map(u => ({ ...u, password: undefined })); }

  @Get('admin/users')
  @Roles('admin', 'head', 'superadmin', 'faculty')
  @ApiOperation({ summary: 'Get all users for admin management panel' })
  @ApiHeader({ name: 'role', description: 'Role: admin|head|superadmin|faculty' })
  async getAllUsers() { return this.db.users.map(u => ({ ...u, password: undefined })); }

  @Post('users')
  @Roles('admin', 'superadmin', 'head')
  @ApiOperation({ summary: 'Create a new system user' })
  @ApiHeader({ name: 'role', description: 'Role: admin|superadmin|head' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  async createUser(@Body() body: any) {
    if (!body.email || !body.role) throw new BadRequestException('email and role are required');
    if (this.db.users.find(u => u.email === body.email)) throw new BadRequestException('Email already exists');
    const id = `u${Date.now()}`;
    const newUser = { user_id: id, username: body.first_name || body.email.split('@')[0], password: body.password || 'password', ...body };
    this.db.users.push(newUser);
    if (body.role === 'student') {
      this.db.students.push({ user_id: id, first_name: body.first_name || body.username || 'New', last_name: body.last_name || '', branch: 'CSE', batch: '2024-2028', cgpa: 7.0, section: 'A', email: body.email, join_date: new Date().toISOString().split('T')[0], dob: '2005-01-01', phone: body.phone || '' });
    } else if (body.role === 'faculty') {
      this.db.faculty.push({ user_id: id, first_name: body.first_name || body.username || 'New', last_name: body.last_name || '', designation: 'Assistant Professor', department_id: 'dept1', email: body.email, phone: body.phone || '' });
    }
    return { success: true, data: { ...newUser, password: undefined } };
  }

  @Put('users/:id')
  @Roles('admin', 'superadmin', 'head')
  @ApiOperation({ summary: 'Update a user record' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  async updateUser(@Param('id') id: string, @Body() body: any) {
    const user = this.db.users.find(u => u.user_id === id);
    if (!user) throw new NotFoundException('User not found');
    Object.assign(user, body);
    return { success: true, data: { ...user, password: undefined } };
  }

  @Delete('users/:id')
  @Roles('admin', 'superadmin', 'head')
  @ApiOperation({ summary: 'Delete a user' })
  async deleteUser(@Param('id') id: string) {
    const index = this.db.users.findIndex(u => u.user_id === id);
    if (index === -1) throw new NotFoundException('User not found');
    this.db.users.splice(index, 1);
    return { success: true, message: 'User deleted' };
  }

  // ── Reports ───────────────────────────────────────────────────────────────────

  @Get('reports/overview')
  @Roles('admin', 'head', 'superadmin')
  @ApiOperation({ summary: 'Get high-level institutional overview metrics' })
  @ApiHeader({ name: 'role', description: 'Role: admin|head|superadmin' })
  async getOverview() {
    const totalFees = this.db.fees.reduce((s, f) => s + f.amount, 0);
    const paidFees = this.db.fees.filter(f => f.status === 'paid').reduce((s, f) => s + f.amount, 0);
    return {
      summary: {
        total_students: this.db.students.length,
        total_faculty: this.db.faculty.length,
        total_courses: this.db.courses.length,
        active_research: this.db.research_projects.filter(p => p.status === 'active').length,
        overall_attendance: '82%',
        fee_compliance: totalFees > 0 ? `${Math.round((paidFees / totalFees) * 100)}%` : '0%',
        avg_co_attainment: '3.4/4.0',
      },
      kpis: { placement_rate: '94%', student_satisfaction: '4.2/5' },
    };
  }

  @Get('reports/at-risk')
  @Roles('admin', 'head', 'superadmin', 'faculty')
  @ApiOperation({ summary: 'Get at-risk students list' })
  async getAtRisk() {
    return this.db.students
      .filter(s => s.cgpa < 6.5)
      .map(s => {
        const records = this.db.attendance_log.filter(a => a.student_id === s.user_id);
        const present = records.filter(r => r.status === 'present').length;
        const attendance_pct = records.length > 0 ? Math.round((present / records.length) * 100) : 65;
        return { ...s, attendance_pct, is_at_risk: true };
      });
  }

  // ── Resources ─────────────────────────────────────────────────────────────────

  @Get('resources')
  @ApiOperation({ summary: 'Get all resources' })
  async getResources() { return this.db.resources; }

  @Post('resources')
  @Roles('admin', 'superadmin', 'head')
  @ApiOperation({ summary: 'Add a new resource' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  async createResource(@Body() body: any) {
    const id = `res${Date.now()}`;
    const newRes = { resource_id: id, status: 'available', ...body };
    this.db.resources.push(newRes as any);
    return { success: true, data: newRes };
  }

  @Put('resources/:id')
  @Roles('admin', 'head', 'superadmin', 'faculty')
  @ApiOperation({ summary: 'Update resource status or details' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  async updateResource(@Param('id') id: string, @Body() body: any) {
    const res = this.db.resources.find(r => r.resource_id === id);
    if (!res) throw new NotFoundException('Resource not found');
    Object.assign(res, body);
    return { success: true, data: res };
  }

  // ── Fees ──────────────────────────────────────────────────────────────────────

  @Get('fees')
  @Roles('admin', 'head', 'superadmin')
  @ApiOperation({ summary: 'Get all fee records with compliance summary' })
  @ApiHeader({ name: 'role', description: 'Role: admin|head|superadmin' })
  async getFees() {
    return {
      fees: this.db.fees,
      summary: {
        total: this.db.fees.length,
        overdue: this.db.fees.filter(f => f.status === 'overdue').length,
        paid: this.db.fees.filter(f => f.status === 'paid').length,
        pending: this.db.fees.filter(f => f.status === 'pending').length,
        compliance_rate: `${Math.round((this.db.fees.filter(f => f.status === 'paid').length / this.db.fees.length) * 100)}%`,
      },
    };
  }

  @Patch('fees/:id/pay')
  @Roles('admin', 'head', 'superadmin')
  @ApiOperation({ summary: 'Mark a fee record as paid' })
  async payFee(@Param('id') id: string) {
    const fee = this.db.fees.find(f => f.fee_id === id);
    if (!fee) throw new NotFoundException('Fee record not found');
    fee.status = 'paid';
    (fee as any).paid_date = new Date().toLocaleDateString();
    return { success: true, data: fee };
  }

  @Post('fees')
  @Roles('admin', 'head', 'superadmin')
  @ApiOperation({ summary: 'Add a new fee record for a student' })
  @ApiHeader({ name: 'role', description: 'Role: admin|head|superadmin' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  async createFee(@Body() body: any) {
    if (!body.student_id || !body.fee_type || !body.amount || !body.due_date) {
      throw new BadRequestException('student_id, fee_type, amount, and due_date are required');
    }
    const id = `f${Date.now()}`;
    const newFee = { fee_id: id, status: 'pending', ...body, amount: Number(body.amount) };
    this.db.fees.push(newFee as any);
    return { success: true, data: newFee };
  }

  @Put('fees/:id')
  @Roles('admin', 'head', 'superadmin')
  @ApiOperation({ summary: 'Update an existing fee record' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  async updateFee(@Param('id') id: string, @Body() body: any) {
    const fee = this.db.fees.find(f => f.fee_id === id);
    if (!fee) throw new NotFoundException('Fee record not found');
    Object.assign(fee, { ...body, amount: Number(body.amount || fee.amount) });
    return { success: true, data: fee };
  }

  // ── Enrollment (Faculty assigns student to course) ─────────────────────────

  @Post('enrollment')
  @Roles('faculty', 'admin', 'head', 'superadmin')
  @ApiOperation({ summary: 'Enroll a student in a course (faculty/admin action)' })
  @ApiHeader({ name: 'role', description: 'Role: faculty|admin|head|superadmin' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  async enrollStudentByCourse(@Body() body: any) {
    const { student_id, course_id } = body;
    if (!student_id || !course_id) throw new BadRequestException('student_id and course_id are required');
    const student = this.db.students.find(s => s.user_id === student_id);
    if (!student) throw new NotFoundException('Student not found');
    const course = this.db.courses.find(c => c.course_id === course_id);
    if (!course) throw new NotFoundException('Course not found');
    const existing = this.db.enrollment.find(e => e.student_id === student_id && e.course_id === course_id);
    if (existing) throw new BadRequestException('Student is already enrolled in this course');
    const id = `e${Date.now()}`;
    const newEnrollment = { enrollment_id: id, student_id, course_id, year_id: new Date().getFullYear().toString(), status: 'active', section: student.section || 'A' };
    this.db.enrollment.push(newEnrollment as any);
    return { success: true, data: newEnrollment };
  }

  // ── Meetings ──────────────────────────────────────────────────────────────────

  @Post('meetings')
  @Roles('faculty', 'admin', 'head')
  @ApiOperation({ summary: 'Schedule a meeting with a student' })
  @ApiHeader({ name: 'role', description: 'Role: faculty|admin|head' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  async scheduleMeeting(@Body() body: any) {
    return { success: true, message: 'Meeting scheduled successfully', meeting: { meeting_id: `mt${Date.now()}`, ...body, created_at: new Date().toISOString() } };
  }

  // ── Syllabus Progress ──────────────────────────────────────────────────────────

  @Get('syllabus-progress')
  @ApiOperation({ summary: 'Get syllabus completion progress, optionally filtered by section' })
  async getSyllabusProgress(@Query('section') section?: string) {
    const list = section
      ? this.db.syllabus_progress.filter(s => s.section === section)
      : this.db.syllabus_progress;
    return list.map(sp => {
      const course = this.db.courses.find(c => c.course_id === sp.course_id);
      return { ...sp, course_name: course?.course_name, course_code: course?.course_code };
    });
  }

  @Patch('syllabus-progress')
  @Roles('faculty', 'admin', 'head', 'superadmin')
  @ApiOperation({ summary: 'Update syllabus completion for a course+section' })
  @ApiHeader({ name: 'user-id', description: 'Faculty user ID' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  async updateSyllabusProgress(@Body() body: any, @Headers('user-id') userId: string) {
    if (!body.course_id || !body.section || body.progress === undefined) throw new BadRequestException('course_id, section, and progress required');
    const existing = this.db.syllabus_progress.find(s => s.course_id === body.course_id && s.section === body.section);
    if (existing) {
      existing.progress = Math.min(100, Math.max(0, Number(body.progress)));
      existing.updated_by = userId;
      existing.updated_at = new Date().toISOString().split('T')[0];
      return { success: true, data: existing };
    }
    const newEntry = { course_id: body.course_id, section: body.section, progress: Number(body.progress), updated_by: userId, updated_at: new Date().toISOString().split('T')[0] };
    this.db.syllabus_progress.push(newEntry as any);
    return { success: true, data: newEntry };
  }

  // ── Attendance Requests (Student → Admin → Faculty) ────────────────────────────

  @Post('attendance-request')
  @Roles('student')
  @ApiOperation({ summary: 'Student requests attendance correction' })
  @ApiHeader({ name: 'user-id', description: 'Student user ID' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  async createAttendanceRequest(@Body() body: any, @Headers('user-id') userId: string) {
    if (!body.course_id || !body.date || !body.reason) throw new BadRequestException('course_id, date, and reason required');
    // Allow past and today dates (student requests attendance for a day they were absent)
    const today = new Date().toISOString().split('T')[0];
    if (body.date > today) throw new BadRequestException('Attendance requests cannot be made for future dates');
    const student = this.db.students.find(s => s.user_id === userId);
    const course = this.db.courses.find(c => c.course_id === body.course_id);
    const id = `ar${Date.now()}`;
    const request = {
      request_id: id, student_id: userId,
      student_name: student ? `${student.first_name} ${student.last_name || ''}`.trim() : userId,
      course_id: body.course_id, course_code: course?.course_code || body.course_id,
      date: body.date, reason: body.reason,
      admin_status: 'pending', faculty_status: 'pending',
      created_at: new Date().toISOString(),
    };
    this.db.attendance_requests.push(request);
    return { success: true, data: request };
  }

  @Get('attendance-requests')
  @Roles('student', 'faculty', 'admin', 'head', 'superadmin')
  @ApiOperation({ summary: 'Get attendance requests' })
  @ApiHeader({ name: 'user-id', description: 'User ID' })
  @ApiHeader({ name: 'role', description: 'User role' })
  async getAttendanceRequests(@Headers('user-id') userId: string, @Headers('role') role: string) {
    if (role === 'student') return this.db.attendance_requests.filter(r => r.student_id === userId);
    if (role === 'faculty') {
      const facultyCourseIds = this.db.courses.filter(c => c.faculty_id === userId).map(c => c.course_id);
      return this.db.attendance_requests.filter(r => facultyCourseIds.includes(r.course_id));
    }
    return this.db.attendance_requests;
  }

  @Patch('attendance-request/:id')
  @Roles('admin', 'head', 'superadmin')
  @ApiOperation({ summary: 'Admin approves or rejects an attendance request' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  async updateAttendanceRequest(@Param('id') id: string, @Body() body: any) {
    const req = this.db.attendance_requests.find(r => r.request_id === id);
    if (!req) throw new NotFoundException('Attendance request not found');
    req.admin_status = body.status || 'approved';
    req.admin_reason = body.admin_reason || '';
    return { success: true, data: req };
  }

  @Patch('attendance-request/:id/mark')
  @Roles('faculty')
  @ApiOperation({ summary: 'Faculty marks attendance after admin approval' })
  @ApiHeader({ name: 'user-id', description: 'Faculty user ID' })
  async markAttendanceRequest(@Param('id') id: string, @Headers('user-id') userId: string) {
    const req = this.db.attendance_requests.find(r => r.request_id === id);
    if (!req) throw new NotFoundException('Attendance request not found');
    if (req.admin_status !== 'approved') throw new BadRequestException('Admin has not approved this request');
    req.faculty_status = 'granted';
    // Add attendance log entry
    const log = { log_id: `al${this.db.attendance_log.length + 1}`, student_id: req.student_id, course_id: req.course_id, date: req.date, status: 'present' };
    this.db.attendance_log.push(log as any);
    return { success: true, data: req };
  }

  // ── Resource Bookings (Faculty → Admin) ────────────────────────────────────────

  @Post('resource-booking')
  @Roles('faculty', 'admin', 'head', 'superadmin')
  @ApiOperation({ summary: 'Faculty requests a resource booking' })
  @ApiHeader({ name: 'user-id', description: 'Requesting user ID' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  async createResourceBooking(@Body() body: any, @Headers('user-id') userId: string) {
    if (!body.resource_id || !body.date || !body.purpose) throw new BadRequestException('resource_id, date, and purpose required');
    const resource = this.db.resources.find(r => r.resource_id === body.resource_id);
    const faculty = this.db.faculty.find(f => f.user_id === userId);
    const id = `rb${Date.now()}`;
    const booking = {
      booking_id: id, resource_id: body.resource_id,
      resource_name: resource?.name || body.resource_id,
      requested_by: userId,
      requester_name: faculty ? `${faculty.first_name} ${faculty.last_name || ''}`.trim() : userId,
      date: body.date, time_slot: body.time_slot || 'Full Day',
      purpose: body.purpose, status: 'pending',
      created_at: new Date().toISOString(),
    };
    this.db.resource_bookings.push(booking);
    return { success: true, data: booking };
  }

  @Get('resource-bookings')
  @Roles('faculty', 'admin', 'head', 'superadmin')
  @ApiOperation({ summary: 'Get resource bookings' })
  @ApiHeader({ name: 'user-id', description: 'User ID' })
  @ApiHeader({ name: 'role', description: 'User role' })
  async getResourceBookings(@Headers('user-id') userId: string, @Headers('role') role: string) {
    if (role === 'faculty') return this.db.resource_bookings.filter(b => b.requested_by === userId);
    return this.db.resource_bookings;
  }

  @Patch('resource-booking/:id')
  @Roles('admin', 'head', 'superadmin')
  @ApiOperation({ summary: 'Admin approves or rejects a resource booking' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  async updateResourceBooking(@Param('id') id: string, @Body() body: any) {
    const booking = this.db.resource_bookings.find(b => b.booking_id === id);
    if (!booking) throw new NotFoundException('Booking not found');
    booking.status = body.status || 'approved';
    return { success: true, data: booking };
  }

  // ── Student Timetable by Enrollment ──────────────────────────────────────────

  @Get('student-timetable')
  @Roles('student')
  @ApiOperation({ summary: 'Get timetable filtered by student enrolled courses' })
  @ApiHeader({ name: 'user-id', description: 'Student user ID' })
  async getStudentTimetable(@Headers('user-id') userId: string) {
    const student = this.db.students.find(s => s.user_id === userId);
    const section = student?.section || 'A';
    const enrolledCourseIds = this.db.enrollment.filter(e => e.student_id === userId && e.status === 'active').map(e => e.course_id);
    const slots = this.db.timetable.filter(t => t.section === section && enrolledCourseIds.includes(t.course_id));
    const grid = slots.reduce((acc: any, curr) => {
      if (!acc[curr.day]) acc[curr.day] = {};
      if (!acc[curr.day][curr.time]) acc[curr.day][curr.time] = curr;
      else {
        if (!Array.isArray(acc[curr.day][curr.time])) acc[curr.day][curr.time] = [acc[curr.day][curr.time]];
        acc[curr.day][curr.time].push(curr);
      }
      return acc;
    }, {});
    return { grid, days: ['MON', 'TUE', 'WED', 'THU', 'FRI'], times: ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'] };
  }
}

