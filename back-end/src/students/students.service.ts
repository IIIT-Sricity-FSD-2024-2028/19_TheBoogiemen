import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InMemoryDbService } from '../database/in-memory-db.service';
import {
  ATTENDANCE_STATUS,
  normalizeAttendanceStatus,
  summariseAttendance,
} from '../common/academic-rules';
import { ErrorCode, errorBody } from '../common/errors/error-codes';
import { isSameCollege, scopeToCollege } from '../common/tenancy/scope-to-college';
import { sectionsOfCourse } from '../common/course-sections';
import { buildAttendanceCalendar, excludeHolidays } from '../common/academic-calendar';
import { studentOutcomeReport } from '../common/outcome-mastery';
import { computeCGPA, computeGradeTrend, predictedFinalGrade } from '../common/grading';

@Injectable()
export class StudentsService {
  constructor(private db: InMemoryDbService) {}

  /**
   * The real, computed CGPA (marks_entry via the relative curve, grading.ts)
   * always wins once it exists. Only when NOT ONE course is gradeable yet
   * does this fall back to students[].cgpa — an admin-provided starting
   * baseline (e.g. bulk-onboard's roster CSV, for a transfer student's prior
   * CGPA), shown only to that student's own profile/grades view until real
   * coursework replaces it. Every aggregate/faculty/admin view (institutional
   * metrics, faculty workload, class performance — common.controller.ts,
   * faculty.service.ts) deliberately calls computeCGPA() directly instead of
   * this helper and must keep doing so: a starting baseline is not a real
   * grade and must never be averaged into a cohort statistic as if it were.
   */
  private resolveOwnCgpa(student: { cgpa?: unknown }, computedCgpa: number | null): number | null {
    if (computedCgpa !== null) return computedCgpa;
    return typeof student.cgpa === 'number' && student.cgpa > 0 ? student.cgpa : null;
  }

  async getProfile(userId: string) {
    const student = this.db.students.find((s) => s.user_id === userId);
    if (!student)
      throw new NotFoundException(
        errorBody(ErrorCode.RESOURCE_NOT_FOUND, 'Student not found'),
      );
    const { cgpa: computedCgpa } = computeCGPA(this.db, userId);
    return { ...student, cgpa: this.resolveOwnCgpa(student, computedCgpa) };
  }

  async getAttendance(userId: string, collegeId: string | null) {
    const records = excludeHolidays(
      this.db,
      this.db.attendance_log.filter((a) => a.student_id === userId),
      collegeId,
    );

    // Group by course to create summary.
    // M-02: a session excused by approved leave counts as attended, so a student
    // is no longer penalised for absence the institution itself authorised.
    const byCourse: Record<string, any[]> = {};
    records.forEach((r) => {
      (byCourse[r.course_id] ||= []).push(r);
    });

    const summary = Object.entries(byCourse).map(([course_id, rows]) => {
      const c = this.db.courses.find(
        (course) => course.course_id === course_id,
      );
      const stats = summariseAttendance(rows);
      return {
        course_id,
        course_code: c?.course_code || course_id,
        course_name: c?.course_name || 'Unknown',
        present: stats.present,
        absent: stats.absent,
        excused: stats.excused,
        total: stats.total,
        percentage: stats.percentage,
      };
    });

    const overall = summariseAttendance(records);

    return {
      summary,
      records,
      totalPresent: overall.present,
      totalAbsent: overall.absent,
      totalExcused: overall.excused,
      overallPct: overall.percentage,
    };
  }

  async getAttendanceCalendar(
    userId: string,
    month: string,
    collegeId: string | null,
  ) {
    if (!/^\d{4}-\d{2}$/.test(month))
      throw new BadRequestException(
        errorBody(ErrorCode.MALFORMED_REQUEST, 'month must be YYYY-MM'),
      );
    return buildAttendanceCalendar(this.db, userId, month, collegeId);
  }

  async getOutcomes(userId: string) {
    return studentOutcomeReport(this.db, userId);
  }

  async getGrades(userId: string) {
    const { cgpa: computedCgpa, courses } = computeCGPA(this.db, userId);
    const predicted = predictedFinalGrade(this.db, userId);
    const student = this.db.students.find((s) => s.user_id === userId);
    return {
      cgpa: this.resolveOwnCgpa(student ?? {}, computedCgpa),
      predictedGrade: predicted?.letter ?? null,
      courses,
    };
  }

  async getGradeTrend(userId: string) {
    return computeGradeTrend(this.db, userId);
  }

  async getCourses(userId: string) {
    const enrollment = this.db.enrollment.filter(
      (e) => e.student_id === userId,
    );
    return enrollment
      .map((e) => {
        const course = this.db.courses.find((c) => c.course_id === e.course_id);
        if (!course) return null;
        // Courses no longer carry one faculty — resolve the faculty teaching
        // THIS student's own section (a different section of the same
        // course may have a different faculty).
        const mySection = sectionsOfCourse(this.db, e.course_id).find(
          (cs) => cs.section === e.section,
        );
        return {
          ...course,
          enrollment_status: e.status,
          section: e.section,
          faculty_id: mySection?.faculty_id ?? null,
          faculty_name: mySection?.faculty_name ?? null,
        };
      })
      .filter(Boolean);
  }

  async getMarks(userId: string) {
    return this.db.marks_entry
      .filter((m) => m.student_id === userId)
      .map((m) => {
        const assessment = this.db.assessments.find(
          (a) => a.assessment_id === m.assessment_id,
        );
        const course = assessment
          ? this.db.courses.find((c) => c.course_id === assessment.course_id)
          : null;
        return {
          ...m,
          assessment_name: assessment?.name,
          course_name: course?.course_name,
          // Joined via the assessment, not the raw stored field — a mark
          // recorded through the real write path (recordMarks in
          // common.controller.ts) never sets course_code on the row itself,
          // only older seeded rows carry it directly.
          course_code: course?.course_code || m.course_code,
        };
      });
  }

  async getFees(userId: string) {
    return this.db.fees.filter((f) => f.student_id === userId);
  }

  async getTimetable(userId: string, collegeId: string | null) {
    // Same fix as common.controller.ts's getStudentTimetable (the route the
    // frontend actually calls, /student-timetable) — kept consistent here
    // too since this is the exact same bug: each enrollment row carries its
    // OWN section, which can differ per course, so matching against
    // students[].section (one blanket "home section" field) could hide a
    // published session for a course the student is genuinely enrolled in.
    const myEnrollment = this.db.enrollment.filter(
      (e) => e.student_id === userId && e.status === 'active',
    );
    const slots = scopeToCollege(this.db.timetable, collegeId).filter(
      (t) =>
        myEnrollment.some((e) => e.course_id === t.course_id && e.section === t.section) &&
        (t.status === undefined || t.status === 'published'),
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

  async enroll(studentId: string, courseId: string, collegeId: string | null) {
    // Check if already enrolled
    const existing = this.db.enrollment.find(
      (e) => e.student_id === studentId && e.course_id === courseId,
    );
    if (existing) {
      throw new BadRequestException(
        errorBody(
          ErrorCode.DUPLICATE_RESOURCE,
          'Already enrolled in this course',
        ),
      );
    }

    // course_id is client-supplied — without this, a student could enroll in
    // another college's course simply by knowing or guessing its id. Same
    // NOT_FOUND for "no such course" and "not your college's course": a
    // student must not be able to tell the two apart by response shape.
    const course = this.db.courses.find((c) => c.course_id === courseId);
    if (!isSameCollege(course, collegeId))
      throw new NotFoundException(
        errorBody(ErrorCode.RESOURCE_NOT_FOUND, 'Course not found'),
      );

    const student = this.db.students.find((s) => s.user_id === studentId);
    const section = student?.section || 'A';
    // A course may exist with zero sections assigned yet (staffed later by a
    // head) — self-enrolling into a section nobody teaches would create an
    // enrollment record attendance/marks can never attach a faculty to.
    const hasFaculty = sectionsOfCourse(this.db, courseId).some(
      (cs) => cs.section === section,
    );
    if (!hasFaculty)
      throw new BadRequestException(
        errorBody(
          ErrorCode.BUSINESS_RULE_VIOLATION,
          `No faculty is assigned to Section ${section} of this course yet. Contact your academic head.`,
        ),
      );

    const id = `e${Date.now()}`;
    const newEnrollment = {
      enrollment_id: id,
      student_id: studentId,
      course_id: courseId,
      year_id: '2025',
      status: 'active',
      section: student?.section || 'A',
      college_id: collegeId ?? course!.college_id,
    };
    this.db.enrollment.push(newEnrollment);
    return { success: true, enrollment: newEnrollment, course };
  }
}
