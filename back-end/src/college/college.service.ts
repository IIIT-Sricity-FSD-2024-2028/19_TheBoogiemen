import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { InMemoryDbService } from '../database/in-memory-db.service';
import { PasswordService } from '../auth/password.service';
import { ErrorCode, errorBody } from '../common/errors/error-codes';
import { assertSeatAvailable, getActiveSubscription, planStatus } from '../common/billing/subscription';
import { CampusScope, findInCollege, inCollege } from '../core/scope';
import { DIRECTOR_ROLES, HOD_ROLES, isCollegeAdmin, isDirector, isHod, roleKind } from '../core/roles';
import { fullName, newId, nowIso, publicUser } from '../core/util';
import { DEFAULT_GRADING, GradingConfig, validateGrading } from '../core/grading';
import { allocateId, DEFAULT_ID_FORMATS, IdTemplate, missingContext, previewId, validateId, validateTemplate } from './id-format';

const bad = (msg: string, details?: any) => new BadRequestException(errorBody(ErrorCode.BUSINESS_RULE_VIOLATION, msg, details));
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^[0-9+\-\s]{7,15}$/;

/** Roles each actor may create or manage. */
const GRANTS: Record<string, string[]> = {
  spoc: ['superadmin', 'head', 'FINANCE_ADMIN', 'faculty', 'student'],
  superadmin: ['head', 'FINANCE_ADMIN', 'faculty', 'student'],
  admin: ['head', 'FINANCE_ADMIN', 'faculty', 'student'],
  INSTITUTE_SUPER_ADMIN: ['head', 'FINANCE_ADMIN', 'faculty', 'student'],
  head: ['faculty', 'student'],
  DEPARTMENT_ADMIN_HOD: ['faculty', 'student'],
};

export const PERSON_ROLES = ['student', 'faculty', 'head', 'superadmin', 'FINANCE_ADMIN'] as const;

export interface PersonInput {
  role: string;
  first_name: string;
  last_name?: string;
  email: string;
  phone?: string;
  department_id?: string;
  programme_id?: string;
  batch_id?: string;
  section?: string;
  designation?: string;
  display_id?: string;
  custom_fields?: Record<string, any>;
}

export function defaultSettings(collegeId: string) {
  return {
    college_id: collegeId,
    term_type: 'semester',
    current_term: null,
    programmes: [],
    batches: [],
    sections: ['A'],
    grading: DEFAULT_GRADING,
    attendance_min_pct: 75,
    id_formats: { ...DEFAULT_ID_FORMATS },
    id_sequences: {},
    custom_fields: [],
    setup: { completed_at: null, steps: {} },
  };
}

@Injectable()
export class CollegeService {
  constructor(private readonly db: InMemoryDbService, private readonly passwords: PasswordService) {}

  // ── Settings ──────────────────────────────────────────────────────────────

  settingsRow(collegeId: string) {
    let row = this.db.college_settings.find((s) => s.college_id === collegeId);
    if (!row) {
      row = defaultSettings(collegeId);
      this.db.college_settings.push(row);
    }
    return row;
  }

  getSettings(scope: CampusScope) {
    const college = this.db.colleges.find((c) => c.college_id === scope.collegeId);
    const s = this.settingsRow(scope.collegeId);
    const { id_sequences, ...settings } = s;
    return {
      college,
      settings,
      departments: this.departments(scope),
      previews: Object.fromEntries(Object.entries(s.id_formats || {}).map(([k, t]) => [k, previewId(t as IdTemplate)])),
    };
  }

  updateProfile(scope: CampusScope, body: { name?: string; code?: string; city?: string; state?: string; type?: string }) {
    const college = this.db.colleges.find((c) => c.college_id === scope.collegeId);
    if (!college) throw new NotFoundException(errorBody(ErrorCode.RESOURCE_NOT_FOUND, 'College not found'));
    if (body.code !== undefined) {
      const code = String(body.code).trim().toUpperCase();
      if (!/^[A-Z0-9]{2,10}$/.test(code)) throw bad('College code must be 2-10 letters or digits.');
      if (this.db.colleges.some((c) => c.code === code && c.college_id !== college.college_id)) {
        throw new ConflictException(errorBody(ErrorCode.DUPLICATE_RESOURCE, 'Another college already uses this code.'));
      }
      college.code = code;
    }
    if (body.name !== undefined) {
      if (!String(body.name).trim()) throw bad('College name is required.');
      college.name = String(body.name).trim().slice(0, 160);
    }
    if (body.city !== undefined) college.city = String(body.city).trim().slice(0, 80) || null;
    if (body.state !== undefined) college.state = String(body.state).trim().slice(0, 80) || null;
    if (body.type !== undefined) {
      if (!['government', 'private', 'deemed'].includes(body.type)) throw bad('Type must be government, private or deemed.');
      college.type = body.type;
    }
    this.markStep(scope.collegeId, 'profile');
    this.db.persist();
    return college;
  }

  updateStructure(scope: CampusScope, body: any) {
    const s = this.settingsRow(scope.collegeId);
    if (body.term_type !== undefined) {
      if (!['semester', 'trimester', 'annual'].includes(body.term_type)) throw bad('Term type must be semester, trimester or annual.');
      s.term_type = body.term_type;
    }
    if (body.current_term !== undefined) {
      const t = body.current_term;
      if (t && (!t.label || !t.start || !t.end || t.end < t.start)) throw bad('Current term needs a label and a valid start and end date.');
      s.current_term = t || null;
    }
    if (body.programmes !== undefined) {
      if (!Array.isArray(body.programmes)) throw bad('Programmes must be a list.');
      const codes = new Set<string>();
      s.programmes = body.programmes.map((p: any) => {
        const code = String(p.code || '').trim().toUpperCase();
        if (!code || !p.name) throw bad('Every programme needs a code and a name.');
        if (codes.has(code)) throw bad(`Programme code ${code} is used twice.`);
        codes.add(code);
        const years = Number(p.duration_years);
        if (!Number.isInteger(years) || years < 1 || years > 6) throw bad('Programme duration must be 1 to 6 years.');
        return { programme_id: p.programme_id || newId('prg'), code, name: String(p.name).trim(), duration_years: years };
      });
    }
    if (body.batches !== undefined) {
      if (!Array.isArray(body.batches)) throw bad('Batches must be a list.');
      s.batches = body.batches.map((b: any) => {
        const start = Number(b.start_year);
        if (!Number.isInteger(start) || start < 2000 || start > 2100) throw bad('Batch start year is invalid.');
        if (!s.programmes.some((p: any) => p.programme_id === b.programme_id)) throw bad('Each batch must belong to a programme.');
        return { batch_id: b.batch_id || newId('bat'), label: String(b.label || '').trim() || `${start}`, start_year: start, programme_id: b.programme_id, current_semester: Number(b.current_semester) || 1 };
      });
    }
    if (body.sections !== undefined) {
      if (!Array.isArray(body.sections) || !body.sections.length) throw bad('Add at least one section.');
      const clean = [...new Set(body.sections.map((x: any) => String(x).trim().toUpperCase()).filter(Boolean))] as string[];
      if (clean.some((x) => !/^[A-Z0-9]{1,4}$/.test(x))) throw bad('Section names must be 1-4 letters or digits.');
      s.sections = clean;
    }
    this.markStep(scope.collegeId, 'structure');
    this.db.persist();
    return this.getSettings(scope);
  }

  updateGrading(scope: CampusScope, body: { grading?: GradingConfig; attendance_min_pct?: number }) {
    const s = this.settingsRow(scope.collegeId);
    if (body.grading !== undefined) {
      const err = validateGrading(body.grading);
      if (err) throw bad(err);
      s.grading = { scale: body.grading.scale, pass_pct: body.grading.pass_pct, bands: body.grading.bands.map((b) => ({ grade: b.grade.trim(), min_pct: b.min_pct, points: b.points })) };
    }
    if (body.attendance_min_pct !== undefined) {
      const pct = Number(body.attendance_min_pct);
      if (!Number.isFinite(pct) || pct < 0 || pct > 100) throw bad('Minimum attendance must be between 0 and 100.');
      s.attendance_min_pct = pct;
    }
    this.markStep(scope.collegeId, 'grading');
    this.db.persist();
    return this.getSettings(scope);
  }

  updateIdFormats(scope: CampusScope, body: Record<string, IdTemplate>) {
    const s = this.settingsRow(scope.collegeId);
    for (const kind of ['student', 'faculty', 'staff']) {
      if (body[kind] === undefined) continue;
      const err = validateTemplate(body[kind]);
      if (err) throw bad(`${kind[0].toUpperCase()}${kind.slice(1)} format: ${err}`);
      s.id_formats[kind] = body[kind];
    }
    this.markStep(scope.collegeId, 'id_formats');
    this.db.persist();
    return this.getSettings(scope);
  }

  previewFormat(template: IdTemplate) {
    const error = validateTemplate(template);
    return { error, preview: error ? null : previewId(template), examples: error ? [] : [1, 2, 3].map((n) => previewId(template).replace(/\d+$/, (m) => String(n).padStart(m.length, '0'))) };
  }

  updateCustomFields(scope: CampusScope, fields: any[]) {
    if (!Array.isArray(fields)) throw bad('Custom fields must be a list.');
    if (fields.length > 20) throw bad('At most 20 custom fields.');
    const keys = new Set<string>();
    const clean = fields.map((f) => {
      const label = String(f.label || '').trim();
      if (!label) throw bad('Every custom field needs a label.');
      const key = (f.key || label).toString().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40);
      if (!key || keys.has(key)) throw bad(`Custom field "${label}" is duplicated.`);
      keys.add(key);
      if (!['text', 'number', 'date', 'select', 'phone', 'email'].includes(f.type)) throw bad(`Custom field "${label}" has an unknown type.`);
      const options = f.type === 'select' ? (f.options || []).map((o: any) => String(o).trim()).filter(Boolean) : [];
      if (f.type === 'select' && options.length < 2) throw bad(`Custom field "${label}" needs at least two options.`);
      if (!['student', 'faculty'].includes(f.applies_to)) throw bad(`Custom field "${label}" must apply to students or faculty.`);
      return { key, label: label.slice(0, 60), type: f.type, options, required: !!f.required, applies_to: f.applies_to };
    });
    const s = this.settingsRow(scope.collegeId);
    s.custom_fields = clean;
    this.markStep(scope.collegeId, 'custom_fields');
    this.db.persist();
    return this.getSettings(scope);
  }

  completeSetup(scope: CampusScope) {
    const s = this.settingsRow(scope.collegeId);
    const missing: string[] = [];
    if (!this.departments(scope).length) missing.push('add at least one department');
    if (!s.programmes?.length) missing.push('add a programme');
    if (!s.batches?.length) missing.push('add a batch');
    if (missing.length) throw bad(`Before finishing setup: ${missing.join(', ')}.`);
    s.setup = { ...(s.setup || {}), completed_at: nowIso() };
    this.db.persist();
    return this.getSettings(scope);
  }

  private markStep(collegeId: string, step: string) {
    const s = this.settingsRow(collegeId);
    s.setup = { ...(s.setup || { completed_at: null }), steps: { ...(s.setup?.steps || {}), [step]: true } };
  }

  // ── Departments ───────────────────────────────────────────────────────────

  departments(scope: CampusScope) {
    return inCollege(scope, this.db.departments).map((d) => {
      const hod = d.hod_user_id ? this.db.users.find((u) => u.user_id === d.hod_user_id) : null;
      return {
        ...d,
        hod_name: hod ? fullName(hod) : null,
        student_count: this.db.students.filter((s) => s.department_id === d.department_id && this.isActive(s.user_id)).length,
        faculty_count: this.db.faculty.filter((f) => f.department_id === d.department_id && this.isActive(f.user_id)).length,
      };
    });
  }

  createDepartment(scope: CampusScope, body: { code: string; name: string }) {
    const code = String(body.code || '').trim().toUpperCase();
    const name = String(body.name || '').trim();
    if (!/^[A-Z0-9]{2,8}$/.test(code)) throw bad('Department code must be 2-8 letters or digits (e.g. CSE).');
    if (!name) throw bad('Department name is required.');
    if (inCollege(scope, this.db.departments).some((d) => d.department_code === code)) {
      throw new ConflictException(errorBody(ErrorCode.DUPLICATE_RESOURCE, `Department ${code} already exists.`));
    }
    const row = { department_id: newId('dep'), college_id: scope.collegeId, department_code: code, department_name: name.slice(0, 120), hod_user_id: null };
    this.db.departments.push(row);
    this.markStep(scope.collegeId, 'structure');
    this.db.persist();
    return row;
  }

  updateDepartment(scope: CampusScope, id: string, body: { name?: string; hod_user_id?: string | null }) {
    const d = findInCollege(scope, this.db.departments, (x) => x.department_id === id, 'Department');
    if (body.name !== undefined) {
      if (!String(body.name).trim()) throw bad('Department name is required.');
      d.department_name = String(body.name).trim();
    }
    if (body.hod_user_id !== undefined) {
      if (body.hod_user_id) {
        const hod = this.db.users.find((u) => u.user_id === body.hod_user_id && u.college_id === scope.collegeId);
        if (!hod || !isHod(hod.role)) throw bad('Choose a user with the HOD role.');
        if (hod.department_id !== d.department_id) throw bad('The HOD must belong to this department.');
      }
      d.hod_user_id = body.hod_user_id || null;
    }
    this.db.persist();
    return d;
  }

  // ── Overview (plan, seats) ────────────────────────────────────────────────

  overview(scope: CampusScope) {
    const college = this.db.colleges.find((c) => c.college_id === scope.collegeId);
    const sub = getActiveSubscription(this.db, scope.collegeId);
    const active = inCollege(scope, this.db.users).filter((u) => u.status !== 'inactive');
    const count = (roles: string[]) => active.filter((u) => roles.includes(u.role)).length;
    const s = this.settingsRow(scope.collegeId);
    return {
      college,
      subscription: sub ? { ...sub, plan_status: planStatus(sub) } : null,
      seats: {
        students: { used: count(['student']), total: sub?.student_seats ?? null },
        faculty: { used: count(['faculty', ...HOD_ROLES]), total: sub?.faculty_seats ?? null },
      },
      people: {
        students: count(['student']), faculty: count(['faculty']), hods: count([...HOD_ROLES]),
        directors: count([...DIRECTOR_ROLES]), finance: count(['FINANCE_ADMIN']),
      },
      departments: this.departments(scope).length,
      setup: s.setup,
      payments: inCollege(scope, this.db.payments).map((p) => ({ payment_id: p.payment_id, amount_paise: p.amount_paise, status: p.status, created_at: p.created_at })),
    };
  }

  // ── People ────────────────────────────────────────────────────────────────

  private isActive(userId: string) {
    return this.db.users.find((u) => u.user_id === userId)?.status !== 'inactive';
  }

  private canManage(scope: CampusScope, role: string) {
    return (GRANTS[scope.role] || []).includes(role);
  }

  private personView(u: any) {
    const student = u.role === 'student' ? this.db.students.find((s) => s.user_id === u.user_id) : null;
    const faculty = ['faculty', ...HOD_ROLES].includes(u.role) ? this.db.faculty.find((f) => f.user_id === u.user_id) : null;
    const dept = u.department_id ? this.db.departments.find((d) => d.department_id === u.department_id) : null;
    return {
      ...publicUser(u),
      name: fullName(u),
      role_kind: roleKind(u.role),
      department_code: dept?.department_code ?? null,
      department_name: dept?.department_name ?? null,
      section: student?.section ?? null,
      batch: student?.batch ?? null,
      batch_id: student?.batch_id ?? null,
      programme_id: student?.programme_id ?? null,
      semester: student?.semester ?? null,
      cgpa: student?.cgpa ?? null,
      designation: faculty?.designation ?? u.designation ?? null,
      custom_fields: student?.custom_fields ?? faculty?.custom_fields ?? {},
    };
  }

  listPeople(scope: CampusScope, q: { role?: string; department_id?: string; status?: string; search?: string }) {
    let rows = inCollege(scope, this.db.users).filter((u) => u.role !== 'spoc' || isCollegeAdmin(scope.role));
    if (isHod(scope.role)) rows = rows.filter((u) => u.department_id === scope.departmentId && ['student', 'faculty', ...HOD_ROLES].includes(u.role));
    if (scope.role === 'FINANCE_ADMIN' || scope.role === 'faculty') rows = rows.filter((u) => u.role === 'student');
    if (q.role) rows = rows.filter((u) => (q.role === 'hod' ? isHod(u.role) : q.role === 'director' ? isDirector(u.role) : u.role === q.role));
    if (q.department_id) rows = rows.filter((u) => u.department_id === q.department_id);
    if (q.status) rows = rows.filter((u) => (u.status || 'active') === q.status);
    if (q.search) {
      const s = q.search.toLowerCase();
      rows = rows.filter((u) => `${fullName(u)} ${u.email} ${u.display_id || ''}`.toLowerCase().includes(s));
    }
    return rows.map((u) => this.personView(u));
  }

  getPerson(scope: CampusScope, id: string) {
    const u = findInCollege(scope, this.db.users, (x) => x.user_id === id, 'Person');
    if (isHod(scope.role) && u.department_id !== scope.departmentId) throw new NotFoundException(errorBody(ErrorCode.RESOURCE_NOT_FOUND, 'Person not found'));
    return this.personView(u);
  }

  private tempPassword() {
    // Meets the password policy: upper, lower, digit, special.
    return `Bp${randomBytes(4).toString('hex')}#${Math.floor(10 + Math.random() * 89)}`;
  }

  /** Validates one person and returns the normalised record or a list of errors. */
  private checkPerson(scope: CampusScope, input: PersonInput, pendingEmails: Set<string>, pendingIds: Set<string>) {
    const errors: string[] = [];
    const settings = this.settingsRow(scope.collegeId);
    const role = input.role === 'hod' ? 'head' : input.role === 'director' ? 'superadmin' : input.role === 'finance' ? 'FINANCE_ADMIN' : input.role;
    if (!(PERSON_ROLES as readonly string[]).includes(role)) errors.push('role must be student, faculty, hod, director or finance');
    else if (!this.canManage(scope, role)) errors.push(`you cannot add ${roleKind(role)} accounts`);
    const first = String(input.first_name || '').trim();
    if (!first) errors.push('first name is required');
    const email = String(input.email || '').trim().toLowerCase();
    if (!EMAIL.test(email)) errors.push('a valid email is required');
    else if (this.db.users.some((u) => u.email?.toLowerCase() === email) || pendingEmails.has(email)) errors.push('email is already in use');
    if (input.phone && !PHONE.test(String(input.phone))) errors.push('phone must be 7-15 digits');

    let departmentId = input.department_id || null;
    if (isHod(scope.role)) departmentId = scope.departmentId;
    const dept = departmentId ? this.db.departments.find((d) => d.department_id === departmentId && d.college_id === scope.collegeId) : null;
    const needsDept = ['student', 'faculty', 'head'].includes(role);
    if (needsDept && !dept) errors.push('a department is required');

    let programme: any = null;
    let batch: any = null;
    let section: string | null = null;
    if (role === 'student') {
      batch = settings.batches.find((b: any) => b.batch_id === input.batch_id);
      if (!batch) errors.push('a batch is required');
      programme = batch ? settings.programmes.find((p: any) => p.programme_id === batch.programme_id) : null;
      section = input.section ? String(input.section).trim().toUpperCase() : null;
      if (!section || !settings.sections.includes(section)) errors.push(`section must be one of ${settings.sections.join(', ')}`);
    }

    // Custom fields for this role
    const custom: Record<string, any> = {};
    for (const f of settings.custom_fields || []) {
      if (f.applies_to !== (role === 'student' ? 'student' : 'faculty')) continue;
      const v = input.custom_fields?.[f.key];
      const empty = v === undefined || v === null || String(v).trim() === '';
      if (empty) {
        if (f.required) errors.push(`${f.label} is required`);
        continue;
      }
      if (f.type === 'select' && !f.options.includes(String(v))) errors.push(`${f.label} must be one of ${f.options.join(', ')}`);
      if (f.type === 'number' && !Number.isFinite(Number(v))) errors.push(`${f.label} must be a number`);
      if (f.type === 'phone' && !PHONE.test(String(v))) errors.push(`${f.label} must be a phone number`);
      if (f.type === 'email' && !EMAIL.test(String(v))) errors.push(`${f.label} must be an email`);
      if (f.type === 'date' && Number.isNaN(Date.parse(String(v)))) errors.push(`${f.label} must be a date`);
      custom[f.key] = String(v).trim();
    }

    // ID: provided (validated against the format) or generated from it.
    const kind = role === 'student' ? 'student' : ['faculty', 'head'].includes(role) ? 'faculty' : 'staff';
    const template: IdTemplate = settings.id_formats?.[kind] || DEFAULT_ID_FORMATS[kind];
    const ctx = { year: role === 'student' && batch ? batch.start_year : new Date().getFullYear(), deptCode: dept?.department_code, programmeCode: programme?.code, section };
    let displayId: string | null = input.display_id ? String(input.display_id).trim().toUpperCase() : null;
    if (displayId) {
      if (!validateId(template, displayId)) errors.push(`ID ${displayId} does not match the ${kind} format (e.g. ${previewId(template, ctx)})`);
      const taken = inCollege(scope, this.db.users).some((u) => (u.display_id || '').toUpperCase() === displayId) || pendingIds.has(displayId);
      if (taken) errors.push(`ID ${displayId} is already used`);
    } else {
      const miss = missingContext(template, ctx);
      if (miss) errors.push(`the ${kind} ID format needs ${miss}`);
    }

    return { errors, role, first, email, dept, batch, programme, section, custom, kind, template, ctx, displayId };
  }

  private seatRole(role: string): 'student' | 'faculty' | null {
    if (role === 'student') return 'student';
    if (role === 'faculty' || role === 'head') return 'faculty';
    return null;
  }

  private insertPerson(scope: CampusScope, c: ReturnType<CollegeService['checkPerson']>, input: PersonInput, password: string) {
    const settings = this.settingsRow(scope.collegeId);
    const takenIds = new Set(inCollege(scope, this.db.users).map((u) => (u.display_id || '').toUpperCase()));
    const displayId = c.displayId ?? allocateId(c.kind, c.template, c.ctx as any, settings.id_sequences, takenIds);
    const user = {
      user_id: newId('u'),
      college_id: scope.collegeId,
      email: c.email,
      username: c.email.split('@')[0],
      role: c.role,
      first_name: c.first,
      last_name: String(input.last_name || '').trim(),
      phone: input.phone ? String(input.phone).trim() : null,
      address: null,
      photo_file_id: null,
      status: 'active',
      must_change_password: true,
      department_id: c.dept?.department_id ?? null,
      display_id: displayId,
      designation: input.designation ? String(input.designation).trim() : c.role === 'superadmin' ? 'Director' : c.role === 'FINANCE_ADMIN' ? 'Finance Officer' : null,
      tier_level: null,
      password_hash: password,
      created_at: nowIso(),
      created_by: scope.userId,
    };
    this.db.users.push(user);
    if (c.role === 'student') {
      this.db.students.push({
        user_id: user.user_id, college_id: scope.collegeId, roll_no: displayId, first_name: user.first_name, last_name: user.last_name,
        email: user.email, phone: user.phone, department_id: user.department_id, branch: c.dept?.department_code ?? null,
        programme_id: c.programme?.programme_id ?? null, batch_id: c.batch?.batch_id ?? null, batch: c.batch?.label ?? null,
        section: c.section, semester: c.batch?.current_semester ?? 1, cgpa: null, dob: null, join_date: nowIso().slice(0, 10), custom_fields: c.custom,
      });
    } else if (['faculty', 'head'].includes(c.role)) {
      this.db.faculty.push({
        user_id: user.user_id, college_id: scope.collegeId, employee_id: displayId, first_name: user.first_name, last_name: user.last_name,
        email: user.email, phone: user.phone, department_id: user.department_id, designation: user.designation || (c.role === 'head' ? 'Head of Department' : 'Assistant Professor'), custom_fields: c.custom,
      });
      if (c.role === 'head' && c.dept && !c.dept.hod_user_id) c.dept.hod_user_id = user.user_id;
    }
    return user;
  }

  async createPerson(scope: CampusScope, input: PersonInput) {
    const c = this.checkPerson(scope, input, new Set(), new Set());
    if (c.errors.length) throw bad(`Cannot add this person: ${c.errors.join('; ')}.`, { errors: c.errors });
    const seat = this.seatRole(c.role);
    if (seat) assertSeatAvailable(this.db, scope.collegeId, seat);
    const temporary = this.tempPassword();
    const user = this.insertPerson(scope, c, input, await this.passwords.hash(temporary));
    this.db.persist();
    return { person: this.personView(user), temporary_password: temporary };
  }

  /**
   * CSV import. `dry_run` validates every row (and seat capacity for the whole
   * file) without writing; the commit call re-validates and creates all valid
   * rows. Each created account gets its own temporary password, returned once.
   */
  async importPeople(scope: CampusScope, rows: PersonInput[], dryRun: boolean) {
    if (!Array.isArray(rows) || rows.length === 0) throw bad('The file has no rows.');
    if (rows.length > 500) throw bad('Import at most 500 people at a time.');
    const pendingEmails = new Set<string>();
    const pendingIds = new Set<string>();
    const settings = this.settingsRow(scope.collegeId);
    const seqCopy = { ...(settings.id_sequences || {}) };
    const takenIds = new Set(inCollege(scope, this.db.users).map((u) => (u.display_id || '').toUpperCase()));
    const results = rows.map((row, i) => {
      const c = this.checkPerson(scope, row, pendingEmails, pendingIds);
      let displayId = c.displayId;
      if (!c.errors.length) {
        pendingEmails.add(c.email);
        if (!displayId) displayId = allocateId(c.kind, c.template, c.ctx as any, seqCopy, new Set([...takenIds, ...pendingIds]));
        pendingIds.add(displayId.toUpperCase());
      }
      return { row: i + 1, ok: c.errors.length === 0, errors: c.errors, email: c.email, name: `${c.first} ${row.last_name || ''}`.trim(), role: c.role, display_id: c.errors.length ? null : displayId, check: c, input: row };
    });

    // Seat check for the whole file
    const sub = getActiveSubscription(this.db, scope.collegeId);
    const seatErrors: string[] = [];
    if (sub) {
      for (const seat of ['student', 'faculty'] as const) {
        const adding = results.filter((r) => r.ok && this.seatRole(r.role) === seat).length;
        if (!adding) continue;
        const roles = seat === 'student' ? ['student'] : ['faculty', ...HOD_ROLES];
        const used = inCollege(scope, this.db.users).filter((u) => roles.includes(u.role) && u.status !== 'inactive').length;
        const cap = seat === 'student' ? sub.student_seats : sub.faculty_seats;
        if (used + adding > cap) seatErrors.push(`This file adds ${adding} ${seat} account(s) but only ${Math.max(0, cap - used)} ${seat} seat(s) are free on your plan.`);
      }
    }

    const summary = { total: results.length, valid: results.filter((r) => r.ok).length, invalid: results.filter((r) => !r.ok).length, seat_errors: seatErrors };
    const view = (r: any) => ({ row: r.row, ok: r.ok, errors: r.errors, email: r.email, name: r.name, role: roleKind(r.role), display_id: r.display_id });
    if (dryRun || seatErrors.length) return { dry_run: true, summary, results: results.map(view), created: [] };

    const created: any[] = [];
    for (const r of results.filter((x) => x.ok)) {
      const temporary = this.tempPassword();
      const user = this.insertPerson(scope, { ...r.check, displayId: r.display_id }, r.input, await this.passwords.hash(temporary));
      created.push({ user_id: user.user_id, name: fullName(user), email: user.email, display_id: user.display_id, role: roleKind(user.role), temporary_password: temporary });
    }
    this.markStep(scope.collegeId, 'people');
    this.db.persist();
    return { dry_run: false, summary, results: results.map(view), created };
  }

  private managedTarget(scope: CampusScope, id: string) {
    const u = findInCollege(scope, this.db.users, (x) => x.user_id === id, 'Person');
    if (!this.canManage(scope, u.role)) throw new ForbiddenException(errorBody(ErrorCode.INSUFFICIENT_ROLE, `You cannot manage ${roleKind(u.role)} accounts.`));
    if (isHod(scope.role) && u.department_id !== scope.departmentId) throw new NotFoundException(errorBody(ErrorCode.RESOURCE_NOT_FOUND, 'Person not found'));
    if (u.user_id === scope.userId) throw bad('You cannot change your own account here. Use My Account.');
    return u;
  }

  updatePerson(scope: CampusScope, id: string, body: any) {
    const u = this.managedTarget(scope, id);
    const settings = this.settingsRow(scope.collegeId);
    const student = this.db.students.find((s) => s.user_id === u.user_id);
    const faculty = this.db.faculty.find((f) => f.user_id === u.user_id);
    if (body.first_name !== undefined) {
      if (!String(body.first_name).trim()) throw bad('First name is required.');
      u.first_name = String(body.first_name).trim();
    }
    if (body.last_name !== undefined) u.last_name = String(body.last_name).trim();
    if (body.phone !== undefined) {
      if (body.phone && !PHONE.test(String(body.phone))) throw bad('Phone must be 7-15 digits.');
      u.phone = body.phone || null;
    }
    if (body.designation !== undefined) {
      u.designation = String(body.designation).trim() || null;
      if (faculty) faculty.designation = u.designation;
    }
    if (body.department_id !== undefined && !isHod(scope.role)) {
      const dept = this.db.departments.find((d) => d.department_id === body.department_id && d.college_id === scope.collegeId);
      if (!dept) throw bad('Unknown department.');
      u.department_id = dept.department_id;
      if (student) { student.department_id = dept.department_id; student.branch = dept.department_code; }
      if (faculty) faculty.department_id = dept.department_id;
    }
    if (body.section !== undefined && student) {
      const section = String(body.section).trim().toUpperCase();
      if (!settings.sections.includes(section)) throw bad(`Section must be one of ${settings.sections.join(', ')}.`);
      student.section = section;
    }
    if (body.custom_fields !== undefined) {
      const target = student || faculty;
      if (target) target.custom_fields = { ...(target.custom_fields || {}), ...body.custom_fields };
    }
    for (const t of [student, faculty]) if (t) { t.first_name = u.first_name; t.last_name = u.last_name; t.phone = u.phone; }
    this.db.persist();
    return this.personView(u);
  }

  setStatus(scope: CampusScope, id: string, status: 'active' | 'inactive') {
    const u = this.managedTarget(scope, id);
    if (status === 'active' && u.status === 'inactive') {
      const seat = this.seatRole(u.role);
      if (seat) assertSeatAvailable(this.db, scope.collegeId, seat);
    }
    u.status = status;
    this.db.persist();
    return this.personView(u);
  }

  async resetPassword(scope: CampusScope, id: string) {
    const u = this.managedTarget(scope, id);
    const temporary = this.tempPassword();
    u.password_hash = await this.passwords.hash(temporary);
    u.must_change_password = true;
    this.db.persist();
    return { person: this.personView(u), temporary_password: temporary };
  }
}
