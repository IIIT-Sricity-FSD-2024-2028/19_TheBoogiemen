import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
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
import { sectionsTaughtBy, sectionTaughtIn } from '../common/course-sections';

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
    const mySections = sectionsTaughtBy(this.db, userId);
    const courseIds = new Set(mySections.map((cs) => cs.course_id));
    return this.db.courses
      .filter((c) => courseIds.has(c.course_id))
      .map((c) => ({
        ...c,
        section: mySections.find((cs) => cs.course_id === c.course_id)?.section,
      }));
  }

  async getFacultyTimetable(userId: string) {
    // Section-scoped, not just course-scoped: two sections of the same
    // course can meet at different times with different faculty, so "my
    // timetable" must match this faculty's own (course_id, section) pairs,
    // not every slot that happens to share a course_id.
    const mySections = sectionsTaughtBy(this.db, userId);
    const slots = this.db.timetable.filter((t) =>
      mySections.some(
        (cs) => cs.course_id === t.course_id && cs.section === t.section,
      ),
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
    // Section-scoped: enrollment must match this faculty's own section of
    // the course, not any section of it — a colleague teaching Section B of
    // the same course is not "my" roster.
    const mySections = sectionsTaughtBy(this.db, facultyId);
    const studentIds = this.db.enrollment
      .filter((e) =>
        mySections.some(
          (cs) => cs.course_id === e.course_id && cs.section === e.section,
        ),
      )
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

  async getTodayAttendance(
    courseId: string,
    userId: string,
    collegeId: string | null,
  ) {
    // course_id is client-supplied (@Param) — without this check a faculty
    // member could read another college's roster by supplying that
    // college's course id.
    const course = this.db.courses.find((c) => c.course_id === courseId);
    if (!isSameCollege(course, collegeId))
      throw new NotFoundException(
        errorBody(ErrorCode.RESOURCE_NOT_FOUND, 'Course not found'),
      );

    // Section-scoped: a faculty may only mark attendance for the section of
    // this course they were actually assigned — see
    // COURSE_OWNERSHIP_MIGRATION_PLAN.md §3/§5.
    const mySection = sectionTaughtIn(this.db, userId, courseId);
    if (!mySection)
      throw new ForbiddenException(
        errorBody(
          ErrorCode.PRIVILEGE_CEILING,
          'You are not assigned to any section of this course.',
        ),
      );

    const enrollment = this.db.enrollment.filter(
      (e) => e.course_id === courseId && e.section === mySection,
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

  async recordAttendance(
    data: any,
    userId: string,
    actorCollegeId: string | null,
  ) {
    const { course_id, date, records } = data;

    const course = this.db.courses.find((c) => c.course_id === course_id);
    if (!isSameCollege(course, actorCollegeId))
      throw new NotFoundException(
        errorBody(ErrorCode.RESOURCE_NOT_FOUND, 'Course not found'),
      );

    // Section-scoped, same as getTodayAttendance: this faculty may only
    // mark attendance for their own assigned section, and only for students
    // actually enrolled in it — a student id from another section must not
    // be smuggled into the records array.
    const mySection = sectionTaughtIn(this.db, userId, course_id);
    if (!mySection)
      throw new ForbiddenException(
        errorBody(
          ErrorCode.PRIVILEGE_CEILING,
          'You are not assigned to any section of this course.',
        ),
      );
    const myStudentIds = new Set(
      this.db.enrollment
        .filter((e) => e.course_id === course_id && e.section === mySection)
        .map((e) => e.student_id),
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
      if (!r?.student_id || !myStudentIds.has(r.student_id)) continue;
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
    const { student_id, assessment_id, marks_obtained, max_marks } = data;
    const collegeId = writeCollegeId(actorCollegeId);
    const existing = this.db.marks_entry.find(
      (m) => m.student_id === student_id && m.assessment_id === assessment_id,
    );
    if (existing) {
      existing.marks_obtained = Number(marks_obtained);
      if (max_marks) existing.max_marks = Number(max_marks);
      this.db.persist();
      return existing;
    }
    const entryId = `m${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newEntry = {
      entry_id: entryId,
      ...data,
      marks_obtained: Number(marks_obtained),
      max_marks: Number(max_marks || 100),
      college_id: collegeId,
    };
    this.db.marks_entry.push(newEntry);
    this.db.persist();
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
