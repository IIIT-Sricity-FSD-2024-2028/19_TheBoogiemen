/**
 * fees.spec.ts — two real bugs, both of them paths to the same symptom
 * ("a student who already paid is asked to pay again"):
 *
 *  1. updateFee() used to Object.assign the whole request body onto the fee,
 *     and the frontend's edit form always sent status: 'pending' — editing
 *     ANY field on an already-PAID fee (fixing a typo in the amount, say)
 *     silently reverted it to unpaid.
 *  2. createFee() had no duplicate guard — re-running "generate semester
 *     fees" (or adding one by hand twice) created a second PENDING row for
 *     a fee the student already had, paid or not, sitting right next to it.
 */
import { BadRequestException } from '@nestjs/common';
import { CommonController } from './common.controller';
import { PasswordService } from '../auth/password.service';

const dbWith = (over: any = {}) =>
  ({
    fees: [],
    students: [{ user_id: 's1', college_id: 'c-default' }],
    persist: jest.fn(),
    ...over,
  }) as any;

const controller = (db: any) => new CommonController(db, {} as PasswordService);

describe('updateFee', () => {
  it('does not revert an already-PAID fee to pending, even though the client sends status: "pending"', async () => {
    const db = dbWith({
      fees: [{ fee_id: 'f1', college_id: 'c-default', status: 'paid', paid_date: '1/1/2026', amount: 45000, fee_type: 'Tuition Fee', due_date: '2026-01-01', semester: '3' }],
    });
    const res: any = await controller(db).updateFee(
      'f1',
      { fee_type: 'Tuition Fee', amount: 50000, due_date: '2026-02-01', semester: '3', status: 'pending' },
      'c-default',
    );
    expect(res.data.status).toBe('paid');
    expect(res.data.paid_date).toBe('1/1/2026');
    expect(res.data.amount).toBe(50000); // the legitimate edit still applies
  });

  it('cannot be used to move the fee to a different student or college', async () => {
    const db = dbWith({
      fees: [{ fee_id: 'f1', college_id: 'c-default', status: 'pending', student_id: 's1', amount: 1000, fee_type: 'Lab Fee', due_date: '2026-01-01' }],
    });
    await controller(db).updateFee('f1', { student_id: 's2', college_id: 'col-other', amount: 1200 }, 'c-default');
    expect(db.fees[0].student_id).toBe('s1');
    expect(db.fees[0].college_id).toBe('c-default');
  });
});

describe('createFee', () => {
  const baseBody = { student_id: 's1', fee_type: 'Tuition Fee', amount: 45000, due_date: '2026-01-01', semester: '3' };

  it('rejects a second fee for the same student/semester/fee_type, even when the first is already paid', async () => {
    const db = dbWith({
      fees: [{ fee_id: 'f1', college_id: 'c-default', student_id: 's1', fee_type: 'Tuition Fee', semester: '3', status: 'paid' }],
    });
    await expect(controller(db).createFee(baseBody, 'c-default')).rejects.toThrow(BadRequestException);
    expect(db.fees).toHaveLength(1); // nothing was added
  });

  it('allows a different fee_type for the same student/semester', async () => {
    const db = dbWith({
      fees: [{ fee_id: 'f1', college_id: 'c-default', student_id: 's1', fee_type: 'Tuition Fee', semester: '3', status: 'paid' }],
    });
    const res: any = await controller(db).createFee({ ...baseBody, fee_type: 'Lab Fee' }, 'c-default');
    expect(res.success).toBe(true);
    expect(db.fees).toHaveLength(2);
  });

  it('allows the same fee_type for a different semester', async () => {
    const db = dbWith({
      fees: [{ fee_id: 'f1', college_id: 'c-default', student_id: 's1', fee_type: 'Tuition Fee', semester: '3', status: 'paid' }],
    });
    const res: any = await controller(db).createFee({ ...baseBody, semester: '4' }, 'c-default');
    expect(res.success).toBe(true);
  });
});

describe('payFee', () => {
  it('marks the fee paid and stamps a paid_date', async () => {
    const db = dbWith({ fees: [{ fee_id: 'f1', college_id: 'c-default', status: 'pending' }] });
    const res: any = await controller(db).payFee('f1', 'c-default');
    expect(res.data.status).toBe('paid');
    expect(res.data.paid_date).toBeTruthy();
  });
});
