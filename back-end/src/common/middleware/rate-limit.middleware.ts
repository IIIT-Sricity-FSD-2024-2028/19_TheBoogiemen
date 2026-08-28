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
 * ponytail: in-process Map, so the window is per-process and resets on restart.
 * Fine for one server. If this is ever load-balanced across instances, the
 * counter has to move to Redis or the limit is silently multiplied by the
 * number of instances.
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

/** Failed attempts allowed from one client before the window closes. */
const MAX_FAILURES = Number(process.env.AUTH_RATE_LIMIT_MAX ?? 10);

/** How long the window lasts, and how long a blocked client stays blocked. */
const WINDOW_MS = Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000);

/**
 * Sweep expired entries once the table grows past this. Bounds memory without
 * paying for a timer or a scan on every request.
 */
const PRUNE_THRESHOLD = 5_000;

interface Window {
  count: number;
  resetAt: number;
}

/**
 * Module-scoped, not instance-scoped: Nest may construct the middleware more
 * than once, and the counter has to be shared across those instances or the
 * limit means nothing.
 */
const failures = new Map<string, Window>();

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

function prune(now: number): void {
  for (const [key, window] of failures) {
    if (now >= window.resetAt) failures.delete(key);
  }
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
    const now = Date.now();
    const window = failures.get(key);

    if (window && now < window.resetAt && window.count >= MAX_FAILURES) {
      const retryAfterSec = Math.ceil((window.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfterSec));

      this.logger.warn(
        { ip: key, path: req.originalUrl, failures: window.count, retryAfterSec },
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
      this.recordFailure(key);
    });

    next();
  }

  private recordFailure(key: string): void {
    const now = Date.now();
    const existing = failures.get(key);

    if (existing && now < existing.resetAt) {
      existing.count++;
      return;
    }

    // Opening a new window is the only path that can grow the table, so it is
    // the only place that needs to check the size.
    if (failures.size >= PRUNE_THRESHOLD) prune(now);

    failures.set(key, { count: 1, resetAt: now + WINDOW_MS });
  }
}

/** Exposed for tests, which need a clean table between cases. */
export function __resetRateLimitState(): void {
  failures.clear();
}
