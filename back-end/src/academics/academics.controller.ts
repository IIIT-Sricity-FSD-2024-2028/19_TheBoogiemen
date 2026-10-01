import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/jwt-payload';
import { InMemoryDbService } from '../database/in-memory-db.service';
import { campusScope } from '../core/scope';
import { AcademicsService } from './academics.service';

const MANAGERS = ['head', 'DEPARTMENT_ADMIN_HOD', 'superadmin', 'admin', 'INSTITUTE_SUPER_ADMIN', 'spoc'] as const;
const STAFF = ['faculty', ...MANAGERS] as const;

@ApiTags('Academics')
@ApiBearerAuth()
@Controller('academics')
export class AcademicsController {
  constructor(private readonly academics: AcademicsService, private readonly db: InMemoryDbService) {}

  private s(u: AuthenticatedUser) {
    return campusScope(this.db, u);
  }

  @Get('courses')
  @Roles(...STAFF)
  courses(@CurrentUser() u: AuthenticatedUser) {
    return this.academics.courses(this.s(u));
  }

  @Post('courses')
  @Roles(...MANAGERS)
  createCourse(@CurrentUser() u: AuthenticatedUser, @Body() body: any) {
    return this.academics.createCourse(this.s(u), body);
  }

  @Get('sections')
  @Roles(...STAFF)
  sections(@CurrentUser() u: AuthenticatedUser, @Query() q: any) {
    return this.academics.sections(this.s(u), q);
  }

  @Post('sections')
  @Roles(...MANAGERS)
  createSection(@CurrentUser() u: AuthenticatedUser, @Body() body: any) {
    return this.academics.createSection(this.s(u), body);
  }

  @Patch('sections/:id')
  @Roles(...MANAGERS)
  assignTeacher(@CurrentUser() u: AuthenticatedUser, @Param('id') id: string, @Body() body: { faculty_id: string }) {
    return this.academics.assignTeacher(this.s(u), id, body?.faculty_id);
  }

  @Get('sections/:id/students')
  @Roles(...STAFF)
  roster(@CurrentUser() u: AuthenticatedUser, @Param('id') id: string) {
    return this.academics.roster(this.s(u), id);
  }

  @Post('sections/:id/enroll')
  @Roles(...MANAGERS)
  @HttpCode(200)
  enroll(@CurrentUser() u: AuthenticatedUser, @Param('id') id: string, @Body() body: { student_ids: string[] }) {
    return this.academics.enroll(this.s(u), id, body?.student_ids);
  }

  @Delete('enrollments/:id')
  @Roles(...MANAGERS)
  unenroll(@CurrentUser() u: AuthenticatedUser, @Param('id') id: string) {
    return this.academics.unenroll(this.s(u), id);
  }

  @Put('sections/:id/syllabus')
  @Roles('faculty', 'head', 'DEPARTMENT_ADMIN_HOD')
  syllabus(@CurrentUser() u: AuthenticatedUser, @Param('id') id: string, @Body() body: any) {
    return this.academics.updateSyllabus(this.s(u), id, body);
  }

  @Get('timetable')
  timetable(@CurrentUser() u: AuthenticatedUser, @Query() q: any) {
    return this.academics.timetable(this.s(u), q);
  }

  @Post('timetable')
  @Roles(...MANAGERS)
  addSlot(@CurrentUser() u: AuthenticatedUser, @Body() body: any) {
    return this.academics.addSlot(this.s(u), body);
  }

  @Delete('timetable/:id')
  @Roles(...MANAGERS)
  removeSlot(@CurrentUser() u: AuthenticatedUser, @Param('id') id: string) {
    return this.academics.removeSlot(this.s(u), id);
  }

  @Get('assessments')
  @Roles(...STAFF)
  assessments(@CurrentUser() u: AuthenticatedUser, @Query() q: any) {
    return this.academics.assessments(this.s(u), q);
  }

  @Post('assessments')
  @Roles('faculty', 'head', 'DEPARTMENT_ADMIN_HOD')
  createAssessment(@CurrentUser() u: AuthenticatedUser, @Body() body: any) {
    return this.academics.createAssessment(this.s(u), body);
  }

  @Patch('assessments/:id')
  @Roles('faculty', 'head', 'DEPARTMENT_ADMIN_HOD')
  updateAssessment(@CurrentUser() u: AuthenticatedUser, @Param('id') id: string, @Body() body: any) {
    return this.academics.updateAssessment(this.s(u), id, body);
  }

  @Delete('assessments/:id')
  @Roles('faculty', 'head', 'DEPARTMENT_ADMIN_HOD')
  deleteAssessment(@CurrentUser() u: AuthenticatedUser, @Param('id') id: string) {
    return this.academics.deleteAssessment(this.s(u), id);
  }

  @Get('assessments/:id/marks')
  @Roles(...STAFF)
  marks(@CurrentUser() u: AuthenticatedUser, @Param('id') id: string) {
    return this.academics.marksSheet(this.s(u), id);
  }

  @Put('assessments/:id/marks')
  @Roles('faculty', 'head', 'DEPARTMENT_ADMIN_HOD')
  saveMarks(@CurrentUser() u: AuthenticatedUser, @Param('id') id: string, @Body() body: { entries: any[] }) {
    return this.academics.saveMarks(this.s(u), id, body?.entries);
  }

  @Post('assessments/:id/publish')
  @Roles('faculty', 'head', 'DEPARTMENT_ADMIN_HOD')
  @HttpCode(200)
  publish(@CurrentUser() u: AuthenticatedUser, @Param('id') id: string) {
    return this.academics.publish(this.s(u), id);
  }

  @Get('results/me')
  @Roles('student')
  myResults(@CurrentUser() u: AuthenticatedUser) {
    return this.academics.studentResults(this.s(u));
  }

  @Get('results/summary')
  @Roles(...MANAGERS)
  summary(@CurrentUser() u: AuthenticatedUser, @Query('department_id') departmentId?: string) {
    return this.academics.resultsSummary(this.s(u), departmentId);
  }
}
