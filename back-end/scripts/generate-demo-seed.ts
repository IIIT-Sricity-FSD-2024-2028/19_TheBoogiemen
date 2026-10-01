/**
 * generate-demo-seed.ts — builds data/mock-db.json from scratch.
 *
 *   npx ts-node scripts/generate-demo-seed.ts
 *
 * Two colleges with consistent, linked records (every row carries college_id;
 * enrollments point at course sections; attendance points at enrollments),
 * plus the platform support team. Deterministic: the same run always
 * produces the same data. Demo passwords are listed in README.md.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcryptjs';

// ── deterministic helpers ───────────────────────────────────────────────────
let seed = 20260929;
function rand() {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = <T>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
let idCounter = 1000;
const id = (prefix: string) => `${prefix}_${(idCounter++).toString(36)}`;
const iso = (d: string, time = '09:00:00') => new Date(`${d}T${time}+05:30`).toISOString();
const ROUNDS = 10;
const hashCache = new Map<string, string>();
const hash = (pw: string) => {
  if (!hashCache.has(pw)) hashCache.set(pw, bcrypt.hashSync(pw, ROUNDS));
  return hashCache.get(pw)!;
};

export const DEMO_PASSWORDS = {
  student: 'Student@2026',
  faculty: 'Faculty@2026',
  hod: 'Hod@2026!',
  director: 'Director@2026',
  finance: 'Finance@2026',
  spoc: 'Spoc@2026!',
  support: 'Support@2026',
};

// ── containers ──────────────────────────────────────────────────────────────
const db: Record<string, any[]> = {
  colleges: [], college_settings: [], departments: [], users: [], students: [], faculty: [],
  courses: [], course_sections: [], enrollment: [], timetable: [], syllabus_progress: [],
  assessments: [], marks_entry: [], submissions: [], attendance_log: [], attendance_requests: [],
  leave_applications: [], discussion_posts: [], discussion_replies: [], research_projects: [],
  meetings: [], events: [], resources: [], resource_bookings: [], announcements: [],
  fee_structures: [], fees: [], fee_payments: [], support_tickets: [], support_threads: [],
  support_messages: [], onboarding_sessions: [], quotes: [], payments: [], subscriptions: [],
  password_resets: [], notification_reads: [], uploads: [], audit_log: [],
};

const GRADING_10PT = {
  scale: '10pt', pass_pct: 40,
  bands: [
    { grade: 'S', min_pct: 90, points: 10 }, { grade: 'A', min_pct: 80, points: 9 }, { grade: 'B', min_pct: 70, points: 8 },
    { grade: 'C', min_pct: 60, points: 7 }, { grade: 'D', min_pct: 50, points: 6 }, { grade: 'E', min_pct: 40, points: 5 },
    { grade: 'F', min_pct: 0, points: 0 },
  ],
};
const GRADING_4PT = {
  scale: '4pt', pass_pct: 50,
  bands: [
    { grade: 'A', min_pct: 85, points: 4 }, { grade: 'B', min_pct: 70, points: 3 }, { grade: 'C', min_pct: 60, points: 2 },
    { grade: 'D', min_pct: 50, points: 1 }, { grade: 'F', min_pct: 0, points: 0 },
  ],
};
const gradeFor = (pct: number, grading: any) =>
  [...grading.bands].sort((a: any, b: any) => b.min_pct - a.min_pct).find((b: any) => pct >= b.min_pct);

const FIRST = ['Aarav', 'Diya', 'Vihaan', 'Ananya', 'Aditya', 'Ishita', 'Kabir', 'Meera', 'Rohan', 'Saanvi', 'Arjun', 'Kavya', 'Nikhil', 'Pooja', 'Siddharth', 'Tanvi', 'Yash', 'Riya', 'Karthik', 'Sneha', 'Harsh', 'Nisha', 'Varun', 'Lakshmi', 'Dev', 'Aisha', 'Pranav', 'Shreya', 'Manav', 'Divya'];
const LAST = ['Sharma', 'Reddy', 'Iyer', 'Nair', 'Gupta', 'Patel', 'Rao', 'Menon', 'Das', 'Kulkarni', 'Singh', 'Joshi', 'Pillai', 'Verma', 'Bhat'];

// ── builders ────────────────────────────────────────────────────────────────
function addUser(u: any, password: string) {
  const row = {
    user_id: u.user_id ?? id('u'),
    college_id: u.college_id ?? null,
    email: u.email,
    username: u.email.split('@')[0],
    role: u.role,
    first_name: u.first_name,
    last_name: u.last_name,
    phone: u.phone ?? null,
    address: null,
    photo_file_id: null,
    status: 'active',
    must_change_password: false,
    department_id: u.department_id ?? null,
    display_id: u.display_id ?? null,
    designation: u.designation ?? null,
    tier_level: u.tier_level ?? null,
    password_hash: hash(password),
    created_at: iso('2026-06-01'),
  };
  db.users.push(row);
  return row;
}

interface CollegeSpec {
  code: string; name: string; domain: string; city: string; state: string; type: string;
  plan: { key: string; student_seats: number; faculty_seats: number; modules: string[]; term_years: number };
  grading: any; attendance_min_pct: number;
  studentFormat: any[]; facultyFormat: any[];
  departments: { code: string; name: string; hod: [string, string]; faculty: [string, string, string][]; courses: [string, string, number][] }[];
  studentsPerSection: number; sections: string[];
  customFields: any[];
}

function weekdaysBetween(start: string, end: string) {
  const out: { date: string; day: string }[] = [];
  const names = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const d = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  while (d <= last) {
    const day = names[d.getUTCDay()];
    if (day !== 'SUN' && day !== 'SAT') out.push({ date: d.toISOString().slice(0, 10), day });
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

const TERM = { label: '2026 odd semester', start: '2026-08-03', end: '2026-12-18' };
const ATTENDANCE_UNTIL = '2026-09-25';
const TIMES = ['09:00', '10:00', '11:00', '14:00'];

function buildCollege(spec: CollegeSpec) {
  const college_id = `col_${spec.code.toLowerCase()}`;
  db.colleges.push({ college_id, code: spec.code, name: spec.name, city: spec.city, state: spec.state, type: spec.type, status: 'active', created_at: iso('2026-06-01') });

  const programme_id = `${college_id}_btech`;
  const batch_id = `${college_id}_b2024`;
  const settings: any = {
    college_id,
    term_type: 'semester',
    current_term: TERM,
    programmes: [{ programme_id, code: 'BTECH', name: 'B.Tech', duration_years: 4 }],
    batches: [{ batch_id, label: '2024-2028', start_year: 2024, programme_id, current_semester: 5 }],
    sections: spec.sections,
    grading: spec.grading,
    attendance_min_pct: spec.attendance_min_pct,
    id_formats: { student: spec.studentFormat, faculty: spec.facultyFormat, staff: [{ type: 'text', value: `${spec.code}-STF-` }, { type: 'seq', width: 3, reset: 'never' }] },
    id_sequences: {} as Record<string, number>,
    custom_fields: spec.customFields,
    setup: { completed_at: iso('2026-06-05'), steps: { profile: true, structure: true, id_formats: true, grading: true, custom_fields: true, people: true } },
  };
  db.college_settings.push(settings);

  const subscription_id = `sub_${spec.code.toLowerCase()}`;
  db.subscriptions.push({
    subscription_id, college_id, quote_id: null, plan_key: spec.plan.key,
    student_seats: spec.plan.student_seats, faculty_seats: spec.plan.faculty_seats, modules: spec.plan.modules,
    status: 'active', starts_on: '2026-06-01', ends_on: `${2026 + spec.plan.term_years}-06-01`, created_at: iso('2026-06-01'),
  });

  const people: any = { students: [] as any[], faculty: [] as any[], hods: [] as any[] };
  const seqNext = (key: string) => (settings.id_sequences[key] = (settings.id_sequences[key] ?? 0) + 1);
  const render = (tpl: any[], ctx: any, n: number) =>
    tpl.map((t: any) => t.type === 'text' ? t.value : t.type === 'year' ? (t.format === 'YY' ? String(ctx.year).slice(-2) : String(ctx.year)) : t.type === 'dept' ? ctx.dept : t.type === 'programme' ? 'BTECH' : t.type === 'section' ? ctx.section : String(n).padStart(t.width, '0')).join('');
  const seqKey = (kind: string, tpl: any[], ctx: any) => {
    const s = tpl.find((t: any) => t.type === 'seq');
    return s.reset === 'dept_year' ? `${kind}:${ctx.dept}:${ctx.year}` : s.reset === 'dept' ? `${kind}:${ctx.dept}` : s.reset === 'year' ? `${kind}:${ctx.year}` : kind;
  };

  // Admin staff
  addUser({ college_id, email: `spoc@${spec.domain}`, role: 'spoc', first_name: 'Priya', last_name: 'Menon', phone: '9876500001', display_id: `${spec.code}-SPOC-001` }, DEMO_PASSWORDS.spoc);
  addUser({ college_id, email: `director@${spec.domain}`, role: 'superadmin', first_name: 'Rajesh', last_name: 'Kumar', phone: '9876500002', designation: 'Director', display_id: render(settings.id_formats.staff, {}, seqNext(`staff`)) }, DEMO_PASSWORDS.director);
  addUser({ college_id, email: `finance@${spec.domain}`, role: 'FINANCE_ADMIN', first_name: 'Suresh', last_name: 'Pillai', phone: '9876500003', designation: 'Finance Officer', display_id: render(settings.id_formats.staff, {}, seqNext(`staff`)) }, DEMO_PASSWORDS.finance);

  let firstFaculty = true;
  let firstStudent = true;
  let nameIdx = spec.code === 'DIT' ? 0 : 11;

  for (const dept of spec.departments) {
    const department_id = `${college_id}_${dept.code.toLowerCase()}`;
    const deptRow = { department_id, college_id, department_code: dept.code, department_name: dept.name, hod_user_id: null as string | null };
    db.departments.push(deptRow);

    // HOD
    const hodEmail = spec.departments.length > 1 ? `hod.${dept.code.toLowerCase()}@${spec.domain}` : `hod@${spec.domain}`;
    const fctx = { dept: dept.code, year: 2026 };
    const hodId = render(settings.id_formats.faculty, fctx, seqNext(seqKey('faculty', settings.id_formats.faculty, fctx)));
    const hod = addUser({ college_id, email: hodEmail, role: 'head', first_name: dept.hod[0], last_name: dept.hod[1], department_id, designation: 'Professor and Head', display_id: hodId, phone: '9876500010' }, DEMO_PASSWORDS.hod);
    deptRow.hod_user_id = hod.user_id;
    db.faculty.push({ user_id: hod.user_id, college_id, employee_id: hodId, first_name: hod.first_name, last_name: hod.last_name, email: hod.email, phone: hod.phone, department_id, designation: 'Professor and Head' });
    people.hods.push(hod);

    // Faculty
    const deptFaculty: any[] = [];
    for (const [first, last, designation] of dept.faculty) {
      const email = firstFaculty ? `faculty@${spec.domain}` : `${first.toLowerCase()}.${last.toLowerCase()}@${spec.domain}`;
      firstFaculty = false;
      const empId = render(settings.id_formats.faculty, fctx, seqNext(seqKey('faculty', settings.id_formats.faculty, fctx)));
      const f = addUser({ college_id, email, role: 'faculty', first_name: first, last_name: last, department_id, designation, display_id: empId, phone: `98765${String(10000 + db.users.length).slice(-5)}` }, DEMO_PASSWORDS.faculty);
      db.faculty.push({ user_id: f.user_id, college_id, employee_id: empId, first_name: first, last_name: last, email, phone: f.phone, department_id, designation });
      deptFaculty.push(f);
      people.faculty.push(f);
    }

    // Courses and sections
    const deptCourses = dept.courses.map(([code, name, credits], i) => {
      const course = { course_id: `${college_id}_${code.toLowerCase()}`, college_id, department_id, course_code: code, course_name: name, credits, semester: 5 };
      db.courses.push(course);
      return { course, faculty: deptFaculty[i % deptFaculty.length], index: i };
    });

    const sectionRows: any[] = [];
    for (const [si, section] of spec.sections.entries()) {
      for (const { course, faculty, index } of deptCourses) {
        const cs = { course_section_id: `${course.course_id}_${section.toLowerCase()}`, college_id, department_id, course_id: course.course_id, section, batch_id, faculty_id: faculty.user_id, term: TERM.label };
        db.course_sections.push(cs);
        sectionRows.push({ cs, course, index, si });
        // Timetable: lectures Mon/Wed/Fri; sections use different hours so a
        // teacher of both sections never clashes. One lab per course on Tue/Thu.
        const time = TIMES[(index + si * 2) % TIMES.length];
        for (const day of ['MON', 'WED', 'FRI']) {
          db.timetable.push({ slot_id: id('tt'), college_id, department_id, course_section_id: cs.course_section_id, course_id: course.course_id, course_code: course.course_code, course_name: course.course_name, section, faculty_id: faculty.user_id, day, time, room: `${dept.code}-${101 + index}`, type: 'lecture' });
        }
        if (index < 2) {
          db.timetable.push({ slot_id: id('tt'), college_id, department_id, course_section_id: cs.course_section_id, course_id: course.course_id, course_code: course.course_code, course_name: course.course_name, section, faculty_id: faculty.user_id, day: si === 0 ? 'TUE' : 'THU', time: index === 0 ? '14:00' : '15:00', room: `${dept.code}-LAB${index + 1}`, type: 'lab' });
        }
        // Syllabus progress per section
        const modules = [1, 2, 3, 4, 5].map((m) => ({ name: `Unit ${m}`, progress: Math.max(0, Math.min(100, 100 - (m - 1) * 22 + Math.round(rand() * 10) - (index * 4))) }));
        db.syllabus_progress.push({ college_id, course_section_id: cs.course_section_id, course_id: course.course_id, section, progress: Math.round(modules.reduce((s, m) => s + m.progress, 0) / modules.length), modules, updated_at: iso('2026-09-24') });
      }
    }

    // Students
    for (const section of spec.sections) {
      for (let k = 0; k < spec.studentsPerSection; k++) {
        const first = FIRST[nameIdx % FIRST.length];
        const last = LAST[(nameIdx * 7) % LAST.length];
        nameIdx++;
        const ctx = { dept: dept.code, year: 2024, section };
        const roll = render(settings.id_formats.student, ctx, seqNext(seqKey('student', settings.id_formats.student, ctx)));
        const email = firstStudent ? `student@${spec.domain}` : `${roll.replace(/[^A-Za-z0-9]/g, '').toLowerCase()}@${spec.domain}`;
        firstStudent = false;
        const u = addUser({ college_id, email, role: 'student', first_name: first, last_name: last, department_id, display_id: roll, phone: `90000${String(10000 + db.users.length).slice(-5)}` }, DEMO_PASSWORDS.student);
        const atRisk = k === spec.studentsPerSection - 1; // one weak attender per section
        const cgpa = Math.round((atRisk ? 5.6 + rand() * 0.8 : 6.8 + rand() * 2.6) * 10) / 10;
        const custom: Record<string, string> = {};
        for (const f of spec.customFields) {
          if (f.type === 'select') custom[f.key] = pick(f.options);
          if (f.type === 'phone') custom[f.key] = `98${String(Math.floor(rand() * 1e8)).padStart(8, '0')}`;
        }
        db.students.push({
          user_id: u.user_id, college_id, roll_no: roll, first_name: first, last_name: last, email, phone: u.phone,
          department_id, branch: dept.code, programme_id, batch_id, batch: '2024-2028', section, semester: 5, cgpa,
          dob: `2005-${String(1 + Math.floor(rand() * 12)).padStart(2, '0')}-${String(1 + Math.floor(rand() * 27)).padStart(2, '0')}`,
          join_date: '2024-08-01', custom_fields: custom,
        });
        people.students.push({ user: u, section, department_id, atRisk, dept: dept.code });

        // Enroll in every course section of their section
        for (const { cs, course } of sectionRows.filter((r) => r.cs.section === section)) {
          const enrollment_id = id('enr');
          db.enrollment.push({ enrollment_id, college_id, department_id, student_id: u.user_id, course_id: course.course_id, course_section_id: cs.course_section_id, section, status: 'active', enrolled_at: iso('2026-08-01') });
          // Attendance for each past class of this section/course
          const presentRate = atRisk ? 0.62 : 0.82 + rand() * 0.16;
          const slots = db.timetable.filter((t) => t.course_section_id === cs.course_section_id);
          for (const { date, day } of weekdaysBetween(TERM.start, ATTENDANCE_UNTIL)) {
            for (const slot of slots.filter((s) => s.day === day)) {
              db.attendance_log.push({
                log_id: id('att'), college_id, student_id: u.user_id, course_id: course.course_id, course_section_id: cs.course_section_id,
                enrollment_id, date, time: slot.time, status: rand() < presentRate ? 'present' : 'absent', marked_by: cs.faculty_id,
              });
            }
          }
        }
      }
    }

    // Assessments and marks (two published, one upcoming draft)
    for (const { cs, course } of sectionRows) {
      const defs = [
        { name: 'Quiz 1', type: 'quiz', max: 10, date: '2026-08-24', status: 'published' },
        { name: 'Internal 1', type: 'internal', max: 30, date: '2026-09-07', status: 'published' },
        { name: 'Internal 2', type: 'internal', max: 30, date: '2026-10-19', status: 'draft' },
      ];
      for (const def of defs) {
        const assessment_id = id('asm');
        db.assessments.push({ assessment_id, college_id, department_id, course_section_id: cs.course_section_id, course_id: course.course_id, course_code: course.course_code, name: def.name, type: def.type, max_marks: def.max, weightage: def.max === 10 ? 10 : 20, date: def.date, status: def.status, published_at: def.status === 'published' ? iso(def.date, '17:00:00') : null, created_by: cs.faculty_id, created_at: iso('2026-08-10') });
        if (def.status !== 'published') continue;
        const enrolled = db.enrollment.filter((e) => e.course_section_id === cs.course_section_id);
        for (const e of enrolled) {
          const s = people.students.find((p: any) => p.user.user_id === e.student_id);
          const base = s?.atRisk ? 0.42 : 0.6 + rand() * 0.38;
          const marks = Math.round(def.max * Math.min(1, base) * 2) / 2;
          const g = gradeFor((marks / def.max) * 100, spec.grading);
          db.marks_entry.push({ entry_id: id('mk'), college_id, assessment_id, course_section_id: cs.course_section_id, student_id: e.student_id, course_id: course.course_id, course_code: course.course_code, marks_obtained: marks, max_marks: def.max, grade: g.grade, grade_points: g.points, published: true, entered_by: cs.faculty_id, updated_at: iso(def.date, '16:00:00') });
        }
      }
    }
  }

  // ── Fees (only when the plan includes the fees module) ──
  if (spec.plan.modules.includes('fees')) {
  const structure_id = `fs_${spec.code.toLowerCase()}_s5`;
  const components = spec.code === 'DIT'
    ? [{ name: 'Tuition fee', amount: 75000 }, { name: 'Examination fee', amount: 2500 }, { name: 'Library and lab fee', amount: 3500 }]
    : [{ name: 'Tuition fee', amount: 42000 }, { name: 'Examination fee', amount: 1500 }];
  const total = components.reduce((s, c) => s + c.amount, 0);
  db.fee_structures.push({ structure_id, college_id, name: 'B.Tech semester 5 fees', programme_id, batch_id, semester: 5, components, total, due_date: '2026-08-31', created_by: null, created_at: iso('2026-07-15') });
  let receiptSeq = 1;
  const finance = db.users.find((u) => u.college_id === college_id && u.role === 'FINANCE_ADMIN');
  for (const [i, s] of people.students.entries()) {
    const fee_id = id('fee');
    const kind = i % 7 === 3 ? 'pending' : i % 7 === 5 ? 'partial' : 'paid';
    const paid = kind === 'paid' ? total : kind === 'partial' ? Math.round(total / 2) : 0;
    db.fees.push({ fee_id, college_id, department_id: s.department_id, student_id: s.user.user_id, structure_id, semester: 5, fee_type: 'Semester fees', components, amount: total, paid_amount: paid, due_date: '2026-08-31', status: kind, created_at: iso('2026-07-15') });
    if (paid > 0) {
      db.fee_payments.push({ payment_id: id('pay'), college_id, fee_id, student_id: s.user.user_id, amount: paid, mode: pick(['upi', 'bank_transfer', 'card', 'cash']), reference: `TXN${String(Math.floor(rand() * 1e9)).padStart(9, '0')}`, receipt_no: `${spec.code}-RCP-2026-${String(receiptSeq++).padStart(5, '0')}`, recorded_by: finance?.user_id ?? null, paid_at: iso(`2026-08-${String(5 + (i % 20)).padStart(2, '0')}`, '11:30:00') });
    }
  }
  }

  // ── Leave (HOD approves all) ──
  const [s1, s2, s3] = people.students;
  const f1 = people.faculty[0];
  const hodOf = (deptId: string) => people.hods.find((h: any) => h.department_id === deptId);
  const leave = (applicant: any, role: string, deptId: string, type: string, from: string, to: string, reason: string, status: string, appliedOn: string) => {
    const hod = hodOf(deptId);
    db.leave_applications.push({
      leave_id: id('lv'), college_id, department_id: deptId, applicant_id: applicant.user_id, applicant_role: role,
      applicant_name: `${applicant.first_name} ${applicant.last_name}`, student_id: role === 'student' ? applicant.user_id : null,
      leave_type: type, start_date: from, end_date: to, reason, status, applied_on: appliedOn,
      decided_by: status === 'pending' ? null : hod?.user_id ?? null, decided_at: status === 'pending' ? null : iso(appliedOn, '15:00:00'),
      decision_note: status === 'rejected' ? 'Overlaps with Internal 1; please reschedule.' : null,
    });
  };
  if (s1) {
    leave(s1.user, 'student', s1.department_id, 'Medical', '2026-08-19', '2026-08-20', 'Fever, doctor advised rest.', 'approved', '2026-08-18');
    // Approved leave makes those classes excused (mirrors the leave service).
    for (const a of db.attendance_log) if (a.student_id === s1.user.user_id && (a.date === '2026-08-19' || a.date === '2026-08-20')) { a.status = 'excused'; a.source = 'leave'; }
    leave(s1.user, 'student', s1.department_id, 'Personal', '2026-10-05', '2026-10-06', 'Sister\'s wedding.', 'pending', '2026-09-26');
  }
  if (s2) leave(s2.user, 'student', s2.department_id, 'Event', '2026-09-07', '2026-09-07', 'Inter-college hackathon.', 'rejected', '2026-09-01');
  if (s3) leave(s3.user, 'student', s3.department_id, 'Medical', '2026-10-01', '2026-10-02', 'Dental surgery appointment.', 'pending', '2026-09-27');
  if (f1) leave(f1, 'faculty', f1.department_id, 'Personal', '2026-10-12', '2026-10-13', 'Conference presentation at IIT Madras.', 'pending', '2026-09-25');

  // ── Attendance corrections (student -> course faculty) ──
  if (s1) {
    const rows = db.attendance_log.filter((a) => a.student_id === s1.user.user_id && a.status === 'absent').slice(0, 3);
    rows.forEach((a, i) => {
      const cs = db.course_sections.find((c) => c.course_section_id === a.course_section_id);
      const course = db.courses.find((c) => c.course_id === a.course_id);
      const status = i === 0 ? 'accepted' : 'pending';
      if (status === 'accepted') a.status = 'present';
      db.attendance_requests.push({ request_id: id('acr'), college_id, department_id: s1.department_id, student_id: s1.user.user_id, student_name: `${s1.user.first_name} ${s1.user.last_name}`, course_id: a.course_id, course_code: course.course_code, course_section_id: a.course_section_id, faculty_id: cs.faculty_id, date: a.date, reason: i === 0 ? 'I was present; marked absent by mistake (signed the register).' : 'Attended but arrived 5 minutes late after lab.', status, decision_note: status === 'accepted' ? 'Verified with the register.' : null, decided_at: status === 'accepted' ? iso(a.date, '18:00:00') : null, created_at: iso(a.date, '17:00:00') });
    });
  }

  // ── Discussions, research, meetings ──
  const firstCourse = db.courses.find((c) => c.college_id === college_id);
  if (s1 && firstCourse && f1 && spec.plan.modules.includes('forum')) {
    const post_id = id('post');
    db.discussion_posts.push({ post_id, college_id, course_id: firstCourse.course_id, department_id: s1.department_id, author_id: s1.user.user_id, author_name: `${s1.user.first_name} ${s1.user.last_name}`, author_role: 'student', title: 'Master theorem case 3 doubt', content: 'When does the regularity condition fail? An example would help.', tag: 'help', created_at: iso('2026-09-10', '19:00:00'), reply_count: 1 });
    db.discussion_replies.push({ reply_id: id('rep'), post_id, college_id, author_id: f1.user_id, author_name: `${f1.first_name} ${f1.last_name}`, author_role: 'faculty', content: 'Try f(n) = n log n with a = 2, b = 2 — case 3 does not apply. We will discuss it on Monday.', created_at: iso('2026-09-11', '09:30:00') });
    db.discussion_posts.push({ post_id: id('post'), college_id, course_id: firstCourse.course_id, department_id: f1.department_id, author_id: f1.user_id, author_name: `${f1.first_name} ${f1.last_name}`, author_role: 'faculty', title: 'Internal 2 syllabus', content: 'Internal 2 covers Units 3 and 4 (greedy algorithms and dynamic programming).', tag: 'announcement', created_at: iso('2026-09-20', '12:00:00'), reply_count: 0 });
  }
  if (s1 && f1 && spec.plan.modules.includes('research')) {
    db.research_projects.push({ project_id: id('rp'), college_id, department_id: s1.department_id, title: 'Attendance anomaly detection with lightweight ML', abstract: 'Flag unusual attendance patterns early so mentors can reach out before students fall below the threshold.', supervisor_id: f1.user_id, supervisor_name: `${f1.first_name} ${f1.last_name}`, students: [{ user_id: s1.user.user_id }, ...(s2 ? [{ user_id: s2.user.user_id }] : [])], status: 'active', progress: 45, milestones: [{ milestone_id: id('ms'), title: 'Literature review', due_date: '2026-08-28', status: 'completed' }, { milestone_id: id('ms'), title: 'Prototype model', due_date: '2026-10-15', status: 'in-progress' }, { milestone_id: id('ms'), title: 'Final report', due_date: '2026-11-30', status: 'pending' }], submission_notes: 'Baseline isolation-forest model trained on anonymised data.', faculty_feedback: 'Good start. Add precision/recall on the September data.', uploads: [], created_at: iso('2026-08-05') });
    db.meetings.push({ meeting_id: id('mt'), college_id, faculty_id: f1.user_id, student_id: s1.user.user_id, date: '2026-10-03', time: '15:30', agenda: 'Project prototype review', mode: 'In person', created_at: iso('2026-09-26') });
  }

  // ── Events, resources, announcements ──
  const director = db.users.find((u) => u.college_id === college_id && u.role === 'superadmin');
  db.events.push({ event_id: id('ev'), college_id, department_id: null, title: 'Campus placement drive', date: '2026-10-09', time: '10:00', venue: 'Main auditorium', description: 'Final-year and pre-final-year students may attend.', created_by: director?.user_id ?? null, created_at: iso('2026-09-15') });
  db.events.push({ event_id: id('ev'), college_id, department_id: `${college_id}_${spec.departments[0].code.toLowerCase()}`, title: `${spec.departments[0].code} department tech talk`, date: '2026-10-15', time: '15:00', venue: 'Seminar hall 1', description: 'Guest talk on distributed systems in practice.', created_by: people.hods[0]?.user_id ?? null, created_at: iso('2026-09-20') });
  const resources = [['Seminar hall 1', 'hall', 120], ['Computing lab 2', 'lab', 60], ['Conference room', 'room', 20], ['Portable projector', 'equipment', 1]] as const;
  for (const [name, type, capacity] of resources) db.resources.push({ resource_id: id('res'), college_id, name, type, capacity, location: 'Main block', status: 'available' });
  if (f1) {
    const hall = db.resources.find((r) => r.college_id === college_id && r.type === 'hall');
    db.resource_bookings.push({ booking_id: id('bk'), college_id, resource_id: hall.resource_id, resource_name: hall.name, requested_by: f1.user_id, requester_name: `${f1.first_name} ${f1.last_name}`, department_id: f1.department_id, date: '2026-10-08', time_slot: '14:00-16:00', purpose: 'Guest lecture for semester 5', status: 'pending', decided_by: null, created_at: iso('2026-09-24') });
  }
  if (director) db.announcements.push({ announcement_id: id('an'), college_id, audience: 'all', department_id: null, course_section_id: null, title: 'Mid-semester break', message: 'The college will remain closed from 19 to 23 October for the mid-semester break.', author_id: director.user_id, author_name: `${director.first_name} ${director.last_name}`, author_role: 'superadmin', created_at: iso('2026-09-22', '10:00:00') });
  if (people.hods[0]) db.announcements.push({ announcement_id: id('an'), college_id, audience: 'student', department_id: people.hods[0].department_id, course_section_id: null, title: 'Internal 2 timetable', message: 'Internal 2 examinations begin on 19 October. The detailed timetable is on the notice board.', author_id: people.hods[0].user_id, author_name: `${people.hods[0].first_name} ${people.hods[0].last_name}`, author_role: 'head', created_at: iso('2026-09-25', '12:00:00') });

  return { college_id, people, spec };
}

// ── The two colleges ────────────────────────────────────────────────────────
const dit = buildCollege({
  code: 'DIT', name: 'Demo Institute of Technology', domain: 'dit.edu', city: 'Hyderabad', state: 'Telangana', type: 'private',
  plan: { key: 'growth', student_seats: 60, faculty_seats: 15, modules: ['research', 'analytics', 'fees', 'forum'], term_years: 2 },
  grading: GRADING_10PT, attendance_min_pct: 75,
  studentFormat: [{ type: 'year', format: 'YYYY' }, { type: 'dept' }, { type: 'seq', width: 3, reset: 'dept_year' }],
  facultyFormat: [{ type: 'text', value: 'FAC-' }, { type: 'dept' }, { type: 'text', value: '-' }, { type: 'seq', width: 3, reset: 'dept' }],
  sections: ['A', 'B'], studentsPerSection: 10,
  customFields: [
    { key: 'admission_category', label: 'Admission category', type: 'select', options: ['General', 'OBC', 'SC', 'ST', 'EWS'], required: true, applies_to: 'student' },
    { key: 'parent_phone', label: 'Parent phone', type: 'phone', options: [], required: false, applies_to: 'student' },
  ],
  departments: [
    {
      code: 'CSE', name: 'Computer Science and Engineering', hod: ['Anita', 'Rao'],
      faculty: [['Meera', 'Iyer', 'Associate Professor'], ['Arjun', 'Nair', 'Assistant Professor'], ['Kavitha', 'Reddy', 'Assistant Professor'], ['Rahul', 'Verma', 'Assistant Professor']],
      courses: [['CS301', 'Design and Analysis of Algorithms', 4], ['CS302', 'Database Management Systems', 4], ['CS303', 'Computer Networks', 3], ['CS304', 'Operating Systems', 3]],
    },
    {
      code: 'ECE', name: 'Electronics and Communication Engineering', hod: ['Vikram', 'Singh'],
      faculty: [['Lakshmi', 'Menon', 'Associate Professor'], ['Naveen', 'Kulkarni', 'Assistant Professor'], ['Farah', 'Khan', 'Assistant Professor']],
      courses: [['EC301', 'Digital Signal Processing', 4], ['EC302', 'Microprocessors and Microcontrollers', 4], ['EC303', 'Communication Systems', 3]],
    },
  ],
});

const rvc = buildCollege({
  code: 'RVC', name: 'Riverside College', domain: 'rvc.edu', city: 'Kochi', state: 'Kerala', type: 'government',
  plan: { key: 'starter', student_seats: 20, faculty_seats: 5, modules: [], term_years: 1 },
  grading: GRADING_4PT, attendance_min_pct: 80,
  studentFormat: [{ type: 'text', value: 'RVC/' }, { type: 'year', format: 'YY' }, { type: 'text', value: '/' }, { type: 'seq', width: 4, reset: 'year' }],
  facultyFormat: [{ type: 'text', value: 'RVC-F' }, { type: 'seq', width: 3, reset: 'never' }],
  sections: ['A'], studentsPerSection: 6,
  customFields: [],
  departments: [
    {
      code: 'CSE', name: 'Computer Science', hod: ['Thomas', 'George'],
      faculty: [['Anjali', 'Varghese', 'Assistant Professor']],
      courses: [['RC301', 'Data Structures', 4], ['RC302', 'Web Technologies', 3]],
    },
  ],
});

// ── Platform support team ───────────────────────────────────────────────────
const staff = [
  { email: 'admin@platform.bp', role: 'PLATFORM_SUPER_ADMIN', first_name: 'Eleanor', last_name: 'Vance', tier: 4, designation: 'Platform administrator' },
  { email: 'manager@platform.bp', role: 'PLATFORM_SUPPORT_MANAGER', first_name: 'Sarah', last_name: 'Jenkins', tier: 3, designation: 'Support manager' },
  { email: 'tech@platform.bp', role: 'PLATFORM_TECH_SUPPORT', first_name: 'David', last_name: 'Chen', tier: 2, designation: 'Technical support engineer' },
  { email: 'tech2@platform.bp', role: 'PLATFORM_TECH_SUPPORT', first_name: 'Ananya', last_name: 'Roy', tier: 2, designation: 'Technical support engineer' },
  { email: 'agent@platform.bp', role: 'PLATFORM_SUPPORT_AGENT', first_name: 'Alex', last_name: 'Mercer', tier: 1, designation: 'Support agent' },
  { email: 'agent2@platform.bp', role: 'PLATFORM_SUPPORT_AGENT', first_name: 'Priya', last_name: 'Sharma', tier: 1, designation: 'Support agent' },
  { email: 'sales@platform.bp', role: 'PLATFORM_SALES_SUPPORT', first_name: 'Rohit', last_name: 'Bansal', tier: 1, designation: 'Sales and onboarding' },
];
const staffRows = staff.map((s, i) => addUser({ ...s, tier_level: s.tier, display_id: `SUP-${String(i + 1).padStart(3, '0')}` }, DEMO_PASSWORDS.support));

// ── Support tickets (ISO timestamps; SLA computed by the support module) ────
let ticketSeq = 1;
function ticket(college: any, raiserEmail: string, t: any) {
  const raiser = db.users.find((u) => u.email === raiserEmail)!;
  const created = t.created;
  const messages: any[] = [{ message_id: id('msg'), author_id: raiser.user_id, author_name: `${raiser.first_name} ${raiser.last_name}`, author_role: raiser.role, kind: 'public', text: t.description, created_at: created }];
  for (const m of t.messages ?? []) {
    const a = staffRows.find((s) => s.email === m.from) ?? raiser;
    messages.push({ message_id: id('msg'), author_id: a.user_id, author_name: `${a.first_name} ${a.last_name}`, author_role: a.role, kind: m.kind ?? 'public', text: m.text, created_at: m.at });
  }
  const assignee = t.assignee ? staffRows.find((s) => s.email === t.assignee) : null;
  const firstStaff = messages.find((m) => m.kind === 'public' && m.author_role.startsWith('PLATFORM_'));
  db.support_tickets.push({
    ticket_id: id('tkt'), display_id: `TKT-${String(1000 + ticketSeq++)}`, college_id: college.college_id,
    raised_by: raiser.user_id, raised_by_name: `${raiser.first_name} ${raiser.last_name}`, raised_by_role: raiser.role,
    subject: t.subject, category: t.category, description: t.description, priority: t.priority, status: t.status,
    tier: t.tier, assigned_to_id: assignee?.user_id ?? null, created_at: created, updated_at: messages[messages.length - 1].created_at,
    first_response_at: firstStaff?.created_at ?? null, resolved_at: t.status === 'resolved' ? t.resolvedAt : null, closed_at: null,
    escalations: t.escalations ?? [], messages,
  });
}
ticket(dit, 'spoc@dit.edu', { subject: 'CSV import rejects roll numbers with lowercase department codes', category: 'People and accounts', priority: 'medium', status: 'open', tier: 1, created: '2026-09-28T04:30:00.000Z', description: 'Our CSV has roll numbers like 2024cse021. The import says they do not match the format. Can it accept lowercase?' });
ticket(dit, 'director@dit.edu', { subject: 'Department report PDF shows blank chart', category: 'Reports', priority: 'high', status: 'in_progress', tier: 2, assignee: 'tech@platform.bp', created: '2026-09-27T06:00:00.000Z', description: 'The CSE cohort PDF downloads but the attendance chart page is empty.', escalations: [{ from_tier: 1, to_tier: 2, reason: 'Needs investigation of PDF generation.', by: 'agent@platform.bp', at: '2026-09-27T07:10:00.000Z' }], messages: [{ from: 'agent@platform.bp', text: 'Thanks for reporting. I have escalated this to our technical team.', at: '2026-09-27T07:10:00.000Z' }, { from: 'tech@platform.bp', kind: 'internal', text: 'Reproduced with the CSE cohort. The chart renderer times out on 20+ rows.', at: '2026-09-27T09:00:00.000Z' }] });
ticket(dit, 'finance@dit.edu', { subject: 'Need a duplicate receipt format with college seal', category: 'Billing and fees', priority: 'low', status: 'waiting_on_customer', tier: 1, assignee: 'agent2@platform.bp', created: '2026-09-24T05:00:00.000Z', description: 'Parents are asking for receipts with the college seal. Can we upload a seal image?', messages: [{ from: 'agent2@platform.bp', text: 'Could you share the seal image (PNG, transparent background) so we can check the layout?', at: '2026-09-24T08:00:00.000Z' }] });
ticket(rvc, 'spoc@rvc.edu', { subject: 'Unable to change the attendance threshold to 80%', category: 'Configuration', priority: 'critical', status: 'resolved', tier: 2, assignee: 'tech2@platform.bp', created: '2026-09-20T03:00:00.000Z', resolvedAt: '2026-09-20T05:30:00.000Z', description: 'Saving the attendance rule shows an error.', escalations: [{ from_tier: 1, to_tier: 2, reason: 'Configuration save failing.', by: 'agent@platform.bp', at: '2026-09-20T03:20:00.000Z' }], messages: [{ from: 'agent@platform.bp', text: 'Looking into this now.', at: '2026-09-20T03:15:00.000Z' }, { from: 'tech2@platform.bp', text: 'Fixed — the threshold now saves correctly. Please confirm.', at: '2026-09-20T05:30:00.000Z' }] });
ticket(rvc, 'director@rvc.edu', { subject: 'Question about upgrading to the Growth plan', category: 'Billing and fees', priority: 'medium', status: 'open', tier: 1, created: '2026-09-28T09:00:00.000Z', description: 'We want the research and analytics modules next semester. What does the upgrade cost?' });

// ── Write ───────────────────────────────────────────────────────────────────
const out = path.join(__dirname, '..', 'data', 'mock-db.json');
fs.writeFileSync(out, JSON.stringify(db, null, 2));
const counts = Object.fromEntries(Object.entries(db).map(([k, v]) => [k, v.length]).filter(([, n]) => (n as number) > 0));
console.log(`Wrote ${out}`);
console.log(counts);
console.log('Colleges:', [dit, rvc].map((c) => c.college_id).join(', '));
