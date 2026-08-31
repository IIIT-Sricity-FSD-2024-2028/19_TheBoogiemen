/**
 * onboarding-rate-limit.middleware.ts — bounds the first genuinely public,
 * unauthenticated *write* surface in this app beyond login/signup.
 *
 * Different counting policy from AuthRateLimitMiddleware on purpose: that
 * one counts only failed logins, because a successful login costs nothing
 * and a shared campus IP must not lock out forty students signing in
 * normally. There is no equivalent "harmless success" here — every hit on
 * these routes is a write worth bounding (a draft row created, a quote
 * computed, a mock order opened), so this counts every request regardless
 * of outcome. The Map/window bookkeeping itself is shared with that file via
 * FixedWindowLimiter — see that class's docstring for why duplicating it
 * was rejected.
 *
 * Route-scoped via BillingModule.configure(), exactly like
 * AuthRateLimitMiddleware is scoped to AuthController alone — absent from
 * the stack for every other route.
 */

import {
  HttpException,
  HttpStatus,
  Injectable,
  NestMiddleware,
} from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { NextFunction, Request, Response } from 'express';
import { ErrorCode, errorBody } from '../../common/errors/error-codes';
import { FixedWindowLimiter } from '../../common/rate-limit/fixed-window-limiter';

/** Requests allowed from one client before the window closes. Generous
 *  enough for a genuine multi-step signup (start, a few re-quotes while
 *  adjusting metrics, accept, a retry after a simulated failure, confirm)
 *  without being useful for flooding the draft table with junk. */
const MAX_REQUESTS = Number(process.env.ONBOARDING_RATE_LIMIT_MAX ?? 30);

const WINDOW_MS = Number(process.env.ONBOARDING_RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000);

const limiter = new FixedWindowLimiter(MAX_REQUESTS, WINDOW_MS);

function clientKey(req: Request): string {
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

@Injectable()
export class OnboardingRateLimitMiddleware implements NestMiddleware {
  constructor(
    @InjectPinoLogger(OnboardingRateLimitMiddleware.name)
    private readonly logger: PinoLogger,
  ) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const key = clientKey(req);
    const retryAfterSec = limiter.retryAfterSeconds(key);

    if (retryAfterSec !== null) {
      res.setHeader('Retry-After', String(retryAfterSec));
      this.logger.warn(
        { ip: key, path: req.originalUrl, retryAfterSec },
        'Onboarding rate limit hit',
      );
      throw new HttpException(
        errorBody(
          ErrorCode.RATE_LIMITED,
          'Too many onboarding requests. Please wait before trying again.',
          { retryAfterSeconds: retryAfterSec },
        ),
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Every request counts, not only failures — see the module docstring.
    limiter.record(key);
    next();
  }
}
