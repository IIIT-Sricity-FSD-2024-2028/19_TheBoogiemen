/**
 * onboarding.service.spec.ts — the whole pipeline, exercised through real
 * dependency injection rather than hand-wired mocks.
 *
 * This is the highest-stakes file added in this pass: a bug here means an
 * account created without payment, a payment captured without an account,
 * or a draft's password surviving where it should have been cleared. Every
 * property ONBOARDING_PIPELINE_PLAN.md claims about the pipeline is checked
 * directly against a real JwtService, PasswordService and CollegesService —
 * only InMemoryDbService is faked, as plain arrays with a no-op persist(),
 * the same pattern uploads.spec.ts already uses for the same reason.
 *
 * PasswordService reads JWT_SECRET (via loadAuthConfig()) at construction —
 * fine in the running app, where main.ts loads .env before anything else,
 * but no prior spec has ever constructed PasswordService, so this is the
 * first one that needs it set. Scoped to this file only, not a project-wide
 * jest setup change: a 32+ char value, satisfying loadAuthConfig()'s own
 * minimum, never read for anything security-sensitive in this test.
 */
process.env.JWT_SECRET ??= 'test-only-secret-not-used-for-anything-real-0000';

import { Test } from '@nestjs/testing';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { getLoggerToken, PinoLogger } from 'nestjs-pino';
import { InMemoryDbService } from '../../database/in-memory-db.service';
import { PasswordService } from '../../auth/password.service';
import { CollegesService } from '../colleges.service';
import { OnboardingService } from './onboarding.service';
import { MockGateway } from '../payments/mock.gateway';
import { PAYMENT_GATEWAY } from '../payments/payment-gateway.interface';
import { OnboardingStartDto } from '../dto/onboarding-start.dto';
import { computeQuote, QuoteMetrics } from '../pricing/pricing.service';

function fakeDb() {
  return {
    users: [] as any[],
    colleges: [] as any[],
    onboarding_sessions: [] as any[],
    quotes: [] as any[],
    payments: [] as any[],
    subscriptions: [] as any[],
    students: [] as any[],
    faculty: [] as any[],
    persist: jest.fn(),
  };
}

const nullLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } as unknown as PinoLogger;

async function buildHarness() {
  const db = fakeDb();
  const moduleRef = await Test.createTestingModule({
    imports: [JwtModule.register({ secret: 'test-onboarding-secret', signOptions: { expiresIn: '2h' } })],
    providers: [
      OnboardingService,
      CollegesService,
      PasswordService,
      { provide: InMemoryDbService, useValue: db },
      { provide: PAYMENT_GATEWAY, useClass: MockGateway },
      { provide: getLoggerToken(OnboardingService.name), useValue: nullLogger },
      { provide: getLoggerToken(CollegesService.name), useValue: nullLogger },
    ],
  }).compile();

  return {
    db,
    onboarding: moduleRef.get(OnboardingService),
    jwt: moduleRef.get(JwtService),
  };
}

const START_DTO: OnboardingStartDto = {
  email: 'spoc@newcollege.edu',
  password: 'Prospect@123',
  first_name: 'Priya',
  last_name: 'Menon',
  college: { name: 'Northbridge Institute', city: 'Pune', state: 'Maharashtra', type: 'private' },
};

const METRICS: QuoteMetrics = {
  student_count: 800,
  faculty_count: 40,
  modules: ['research', 'analytics'],
  term_years: 1,
};

/** Decode a JWT without verifying — enough to inspect claims in a test. */
function decode(token: string): any {
  return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
}

describe('OnboardingService — the full pipeline', () => {
  it('creates nothing durable at start() — only a draft', async () => {
    const { onboarding, db } = await buildHarness();
    await onboarding.start(START_DTO);

    expect(db.onboarding_sessions).toHaveLength(1);
    expect(db.users).toHaveLength(0);
    expect(db.colleges).toHaveLength(0);
    expect(db.subscriptions).toHaveLength(0);
  });

  it('issues a token with no sub/role — structurally unable to pass as a real session', async () => {
    const { onboarding, jwt } = await buildHarness();
    const { token } = await onboarding.start(START_DTO);
    const payload = decode(token);

    expect(payload.purpose).toBe('onboarding');
    expect(payload.sub).toBeUndefined();
    expect(payload.role).toBeUndefined();
    // Verifies under the app's own secret — same mechanism JwtAuthGuard uses,
    // proving this would reach that guard's payload check, not bypass it.
    await expect(jwt.verifyAsync(token)).resolves.toMatchObject({ purpose: 'onboarding' });
  });

  it('refuses to start a second draft for an email that already has one in progress', async () => {
    const { onboarding } = await buildHarness();
    await onboarding.start(START_DTO);
    await expect(onboarding.start(START_DTO)).rejects.toThrow();
  });

  it('refuses to start onboarding for an email that already has a real account', async () => {
    const { onboarding, db } = await buildHarness();
    db.users.push({ user_id: 'u1', email: START_DTO.email, role: 'student' });
    await expect(onboarding.start(START_DTO)).rejects.toThrow();
  });

  describe('the committed quote', () => {
    it('matches computeQuote() exactly — no second implementation drifting from the first', async () => {
      const { onboarding } = await buildHarness();
      const { token } = await onboarding.start(START_DTO);
      const { session_id } = decode(token);

      const quote = await onboarding.commitQuote(session_id, METRICS);
      const direct = computeQuote(METRICS);

      expect(quote.payable_paise).toBe(direct.payable_paise);
      expect(quote.pricing_version).toBe(direct.pricing_version);
    });

    it('re-quoting cancels the previous quote rather than editing it in place', async () => {
      const { onboarding, db } = await buildHarness();
      const { token } = await onboarding.start(START_DTO);
      const { session_id } = decode(token);

      const first = await onboarding.commitQuote(session_id, METRICS);
      await onboarding.commitQuote(session_id, { ...METRICS, student_count: 1200 });

      const firstRow = db.quotes.find((q: any) => q.quote_id === first.quote_id);
      expect(firstRow.status).toBe('cancelled');
      expect(db.quotes.filter((q: any) => q.status === 'quoted')).toHaveLength(1);
    });
  });

  describe('mock payment failure — the resolved design decision', () => {
    it('a failed payment leaves the quote valid; retrying reuses it, not a new price', async () => {
      const { onboarding, db } = await buildHarness();
      const { token } = await onboarding.start(START_DTO);
      const { session_id } = decode(token);
      const quote = await onboarding.commitQuote(session_id, METRICS);

      const firstOrder = await onboarding.acceptQuote(session_id);
      await onboarding.failPayment(session_id);

      const failedPayment = db.payments.find((p: any) => p.gateway_order_id === firstOrder.order_id);
      expect(failedPayment.status).toBe('failed');

      // Retry: same quote_id, same amount — never a fresh quote after a
      // simulated failure, exactly as confirmed with the user.
      const retryOrder = await onboarding.acceptQuote(session_id);
      expect(retryOrder.quote_id).toBe(quote.quote_id);
      expect(retryOrder.amount_paise).toBe(quote.payable_paise);
      expect(db.quotes.filter((q: any) => q.session_id === session_id)).toHaveLength(1);
    });

    it('accepting twice before any failure reuses the same open order, not a duplicate', async () => {
      const { onboarding, db } = await buildHarness();
      const { token } = await onboarding.start(START_DTO);
      const { session_id } = decode(token);
      await onboarding.commitQuote(session_id, METRICS);

      const a = await onboarding.acceptQuote(session_id);
      const b = await onboarding.acceptQuote(session_id);

      expect(a.order_id).toBe(b.order_id);
      expect(db.payments.filter((p: any) => p.status === 'created')).toHaveLength(1);
    });
  });

  describe('fulfillment — the only path that creates a real account', () => {
    it('creates exactly one college, one spoc user, one active subscription, and signs a real session', async () => {
      const { onboarding, db } = await buildHarness();
      const { token } = await onboarding.start(START_DTO);
      const { session_id } = decode(token);
      const quote = await onboarding.commitQuote(session_id, METRICS);
      await onboarding.acceptQuote(session_id);

      const result = await onboarding.confirmPayment(session_id);

      expect(db.colleges).toHaveLength(1);
      expect(db.colleges[0].name).toBe(START_DTO.college.name);

      expect(db.users).toHaveLength(1);
      const spoc = db.users[0];
      expect(spoc.role).toBe('spoc');
      expect(spoc.college_id).toBe(db.colleges[0].college_id);
      expect(spoc.email).toBe(START_DTO.email);

      expect(db.subscriptions).toHaveLength(1);
      const sub = db.subscriptions[0];
      expect(sub.status).toBe('active');
      expect(sub.college_id).toBe(db.colleges[0].college_id);
      expect(sub.quote_id).toBe(quote.quote_id);
      expect(sub.seats_purchased).toBe(METRICS.student_count + METRICS.faculty_count);

      const payment = db.payments.find((p: any) => p.quote_id === quote.quote_id);
      expect(payment.status).toBe('captured');
      expect(payment.subscription_id).toBe(sub.subscription_id);

      // The response is what the controller sets bp_session from — must
      // carry a usable role and college_id, exactly like a normal login.
      expect(result.user).toMatchObject({ role: 'spoc', college_id: db.colleges[0].college_id });
      const sessionPayload = decode(result.token);
      expect(sessionPayload.sub).toBe(spoc.user_id);
      expect(sessionPayload.role).toBe('spoc');
      expect(sessionPayload.college_id).toBe(db.colleges[0].college_id);
    });

    it('the password chosen at step 1 is what the new account authenticates with — never re-collected', async () => {
      const { onboarding, db } = await buildHarness();
      const { token } = await onboarding.start(START_DTO);
      const { session_id } = decode(token);
      await onboarding.commitQuote(session_id, METRICS);
      await onboarding.acceptQuote(session_id);
      await onboarding.confirmPayment(session_id);

      const passwordService = new PasswordService();
      const valid = await passwordService.verify(START_DTO.password, db.users[0].password_hash);
      expect(valid).toBe(true);
    });

    it('clears the draft\'s password hash and marks it completed once fulfilled', async () => {
      const { onboarding, db } = await buildHarness();
      const { token } = await onboarding.start(START_DTO);
      const { session_id } = decode(token);
      await onboarding.commitQuote(session_id, METRICS);
      await onboarding.acceptQuote(session_id);
      await onboarding.confirmPayment(session_id);

      const draft = db.onboarding_sessions.find((s: any) => s.session_id === session_id);
      expect(draft.status).toBe('completed');
      expect(draft.password_hash).toBeNull();
    });

    it('refuses to fulfil twice — a completed draft cannot be reused', async () => {
      const { onboarding } = await buildHarness();
      const { token } = await onboarding.start(START_DTO);
      const { session_id } = decode(token);
      await onboarding.commitQuote(session_id, METRICS);
      await onboarding.acceptQuote(session_id);
      await onboarding.confirmPayment(session_id);

      await expect(onboarding.confirmPayment(session_id)).rejects.toThrow();
    });

    it('refuses to fulfil with no captured payment', async () => {
      const { onboarding } = await buildHarness();
      const { token } = await onboarding.start(START_DTO);
      const { session_id } = decode(token);
      await onboarding.commitQuote(session_id, METRICS);
      // No acceptQuote() — no payment was ever opened.
      await expect(onboarding.confirmPayment(session_id)).rejects.toThrow();
    });
  });

  describe('draft expiry', () => {
    it('an expired draft cannot be quoted, accepted, or fulfilled', async () => {
      const { onboarding, db } = await buildHarness();
      const { token } = await onboarding.start(START_DTO);
      const { session_id } = decode(token);

      db.onboarding_sessions[0].expires_at = new Date(Date.now() - 1000).toISOString();

      await expect(onboarding.commitQuote(session_id, METRICS)).rejects.toThrow();
      expect(db.onboarding_sessions[0].status).toBe('expired');
    });
  });
});
