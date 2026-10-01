import { ForbiddenException, Injectable } from '@nestjs/common';
import { InMemoryDbService } from '../database/in-memory-db.service';
import { ErrorCode, errorBody } from '../common/errors/error-codes';
import { summariseAttendance } from '../common/academic-rules';
import { CampusScope, assertDepartment, inCollege } from '../core/scope';
import { isDirector, isHod } from '../core/roles';
import { fullName, round1, today } from '../core/util';
import { AcademicsService } from '../academics/academics.service';
import { FeesService } from '../fees/fees.service';

const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const AT_RISK_CGPA = 6.0;

/** Dashboards and reports, all computed from the live records of one college. */
@Injectable()
export class ReportsService {
  constructor(private readonly db: InMemoryDbService, private readonly academics: AcademicsService, private readonly fees: FeesService) {}

  private studentsOf(scope: CampusScope, departmentId?: string) {
    return inCollege(scope, this.db.students).filter((s) => (!departmentId || s.department_id === departmentId) && this.db.users.find((u) => u.user_id === s.user_id)?.status !== 'inactive');
  }

  /** Per-student attendance and results, and why they are at risk. */
  studentStanding(scope: CampusScope, departmentId?: string) {
    const min = this.academics.attendanceMin(scope.collegeId);
    const grading = this.academics.grading(scope.collegeId);
    return this.studentsOf(scope, departmentId).map((st) => {
      const att = summariseAttendance(this.db.attendance_log.filter((a) => a.student_id === st.user_id));
      const marks = this.db.marks_entry.filter((m) => m.student_id === st.user_id && m.published);
      const obtained = marks.reduce((s, m) => s + m.marks_obtained, 0);
      const max = marks.reduce((s, m) => s + m.max_marks, 0);
      const marksPct = max ? round1((obtained / max) * 100) : null;
      const reasons: string[] = [];
      if (att.total > 0 && att.percentage < min) reasons.push(`Attendance ${att.percentage}% (minimum ${min}%)`);
      if (typeof st.cgpa === 'number' && st.cgpa < AT_RISK_CGPA) reasons.push(`CGPA ${st.cgpa}`);
      if (marksPct !== null && marksPct < grading.pass_pct) reasons.push(`Marks ${marksPct}% (pass ${grading.pass_pct}%)`);
      const dept = this.db.departments.find((d) => d.department_id === st.department_id);
      return { student_id: st.user_id, roll_no: st.roll_no, name: fullName(st), department_code: dept?.department_code, section: st.section, cgpa: st.cgpa, attendance_pct: att.total ? att.percentage : null, marks_pct: marksPct, at_risk: reasons.length > 0, reasons };
    });
  }

  atRisk(scope: CampusScope, departmentId?: string) {
    if (isHod(scope.role)) departmentId = scope.departmentId!;
    else if (departmentId) assertDepartment(scope, departmentId);
    return this.studentStanding(scope, departmentId).filter((s) => s.at_risk);
  }

  private attendanceByCourse(scope: CampusScope, sections: any[]) {
    return sections.map((cs) => {
      const att = summariseAttendance(this.db.attendance_log.filter((a) => a.course_section_id === cs.course_section_id));
      const course = this.db.courses.find((c) => c.course_id === cs.course_id);
      return { course_section_id: cs.course_section_id, label: `${course?.course_code} ${cs.section}`, course_code: course?.course_code, course_name: course?.course_name, section: cs.section, percentage: att.total ? att.percentage : null, classes: att.total };
    });
  }

  // ── Faculty ───────────────────────────────────────────────────────────────

  faculty(scope: CampusScope) {
    const sections = inCollege(scope, this.db.course_sections).filter((s) => s.faculty_id === scope.userId);
    const sectionIds = new Set(sections.map((s) => s.course_section_id));
    const day = DAY_NAMES[new Date().getDay()];
    const todayClasses = inCollege(scope, this.db.timetable).filter((t) => t.faculty_id === scope.userId && t.day === day).sort((a, b) => a.time.localeCompare(b.time));
    const marked = new Set(this.db.attendance_log.filter((a) => sectionIds.has(a.course_section_id) && a.date === today()).map((a) => a.course_section_id));
    const min = this.academics.attendanceMin(scope.collegeId);
    const myStudents = new Set(this.db.enrollment.filter((e) => sectionIds.has(e.course_section_id) && e.status === 'active').map((e) => e.student_id));
    const standing = this.studentStanding(scope).filter((s) => myStudents.has(s.student_id));
    return {
      sections: sections.map((s) => this.academics.sectionView(s)),
      today: todayClasses.map((t) => ({ ...t, attendance_marked: marked.has(t.course_section_id) })),
      pending_corrections: inCollege(scope, this.db.attendance_requests).filter((r) => r.faculty_id === scope.userId && r.status === 'pending').length,
      students: myStudents.size,
      at_risk: standing.filter((s) => s.at_risk),
      attendance_min_pct: min,
      attendance_by_section: this.attendanceByCourse(scope, sections),
      upcoming_assessments: inCollege(scope, this.db.assessments).filter((a) => sectionIds.has(a.course_section_id) && a.date >= today()).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5),
      unpublished_assessments: inCollege(scope, this.db.assessments).filter((a) => sectionIds.has(a.course_section_id) && a.status === 'draft' && a.date <= today()).length,
      my_leave: inCollege(scope, this.db.leave_applications).filter((l) => l.applicant_id === scope.userId).sort((a, b) => b.applied_on.localeCompare(a.applied_on)).slice(0, 3),
    };
  }

  // ── HOD ───────────────────────────────────────────────────────────────────

  department(scope: CampusScope, departmentId: string) {
    const dept = this.academics.departmentOf(scope, departmentId);
    const students = this.studentsOf(scope, departmentId);
    const faculty = inCollege(scope, this.db.users).filter((u) => u.department_id === departmentId && ['faculty', 'head', 'DEPARTMENT_ADMIN_HOD'].includes(u.role) && u.status !== 'inactive');
    const sections = inCollege(scope, this.db.course_sections).filter((s) => s.department_id === departmentId);
    const standing = this.studentStanding(scope, departmentId);
    const withAtt = standing.filter((s) => s.attendance_pct !== null);
    const results = this.academics.resultsSummary(scope, departmentId);
    const withResults = results.filter((r) => r.average_pct !== null);
    return {
      department: dept,
      kpis: {
        students: students.length,
        faculty: faculty.length,
        courses: inCollege(scope, this.db.courses).filter((c) => c.department_id === departmentId).length,
        sections: sections.length,
        average_attendance: withAtt.length ? round1(withAtt.reduce((s, x) => s + (x.attendance_pct as number), 0) / withAtt.length) : null,
        at_risk: standing.filter((s) => s.at_risk).length,
        average_marks: withResults.length ? round1(withResults.reduce((s, r) => s + (r.average_pct as number), 0) / withResults.length) : null,
      },
      pending: {
        leave: inCollege(scope, this.db.leave_applications).filter((l) => l.department_id === departmentId && l.status === 'pending' && l.applicant_role !== 'hod').length,
        bookings: inCollege(scope, this.db.resource_bookings).filter((b) => b.department_id === departmentId && b.status === 'pending').length,
        corrections: inCollege(scope, this.db.attendance_requests).filter((r) => r.department_id === departmentId && r.status === 'pending').length,
      },
      attendance_by_course: this.attendanceByCourse(scope, sections),
      results_by_course: results.map((r) => ({ label: `${r.course_code} ${r.section}`, course_code: r.course_code, section: r.section, average_pct: r.average_pct, pass_rate: r.pass_rate, distribution: r.distribution })),
      at_risk: standing.filter((s) => s.at_risk).slice(0, 10),
      attendance_min_pct: this.academics.attendanceMin(scope.collegeId),
    };
  }

  hod(scope: CampusScope) {
    if (!scope.departmentId) throw new ForbiddenException(errorBody(ErrorCode.INSUFFICIENT_ROLE, 'Your account is not linked to a department.'));
    return this.department(scope, scope.departmentId);
  }

  // ── Director ──────────────────────────────────────────────────────────────

  director(scope: CampusScope) {
    const departments = inCollege(scope, this.db.departments).map((d) => {
      const r = this.department(scope, d.department_id);
      const fee = this.fees.summary(scope).by_department.find((x) => x.department_id === d.department_id);
      return { department_id: d.department_id, department_code: d.department_code, department_name: d.department_name, ...r.kpis, pending_leave: r.pending.leave, fee_collection_rate: fee && fee.billed ? round1((fee.collected / fee.billed) * 100) : null };
    });
    const standing = this.studentStanding(scope);
    const withAtt = standing.filter((s) => s.attendance_pct !== null);
    const feesEnabled = this.db.subscriptions.find((s) => s.college_id === scope.collegeId)?.modules?.includes('fees') ?? true;
    return {
      kpis: {
        students: standing.length,
        faculty: inCollege(scope, this.db.users).filter((u) => ['faculty', 'head', 'DEPARTMENT_ADMIN_HOD'].includes(u.role) && u.status !== 'inactive').length,
        departments: departments.length,
        average_attendance: withAtt.length ? round1(withAtt.reduce((s, x) => s + (x.attendance_pct as number), 0) / withAtt.length) : null,
        at_risk: standing.filter((s) => s.at_risk).length,
      },
      departments,
      fees: feesEnabled ? this.fees.summary(scope) : null,
      pending: {
        hod_leave: inCollege(scope, this.db.leave_applications).filter((l) => l.applicant_role === 'hod' && l.status === 'pending').length,
        bookings: inCollege(scope, this.db.resource_bookings).filter((b) => b.status === 'pending').length,
      },
      upcoming_events: inCollege(scope, this.db.events).filter((e) => e.date >= today()).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5),
    };
  }

  assertStaffReport(scope: CampusScope) {
    if (!isDirector(scope.role) && !isHod(scope.role) && scope.role !== 'spoc') throw new ForbiddenException(errorBody(ErrorCode.INSUFFICIENT_ROLE, 'Not allowed.'));
  }
}
