/**
 * subscription.ts — the one place "what did this college buy" is answered.
 *
 * SPOC_BILLING_ENFORCEMENT_DIAGNOSIS.md's root cause: OnboardingService.
 * confirmPayment() writes a subscriptions row once and nothing ever reads it
 * again. Every call site that needs a seat cap, a module allow-list, or a
 * renewal date routes through here, the same "one small helper, every
 * call-site wraps it" shape as scope-to-college.ts.
 */

import { ForbiddenException } from '@nestjs/common';
import { InMemoryDbService } from '../../database/in-memory-db.service';
import { ErrorCode, errorBody } from '../errors/error-codes';
import { PricedModule } from '../../billing/dto/estimate.dto';

export interface Subscription {
  subscription_id: string;
  college_id: string;
  quote_id: string;
  student_seats: number;
  faculty_seats: number;
  modules: PricedModule[];
  status: string;
  starts_on: string;
  ends_on: string;
  created_at: string;
}

/**
 * `collegeId === null` (superadmin, the vendor operator) and "this college
 * has no subscription row at all" (the superadmin's manual/exceptional
 * CollegesService.create() path — no quote, no payment) both resolve to
 * `null` here, and every caller below treats a null subscription as
 * unlimited/ungated. Diagnosis doc §5.2: recommended and confirmed.
 */
export function getActiveSubscription(
  db: InMemoryDbService,
  collegeId: string | null,
): Subscription | null {
  if (!collegeId) return null;
  const subs = db.subscriptions as Subscription[];
  return subs.find((s) => s.college_id === collegeId) ?? null;
}

/**
 * No sweep job ever flips `status` to 'expired' — checked lazily against
 * `ends_on` at read time instead, the same pattern OnboardingService.
 * requireDraft() already uses for draft expiry. Diagnosis doc §5.3.
 */
export function isExpired(sub: Subscription): boolean {
  return new Date(sub.ends_on).getTime() < Date.now();
}

const EXPIRING_SOON_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/** Display-only classification for the SPOC dashboard — enforcement only
 *  ever cares about isExpired(), not this third state. */
export function planStatus(
  sub: Subscription,
): 'active' | 'expiring_soon' | 'expired' {
  const msRemaining = new Date(sub.ends_on).getTime() - Date.now();
  if (msRemaining < 0) return 'expired';
  if (msRemaining <= EXPIRING_SOON_WINDOW_MS) return 'expiring_soon';
  return 'active';
}

function assertNotExpired(sub: Subscription): void {
  if (isExpired(sub)) {
    throw new ForbiddenException(
      errorBody(
        ErrorCode.SUBSCRIPTION_EXPIRED,
        `Your institution's plan expired on ${sub.ends_on}. Contact support to renew.`,
        { ends_on: sub.ends_on },
      ),
    );
  }
}

/**
 * Confirmed: split seat pool — students and faculty each have their own cap
 * (quote.metrics.student_count / faculty_count), not one combined total.
 */
export function assertSeatAvailable(
  db: InMemoryDbService,
  collegeId: string | null,
  role: 'student' | 'faculty',
): void {
  const sub = getActiveSubscription(db, collegeId);
  if (!sub) return; // no subscription row — unlimited, see the docstring above
  assertNotExpired(sub);

  const cap = role === 'student' ? sub.student_seats : sub.faculty_seats;
  const current = db.users.filter(
    (u) => u.college_id === collegeId && u.role === role,
  ).length;
  if (current >= cap) {
    throw new ForbiddenException(
      errorBody(
        ErrorCode.SEAT_LIMIT_EXCEEDED,
        `Your plan includes ${cap} ${role} seat${cap === 1 ? '' : 's'}; ${current} ${current === 1 ? 'is' : 'are'} already in use. Contact support to add more.`,
        { role, cap, current },
      ),
    );
  }
}

export function assertModuleEnabled(
  db: InMemoryDbService,
  collegeId: string | null,
  module: PricedModule,
): void {
  const sub = getActiveSubscription(db, collegeId);
  if (!sub) return; // no subscription row — unlimited, see the docstring above
  assertNotExpired(sub);

  if (!sub.modules.includes(module)) {
    throw new ForbiddenException(
      errorBody(
        ErrorCode.MODULE_NOT_LICENSED,
        `The ${module} module is not included in your institution's plan.`,
        { module },
      ),
    );
  }
}
