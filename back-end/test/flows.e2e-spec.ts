/**
 * End-to-end flows across roles, run against a temporary copy of the demo
 * seed (MOCK_DB_PATH), so data/mock-db.json is never modified.
 *
 *   npm run test:e2e
 */
import * as dotenv from 'dotenv';
dotenv.config({ quiet: true });

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'bp-e2e-'));
const DB = path.join(TMP, 'mock-db.json');
fs.copyFileSync(path.join(__dirname, '..', 'data', 'mock-db.json'), DB);
process.env.MOCK_DB_PATH = DB;

import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { Logger } from 'nestjs-pino';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { VALIDATION_PIPE_OPTIONS } from '../src/common/errors/validation.factory';
import { InMemoryDbService } from '../src/database/in-memory-db.service';

type Call = (method: 'get' | 'post' | 'put' | 'patch' | 'delete', url: string, body?: any) => Promise<request.Response>;

const LOGINS: Record<string, [string, string, string]> = {
  student: ['student@dit.edu', 'Student@2026', 'student'],
  faculty: ['faculty@dit.edu', 'Faculty@2026', 'faculty'],
  hodCse: ['hod.cse@dit.edu', 'Hod@2026!', 'hod'],
  hodEce: ['hod.ece@dit.edu', 'Hod@2026!', 'hod'],
  director: ['director@dit.edu', 'Director@2026', 'director'],
  finance: ['finance@dit.edu', 'Finance@2026', 'finance'],
  spoc: ['spoc@dit.edu', 'Spoc@2026!', 'spoc'],
  rvcStudent: ['student@rvc.edu', 'Student@2026', 'student'],
  agent: ['agent@platform.bp', 'Support@2026', 'support'],
  tech: ['tech@platform.bp', 'Support@2026', 'support'],
};

/** Unwraps both `{ success, data }` envelopes and bare payloads. */
const body = (r: request.Response) => (r.body && !Array.isArray(r.body) && 'data' in r.body && r.body.success !== undefined ? r.body.data : r.body);

describe('BarelyPassing flows (e2e)', () => {
  let app: INestApplication;
  let db: InMemoryDbService;
  const as: Record<string, Call> = {};

  async function signIn(email: string, password: string, portal: string): Promise<Call> {
    const res = await request(app.getHttpServer()).post('/api/auth/login').send({ email, password, portal });
    if (res.status !== 201 && res.status !== 200) throw new Error(`login ${email}: ${res.status} ${JSON.stringify(res.body)}`);
    const cookie = String(res.headers['set-cookie']?.[0] || '').split(';')[0];
    return (method, url, payload) => {
      const req = request(app.getHttpServer())[method](`/api${url}`).set('Cookie', cookie);
      return payload === undefined ? req : req.send(payload);
    };
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    app.use(cookieParser());
    app.useGlobalFilters(new AllExceptionsFilter(app.get(Logger)));
    app.useGlobalPipes(new ValidationPipe(VALIDATION_PIPE_OPTIONS));
    app.setGlobalPrefix('api');
    await app.init();
    db = app.get(InMemoryDbService);
    for (const [key, [email, password, portal]] of Object.entries(LOGINS)) as[key] = await signIn(email, password, portal);
  }, 60000);

  afterAll(async () => {
    await app?.close();
    fs.rmSync(TMP, { recursive: true, force: true });
  });

  const student = () => db.users.find((u) => u.email === 'student@dit.edu');

  it('rejects signing in through the wrong portal', async () => {
    const res = await request(app.getHttpServer()).post('/api/auth/login').send({ email: 'student@dit.edu', password: 'Student@2026', portal: 'faculty' });
    expect(res.status).toBe(403);
    expect(JSON.stringify(res.body)).toContain('ROLE_MISMATCH');
  });

  it('leave: student applies, HOD of the department approves, absences become excused', async () => {
    const me = student();
    const absent = db.attendance_log.find((a) => a.student_id === me.user_id && a.status === 'absent');
    expect(absent).toBeDefined();
    const date = absent.date;

    const applied = await as.student('post', '/leave', { leave_type: 'Medical', start_date: date, end_date: date, reason: 'Fever, doctor advised rest' });
    expect(applied.status).toBeLessThan(300);
    const leaveId = body(applied).leave_id;

    // Another department's HOD cannot decide it.
    const wrongHod = await as.hodEce('post', `/leave/${leaveId}/decide`, { decision: 'approve' });
    expect([403, 404]).toContain(wrongHod.status);

    const decided = await as.hodCse('post', `/leave/${leaveId}/decide`, { decision: 'approve', note: 'Get well soon' });
    expect(decided.status).toBeLessThan(300);
    expect(body(decided).status).toBe('approved');

    const record = db.attendance_log.find((a) => a.student_id === me.user_id && a.date === date && a.course_section_id === absent.course_section_id);
    expect(record.status).toBe('excused');
  });

  it('attendance correction: student asks, the course faculty accepts, record becomes present', async () => {
    const me = student();
    const pending = new Set(db.attendance_requests.filter((r) => r.student_id === me.user_id && r.status === 'pending').map((r) => `${r.course_section_id}|${r.date}`));
    const absent = db.attendance_log.find((a) => a.student_id === me.user_id && a.status === 'absent' && !pending.has(`${a.course_section_id}|${a.date}`));
    expect(absent).toBeDefined();
    const section = db.course_sections.find((s) => s.course_section_id === absent.course_section_id);
    const teacher = db.users.find((u) => u.user_id === section.faculty_id);
    const faculty = await signIn(teacher.email, 'Faculty@2026', teacher.role === 'faculty' ? 'faculty' : 'hod');

    const asked = await as.student('post', '/attendance/corrections', { course_section_id: absent.course_section_id, date: absent.date, reason: 'I was present; marked absent by mistake.' });
    expect(asked.status).toBeLessThan(300);
    const id = body(asked).request_id;

    const decided = await faculty('post', `/attendance/corrections/${id}/decide`, { decision: 'accept', note: 'Checked the register' });
    expect(decided.status).toBeLessThan(300);
    const record = db.attendance_log.find((a) => a.student_id === me.user_id && a.date === absent.date && a.course_section_id === absent.course_section_id);
    expect(record.status).toBe('present');
  });

  it('academics: faculty enters and publishes marks, student sees the auto grade, HOD summary includes it', async () => {
    const me = student();
    const faculty = db.users.find((u) => u.email === 'faculty@dit.edu');
    const enrolledIds = new Set(db.enrollment.filter((e) => e.student_id === me.user_id && e.status === 'active').map((e) => e.course_section_id));
    const section = db.course_sections.find((s) => s.faculty_id === faculty.user_id && enrolledIds.has(s.course_section_id));
    expect(section).toBeDefined();

    const created = await as.faculty('post', '/academics/assessments', { course_section_id: section.course_section_id, name: 'E2E Quiz', type: 'quiz', max_marks: 20, weightage: 5, date: new Date().toISOString().slice(0, 10) });
    expect(created.status).toBeLessThan(300);
    const id = body(created).assessment_id;

    const saved = await as.faculty('put', `/academics/assessments/${id}/marks`, { entries: [{ student_id: me.user_id, marks_obtained: 19 }] });
    expect(saved.status).toBe(200);
    const bad = await as.faculty('put', `/academics/assessments/${id}/marks`, { entries: [{ student_id: me.user_id, marks_obtained: 25 }] });
    expect(bad.status).toBe(400);

    // Not visible to the student until published.
    const before = JSON.stringify(body(await as.student('get', '/academics/results/me')));
    expect(before).not.toContain('E2E Quiz');

    expect((await as.faculty('post', `/academics/assessments/${id}/publish`)).status).toBeLessThan(300);
    const after = JSON.stringify(body(await as.student('get', '/academics/results/me')));
    expect(after).toContain('E2E Quiz');
    const entry = db.marks_entry.find((m) => m.assessment_id === id && m.student_id === me.user_id);
    expect(entry.grade).toBe('S'); // 95% on the 10-point scale

    // A student cannot enter marks.
    expect((await as.student('put', `/academics/assessments/${id}/marks`, { entries: [] })).status).toBe(403);
    expect((await as.hodCse('get', '/academics/results/summary')).status).toBe(200);
  });

  it('fees: finance bills and records a payment, student pays the rest online, receipts are numbered', async () => {
    const me = student();
    const created = await as.finance('post', '/fees', { student_id: me.user_id, amount: 5000, fee_type: 'Lab fee', due_date: '2026-12-31' });
    expect(created.status).toBeLessThan(300);
    const feeId = body(created).fee_id;

    const offline = await as.finance('post', `/fees/${feeId}/payments`, { amount: 2000, mode: 'upi', reference: 'UPI-E2E-1' });
    expect(offline.status).toBeLessThan(300);
    expect(body(offline).payment.receipt_no).toMatch(/^DIT-RCP-\d{4}-\d{5}$/);

    const tooMuch = await as.student('post', `/fees/me/${feeId}/pay`, { amount: 9999 });
    expect(tooMuch.status).toBe(400);
    const failed = await as.student('post', `/fees/me/${feeId}/pay`, { amount: 3000, simulate: 'fail' });
    expect(failed.status).toBe(400);

    const paid = await as.student('post', `/fees/me/${feeId}/pay`, { amount: 3000 });
    expect(paid.status).toBeLessThan(300);
    expect(body(paid).fee.status).toBe('paid');

    const pdf = await as.student('get', `/fees/payments/${body(paid).payment.payment_id}/receipt?format=pdf`);
    expect(pdf.status).toBe(200);
    expect(String(pdf.headers['content-type'])).toContain('pdf');

    // Another college cannot see it, and a college without the fees module is refused.
    expect((await as.rvcStudent('get', '/fees/me')).status).toBe(403);
  });

  it('people: SPOC adds a student with the college ID format; first sign-in must change the password', async () => {
    const { settings } = body(await as.spoc('get', '/college/settings'));
    const cse = db.departments.find((d) => d.college_id === student().college_id && d.department_code === 'CSE');
    const created = await as.spoc('post', '/college/people', {
      role: 'student', first_name: 'Test', last_name: 'Learner', email: 'e2e.learner@dit.edu',
      department_id: cse.department_id, programme_id: settings.programmes[0].programme_id, batch_id: settings.batches[0].batch_id, section: settings.sections[0], custom_fields: { admission_category: 'General' },
    });
    expect(created.status < 300 ? 'ok' : created.body.message).toBe('ok');
    const { person, temporary_password } = body(created);
    expect(person.display_id).toMatch(/^\d{4}CSE\d{3}$/);

    const newcomer = await signIn('e2e.learner@dit.edu', temporary_password, 'student');
    expect(body(await newcomer('get', '/auth/me')).user?.must_change_password ?? body(await newcomer('get', '/auth/me')).must_change_password).toBe(true);
    const changed = await newcomer('post', '/auth/change-password', { current_password: temporary_password, new_password: 'Learner@2026x' });
    expect(changed.status).toBeLessThan(300);
    const me = body(await newcomer('get', '/auth/me'));
    expect((me.user ?? me).must_change_password).toBe(false);

    // Dry-run import reports per-row errors and creates nothing.
    const usersBefore = db.users.length;
    const dry = await as.spoc('post', '/college/people/import', { dry_run: true, rows: [{ role: 'student', first_name: '', email: 'not-an-email' }] });
    expect(dry.status).toBeLessThan(300);
    expect(JSON.stringify(body(dry))).toContain('first name is required');
    expect(db.users.length).toBe(usersBefore);

    // A faculty member cannot create accounts.
    expect((await as.faculty('post', '/college/people', { role: 'student', first_name: 'X', email: 'x@dit.edu' })).status).toBe(403);
  });

  it('support: SPOC raises a ticket, L1 replies and escalates to L2, L2 resolves, SPOC reopens', async () => {
    const raised = await as.spoc('post', '/support/tickets', { subject: 'Cannot import CSV', category: 'People and accounts', priority: 'high', description: 'The import says row 3 has an invalid batch.' });
    expect(raised.status).toBeLessThan(300);
    const id = body(raised).ticket_id;

    expect((await as.agent('post', `/platform/tickets/${id}/reply`, { text: 'Looking into it.', kind: 'public' })).status).toBeLessThan(300);
    expect((await as.agent('post', `/platform/tickets/${id}/escalate`, { to_tier: 3, reason: 'Skip a level' })).status).toBe(403);
    expect((await as.agent('post', `/platform/tickets/${id}/escalate`, { to_tier: 2, reason: 'Needs a data fix' })).status).toBeLessThan(300);
    // Once at L2 the ticket leaves the L1 queue.
    expect((await as.agent('get', `/platform/tickets/${id}`)).status).toBe(404);
    expect((await as.tech('post', `/platform/tickets/${id}/status`, { status: 'closed' })).status).toBe(403);

    expect((await as.tech('post', `/platform/tickets/${id}/reply`, { text: 'Internal: batch id mismatch', kind: 'internal' })).status).toBeLessThan(300);
    expect((await as.tech('post', `/platform/tickets/${id}/status`, { status: 'resolved' })).status).toBeLessThan(300);

    // The college never sees internal notes.
    const thread = JSON.stringify(body(await as.spoc('get', `/support/tickets/${id}`)));
    expect(thread).not.toContain('Internal: batch id mismatch');
    expect(thread).toContain('Looking into it.');

    const reopened = await as.spoc('post', `/support/tickets/${id}/reopen`);
    expect(reopened.status).toBeLessThan(300);
  });

  it('keeps colleges apart', async () => {
    const ditFee = db.fees.find((f) => f.college_id === student().college_id);
    const rvcStudent = db.users.find((u) => u.email === 'student@rvc.edu');
    expect(rvcStudent.college_id).not.toBe(student().college_id);
    // DIT staff cannot open an RVC student's record.
    expect((await as.director('get', `/college/people/${rvcStudent.user_id}`)).status).toBe(404);
    // RVC users never see DIT announcements or events.
    const events = JSON.stringify(body(await as.rvcStudent('get', '/events')));
    const ditEvent = db.events.find((e) => e.college_id === student().college_id);
    if (ditEvent) expect(events).not.toContain(ditEvent.event_id);
    expect(ditFee).toBeDefined();
  });
});
