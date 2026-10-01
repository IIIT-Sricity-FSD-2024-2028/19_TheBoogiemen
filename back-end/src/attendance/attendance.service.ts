import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InMemoryDbService } from '../database/in-memory-db.service';
import { ErrorCode, errorBody } from '../common/errors/error-codes';
import { normalizeAttendanceStatus, summariseAttendance } from '../common/academic-rules';
import { CampusScope, findInCollege, inCollege } from '../core/scope';
import { isDirector, isHod } from '../core/roles';
import { fullName, newId, nowIso, today } from '../core/util';
import { AcademicsService } from '../academics/academics.service';

const bad = (msg: string) => new BadRequestException(errorBody(ErrorCode.BUSINESS_RULE_VIOLATION, msg));
const EDIT_WINDOW_DAYS = 14;
const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

@Injectable()
export class AttendanceService {
  constructor(private readonly db: InMemoryDbService, private readonly academics: AcademicsService) {}

  private checkDate(date: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || '')) || Number.isNaN(Date.parse(date))) throw bad('Choose a valid date.');
    if (date > today()) throw bad('Attendance cannot be marked for a future date.');
    const age = (Date.parse(today()) - Date.parse(date)) / 86400000;
    if (age > EDIT_WINDOW_DAYS) throw bad(`Attendance can only be marked or changed within ${EDIT_WINDOW_DAYS} days.`);
  }

  /** Roster for one class meeting, with any status already recorded. */
  session(scope: CampusScope, courseSectionId: string, date: string) {
    const cs = this.academics.section(scope, courseSectionId);
    this.academics.assertCanView(scope, cs);
    const day = DAY_NAMES[new Date(`${date}T00:00:00Z`).getUTCDay()];
    const slots = this.db.timetable.filter((t) => t.course_section_id === cs.course_section_id && t.day === day);
    const records = this.db.attendance_log.filter((a) => a.course_section_id === cs.course_section_id && a.date === date);
    return {
      section: this.academics.sectionView(cs),
      date,
      scheduled: slots.map((s) => ({ time: s.time, type: s.type, room: s.room })),
      editable: cs.faculty_id === scope.userId && date <= today() && (Date.parse(today()) - Date.parse(date)) / 86400000 <= EDIT_WINDOW_DAYS,
      students: this.academics.roster(scope, cs.course_section_id).map((r) => {
        const rec = records.find((a) => a.student_id === r.student_id);
        return { ...r, status: rec?.status ?? null, from_leave: rec?.source === 'leave' };
      }),
    };
  }

  mark(scope: CampusScope, body: { course_section_id: string; date: string; records: { student_id: string; status: string }[] }) {
    const cs = this.academics.section(scope, body.course_section_id);
    this.academics.assertTeaches(scope, cs);
    this.checkDate(body.date);
    if (!Array.isArray(body.records) || !body.records.length) throw bad('Mark at least one student.');
    const enrollments = this.db.enrollment.filter((e) => e.course_section_id === cs.course_section_id && e.status === 'active');
    const day = DAY_NAMES[new Date(`${body.date}T00:00:00Z`).getUTCDay()];
    const time = this.db.timetable.find((t) => t.course_section_id === cs.course_section_id && t.day === day)?.time ?? null;
    let saved = 0;
    for (const r of body.records) {
      const enr = enrollments.find((e) => e.student_id === r.student_id);
      if (!enr) throw bad('A student in the list is not enrolled in this section.');
      if (!['present', 'absent'].includes(r.status)) throw bad('Status must be present or absent.');
      const existing = this.db.attendance_log.find((a) => a.enrollment_id === enr.enrollment_id && a.date === body.date);
      if (existing) {
        // Approved leave stays excused unless the student actually attended.
        if (existing.source === 'leave' && r.status === 'absent') continue;
        existing.status = r.status;
        existing.marked_by = scope.userId;
        existing.updated_at = nowIso();
        if (r.status === 'present') delete existing.source;
      } else {
        this.db.attendance_log.push({ log_id: newId('att'), college_id: scope.collegeId, student_id: r.student_id, course_id: cs.course_id, course_section_id: cs.course_section_id, enrollment_id: enr.enrollment_id, date: body.date, time, status: r.status, marked_by: scope.userId, updated_at: nowIso() });
      }
      saved++;
    }
    this.db.persist();
    return { saved, session: this.session(scope, cs.course_section_id, body.date) };
  }

  /** The student's own attendance, per enrolled section. */
  mine(scope: CampusScope) {
    const min = this.academics.attendanceMin(scope.collegeId);
    const enrollments = this.db.enrollment.filter((e) => e.student_id === scope.userId && e.status === 'active');
    const records = this.db.attendance_log.filter((a) => a.student_id === scope.userId);
    const summary = enrollments.map((e) => {
      const c = this.db.courses.find((x) => x.course_id === e.course_id);
      const stats = summariseAttendance(records.filter((r) => r.enrollment_id === e.enrollment_id));
      return { enrollment_id: e.enrollment_id, course_id: e.course_id, course_code: c?.course_code, course_name: c?.course_name, section: e.section, section_id: e.course_section_id, course_section_id: e.course_section_id, semester: c?.semester, ...stats };
    });
    return {
      attendance_min_pct: min,
      summary,
      records: records
        .map((r) => {
          const c = this.db.courses.find((x) => x.course_id === r.course_id);
          return { log_id: r.log_id, date: r.date, time: r.time, status: normalizeAttendanceStatus(r.status), enrollment_id: r.enrollment_id, course_section_id: r.course_section_id, course_id: r.course_id, course_code: c?.course_code, course_name: c?.course_name, from_leave: r.source === 'leave' };
        })
        .sort((a, b) => String(b.date).localeCompare(String(a.date))),
    };
  }

  // ── Corrections: student -> course faculty ────────────────────────────────

  corrections(scope: CampusScope, q: { status?: string }) {
    let rows = inCollege(scope, this.db.attendance_requests);
    if (scope.role === 'student') rows = rows.filter((r) => r.student_id === scope.userId);
    else if (scope.role === 'faculty') rows = rows.filter((r) => r.faculty_id === scope.userId);
    else if (isHod(scope.role)) rows = rows.filter((r) => r.department_id === scope.departmentId || r.faculty_id === scope.userId);
    else if (!isDirector(scope.role)) throw new ForbiddenException(errorBody(ErrorCode.INSUFFICIENT_ROLE, 'Not allowed.'));
    if (q.status) rows = rows.filter((r) => r.status === q.status);
    return rows
      .map((r) => ({ ...r, faculty_name: fullName(this.db.users.find((u) => u.user_id === r.faculty_id)), roll_no: this.db.students.find((s) => s.user_id === r.student_id)?.roll_no }))
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  }

  requestCorrection(scope: CampusScope, body: { course_section_id: string; date: string; reason: string }) {
    const enr = this.db.enrollment.find((e) => e.student_id === scope.userId && e.course_section_id === body.course_section_id && e.status === 'active');
    if (!enr) throw bad('You can only request corrections for your own courses.');
    if (!body.date || body.date > today()) throw bad('Choose a past class date.');
    const reason = String(body.reason || '').trim();
    if (reason.length < 10) throw bad('Explain the reason in at least 10 characters.');
    const record = this.db.attendance_log.find((a) => a.enrollment_id === enr.enrollment_id && a.date === body.date);
    if (!record) throw bad('No class was recorded for you on that date.');
    if (normalizeAttendanceStatus(record.status) !== 'absent') throw bad('You are not marked absent for that class.');
    if (this.db.attendance_requests.some((r) => r.student_id === scope.userId && r.course_section_id === enr.course_section_id && r.date === body.date && r.status === 'pending')) {
      throw bad('You already have a pending request for that class.');
    }
    const cs = this.db.course_sections.find((s) => s.course_section_id === enr.course_section_id);
    const course = this.db.courses.find((c) => c.course_id === enr.course_id);
    const row = { request_id: newId('acr'), college_id: scope.collegeId, department_id: enr.department_id, student_id: scope.userId, student_name: fullName(scope.user), course_id: enr.course_id, course_code: course?.course_code, course_section_id: enr.course_section_id, faculty_id: cs?.faculty_id, date: body.date, reason: reason.slice(0, 500), status: 'pending', decision_note: null, decided_at: null, created_at: nowIso() };
    this.db.attendance_requests.push(row);
    return row;
  }

  decide(scope: CampusScope, id: string, body: { decision: 'accept' | 'reject'; note?: string }) {
    const r = findInCollege(scope, this.db.attendance_requests, (x) => x.request_id === id, 'Correction request');
    if (r.faculty_id !== scope.userId) throw new ForbiddenException(errorBody(ErrorCode.INSUFFICIENT_ROLE, 'Only the course teacher can decide this request.'));
    if (r.status !== 'pending') throw bad('This request has already been decided.');
    if (!['accept', 'reject'].includes(body?.decision)) throw bad('Decision must be accept or reject.');
    if (body.decision === 'reject' && !String(body.note || '').trim()) throw bad('Give a reason when rejecting.');
    r.status = body.decision === 'accept' ? 'accepted' : 'rejected';
    r.decision_note = String(body.note || '').trim() || null;
    r.decided_at = nowIso();
    r.decided_by = scope.userId;
    if (r.status === 'accepted') {
      const rec = this.db.attendance_log.find((a) => a.student_id === r.student_id && a.course_section_id === r.course_section_id && a.date === r.date);
      if (rec) {
        rec.status = 'present';
        rec.corrected_by_request = r.request_id;
        rec.updated_at = nowIso();
      }
    }
    this.db.persist();
    return r;
  }
}
