import { Controller, Get, Post, Body, Headers, Param, Put, Query, Patch, Delete, BadRequestException, Req, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Roles } from '../auth/roles.guard';
import { ApiTags, ApiOperation, ApiHeader, ApiBody } from '@nestjs/swagger';

import { Course } from '../core/entities/course.entity';
import { Enrollment } from '../core/entities/enrollment.entity';
import { Assessment } from '../core/entities/assessment.entity';
import { Submission } from '../core/entities/submission.entity';
import { MarksEntry } from '../core/entities/marks-entry.entity';
import { AttendanceLog } from '../core/entities/attendance-log.entity';
import { LeaveRequest } from '../core/entities/leave-request.entity';
import { ForumPost } from '../core/entities/forum-post.entity';
import { ForumReply } from '../core/entities/forum-reply.entity';
import { Event } from '../core/entities/event.entity';
import { ResearchProject } from '../core/entities/research-project.entity';
import { User } from '../core/entities/user.entity';

@ApiTags('Platform Core')
@Controller()
export class CommonController {
  constructor(
    @InjectRepository(Course) private courseRepo: Repository<Course>,
    @InjectRepository(Enrollment) private enrollmentRepo: Repository<Enrollment>,
    @InjectRepository(Assessment) private assessmentRepo: Repository<Assessment>,
    @InjectRepository(Submission) private submissionRepo: Repository<Submission>,
    @InjectRepository(MarksEntry) private marksRepo: Repository<MarksEntry>,
    @InjectRepository(AttendanceLog) private attendanceRepo: Repository<AttendanceLog>,
    @InjectRepository(LeaveRequest) private leaveRepo: Repository<LeaveRequest>,
    @InjectRepository(ForumPost) private postRepo: Repository<ForumPost>,
    @InjectRepository(ForumReply) private replyRepo: Repository<ForumReply>,
    @InjectRepository(Event) private eventRepo: Repository<Event>,
    @InjectRepository(ResearchProject) private researchRepo: Repository<ResearchProject>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  // ── Courses ──────────────────────────────────────────────────────────────────

  @Get('courses')
  @ApiOperation({ summary: 'Get all courses in the tenant' })
  async getCourses(@Req() req: any) {
    return this.courseRepo.find({ where: { organizationId: req.tenantId } });
  }

  @Post('courses')
  @Roles('faculty', 'head', 'admin', 'superadmin', 'institution_owner')
  @ApiOperation({ summary: 'Create a new course' })
  async createCourse(@Req() req: any, @Body() body: any) {
    const course = this.courseRepo.create({
      organizationId: req.tenantId,
      name: body.course_name || body.name,
      code: body.course_code || body.code,
    });
    return this.courseRepo.save(course);
  }

  // ── Assessments ──────────────────────────────────────────────────────────────

  @Get('assessments')
  async getAssessments(@Req() req: any, @Query('faculty_id') facultyId?: string) {
    // Basic implementation: fetch all for tenant. Faculty filter can be complex (joining enrollments)
    return this.assessmentRepo.find({ where: { organizationId: req.tenantId }, relations: { course: true } });
  }

  @Post('assessments')
  @Roles('faculty', 'admin', 'institution_owner')
  async createAssessment(@Req() req: any, @Body() body: any) {
    const assessment = this.assessmentRepo.create({
      organizationId: req.tenantId,
      courseId: body.course_id,
      name: body.name,
      type: body.type,
      date: body.date,
      maxMarks: body.max_marks || 100,
      weightage: body.weightage || 100,
      examMode: body.exam_mode || 'offline',
    });
    return this.assessmentRepo.save(assessment);
  }

  // ── Marks ────────────────────────────────────────────────────────────────────

  @Get('marks')
  async getMarks(@Req() req: any, @Query('assessment_id') assessmentId?: string) {
    const where: any = { organizationId: req.tenantId };
    if (assessmentId) where.assessmentId = assessmentId;
    return this.marksRepo.find({ where, relations: { student: true } });
  }

  @Post('marks')
  @Roles('faculty', 'admin', 'institution_owner')
  async recordMarks(@Req() req: any, @Body() body: any) {
    const existing = await this.marksRepo.findOne({ where: { studentId: body.student_id, assessmentId: body.assessment_id } });
    if (existing) throw new BadRequestException('Marks already entered and locked for this student.');

    const entry = this.marksRepo.create({
      organizationId: req.tenantId,
      studentId: body.student_id,
      assessmentId: body.assessment_id,
      marksObtained: body.marks_obtained,
      remarks: body.remarks,
    });
    return this.marksRepo.save(entry);
  }

  // ── Submissions ──────────────────────────────────────────────────────────────

  @Get('submissions')
  async getSubmissions(@Req() req: any, @Headers('user-id') userId: string, @Headers('role') role: string) {
    if (role === 'student') return this.submissionRepo.find({ where: { organizationId: req.tenantId, studentId: userId } });
    return this.submissionRepo.find({ where: { organizationId: req.tenantId } });
  }

  @Post('submissions')
  async createSubmission(@Req() req: any, @Body() body: any, @Headers('user-id') userId: string) {
    let sub = await this.submissionRepo.findOne({ where: { studentId: userId, assessmentId: body.assessment_id } });
    if (sub) {
      sub.notes = body.notes || sub.notes;
      sub.submittedAt = new Date();
      return this.submissionRepo.save(sub);
    }
    sub = this.submissionRepo.create({
      organizationId: req.tenantId,
      studentId: userId,
      assessmentId: body.assessment_id,
      notes: body.notes || '',
    });
    return this.submissionRepo.save(sub);
  }

  // ── Attendance ────────────────────────────────────────────────────────────────

  @Get('attendance/today/:courseId')
  @Roles('faculty', 'institution_owner')
  async getTodayAttendance(@Req() req: any, @Param('courseId') courseId: string) {
    const enrollments = await this.enrollmentRepo.find({ where: { organizationId: req.tenantId, courseId, role: 'student' }, relations: { user: true } });
    const students = enrollments.map(e => ({ ...e.user, today_status: 'present' }));
    return { students, date: new Date().toISOString().split('T')[0] };
  }

  @Post('attendance')
  @Roles('faculty', 'institution_owner')
  async recordAttendance(@Req() req: any, @Body() body: any) {
    const { course_id, date, records } = body;
    const logs: any[] = [];
    for (const r of records) {
      const log = this.attendanceRepo.create({
        organizationId: req.tenantId,
        studentId: r.student_id,
        courseId: course_id,
        date: date,
        status: r.status,
      });
      logs.push((await this.attendanceRepo.save(log)) as any);
    }
    return { saved: logs.length, records: logs };
  }

  // ── Discussions (Forum) ────────────────────────────────────────────────────────

  @Get('discussions')
  async getDiscussions(@Req() req: any) {
    return this.postRepo.find({ where: { organizationId: req.tenantId }, relations: { author: true, replies: true } });
  }

  @Get('discussions/:postId')
  async getDiscussion(@Req() req: any, @Param('postId') postId: string) {
    return this.postRepo.findOne({ where: { id: postId, organizationId: req.tenantId }, relations: { author: true, replies: { author: true } } });
  }

  @Post('discussions')
  async createDiscussion(@Req() req: any, @Body() body: any, @Headers('user-id') userId: string) {
    const post = this.postRepo.create({
      organizationId: req.tenantId,
      authorId: userId,
      courseId: body.course_id,
      title: body.title,
      content: body.content,
      tag: body.tag,
    });
    return this.postRepo.save(post);
  }

  @Post('discussions/:postId/replies')
  async replyDiscussion(@Req() req: any, @Param('postId') postId: string, @Body() body: any, @Headers('user-id') userId: string) {
    const reply = this.replyRepo.create({
      organizationId: req.tenantId,
      postId: postId,
      authorId: userId,
      content: body.content,
    });
    return this.replyRepo.save(reply);
  }

  @Delete('discussions/:id')
  async deleteDiscussion(@Req() req: any, @Param('id') id: string) {
    await this.postRepo.delete({ id, organizationId: req.tenantId });
    return { success: true };
  }

  // ── Leaves ────────────────────────────────────────────────────────────────────

  @Get('leave')
  async getLeaves(@Req() req: any) {
    return this.leaveRepo.find({ where: { organizationId: req.tenantId }, relations: { user: true } });
  }

  @Post('leave')
  async createLeave(@Req() req: any, @Body() body: any, @Headers('user-id') userId: string) {
    const leave = this.leaveRepo.create({
      organizationId: req.tenantId,
      userId: userId,
      leaveType: body.leave_type,
      startDate: body.start_date,
      endDate: body.end_date,
      reason: body.reason,
    });
    return this.leaveRepo.save(leave);
  }

  @Patch('leave/:id/approve')
  @Roles('admin', 'institution_owner')
  async approveLeave(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    const leave = await this.leaveRepo.findOne({ where: { id, organizationId: req.tenantId } });
    if (!leave) throw new BadRequestException('Leave not found');
    leave.status = body.status; // 'approved' or 'rejected'
    return this.leaveRepo.save(leave);
  }

  // ── Events ────────────────────────────────────────────────────────────────────

  @Get('events')
  async getEvents(@Req() req: any) {
    return this.eventRepo.find({ where: { organizationId: req.tenantId } });
  }

  @Post('events')
  @Roles('admin', 'institution_owner')
  async createEvent(@Req() req: any, @Body() body: any) {
    const event = this.eventRepo.create({
      organizationId: req.tenantId,
      eventName: body.event_name,
      date: body.date,
      venue: body.venue,
      description: body.description,
    });
    return this.eventRepo.save(event);
  }

  @Delete('events/:id')
  @Roles('admin', 'institution_owner')
  async deleteEvent(@Req() req: any, @Param('id') id: string) {
    await this.eventRepo.delete({ id, organizationId: req.tenantId });
    return { success: true };
  }

  // ── Research ──────────────────────────────────────────────────────────────────

  @Get('research')
  async getResearch(@Req() req: any) {
    return this.researchRepo.find({ where: { organizationId: req.tenantId }, relations: { student: true } });
  }

  @Patch('research/:id/progress')
  async updateResearchProgress(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    const proj = await this.researchRepo.findOne({ where: { id, organizationId: req.tenantId } });
    if (!proj) throw new BadRequestException('Project not found');
    proj.submissionNotes = body.submission_notes;
    return this.researchRepo.save(proj);
  }

  // ── Frontend Specific Integrations (Student/Faculty Dashboards) ───────────────

  @Get('students/me')
  async getStudentMe(@Req() req: any, @Headers('user-id') userId: string) {
    return this.userRepo.findOne({ where: { id: userId } });
  }

  @Get('students/me/attendance')
  async getStudentAttendance(@Req() req: any, @Headers('user-id') userId: string) {
    return this.attendanceRepo.find({ where: { organizationId: req.tenantId, studentId: userId }, relations: { course: true } });
  }

  @Get('students/me/courses')
  async getStudentCourses(@Req() req: any, @Headers('user-id') userId: string) {
    return this.enrollmentRepo.find({ where: { organizationId: req.tenantId, userId: userId }, relations: { course: true } });
  }

  @Get('student-timetable')
  async getStudentTimetable() {
    return { grid: {}, days: ['MON', 'TUE', 'WED', 'THU', 'FRI'], times: ['09:00', '10:00', '11:00', '12:00'] };
  }

  @Post('students/enroll')
  async enrollStudent(@Req() req: any, @Body() body: any, @Headers('user-id') userId: string) {
    const e = this.enrollmentRepo.create({ organizationId: req.tenantId, userId: userId, courseId: body.course_id, role: 'student' });
    return this.enrollmentRepo.save(e);
  }

  @Get('faculty/me/timetable')
  async getFacultyTimetable() {
    return { grid: {}, days: ['MON', 'TUE', 'WED', 'THU', 'FRI'], times: ['09:00', '10:00', '11:00'] };
  }

  @Get('admin/users')
  async getAdminUsers(@Req() req: any) {
    // Return mock or empty list for now if we can't join memberships easily
    return [];
  }

  @Get('faculty/me/students')
  async getFacultyStudents(@Req() req: any, @Headers('user-id') userId: string) {
    const myCourses = await this.enrollmentRepo.find({ where: { organizationId: req.tenantId, userId: userId, role: 'faculty' } });
    const courseIds = myCourses.map(c => c.courseId);
    if (!courseIds.length) return [];
    
    // Find students enrolled in these courses (In production, use QueryBuilder)
    const enrollments = await this.enrollmentRepo.find({ where: { organizationId: req.tenantId, role: 'student' }, relations: { user: true, course: true } });
    return enrollments.filter(e => courseIds.includes(e.courseId)).map(e => ({ ...e.user, course_name: e.course.name }));
  }

  @Get('faculty/me/courses')
  async getFacultyMeCourses(@Req() req: any, @Headers('user-id') userId: string) {
    const enrolls = await this.enrollmentRepo.find({ where: { organizationId: req.tenantId, userId: userId, role: 'faculty' }, relations: { course: true } });
    return enrolls.map(e => e.course);
  }

  @Get('reports/overview')
  async getReportsOverview() {
    return { total_students: 100, average_attendance: 85, pass_rate: 90 };
  }

  @Get('reports/at-risk')
  async getReportsAtRisk() {
    return [];
  }

  @Get('resources')
  async getResources() {
    return [];
  }

  @Post('meetings')
  async createMeeting(@Req() req: any, @Body() body: any) {
    return { success: true };
  }
}
