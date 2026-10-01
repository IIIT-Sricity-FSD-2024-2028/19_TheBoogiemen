import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InMemoryDbService } from '../database/in-memory-db.service';
import { ErrorCode, errorBody } from '../common/errors/error-codes';
import { CampusScope, assertDepartment, findInCollege, inCollege, inReach } from '../core/scope';
import { isCollegeAdmin, isDirector, isHod } from '../core/roles';
import { fullName, newId, nowIso, round1 } from '../core/util';
import { DEFAULT_GRADING, gradeFor } from '../core/grading';
import { summariseAttendance } from '../common/academic-rules';

const bad = (msg: string) => new BadRequestException(errorBody(ErrorCode.BUSINESS_RULE_VIOLATION, msg));
const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

@Injectable()
export class AcademicsService {
  constructor(private readonly db: InMemoryDbService) {}

  grading(collegeId: string) {
    return this.db.college_settings.find((s) => s.college_id === collegeId)?.grading ?? DEFAULT_GRADING;
  }

  attendanceMin(collegeId: string): number {
    return this.db.college_settings.find((s) => s.college_id === collegeId)?.attendance_min_pct ?? 75;
  }

  // ── Access helpers ────────────────────────────────────────────────────────

  section(scope: CampusScope, id: string) {
    return findInCollege(scope, this.db.course_sections, (s) => s.course_section_id === id, 'Course section');
  }

  /** Faculty teaching the section, its department's HOD, or college admins. */
  assertCanView(scope: CampusScope, cs: any) {
    if (scope.role === 'faculty' && cs.faculty_id === scope.userId) return;
    if (isHod(scope.role) && cs.department_id === scope.departmentId) return;
    if (isHod(scope.role) && cs.faculty_id === scope.userId) return;
    if (isDirector(scope.role) || scope.role === 'spoc') return;
    throw new ForbiddenException(errorBody(ErrorCode.INSUFFICIENT_ROLE, 'You do not teach this section.'));
  }

  /** Only the teacher of the section may mark attendance or enter marks. */
  assertTeaches(scope: CampusScope, cs: any) {
    if (cs.faculty_id !== scope.userId) {
      throw new ForbiddenException(errorBody(ErrorCode.INSUFFICIENT_ROLE, 'Only the teacher of this section can do this.'));
    }
  }

  private assertManagesDepartment(scope: CampusScope, departmentId: string) {
    if (isDirector(scope.role) || scope.role === 'spoc') return;
    if (isHod(scope.role) && departmentId === scope.departmentId) return;
    throw new ForbiddenException(errorBody(ErrorCode.INSUFFICIENT_ROLE, 'Only the HOD of this department or the director can do this.'));
  }

  sectionView(cs: any) {
    const course = this.db.courses.find((c) => c.course_id === cs.course_id);
    const teacher = this.db.users.find((u) => u.user_id === cs.faculty_id);
    const dept = this.db.departments.find((d) => d.department_id === cs.department_id);
    const students = this.db.enrollment.filter((e) => e.course_section_id === cs.course_section_id && e.status === 'active').length;
    const syllabus = this.db.syllabus_progress.find((s) => s.course_section_id === cs.course_section_id);
    return {
      ...cs,
      course_code: course?.course_code, course_name: course?.course_name, credits: course?.credits, semester: course?.semester,
      faculty_name: teacher ? fullName(teacher) : null, department_code: dept?.department_code ?? null,
      student_count: students, syllabus_progress: syllabus?.progress ?? null, syllabus_modules: syllabus?.modules ?? [],
    };
  }

  // ── Courses and sections ──────────────────────────────────────────────────

  courses(scope: CampusScope) {
    let rows = inCollege(scope, this.db.courses);
    if (isHod(scope.role)) rows = rows.filter((c) => c.department_id === scope.departmentId);
    if (scope.role === 'faculty') {
      const mine = new Set(this.db.course_sections.filter((s) => s.faculty_id === scope.userId).map((s) => s.course_id));
      rows = rows.filter((c) => mine.has(c.course_id));
    }
    return rows.map((c) => ({
      ...c,
      department_code: this.db.departments.find((d) => d.department_id === c.department_id)?.department_code,
      sections: this.db.course_sections.filter((s) => s.course_id === c.course_id).map((s) => this.sectionView(s)),
    }));
  }

  createCourse(scope: CampusScope, body: any) {
    const departmentId = isHod(scope.role) ? scope.departmentId : body.department_id;
    const dept = this.db.departments.find((d) => d.department_id === departmentId && d.college_id === scope.collegeId);
    if (!dept) throw bad('Choose a department.');
    this.assertManagesDepartment(scope, dept.department_id);
    const code = String(body.course_code || '').trim().toUpperCase();
    const name = String(body.course_name || '').trim();
    if (!/^[A-Z0-9-]{3,12}$/.test(code)) throw bad('Course code must be 3-12 letters, digits or dashes.');
    if (!name) throw bad('Course name is required.');
    const credits = Number(body.credits);
    if (!Number.isInteger(credits) || credits < 1 || credits > 10) throw bad('Credits must be a whole number from 1 to 10.');
    const semester = Number(body.semester);
    if (!Number.isInteger(semester) || semester < 1 || semester > 12) throw bad('Semester must be 1 to 12.');
    if (inCollege(scope, this.db.courses).some((c) => c.course_code === code)) {
      throw new ConflictException(errorBody(ErrorCode.DUPLICATE_RESOURCE, `Course ${code} already exists.`));
    }
    const course = { course_id: newId('crs'), college_id: scope.collegeId, department_id: dept.department_id, course_code: code, course_name: name.slice(0, 120), credits, semester };
    this.db.courses.push(course);
    return course;
  }

  sections(scope: CampusScope, q: { course_id?: string; mine?: string }) {
    let rows = inReach(scope, this.db.course_sections);
    if (scope.role === 'faculty' || q.mine === 'true') rows = inCollege(scope, this.db.course_sections).filter((s) => s.faculty_id === scope.userId);
    if (q.course_id) rows = rows.filter((s) => s.course_id === q.course_id);
    return rows.map((s) => this.sectionView(s));
  }

  createSection(scope: CampusScope, body: any) {
    const course = findInCollege(scope, this.db.courses, (c) => c.course_id === body.course_id, 'Course');
    this.assertManagesDepartment(scope, course.department_id);
    const settings = this.db.college_settings.find((s) => s.college_id === scope.collegeId);
    const section = String(body.section || '').trim().toUpperCase();
    if (!settings?.sections?.includes(section)) throw bad(`Section must be one of ${(settings?.sections || []).join(', ')}.`);
    if (this.db.course_sections.some((s) => s.course_id === course.course_id && s.section === section)) {
      throw new ConflictException(errorBody(ErrorCode.DUPLICATE_RESOURCE, `Section ${section} already exists for this course.`));
    }
    const teacher = this.teacher(scope, body.faculty_id, course.department_id);
    const cs = { course_section_id: newId('sec'), college_id: scope.collegeId, department_id: course.department_id, course_id: course.course_id, section, batch_id: body.batch_id || null, faculty_id: teacher.user_id, term: settings?.current_term?.label ?? null };
    this.db.course_sections.push(cs);
    return this.sectionView(cs);
  }

  private teacher(scope: CampusScope, facultyId: string, departmentId: string) {
    const t = this.db.users.find((u) => u.user_id === facultyId && u.college_id === scope.collegeId && ['faculty', 'head'].includes(u.role) && u.status !== 'inactive');
    if (!t) throw bad('Choose an active faculty member.');
    if (t.department_id !== departmentId) throw bad('The teacher must belong to the course department.');
    return t;
  }

  assignTeacher(scope: CampusScope, id: string, facultyId: string) {
    const cs = this.section(scope, id);
    this.assertManagesDepartment(scope, cs.department_id);
    cs.faculty_id = this.teacher(scope, facultyId, cs.department_id).user_id;
    for (const t of this.db.timetable) if (t.course_section_id === cs.course_section_id) t.faculty_id = cs.faculty_id;
    this.db.persist();
    return this.sectionView(cs);
  }

  roster(scope: CampusScope, id: string) {
    const cs = this.section(scope, id);
    this.assertCanView(scope, cs);
    const min = this.attendanceMin(scope.collegeId);
    return this.db.enrollment
      .filter((e) => e.course_section_id === cs.course_section_id && e.status === 'active')
      .map((e) => {
        const st = this.db.students.find((s) => s.user_id === e.student_id);
        const att = summariseAttendance(this.db.attendance_log.filter((a) => a.enrollment_id === e.enrollment_id));
        return {
          enrollment_id: e.enrollment_id, student_id: e.student_id, roll_no: st?.roll_no, name: fullName(st), email: st?.email,
          section: st?.section, cgpa: st?.cgpa ?? null,
          attendance: { ...att, below_min: att.total > 0 && att.percentage < min },
        };
      })
      .sort((a, b) => String(a.roll_no).localeCompare(String(b.roll_no)));
  }

  enroll(scope: CampusScope, id: string, studentIds: string[]) {
    const cs = this.section(scope, id);
    this.assertManagesDepartment(scope, cs.department_id);
    if (!Array.isArray(studentIds) || !studentIds.length) throw bad('Choose at least one student.');
    const added: string[] = [];
    const skipped: string[] = [];
    for (const sid of studentIds) {
      const st = this.db.students.find((s) => s.user_id === sid && s.college_id === scope.collegeId);
      const user = this.db.users.find((u) => u.user_id === sid);
      if (!st || user?.status === 'inactive') { skipped.push(sid); continue; }
      if (isHod(scope.role) && st.department_id !== scope.departmentId) { skipped.push(sid); continue; }
      if (this.db.enrollment.some((e) => e.student_id === sid && e.course_id === cs.course_id && e.status === 'active')) { skipped.push(sid); continue; }
      this.db.enrollment.push({ enrollment_id: newId('enr'), college_id: scope.collegeId, department_id: st.department_id, student_id: sid, course_id: cs.course_id, course_section_id: cs.course_section_id, section: cs.section, status: 'active', enrolled_at: nowIso(), enrolled_by: scope.userId });
      added.push(sid);
    }
    return { added: added.length, skipped: skipped.length };
  }

  unenroll(scope: CampusScope, enrollmentId: string) {
    const e = findInCollege(scope, this.db.enrollment, (x) => x.enrollment_id === enrollmentId, 'Enrollment');
    this.assertManagesDepartment(scope, e.department_id);
    e.status = 'dropped';
    e.dropped_at = nowIso();
    this.db.persist();
    return { success: true };
  }

  // ── Timetable ─────────────────────────────────────────────────────────────

  timetable(scope: CampusScope, q: { course_section_id?: string; mine?: string; department_id?: string }) {
    let rows = inReach(scope, this.db.timetable);
    if (scope.role === 'faculty' || q.mine === 'true') rows = inCollege(scope, this.db.timetable).filter((t) => t.faculty_id === scope.userId);
    if (scope.role === 'student') {
      const mine = new Set(this.db.enrollment.filter((e) => e.student_id === scope.userId && e.status === 'active').map((e) => e.course_section_id));
      rows = inCollege(scope, this.db.timetable).filter((t) => mine.has(t.course_section_id));
    }
    if (q.course_section_id) rows = rows.filter((t) => t.course_section_id === q.course_section_id);
    if (q.department_id) rows = rows.filter((t) => t.department_id === q.department_id);
    return rows.map((t) => ({ ...t, faculty_name: fullName(this.db.users.find((u) => u.user_id === t.faculty_id)) }));
  }

  addSlot(scope: CampusScope, body: any) {
    const cs = this.section(scope, body.course_section_id);
    this.assertManagesDepartment(scope, cs.department_id);
    const day = String(body.day || '').toUpperCase();
    if (!DAYS.includes(day)) throw bad('Day must be MON to SAT.');
    if (!TIME.test(String(body.time || ''))) throw bad('Time must be HH:MM.');
    const type = body.type === 'lab' ? 'lab' : 'lecture';
    const room = String(body.room || '').trim();
    if (!room) throw bad('Room is required.');
    const clash = inCollege(scope, this.db.timetable).find((t) => t.day === day && t.time === body.time && (t.faculty_id === cs.faculty_id || (t.section === cs.section && t.department_id === cs.department_id) || t.room === room));
    if (clash) throw new ConflictException(errorBody(ErrorCode.DUPLICATE_RESOURCE, `Clash with ${clash.course_code} section ${clash.section} (${clash.room}) at ${day} ${body.time}.`));
    const course = this.db.courses.find((c) => c.course_id === cs.course_id);
    const slot = { slot_id: newId('tt'), college_id: scope.collegeId, department_id: cs.department_id, course_section_id: cs.course_section_id, course_id: cs.course_id, course_code: course?.course_code, course_name: course?.course_name, section: cs.section, faculty_id: cs.faculty_id, day, time: body.time, room, type };
    this.db.timetable.push(slot);
    return slot;
  }

  removeSlot(scope: CampusScope, slotId: string) {
    const slot = findInCollege(scope, this.db.timetable, (t) => t.slot_id === slotId, 'Timetable slot');
    this.assertManagesDepartment(scope, slot.department_id);
    const i = this.db.timetable.indexOf(slot);
    this.db.timetable.splice(i, 1);
    return { success: true };
  }

  // ── Syllabus ──────────────────────────────────────────────────────────────

  updateSyllabus(scope: CampusScope, id: string, body: { modules: { name: string; progress: number }[] }) {
    const cs = this.section(scope, id);
    this.assertTeaches(scope, cs);
    if (!Array.isArray(body?.modules) || !body.modules.length) throw bad('Add at least one unit.');
    const modules = body.modules.map((m) => {
      const progress = Number(m.progress);
      if (!String(m.name || '').trim()) throw bad('Every unit needs a name.');
      if (!Number.isFinite(progress) || progress < 0 || progress > 100) throw bad('Progress must be 0 to 100.');
      return { name: String(m.name).trim().slice(0, 80), progress: Math.round(progress) };
    });
    const progress = Math.round(modules.reduce((s, m) => s + m.progress, 0) / modules.length);
    let row = this.db.syllabus_progress.find((s) => s.course_section_id === cs.course_section_id);
    if (!row) {
      row = { college_id: scope.collegeId, course_section_id: cs.course_section_id, course_id: cs.course_id, section: cs.section };
      this.db.syllabus_progress.push(row);
    }
    Object.assign(row, { modules, progress, updated_at: nowIso() });
    this.db.persist();
    return row;
  }

  // ── Assessments and marks ─────────────────────────────────────────────────

  assessments(scope: CampusScope, q: { course_section_id?: string }) {
    let rows = inReach(scope, this.db.assessments);
    if (scope.role === 'faculty') {
      const mine = new Set(inCollege(scope, this.db.course_sections).filter((s) => s.faculty_id === scope.userId).map((s) => s.course_section_id));
      rows = inCollege(scope, this.db.assessments).filter((a) => mine.has(a.course_section_id));
    }
    if (q.course_section_id) rows = rows.filter((a) => a.course_section_id === q.course_section_id);
    return rows
      .map((a) => {
        const entries = this.db.marks_entry.filter((m) => m.assessment_id === a.assessment_id);
        const cs = this.db.course_sections.find((s) => s.course_section_id === a.course_section_id);
        const enrolled = this.db.enrollment.filter((e) => e.course_section_id === a.course_section_id && e.status === 'active').length;
        const avg = entries.length ? round1(entries.reduce((s, m) => s + m.marks_obtained, 0) / entries.length) : null;
        return { ...a, section: cs?.section, entered: entries.length, enrolled, average: avg };
      })
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }

  createAssessment(scope: CampusScope, body: any) {
    const cs = this.section(scope, body.course_section_id);
    this.assertTeaches(scope, cs);
    const name = String(body.name || '').trim();
    if (!name) throw bad('Assessment name is required.');
    const max = Number(body.max_marks);
    if (!Number.isFinite(max) || max <= 0 || max > 1000) throw bad('Maximum marks must be between 1 and 1000.');
    const weightage = Number(body.weightage ?? 0);
    if (!Number.isFinite(weightage) || weightage < 0 || weightage > 100) throw bad('Weightage must be 0 to 100%.');
    if (!body.date || Number.isNaN(Date.parse(body.date))) throw bad('Choose a valid date.');
    const type = ['quiz', 'internal', 'assignment', 'lab', 'final'].includes(body.type) ? body.type : 'internal';
    const course = this.db.courses.find((c) => c.course_id === cs.course_id);
    const row = { assessment_id: newId('asm'), college_id: scope.collegeId, department_id: cs.department_id, course_section_id: cs.course_section_id, course_id: cs.course_id, course_code: course?.course_code, name: name.slice(0, 80), type, max_marks: max, weightage, date: body.date, status: 'draft', published_at: null, created_by: scope.userId, created_at: nowIso() };
    this.db.assessments.push(row);
    return row;
  }

  private assessment(scope: CampusScope, id: string) {
    return findInCollege(scope, this.db.assessments, (a) => a.assessment_id === id, 'Assessment');
  }

  updateAssessment(scope: CampusScope, id: string, body: any) {
    const a = this.assessment(scope, id);
    this.assertTeaches(scope, this.section(scope, a.course_section_id));
    if (body.name !== undefined) {
      if (!String(body.name).trim()) throw bad('Assessment name is required.');
      a.name = String(body.name).trim();
    }
    if (body.date !== undefined) {
      if (Number.isNaN(Date.parse(body.date))) throw bad('Choose a valid date.');
      a.date = body.date;
    }
    if (body.max_marks !== undefined) {
      if (this.db.marks_entry.some((m) => m.assessment_id === a.assessment_id)) throw bad('Maximum marks cannot change after marks are entered.');
      const max = Number(body.max_marks);
      if (!Number.isFinite(max) || max <= 0) throw bad('Maximum marks must be positive.');
      a.max_marks = max;
    }
    this.db.persist();
    return a;
  }

  deleteAssessment(scope: CampusScope, id: string) {
    const a = this.assessment(scope, id);
    this.assertTeaches(scope, this.section(scope, a.course_section_id));
    if (a.status === 'published') throw bad('Published assessments cannot be deleted.');
    for (let i = this.db.marks_entry.length - 1; i >= 0; i--) if (this.db.marks_entry[i].assessment_id === a.assessment_id) this.db.marks_entry.splice(i, 1);
    this.db.assessments.splice(this.db.assessments.indexOf(a), 1);
    return { success: true };
  }

  marksSheet(scope: CampusScope, id: string) {
    const a = this.assessment(scope, id);
    const cs = this.section(scope, a.course_section_id);
    this.assertCanView(scope, cs);
    const entries = this.db.marks_entry.filter((m) => m.assessment_id === a.assessment_id);
    return {
      assessment: a,
      grading: this.grading(scope.collegeId),
      rows: this.roster(scope, cs.course_section_id).map((r) => {
        const e = entries.find((m) => m.student_id === r.student_id);
        return { student_id: r.student_id, roll_no: r.roll_no, name: r.name, marks_obtained: e?.marks_obtained ?? null, grade: e?.grade ?? null };
      }),
    };
  }

  /** Saves marks; the grade always comes from the college grading scale. */
  saveMarks(scope: CampusScope, id: string, entries: { student_id: string; marks_obtained: number | null }[]) {
    const a = this.assessment(scope, id);
    const cs = this.section(scope, a.course_section_id);
    this.assertTeaches(scope, cs);
    if (!Array.isArray(entries)) throw bad('Send a list of marks.');
    const enrolled = new Set(this.db.enrollment.filter((e) => e.course_section_id === cs.course_section_id && e.status === 'active').map((e) => e.student_id));
    const grading = this.grading(scope.collegeId);
    let saved = 0;
    for (const entry of entries) {
      if (!enrolled.has(entry.student_id)) throw bad('A student in the list is not enrolled in this section.');
      const existing = this.db.marks_entry.find((m) => m.assessment_id === a.assessment_id && m.student_id === entry.student_id);
      if (entry.marks_obtained === null || entry.marks_obtained === undefined || (entry.marks_obtained as any) === '') {
        if (existing) this.db.marks_entry.splice(this.db.marks_entry.indexOf(existing), 1);
        continue;
      }
      const marks = Number(entry.marks_obtained);
      if (!Number.isFinite(marks) || marks < 0 || marks > a.max_marks) throw bad(`Marks must be between 0 and ${a.max_marks}.`);
      const band = gradeFor((marks / a.max_marks) * 100, grading);
      const row = existing ?? { entry_id: newId('mk'), college_id: scope.collegeId, assessment_id: a.assessment_id, course_section_id: cs.course_section_id, student_id: entry.student_id, course_id: cs.course_id, course_code: a.course_code };
      Object.assign(row, { marks_obtained: marks, max_marks: a.max_marks, grade: band.grade, grade_points: band.points, published: a.status === 'published', entered_by: scope.userId, updated_at: nowIso() });
      if (!existing) this.db.marks_entry.push(row);
      saved++;
    }
    this.db.persist();
    return { saved, sheet: this.marksSheet(scope, id) };
  }

  publish(scope: CampusScope, id: string) {
    const a = this.assessment(scope, id);
    this.assertTeaches(scope, this.section(scope, a.course_section_id));
    const entries = this.db.marks_entry.filter((m) => m.assessment_id === a.assessment_id);
    if (!entries.length) throw bad('Enter marks before publishing.');
    a.status = 'published';
    a.published_at = nowIso();
    for (const m of entries) m.published = true;
    this.db.persist();
    return a;
  }

  /** Student's own published results. */
  studentResults(scope: CampusScope) {
    const grading = this.grading(scope.collegeId);
    const marks = this.db.marks_entry.filter((m) => m.student_id === scope.userId && m.published);
    const rows = marks.map((m) => {
      const a = this.db.assessments.find((x) => x.assessment_id === m.assessment_id);
      const c = this.db.courses.find((x) => x.course_id === m.course_id);
      return { ...m, assessment_name: a?.name, assessment_type: a?.type, date: a?.date, weightage: a?.weightage, course_name: c?.course_name, percentage: round1((m.marks_obtained / m.max_marks) * 100) };
    });
    const byCourse = new Map<string, any[]>();
    for (const r of rows) byCourse.set(r.course_id, [...(byCourse.get(r.course_id) || []), r]);
    const courses = [...byCourse.entries()].map(([course_id, list]) => {
      const obtained = list.reduce((s, r) => s + r.marks_obtained, 0);
      const max = list.reduce((s, r) => s + r.max_marks, 0);
      const pct = max ? round1((obtained / max) * 100) : null;
      const band = pct === null ? null : gradeFor(pct, grading);
      return { course_id, course_code: list[0].course_code, course_name: list[0].course_name, obtained, max, percentage: pct, grade: band?.grade ?? null, grade_points: band?.points ?? null };
    });
    return { grading, assessments: rows.sort((a, b) => String(b.date).localeCompare(String(a.date))), courses };
  }

  /** Results distribution for a department or the whole college. */
  resultsSummary(scope: CampusScope, departmentId?: string) {
    const grading = this.grading(scope.collegeId);
    let sections = inReach(scope, this.db.course_sections);
    if (departmentId) sections = sections.filter((s) => s.department_id === departmentId);
    return sections.map((cs) => {
      const published = this.db.assessments.filter((a) => a.course_section_id === cs.course_section_id && a.status === 'published');
      const ids = new Set(published.map((a) => a.assessment_id));
      const marks = this.db.marks_entry.filter((m) => ids.has(m.assessment_id));
      const perStudent = new Map<string, { o: number; m: number }>();
      for (const m of marks) {
        const cur = perStudent.get(m.student_id) || { o: 0, m: 0 };
        perStudent.set(m.student_id, { o: cur.o + m.marks_obtained, m: cur.m + m.max_marks });
      }
      const pcts = [...perStudent.values()].map((v) => (v.m ? (v.o / v.m) * 100 : 0));
      const distribution: Record<string, number> = {};
      for (const p of pcts) {
        const g = gradeFor(p, grading).grade;
        distribution[g] = (distribution[g] || 0) + 1;
      }
      return {
        ...this.sectionView(cs),
        assessments_published: published.length,
        average_pct: pcts.length ? round1(pcts.reduce((s, p) => s + p, 0) / pcts.length) : null,
        pass_rate: pcts.length ? round1((pcts.filter((p) => p >= grading.pass_pct).length / pcts.length) * 100) : null,
        distribution,
      };
    });
  }

  departmentOf(scope: CampusScope, id: string) {
    const d = this.db.departments.find((x) => x.department_id === id && x.college_id === scope.collegeId);
    if (!d) throw new NotFoundException(errorBody(ErrorCode.RESOURCE_NOT_FOUND, 'Department not found'));
    assertDepartment(scope, id);
    return d;
  }

  isCollegeAdmin(scope: CampusScope) {
    return isCollegeAdmin(scope.role);
  }
}
