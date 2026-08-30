/**
 * onboarding.service.ts — draft lifecycle and fulfillment.
 *
 * The whole point of this file, restated from ONBOARDING_PIPELINE_PLAN.md
 * §2: nothing durable — no colleges row, no users row, no subscriptions row
 * — exists until fulfill() runs, and fulfill() only runs once a payment is
 * captured. Everything before that is an onboarding_sessions draft, which is
 * not a role, not loginable, and not reachable by anything @Roles('spoc')
 * gates.
 */

import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { InMemoryDbService } from '../../database/in-memory-db.service';
import { PasswordService } from '../../auth/password.service';
import { JwtPayload, Role } from '../../auth/jwt-payload';
import { ErrorCode, errorBody } from '../../common/errors/error-codes';
import { CollegesService } from '../colleges.service';
import { computeQuote, QuoteBreakdown, QuoteMetrics } from '../pricing/pricing.service';
import { PAYMENT_GATEWAY } from '../payments/payment-gateway.interface';
import type { PaymentGateway } from '../payments/payment-gateway.interface';
import { OnboardingStartDto } from '../dto/onboarding-start.dto';

/** Confirmed with the user: 60 minutes — long enough for a careful signup,
 *  short enough that an abandoned draft doesn't linger meaningfully even
 *  with no sweep job (expiry is checked lazily on read, not cron-swept). */
export const DRAFT_TTL_MS = 60 * 60 * 1000;

@Injectable()
export class OnboardingService {
  constructor(
    private readonly db: InMemoryDbService,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
    private readonly collegesService: CollegesService,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
    @InjectPinoLogger(OnboardingService.name)
    private readonly logger: PinoLogger,
  ) {}

  // ── Stage 1 ──────────────────────────────────────────────────────────────

  async start(dto: OnboardingStartDto): Promise<{ token: string; ttlMs: number }> {
    if (this.db.users.find((u) => u.email === dto.email)) {
      throw new BadRequestException(
        errorBody(ErrorCode.DUPLICATE_RESOURCE, 'An account with this email already exists'),
      );
    }
    if (this.activeDraftByEmail(dto.email)) {
      throw new BadRequestException(
        errorBody(
          ErrorCode.DUPLICATE_RESOURCE,
          'An onboarding session for this email is already in progress',
        ),
      );
    }

    const now = Date.now();
    const sessionId = `os${now}`;
    this.db.onboarding_sessions.push({
      session_id: sessionId,
      email: dto.email,
      password_hash: await this.passwordService.hash(dto.password),
      first_name: dto.first_name ?? null,
      last_name: dto.last_name ?? null,
      phone: dto.phone ?? null,
      college_name: dto.college.name,
      city: dto.college.city ?? null,
      state: dto.college.state ?? null,
      type: dto.college.type ?? null,
      status: 'details',
      created_at: new Date(now).toISOString(),
      expires_at: new Date(now + DRAFT_TTL_MS).toISOString(),
    });

    const token = await this.jwtService.signAsync(
      { purpose: 'onboarding', session_id: sessionId },
      { expiresIn: Math.floor(DRAFT_TTL_MS / 1000) },
    );

    this.logger.info({ sessionId }, 'Onboarding draft started');
    return { token, ttlMs: DRAFT_TTL_MS };
  }

  // ── Stage 2 ──────────────────────────────────────────────────────────────

  async getQuote(sessionId: string): Promise<(QuoteBreakdown & { quote_id: string; status: string }) | null> {
    const draft = this.requireDraft(sessionId);
    const quote = this.liveQuote(draft.session_id);
    if (!quote) return null;
    return { ...quote.breakdown, quote_id: quote.quote_id, status: quote.status };
  }

  async commitQuote(sessionId: string, metrics: QuoteMetrics) {
    const draft = this.requireDraft(sessionId);
    if (!['details', 'quoted'].includes(draft.status)) {
      throw new BadRequestException(
        errorBody(
          ErrorCode.INVALID_STATE_TRANSITION,
          'This onboarding session has already moved past the quote stage.',
        ),
      );
    }

    // A quote is never edited in place (§6 of the plan) — re-quoting after
    // changing metrics cancels the old one and issues a new one.
    const existing = this.liveQuote(sessionId);
    if (existing) existing.status = 'cancelled';

    const breakdown = computeQuote(metrics);
    const quoteId = `q${Date.now()}`;
    this.db.quotes.push({
      quote_id: quoteId,
      session_id: sessionId,
      college_id: null,
      metrics,
      breakdown,
      pricing_version: breakdown.pricing_version,
      status: 'quoted',
      expires_at: draft.expires_at, // bounded by the draft's own TTL
      created_at: new Date().toISOString(),
    });
    draft.status = 'quoted';
    this.db.persist();

    return { ...breakdown, quote_id: quoteId, status: 'quoted' };
  }

  // ── Stage 3 ──────────────────────────────────────────────────────────────

  /**
   * Opens a mock payment order for the live quote. Safe to call more than
   * once for the same quote — a retry after a simulated failure reuses the
   * SAME quote (confirmed with the user: a failed mock payment does not
   * invalidate the price) and, if a 'created' order is already open, reuses
   * that order too rather than minting a redundant one.
   */
  async acceptQuote(sessionId: string) {
    const draft = this.requireDraft(sessionId);
    const quote = this.liveQuote(sessionId);
    if (!quote || !['quoted', 'accepted'].includes(quote.status)) {
      throw new BadRequestException(
        errorBody(ErrorCode.INVALID_STATE_TRANSITION, 'No quote is ready to accept.'),
      );
    }

    const openPayment = this.db.payments.find(
      (p: any) => p.quote_id === quote.quote_id && p.status === 'created',
    );
    if (openPayment) {
      return { quote_id: quote.quote_id, order_id: openPayment.gateway_order_id, amount_paise: openPayment.amount_paise };
    }

    quote.status = 'accepted';
    draft.status = 'accepted';

    const order = await this.gateway.createOrder(quote.breakdown.payable_paise, {
      session_id: sessionId,
      quote_id: quote.quote_id,
    });
    const paymentId = `pay${Date.now()}`;
    this.db.payments.push({
      payment_id: paymentId,
      quote_id: quote.quote_id,
      subscription_id: null,
      gateway: 'mock',
      gateway_order_id: order.order_id,
      amount_paise: quote.breakdown.payable_paise,
      status: 'created',
      created_at: new Date().toISOString(),
    });
    this.db.persist();

    return { quote_id: quote.quote_id, order_id: order.order_id, amount_paise: quote.breakdown.payable_paise };
  }

  // ── Stage 4 ──────────────────────────────────────────────────────────────

  /** Simulated failure: the payment fails, the quote stays valid for a retry via acceptQuote(). */
  async failPayment(sessionId: string): Promise<void> {
    const payment = this.openPaymentForSession(sessionId);
    payment.status = 'failed';
    this.db.persist();
    this.logger.info({ sessionId, paymentId: payment.payment_id }, 'Mock payment simulated failure');
  }

  /**
   * Fulfillment. The only place a colleges/users/subscriptions row gets
   * created from this flow. See the module docstring and §7 of the plan for
   * why this is the sole trigger.
   */
  async confirmPayment(sessionId: string): Promise<{ token: string; user: Record<string, unknown> }> {
    const draft = this.requireDraft(sessionId);
    const payment = this.openPaymentForSession(sessionId);
    const quote = this.db.quotes.find((q: any) => q.quote_id === payment.quote_id);

    payment.status = 'captured';

    const { college, spocUser } = await this.collegesService.createCollegeAndSpoc({
      collegeName: draft.college_name,
      city: draft.city,
      state: draft.state,
      type: draft.type,
      spocEmail: draft.email,
      spocFirstName: draft.first_name,
      spocLastName: draft.last_name,
      spocPhone: draft.phone,
      // Already hashed at start() — never re-collected, never re-hashed.
      spocPasswordHash: draft.password_hash,
    });

    const seats = quote.metrics.student_count + quote.metrics.faculty_count;
    const startsOn = new Date();
    const endsOn = new Date(startsOn);
    endsOn.setFullYear(endsOn.getFullYear() + quote.metrics.term_years);

    const subscriptionId = `sub${Date.now()}`;
    this.db.subscriptions.push({
      subscription_id: subscriptionId,
      college_id: college.college_id,
      quote_id: quote.quote_id,
      seats_purchased: seats,
      modules: quote.metrics.modules,
      status: 'active',
      starts_on: startsOn.toISOString().split('T')[0],
      ends_on: endsOn.toISOString().split('T')[0],
      created_at: new Date().toISOString(),
    });
    payment.subscription_id = subscriptionId;

    // The users row now owns the only live copy of this hash — a completed
    // draft has no further reason to hold a credential.
    draft.status = 'completed';
    draft.password_hash = null;
    this.db.persist();

    const payload: JwtPayload = {
      sub: spocUser.user_id,
      role: spocUser.role as Role,
      email: spocUser.email,
      college_id: spocUser.college_id,
    };
    const token = await this.jwtService.signAsync(payload);

    this.logger.info(
      { sessionId, collegeId: college.college_id, subscriptionId },
      'Onboarding fulfilled — college, SPOC and subscription created',
    );

    return {
      token,
      user: {
        user_id: spocUser.user_id,
        username: spocUser.username,
        email: spocUser.email,
        role: spocUser.role,
        college_id: spocUser.college_id,
        first_name: spocUser.first_name,
        last_name: spocUser.last_name,
      },
    };
  }

  // ── helpers ──────────────────────────────────────────────────────────────

  private activeDraftByEmail(email: string) {
    const now = Date.now();
    return this.db.onboarding_sessions.find(
      (s: any) =>
        s.email === email &&
        s.status !== 'completed' &&
        s.status !== 'expired' &&
        new Date(s.expires_at).getTime() > now,
    );
  }

  /**
   * Loads the draft and enforces expiry — the OnboardingSessionGuard already
   * checked the token's own signature and exp claim, but the draft ROW's
   * status is the source of truth for business-level expiry (a completed
   * draft must never be reusable even if its token technically has not
   * expired yet — see confirmPayment()'s single-fulfillment guarantee).
   */
  private requireDraft(sessionId: string) {
    const draft = this.db.onboarding_sessions.find((s: any) => s.session_id === sessionId);
    if (!draft || draft.status === 'completed' || draft.status === 'expired') {
      throw new BadRequestException(
        errorBody(
          ErrorCode.AUTHENTICATION_REQUIRED,
          'This onboarding session is no longer valid. Please start again.',
        ),
      );
    }
    if (new Date(draft.expires_at).getTime() <= Date.now()) {
      draft.status = 'expired';
      this.db.persist();
      throw new BadRequestException(
        errorBody(
          ErrorCode.AUTHENTICATION_REQUIRED,
          'This onboarding session has expired. Please start again.',
        ),
      );
    }
    return draft;
  }

  private liveQuote(sessionId: string) {
    return this.db.quotes.find(
      (q: any) => q.session_id === sessionId && ['quoted', 'accepted'].includes(q.status),
    );
  }

  private openPaymentForSession(sessionId: string) {
    const quote = this.liveQuote(sessionId);
    const payment = quote
      ? this.db.payments.find((p: any) => p.quote_id === quote.quote_id && p.status === 'created')
      : null;
    if (!payment) {
      throw new BadRequestException(
        errorBody(ErrorCode.INVALID_STATE_TRANSITION, 'No payment is awaiting confirmation.'),
      );
    }
    return payment;
  }
}
