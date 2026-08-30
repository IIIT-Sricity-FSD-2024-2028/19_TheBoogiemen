import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { InMemoryDbService } from '../database/in-memory-db.service';
import {
  ATTENDANCE_STATUS,
  isAtRisk,
  normalizeAttendanceStatus,
  riskReasons,
  summariseAttendance,
} from '../common/academic-rules';
import { ErrorCode, errorBody } from '../common/errors/error-codes';
import {
  isSameCollege,
  scopeToCollege,
  writeCollegeId,
} from '../common/tenancy/scope-to-college';

@Injectable()
export class FacultyService {
  constructor(private db: InMemoryDbService) {}

  async getProfile(userId: string) {
    const faculty = this.db.faculty.find((f) => f.user_id === userId);
    if (!faculty)
      return {
        user_id: userId,
        first_name: 'Faculty',
        last_name: '',
        designation: 'Professor',
      };
    const dept = this.db.departments.find(
      (d) => d.department_id === faculty.department_id,
    );
    return {
      ...faculty,
      department_name: dept?.department_name || 'Computer Science',
    };
  }

  async getMyCourses(userId: string) {
    return this.db.courses.filter((c) => c.faculty_id === userId);
  }

  async getFacultyTimetable(userId: string) {
    const facultyCourseIds = this.db.courses
      .filter((c) => c.faculty_id === userId)
      .map((c) => c.course_id);
    const slots = this.db.timetable.filter((t) =>
      facultyCourseIds.includes(t.course_id),
    );
    const grid = slots.reduce((acc: any, curr) => {
      if (!acc[curr.day]) acc[curr.day] = {};
      acc[curr.day][curr.time] = curr;
      return acc;
    }, {});
    return {
      grid,
      days: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
      times: ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'],
    };
  }

  async getMyStudents(facultyId: string) {
    const facultyCourseIds = this.db.courses
      .filter((c) => c.faculty_id === facultyId)
      .map((c) => c.course_id);
    const studentIds = this.db.enrollment
      .filter((e) => facultyCourseIds.includes(e.course_id))
      .map((e) => e.student_id);

    const uniqueStudentIds = [...new Set(studentIds)];

    return this.db.students
      .filter((s) => uniqueStudentIds.includes(s.user_id))
      .map((s) => {
        const records = this.db.attendance_log.filter(
          (a) => a.student_id === s.user_id,
        );
        // M-02: EXCUSED sessions from approved leave count as attended.
        const attendance = summariseAttendance(records);
        const attendance_pct =
          attendance.total > 0 ? attendance.percentage : null;

        const marks = this.db.marks_entry.filter(
          (m) => m.student_id === s.user_id,
        );
        const scored = marks.filter((m) => Number(m.max_marks) > 0);
        const avgScore =
          scored.length > 0
            ? Math.round(
                scored.reduce(
                  (sum, m) =>
                    sum +
                    (Number(m.marks_obtained) / Number(m.max_marks)) * 100,
                  0,
                ) / scored.length,
              )
            : null;

        return {
          ...s,
          attendance_pct,
          excused_sessions: attendance.excused,
          avg_score: avgScore,
          // M-04: shared predicate — this used the same rule expressed inline,
          // which had already drifted from the admin report's `cgpa < 6.5`.
          is_at_risk: isAtRisk({ cgpa: s.cgpa, attendancePct: attendance_pct }),
          risk_reasons: riskReasons({
            cgpa: s.cgpa,
            attendancePct: attendance_pct,
          }),
        };
      });
  }

  async getTodayAttendance(courseId: string, collegeId: string | null) {
    // course_id is client-supplied (@Param) — without this check a faculty
    // member could read another college's roster by supplying that
    // college's course id.
    const course = this.db.courses.find((c) => c.course_id === courseId);
    if (!isSameCollege(course, collegeId))
      throw new NotFoundException(
        errorBody(ErrorCode.RESOURCE_NOT_FOUND, 'Course not found'),
      );

    const enrollment = this.db.enrollment.filter(
      (e) => e.course_id === courseId,
    );
    const studentIds = enrollment.map((e) => e.student_id);
    const today = new Date().toISOString().split('T')[0];
    const students = this.db.students
      .filter((s) => studentIds.includes(s.user_id))
      .map((s) => {
        const todayLog = this.db.attendance_log.find(
          (a) =>
            a.student_id === s.user_id &&
            a.course_id === courseId &&
            a.date === today,
        );
        return { ...s, today_status: todayLog?.status || 'present' };
      });
    return { students, date: today, course_id: courseId };
  }

  async recordAttendance(data: any, actorCollegeId: string | null) {
    const { course_id, date, records } = data;

    const course = this.db.courses.find((c) => c.course_id === course_id);
    if (!isSameCollege(course, actorCollegeId))
      throw new NotFoundException(
        errorBody(ErrorCode.RESOURCE_NOT_FOUND, 'Course not found'),
      );
    const collegeId = writeCollegeId(actorCollegeId);

    // M-01: idempotent per student/course/date — re-submitting a session now
    // corrects the existing rows instead of stacking duplicate absences.
    // H-07: UUID identifiers; the previous length-based scheme produced both
    // gaps and outright duplicate primary keys.
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
        // Approved leave outranks a plain absent mark for the same session.
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
          college_id: collegeId,
        };
        this.db.attendance_log.push(log as any);
        created++;
        saved.push(log);
      }
    }

    if (updated) this.db.persist();
    return { saved: saved.length, created, updated, records: saved };
  }

  async postMarks(data: any, actorCollegeId: string | null) {
    const entryId = `m${Date.now()}`;
    const newEntry = {
      entry_id: entryId,
      ...data,
      college_id: writeCollegeId(actorCollegeId),
    };
    this.db.marks_entry.push(newEntry);
    return newEntry;
  }

  async getAssessments(facultyId: string) {
    return this.db.assessments.filter((a) => a.faculty_id === facultyId);
  }

  async getAtRiskStudents(collegeId: string | null) {
    // M-04: one predicate for every at-risk surface. This previously filtered on
    // `cgpa < 6` alone, so a student failing only on attendance never appeared.
    return scopeToCollege(this.db.students, collegeId)
      .map((s) => {
        const records = this.db.attendance_log.filter(
          (a) => a.student_id === s.user_id,
        );
        const attendance = summariseAttendance(records);
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
}
