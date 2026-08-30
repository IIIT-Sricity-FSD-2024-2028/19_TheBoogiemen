/**
 * subscription.spec.ts — the parts of plan enforcement that must not
 * regress: seat caps, module licensing, and expiry, per
 * SPOC_BILLING_ENFORCEMENT_DIAGNOSIS.md.
 */

import { ForbiddenException } from '@nestjs/common';
import {
  assertModuleEnabled,
  assertSeatAvailable,
  getActiveSubscription,
  isExpired,
  planStatus,
  Subscription,
} from './subscription';

const future = (days: number) =>
  new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
const past = (days: number) =>
  new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

const sub = (over: Partial<Subscription> = {}): Subscription => ({
  subscription_id: 'sub1',
  college_id: 'college-a',
  quote_id: 'q1',
  student_seats: 2,
  faculty_seats: 1,
  modules: ['forum'],
  status: 'active',
  starts_on: past(30),
  ends_on: future(30),
  created_at: past(30),
  ...over,
});

const dbWith = (subscriptions: Subscription[], users: any[] = []) =>
  ({ subscriptions, users }) as any;

describe('getActiveSubscription', () => {
  it('returns null for a null collegeId (superadmin)', () => {
    expect(getActiveSubscription(dbWith([sub()]), null)).toBeNull();
  });

  it('returns null when the college has no subscription row', () => {
    expect(getActiveSubscription(dbWith([sub({ college_id: 'college-b' })]), 'college-a')).toBeNull();
  });

  it('finds the matching row', () => {
    expect(getActiveSubscription(dbWith([sub()]), 'college-a')?.subscription_id).toBe('sub1');
  });
});

describe('isExpired / planStatus', () => {
  it('is not expired with ends_on well in the future', () => {
    expect(isExpired(sub({ ends_on: future(31) }))).toBe(false);
    expect(planStatus(sub({ ends_on: future(31) }))).toBe('active');
  });

  it('is expired once ends_on has passed', () => {
    expect(isExpired(sub({ ends_on: past(1) }))).toBe(true);
    expect(planStatus(sub({ ends_on: past(1) }))).toBe('expired');
  });

  it('reports expiring_soon inside the 30-day window without being expired', () => {
    const s = sub({ ends_on: future(10) });
    expect(isExpired(s)).toBe(false);
    expect(planStatus(s)).toBe('expiring_soon');
  });
});

describe('assertSeatAvailable', () => {
  it('passes when the college has no subscription row — unlimited', () => {
    expect(() =>
      assertSeatAvailable(dbWith([], []), 'college-a', 'student'),
    ).not.toThrow();
  });

  it('passes under the cap', () => {
    const db = dbWith([sub({ student_seats: 2 })], [
      { college_id: 'college-a', role: 'student' },
    ]);
    expect(() => assertSeatAvailable(db, 'college-a', 'student')).not.toThrow();
  });

  it('blocks at the cap — the bug this closes', () => {
    const db = dbWith([sub({ student_seats: 2 })], [
      { college_id: 'college-a', role: 'student' },
      { college_id: 'college-a', role: 'student' },
    ]);
    expect(() => assertSeatAvailable(db, 'college-a', 'student')).toThrow(ForbiddenException);
  });

  it('enforces students and faculty as separate pools', () => {
    // 2 faculty already in use burns none of the student pool.
    const db = dbWith([sub({ student_seats: 2, faculty_seats: 1 })], [
      { college_id: 'college-a', role: 'faculty' },
      { college_id: 'college-a', role: 'faculty' },
    ]);
    expect(() => assertSeatAvailable(db, 'college-a', 'student')).not.toThrow();
    expect(() => assertSeatAvailable(db, 'college-a', 'faculty')).toThrow(ForbiddenException);
  });

  it('blocks on an expired plan even under the seat cap', () => {
    const db = dbWith([sub({ ends_on: past(1), student_seats: 2 })], []);
    expect(() => assertSeatAvailable(db, 'college-a', 'student')).toThrow(ForbiddenException);
  });
});

describe('assertModuleEnabled', () => {
  it('passes when the college has no subscription row — unlimited', () => {
    expect(() => assertModuleEnabled(dbWith([]), 'college-a', 'forum')).not.toThrow();
  });

  it('passes when the module is licensed', () => {
    const db = dbWith([sub({ modules: ['forum', 'research'] })]);
    expect(() => assertModuleEnabled(db, 'college-a', 'forum')).not.toThrow();
  });

  it('blocks a module the plan never opted into — the bug this closes', () => {
    const db = dbWith([sub({ modules: ['research'] })]);
    expect(() => assertModuleEnabled(db, 'college-a', 'forum')).toThrow(ForbiddenException);
  });

  it('blocks every module on an expired plan', () => {
    const db = dbWith([sub({ ends_on: past(1), modules: ['forum'] })]);
    expect(() => assertModuleEnabled(db, 'college-a', 'forum')).toThrow(ForbiddenException);
  });

  it('superadmin (null collegeId) bypasses module gating entirely', () => {
    const db = dbWith([sub({ modules: [] })]);
    expect(() => assertModuleEnabled(db, null, 'forum')).not.toThrow();
  });
});
