import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InMemoryDbService } from '../database/in-memory-db.service';
import { ErrorCode, errorBody } from '../common/errors/error-codes';
import { CampusScope, findInCollege, inCollege, inReach } from '../core/scope';
import { isFinance } from '../core/roles';
import { fullName, newId, nowIso, today } from '../core/util';

const bad = (msg: string) => new BadRequestException(errorBody(ErrorCode.BUSINESS_RULE_VIOLATION, msg));
export const PAYMENT_MODES = ['cash', 'upi', 'cheque', 'bank_transfer', 'card', 'online_test'] as const;

function statusFor(amount: number, paid: number) {
  if (paid <= 0) return 'pending';
  if (paid >= amount) return 'paid';
  return 'partial';
}

@Injectable()
export class FeesService {
  constructor(private readonly db: InMemoryDbService) {}

  private college(scope: CampusScope) {
    return this.db.colleges.find((c) => c.college_id === scope.collegeId);
  }

  private feeView(f: any) {
    const st = this.db.students.find((s) => s.user_id === f.student_id);
    const overdue = f.status !== 'paid' && f.due_date < today();
    return { ...f, student_name: fullName(st), roll_no: st?.roll_no ?? null, section: st?.section ?? null, department_code: st?.branch ?? null, balance: Math.max(0, f.amount - (f.paid_amount || 0)), overdue, payments: this.db.fee_payments.filter((p) => p.fee_id === f.fee_id) };
  }

  // ── Structures ────────────────────────────────────────────────────────────

  structures(scope: CampusScope) {
    const settings = this.db.college_settings.find((s) => s.college_id === scope.collegeId);
    return inCollege(scope, this.db.fee_structures).map((s) => ({
      ...s,
      programme: settings?.programmes?.find((p: any) => p.programme_id === s.programme_id)?.name ?? null,
      batch: settings?.batches?.find((b: any) => b.batch_id === s.batch_id)?.label ?? null,
      generated: this.db.fees.filter((f) => f.structure_id === s.structure_id).length,
    }));
  }

  createStructure(scope: CampusScope, body: any) {
    const settings = this.db.college_settings.find((s) => s.college_id === scope.collegeId);
    const name = String(body.name || '').trim();
    if (!name) throw bad('Name is required.');
    const batch = settings?.batches?.find((b: any) => b.batch_id === body.batch_id);
    if (!batch) throw bad('Choose a batch.');
    const semester = Number(body.semester);
    if (!Number.isInteger(semester) || semester < 1 || semester > 12) throw bad('Semester must be 1 to 12.');
    if (!Array.isArray(body.components) || !body.components.length) throw bad('Add at least one fee component.');
    const components = body.components.map((c: any) => {
      const amount = Number(c.amount);
      if (!String(c.name || '').trim()) throw bad('Every component needs a name.');
      if (!Number.isFinite(amount) || amount <= 0) throw bad('Component amounts must be positive.');
      return { name: String(c.name).trim().slice(0, 60), amount: Math.round(amount) };
    });
    if (!body.due_date || Number.isNaN(Date.parse(body.due_date))) throw bad('Choose a due date.');
    const row = { structure_id: newId('fs'), college_id: scope.collegeId, name: name.slice(0, 80), programme_id: batch.programme_id, batch_id: batch.batch_id, semester, components, total: components.reduce((s: number, c: any) => s + c.amount, 0), due_date: body.due_date, created_by: scope.userId, created_at: nowIso() };
    this.db.fee_structures.push(row);
    return row;
  }

  deleteStructure(scope: CampusScope, id: string) {
    const s = findInCollege(scope, this.db.fee_structures, (x) => x.structure_id === id, 'Fee structure');
    if (this.db.fees.some((f) => f.structure_id === s.structure_id)) throw bad('Fees were already generated from this structure; it cannot be deleted.');
    this.db.fee_structures.splice(this.db.fee_structures.indexOf(s), 1);
    return { success: true };
  }

  /** Creates one fee per active student of the structure's batch (skips students who already have it). */
  generate(scope: CampusScope, id: string) {
    const s = findInCollege(scope, this.db.fee_structures, (x) => x.structure_id === id, 'Fee structure');
    const students = inCollege(scope, this.db.students).filter((st) => st.batch_id === s.batch_id && this.db.users.find((u) => u.user_id === st.user_id)?.status !== 'inactive');
    let created = 0;
    for (const st of students) {
      if (this.db.fees.some((f) => f.structure_id === s.structure_id && f.student_id === st.user_id)) continue;
      this.db.fees.push({ fee_id: newId('fee'), college_id: scope.collegeId, department_id: st.department_id, student_id: st.user_id, structure_id: s.structure_id, semester: s.semester, fee_type: s.name, components: s.components, amount: s.total, paid_amount: 0, due_date: s.due_date, status: 'pending', created_at: nowIso(), created_by: scope.userId });
      created++;
    }
    return { created, skipped: students.length - created };
  }

  // ── Fees ──────────────────────────────────────────────────────────────────

  list(scope: CampusScope, q: { status?: string; department_id?: string; overdue?: string }) {
    let rows = inReach(scope, this.db.fees);
    if (q.department_id) rows = rows.filter((f) => f.department_id === q.department_id);
    let out = rows.map((f) => this.feeView(f));
    if (q.status) out = out.filter((f) => f.status === q.status);
    if (q.overdue === 'true') out = out.filter((f) => f.overdue);
    return out.sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)));
  }

  mine(scope: CampusScope) {
    return this.db.fees.filter((f) => f.student_id === scope.userId).map((f) => this.feeView(f)).sort((a, b) => String(b.due_date).localeCompare(String(a.due_date)));
  }

  create(scope: CampusScope, body: any) {
    const st = this.db.students.find((s) => s.user_id === body.student_id && s.college_id === scope.collegeId);
    if (!st) throw bad('Choose a student.');
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) throw bad('Amount must be positive.');
    if (!String(body.fee_type || '').trim()) throw bad('Fee type is required.');
    if (!body.due_date || Number.isNaN(Date.parse(body.due_date))) throw bad('Choose a due date.');
    const row = { fee_id: newId('fee'), college_id: scope.collegeId, department_id: st.department_id, student_id: st.user_id, structure_id: null, semester: Number(body.semester) || st.semester, fee_type: String(body.fee_type).trim().slice(0, 60), components: [{ name: String(body.fee_type).trim(), amount: Math.round(amount) }], amount: Math.round(amount), paid_amount: 0, due_date: body.due_date, status: 'pending', created_at: nowIso(), created_by: scope.userId };
    this.db.fees.push(row);
    return this.feeView(row);
  }

  private nextReceipt(scope: CampusScope) {
    const code = this.college(scope)?.code || 'BP';
    const year = new Date().getFullYear();
    const prefix = `${code}-RCP-${year}-`;
    const max = inCollege(scope, this.db.fee_payments)
      .map((p) => (String(p.receipt_no || '').startsWith(prefix) ? Number(String(p.receipt_no).slice(prefix.length)) : 0))
      .reduce((m, n) => Math.max(m, n), 0);
    return `${prefix}${String(max + 1).padStart(5, '0')}`;
  }

  private applyPayment(scope: CampusScope, fee: any, amount: number, mode: string, reference: string | null) {
    const balance = fee.amount - (fee.paid_amount || 0);
    if (balance <= 0) throw bad('This fee is already fully paid.');
    if (!Number.isFinite(amount) || amount <= 0) throw bad('Amount must be positive.');
    if (amount > balance) throw bad(`Amount exceeds the balance of ${balance}.`);
    fee.paid_amount = (fee.paid_amount || 0) + Math.round(amount);
    fee.status = statusFor(fee.amount, fee.paid_amount);
    fee.updated_at = nowIso();
    const payment = { payment_id: newId('pay'), college_id: scope.collegeId, fee_id: fee.fee_id, student_id: fee.student_id, amount: Math.round(amount), mode, reference, receipt_no: this.nextReceipt(scope), recorded_by: scope.userId, paid_at: nowIso() };
    this.db.fee_payments.push(payment);
    this.db.persist();
    return { payment, fee: this.feeView(fee) };
  }

  /** Finance records an offline payment. */
  recordPayment(scope: CampusScope, id: string, body: { amount: number; mode: string; reference?: string }) {
    const fee = findInCollege(scope, this.db.fees, (f) => f.fee_id === id, 'Fee');
    const mode = String(body.mode || '');
    if (!PAYMENT_MODES.includes(mode as any) || mode === 'online_test') throw bad('Mode must be cash, upi, cheque, bank_transfer or card.');
    const reference = String(body.reference || '').trim();
    if (mode !== 'cash' && !reference) throw bad('Enter the transaction or cheque reference.');
    return this.applyPayment(scope, fee, Number(body.amount), mode, reference || null);
  }

  /**
   * Student pays through the TEST-MODE gateway (no real money moves; clearly
   * labelled in the UI). `simulate: 'fail'` exercises the failure path.
   */
  payOnline(scope: CampusScope, id: string, body: { amount: number; simulate?: string }) {
    const fee = this.db.fees.find((f) => f.fee_id === id && f.student_id === scope.userId);
    if (!fee) throw bad('Fee not found.');
    if (body?.simulate === 'fail') throw new BadRequestException(errorBody(ErrorCode.BUSINESS_RULE_VIOLATION, 'Payment failed (test mode). No money was taken. Try again.'));
    return this.applyPayment(scope, fee, Number(body?.amount), 'online_test', `TEST-${Date.now()}`);
  }

  payments(scope: CampusScope, q: { from?: string; to?: string; mode?: string }) {
    let rows = inCollege(scope, this.db.fee_payments);
    if (q.from) rows = rows.filter((p) => p.paid_at.slice(0, 10) >= q.from!);
    if (q.to) rows = rows.filter((p) => p.paid_at.slice(0, 10) <= q.to!);
    if (q.mode) rows = rows.filter((p) => p.mode === q.mode);
    return rows.map((p) => {
      const st = this.db.students.find((s) => s.user_id === p.student_id);
      const fee = this.db.fees.find((f) => f.fee_id === p.fee_id);
      return { ...p, student_name: fullName(st), roll_no: st?.roll_no, fee_type: fee?.fee_type, recorded_by_name: fullName(this.db.users.find((u) => u.user_id === p.recorded_by)) };
    }).sort((a, b) => String(b.paid_at).localeCompare(String(a.paid_at)));
  }

  receipt(scope: CampusScope, paymentId: string) {
    const p = findInCollege(scope, this.db.fee_payments, (x) => x.payment_id === paymentId, 'Payment');
    if (scope.role === 'student' && p.student_id !== scope.userId) throw new ForbiddenException(errorBody(ErrorCode.INSUFFICIENT_ROLE, 'Not your receipt.'));
    if (scope.role !== 'student' && !isFinance(scope.role) && !['superadmin', 'admin', 'INSTITUTE_SUPER_ADMIN'].includes(scope.role)) throw new ForbiddenException(errorBody(ErrorCode.INSUFFICIENT_ROLE, 'Not allowed.'));
    const fee = this.db.fees.find((f) => f.fee_id === p.fee_id);
    const st = this.db.students.find((s) => s.user_id === p.student_id);
    return { payment: p, fee, student: { name: fullName(st), roll_no: st?.roll_no, section: st?.section, batch: st?.batch }, college: this.college(scope) };
  }

  remind(scope: CampusScope, feeIds: string[]) {
    if (!Array.isArray(feeIds) || !feeIds.length) throw bad('Choose fees to remind.');
    let reminded = 0;
    for (const id of feeIds) {
      const f = this.db.fees.find((x) => x.fee_id === id && x.college_id === scope.collegeId);
      if (!f || f.status === 'paid') continue;
      f.reminded_at = nowIso();
      f.reminders = (f.reminders || 0) + 1;
      reminded++;
    }
    this.db.persist();
    return { reminded };
  }

  summary(scope: CampusScope) {
    const fees = inReach(scope, this.db.fees);
    const billed = fees.reduce((s, f) => s + f.amount, 0);
    const collected = fees.reduce((s, f) => s + (f.paid_amount || 0), 0);
    const overdue = fees.filter((f) => f.status !== 'paid' && f.due_date < today());
    const byDept = new Map<string, { billed: number; collected: number }>();
    for (const f of fees) {
      const d = byDept.get(f.department_id) || { billed: 0, collected: 0 };
      byDept.set(f.department_id, { billed: d.billed + f.amount, collected: d.collected + (f.paid_amount || 0) });
    }
    const payments = inCollege(scope, this.db.fee_payments);
    const byMonth = new Map<string, number>();
    for (const p of payments) byMonth.set(p.paid_at.slice(0, 7), (byMonth.get(p.paid_at.slice(0, 7)) || 0) + p.amount);
    return {
      billed, collected, outstanding: billed - collected,
      collection_rate: billed ? Math.round((collected / billed) * 1000) / 10 : null,
      counts: { total: fees.length, paid: fees.filter((f) => f.status === 'paid').length, partial: fees.filter((f) => f.status === 'partial').length, pending: fees.filter((f) => f.status === 'pending').length, overdue: overdue.length },
      overdue_amount: overdue.reduce((s, f) => s + f.amount - (f.paid_amount || 0), 0),
      by_department: [...byDept.entries()].map(([department_id, v]) => ({ department_id, department_code: this.db.departments.find((d) => d.department_id === department_id)?.department_code ?? '—', ...v })),
      by_month: [...byMonth.entries()].sort().map(([month, amount]) => ({ month, amount })),
    };
  }
}
