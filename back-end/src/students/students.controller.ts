import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/jwt-payload';
import { InMemoryDbService } from '../database/in-memory-db.service';
import { summariseAttendance } from '../common/academic-rules';
import { campusScope } from '../core/scope';
import { fullName } from '../core/util';
import { AttendanceService } from '../attendance/attendance.service';
import { AcademicsService } from '../academics/academics.service';

/** The signed-in student's own data (read-only views over the academic records). */
@ApiTags('Students')
@ApiBearerAuth()
@Controller()
export class StudentsController {
  constructor(private readonly db: InMemoryDbService, private readonly attendance: AttendanceService, private readonly academics: AcademicsService) {}

  @Get('students/me')
  @Roles('student')
  profile(@CurrentUser() u: AuthenticatedUser) {
    const scope = campusScope(this.db, u);
    const st = this.db.students.find((s) => s.user_id === scope.userId);
    const settings = this.db.college_settings.find((s) => s.college_id === scope.collegeId);
    const dept = this.db.departments.find((d) => d.department_id === st?.department_id);
    const programme = settings?.programmes?.find((p: any) => p.programme_id === st?.programme_id);
    const fields = (settings?.custom_fields || []).filter((f: any) => f.applies_to === 'student');
    return {
      ...st,
      department_name: dept?.department_name ?? null,
      department_code: dept?.department_code ?? null,
      programme: programme?.name ?? null,
      college: this.db.colleges.find((c) => c.college_id === scope.collegeId)?.name ?? null,
      custom_fields: fields.map((f: any) => ({ key: f.key, label: f.label, value: st?.custom_fields?.[f.key] ?? null })),
    };
  }

  @Get('students/me/courses')
  @Roles('student')
  courses(@CurrentUser() u: AuthenticatedUser) {
    const scope = campusScope(this.db, u);
    return this.db.enrollment
      .filter((e) => e.student_id === scope.userId && e.status === 'active')
      .map((e) => {
        const course = this.db.courses.find((c) => c.course_id === e.course_id);
        const cs = this.db.course_sections.find((s) => s.course_section_id === e.course_section_id);
        const att = summariseAttendance(this.db.attendance_log.filter((a) => a.enrollment_id === e.enrollment_id));
        const syllabus = this.db.syllabus_progress.find((s) => s.course_section_id === e.course_section_id);
        return {
          ...course,
          faculty_id: cs?.faculty_id ?? null,
          faculty_name: cs ? fullName(this.db.users.find((x) => x.user_id === cs.faculty_id)) || null : null,
          enrollment_id: e.enrollment_id,
          enrollment_status: e.status,
          section: e.section,
          section_id: e.course_section_id,
          course_section_id: e.course_section_id,
          attendance_pct: att.total ? att.percentage : null,
          attendance_summary: att,
          syllabus_progress: syllabus?.progress ?? null,
          modules: syllabus?.modules ?? [],
        };
      });
  }

  @Get('students/me/attendance')
  @Roles('student')
  attendanceMine(@CurrentUser() u: AuthenticatedUser) {
    return this.attendance.mine(campusScope(this.db, u));
  }

  @Get('students/me/marks')
  @Roles('student')
  marks(@CurrentUser() u: AuthenticatedUser) {
    return this.academics.studentResults(campusScope(this.db, u)).assessments;
  }

  @Get('student-timetable')
  @Roles('student')
  timetable(@CurrentUser() u: AuthenticatedUser) {
    const slots = this.academics.timetable(campusScope(this.db, u), {});
    const grid: Record<string, Record<string, any>> = {};
    for (const s of slots) {
      grid[s.day] = grid[s.day] || {};
      const cur = grid[s.day][s.time];
      grid[s.day][s.time] = cur ? [...(Array.isArray(cur) ? cur : [cur]), s] : s;
    }
    const times = [...new Set(slots.map((s) => s.time))].sort();
    return { grid, days: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].filter((d) => d !== 'SAT' || grid.SAT), times };
  }
}
