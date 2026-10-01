import { Controller, ForbiddenException, Get, NotFoundException, Param, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/jwt-payload';
import { InMemoryDbService } from '../database/in-memory-db.service';
import { generatePdfBuffer } from '../common/pdf-generator';
import { ErrorCode, errorBody } from '../common/errors/error-codes';
import { summariseAttendance } from '../common/academic-rules';
import { campusScope, CampusScope } from '../core/scope';
import { isHod } from '../core/roles';
import { fullName } from '../core/util';
import { ReportsService } from './reports.service';
import { AcademicsService } from '../academics/academics.service';

const DIRECTOR = ['superadmin', 'admin', 'INSTITUTE_SUPER_ADMIN'] as const;
const HOD = ['head', 'DEPARTMENT_ADMIN_HOD'] as const;

function sendPdf(res: Response, name: string, pdf: Buffer) {
  res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${name}"`, 'Content-Length': String(pdf.length) });
  return res.end(pdf);
}

@ApiTags('Reports')
@ApiBearerAuth()
@Controller()
export class ReportsController {
  constructor(private readonly reports: ReportsService, private readonly academics: AcademicsService, private readonly db: InMemoryDbService) {}

  private s(u: AuthenticatedUser) {
    return campusScope(this.db, u);
  }

  @Get('dashboard/faculty')
  @Roles('faculty', ...HOD)
  faculty(@CurrentUser() u: AuthenticatedUser) { return this.reports.faculty(this.s(u)); }

  @Get('dashboard/hod')
  @Roles(...HOD)
  hod(@CurrentUser() u: AuthenticatedUser) { return this.reports.hod(this.s(u)); }

  @Get('dashboard/director')
  @Roles(...DIRECTOR, 'spoc')
  director(@CurrentUser() u: AuthenticatedUser) { return this.reports.director(this.s(u)); }

  @Get('reports/department/:id')
  @Roles(...HOD, ...DIRECTOR)
  department(@CurrentUser() u: AuthenticatedUser, @Param('id') id: string) { return this.reports.department(this.s(u), id); }

  @Get('reports/at-risk')
  @Roles('faculty', ...HOD, ...DIRECTOR)
  atRisk(@CurrentUser() u: AuthenticatedUser, @Query('department_id') departmentId?: string) {
    const scope = this.s(u);
    if (scope.role === 'faculty') return this.reports.faculty(scope).at_risk;
    return this.reports.atRisk(scope, departmentId);
  }

  @Get('reports/students')
  @Roles(...HOD, ...DIRECTOR)
  standing(@CurrentUser() u: AuthenticatedUser, @Query('department_id') departmentId?: string) {
    const scope = this.s(u);
    return this.reports.studentStanding(scope, isHod(scope.role) ? scope.departmentId! : departmentId);
  }

  @Get('reports/department/:id/pdf')
  @Roles(...HOD, ...DIRECTOR)
  departmentPdf(@CurrentUser() u: AuthenticatedUser, @Param('id') id: string, @Res() res: Response) {
    const r = this.reports.department(this.s(u), id);
    const rows = r.attendance_by_course.map((a) => {
      const res2 = r.results_by_course.find((x) => x.label === a.label);
      return [a.label, a.course_name ?? '-', a.percentage === null ? 'No classes' : `${a.percentage}%`, res2?.average_pct == null ? '-' : `${res2.average_pct}%`, res2?.pass_rate == null ? '-' : `${res2.pass_rate}%`];
    });
    const pdf = generatePdfBuffer(
      `${r.department.department_name} - department report`,
      `Students ${r.kpis.students} | Faculty ${r.kpis.faculty} | Avg attendance ${r.kpis.average_attendance ?? '-'}% | At risk ${r.kpis.at_risk}`,
      ['Course / section', 'Course', 'Attendance', 'Avg marks', 'Pass rate'],
      rows.length ? rows : [['-', 'No course sections', '-', '-', '-']],
    );
    return sendPdf(res, `${r.department.department_code}-report.pdf`, pdf);
  }

  @Get('reports/at-risk/pdf')
  @Roles(...HOD, ...DIRECTOR)
  atRiskPdf(@CurrentUser() u: AuthenticatedUser, @Query('department_id') departmentId: string, @Res() res: Response) {
    const list = this.reports.atRisk(this.s(u), departmentId);
    const pdf = generatePdfBuffer(
      'At-risk students',
      `${list.length} student(s) at risk`,
      ['Roll no', 'Name', 'Dept', 'Attendance', 'CGPA', 'Reasons'],
      list.length ? list.map((s) => [s.roll_no, s.name, s.department_code ?? '-', s.attendance_pct === null ? '-' : `${s.attendance_pct}%`, s.cgpa ?? '-', s.reasons.join('; ')]) : [['-', 'No students at risk', '-', '-', '-', '-']],
    );
    return sendPdf(res, 'at-risk-students.pdf', pdf);
  }

  @Get('reports/student-pdf')
  @Roles('student')
  ownReport(@CurrentUser() u: AuthenticatedUser, @Res() res: Response) {
    const scope = this.s(u);
    return this.studentPdf(scope, scope.userId, res);
  }

  @Get('reports/student-pdf/:studentId')
  @Roles('faculty', ...HOD, ...DIRECTOR)
  studentReport(@CurrentUser() u: AuthenticatedUser, @Param('studentId') studentId: string, @Res() res: Response) {
    return this.studentPdf(this.s(u), studentId, res);
  }

  private studentPdf(scope: CampusScope, studentId: string, res: Response) {
    const st = this.db.students.find((s) => s.user_id === studentId && s.college_id === scope.collegeId);
    if (!st) throw new NotFoundException(errorBody(ErrorCode.RESOURCE_NOT_FOUND, 'Student not found'));
    if (isHod(scope.role) && st.department_id !== scope.departmentId) throw new NotFoundException(errorBody(ErrorCode.RESOURCE_NOT_FOUND, 'Student not found'));
    if (scope.role === 'faculty') {
      const mine = new Set(this.db.course_sections.filter((s) => s.faculty_id === scope.userId).map((s) => s.course_section_id));
      if (!this.db.enrollment.some((e) => e.student_id === studentId && mine.has(e.course_section_id))) throw new ForbiddenException(errorBody(ErrorCode.INSUFFICIENT_ROLE, 'Not one of your students.'));
    }
    const results = this.academics.studentResults({ ...scope, userId: studentId } as CampusScope);
    const rows = this.db.enrollment.filter((e) => e.student_id === studentId && e.status === 'active').map((e) => {
      const c = this.db.courses.find((x) => x.course_id === e.course_id);
      const att = summariseAttendance(this.db.attendance_log.filter((a) => a.enrollment_id === e.enrollment_id));
      const r = results.courses.find((x) => x.course_id === e.course_id);
      return [c?.course_code ?? '-', c?.course_name ?? '-', String(c?.credits ?? '-'), att.total ? `${att.percentage}%` : 'No classes', r?.percentage == null ? '-' : `${r.percentage}% (${r.grade})`];
    });
    const college = this.db.colleges.find((c) => c.college_id === scope.collegeId);
    const pdf = generatePdfBuffer(
      `${college?.name ?? ''} - academic progress report`,
      `${fullName(st)} | ${st.roll_no ?? '-'} | ${st.branch ?? ''} ${st.batch ?? ''} section ${st.section ?? '-'} | CGPA ${st.cgpa ?? 'Not available'}`,
      ['Code', 'Course', 'Credits', 'Attendance', 'Marks so far'],
      rows.length ? rows : [['-', 'No enrolled courses', '-', '-', '-']],
    );
    return sendPdf(res, `progress-report-${st.roll_no ?? 'student'}.pdf`.replace(/[^A-Za-z0-9.\-]/g, '_'), pdf);
  }
}
