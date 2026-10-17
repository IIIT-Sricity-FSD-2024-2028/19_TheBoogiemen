/**
 * rate-limit.middleware.ts — brute-force protection for the auth routes.
 *
 * Route-scoped middleware, bound in AuthModule.configure() rather than with
 * app.use(). That is the whole point: this runs for the handful of /auth routes
 * and is not even in the stack for the other ~170, so the cost to everything
 * else is exactly zero.
 *
 * Why middleware and not a guard: middleware runs before guards, pipes and the
 * handler, so a blocked caller is rejected before the server parses a DTO or
 * spends ~250ms on a bcrypt comparison. Rejecting early is the entire value —
 * a guard would work, but only after the request had already cost something.
 *
 * Why no dependency: @nestjs/throttler brings a guard, a storage abstraction and
 * a decorator for what is one Map lookup here. A fixed window in memory is the
 * right size for a single-process application.
 *
 * The counting core (the Map, the window bookkeeping) lives in
 * FixedWindowLimiter (common/rate-limit/fixed-window-limiter.ts), shared
 * with onboarding-rate-limit.middleware.ts. This class owns only what is
 * specific to auth: counting failures alone, never successes (see the
 * comment on `use()` below), and this module's own env var names.
 */

import {
  HttpException,
  HttpStatus,
  Injectable,
  NestMiddleware,
} from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { NextFunction, Request, Response } from 'express';
import { ErrorCode, errorBody } from '../errors/error-codes';
import { FixedWindowLimiter } from '../rate-limit/fixed-window-limiter';

/** Failed attempts allowed from one client before the window closes. */
const MAX_FAILURES = Number(process.env.AUTH_RATE_LIMIT_MAX ?? 10);

/** How long the window lasts, and how long a blocked client stays blocked. */
const WINDOW_MS = Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000);

/**
 * Module-scoped, not instance-scoped: Nest may construct the middleware more
 * than once, and the counter has to be shared across those instances or the
 * limit means nothing.
 */
const limiter = new FixedWindowLimiter(MAX_FAILURES, WINDOW_MS);

/**
 * Who is being limited.
 *
 * `req.ip` respects Express's trust-proxy setting. That setting is off, so
 * behind a reverse proxy this is the proxy's address and every client shares
 * one bucket — enable `trust proxy` before deploying behind one, or the first
 * ten failures lock out everybody.
 */
function clientKey(req: Request): string {
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

@Injectable()
export class AuthRateLimitMiddleware implements NestMiddleware {
  constructor(
    @InjectPinoLogger(AuthRateLimitMiddleware.name)
    private readonly logger: PinoLogger,
  ) {}

  /**
   * Synchronous on purpose — no async, no promise allocated per request. The
   * work is one Map lookup and, on a rejected login, one listener.
   */
  use(req: Request, res: Response, next: NextFunction): void {
    const key = clientKey(req);
    const retryAfterSec = limiter.retryAfterSeconds(key);

    if (retryAfterSec !== null) {
      res.setHeader('Retry-After', String(retryAfterSec));

      this.logger.warn(
        { ip: key, path: req.originalUrl, retryAfterSec },
        'Auth rate limit hit',
      );

      // Caught by AllExceptionsFilter: Nest wraps middleware in an exceptions
      // proxy, so this comes back in the same envelope as every other error.
      throw new HttpException(
        errorBody(
          ErrorCode.RATE_LIMITED,
          'Too many failed attempts. Please wait before trying again.',
          { retryAfterSeconds: retryAfterSec },
        ),
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    /**
     * Count failures, never successes.
     *
     * This is what makes the limit safe on a shared address. The college NATs
     * a whole lab behind one IP, so counting every request would let forty
     * students logging in normally lock each other out. A wrong password is a
     * 401 and is the only thing that accrues; signing in successfully costs
     * nothing.
     *
     * `finish` fires once the response is written, which is the earliest point
     * the outcome is known.
     */
    res.on('finish', () => {
      if (res.statusCode !== HttpStatus.UNAUTHORIZED) return;
      limiter.record(key);
    });

    next();
  }
}

/** Exposed for tests, which need a clean table between cases. */
export function __resetRateLimitState(): void {
  limiter.clear();
}
