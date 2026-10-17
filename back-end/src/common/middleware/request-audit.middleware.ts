/**
 * request-audit.middleware.ts — the "who changed what" trail.
 *
 * Router-level middleware, bound once in AppModule.configure() across every API
 * route. This is the audit log an evaluator, an administrator or a post-incident
 * reader opens to answer a single question: which account made this change, and
 * did it succeed?
 *
 * Not a duplicate of pino-http. That logs every request, dominated by reads, and
 * exists to debug behaviour. This records only state *changes*, to a separate
 * permanent file, and exists to attribute them. In an academic system where
 * faculty enter marks and staff approve leave, "who marked this student absent"
 * is a question the request log cannot answer without grepping thousands of GET
 * lines.
 *
 * Overhead is close to zero on the hot path: reads return on the first line,
 * before anything is allocated, and reads are the overwhelming majority of
 * traffic. A mutation costs one hrtime read and one 'finish' listener.
 */

import { Injectable, NestMiddleware, RequestMethod } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import * as path from 'path';
import { pino } from 'pino';
import { stdTimeFunctions } from 'pino';
import {
  LOG_DIR,
  REQUEST_ID_HEADER,
  fileLoggingEnabled,
  todayStamp,
} from '../../config/logger.config';

/**
 * Methods that cannot change anything. Skipping them is what keeps this cheap
 * and what keeps the audit file readable — a trail padded with page loads is a
 * trail nobody scrolls through.
 */
const READ_ONLY_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * A dedicated logger, not a child of the application one.
 *
 * A child would inherit the app logger's transports and land every audit record
 * in app-*.log alongside the request noise it is meant to stand apart from. The
 * audit trail earns its own file for the same reason error-*.log does: it is the
 * file you open first, and it is only useful if it is short.
 *
 * `base: null` drops pid and hostname. An audit record is about the actor, not
 * the machine, and both are already on every line in app-*.log.
 */
const auditLogger = pino({
  level: 'info',
  base: null,
  timestamp: stdTimeFunctions.isoTime,
  transport: {
    target: 'pino/file',
    options: fileLoggingEnabled()
      ? {
          destination: path.join(LOG_DIR, `audit-${todayStamp()}.log`),
          mkdir: true,
        }
      : // LOG_TO_FILE=false — one code path, stdout instead of a file.
        { destination: 1 },
  },
});

/**
 * What the status code says about the attempt.
 *
 * Recorded as a word because the interesting audit queries are "show me
 * everything that was denied" and "show me what failed", and grepping a word
 * beats a numeric range.
 */
function outcomeOf(statusCode: number): string {
  if (statusCode < 400) return 'success';
  if (statusCode === 401 || statusCode === 403) return 'denied';
  if (statusCode < 500) return 'rejected';
  return 'failed';
}

@Injectable()
export class RequestAuditMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    // The hot path. Reads leave before anything is allocated.
    if (READ_ONLY_METHODS.has(req.method)) return next();

    const startedAt = process.hrtime.bigint();

    /**
     * 'finish' fires once the response is written — the earliest point at which
     * both the outcome and the caller's identity are known.
     *
     * Identity has to be read here rather than at the top of `use`: middleware
     * runs at stage 5, and JwtAuthGuard does not populate `request.user` until
     * stage 7. Reading it now is what makes attribution possible at all.
     */
    res.on('finish', () => {
      const user = (req as any).user;
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;

      auditLogger.info({
        // Ties the audit record to the full request log line and to the id the
        // client was handed in its error response.
        requestId: (req as any).id ?? req.header(REQUEST_ID_HEADER),
        actor: user?.sub ?? 'anonymous',
        role: user?.role ?? 'none',
        ip: req.ip,
        method: req.method,
        // originalUrl keeps the query string; the path alone loses which record
        // was targeted on routes that filter by query.
        path: req.originalUrl,
        statusCode: res.statusCode,
        outcome: outcomeOf(res.statusCode),
        durationMs: Math.round(durationMs * 100) / 100,
        msg: `${req.method} ${req.originalUrl}`,
      });
    });

    next();
  }
}

/**
 * Routes excluded from the trail, with the reason each one is safe to drop.
 *
 * Paths are written WITHOUT the 'api/' prefix: Nest runs exclude() paths through
 * the same RouteInfoPathExtractor as forRoutes(), which prepends the global
 * prefix. Writing 'api/uploads' here would compile to '/api/api/uploads' and
 * silently never match — an exclusion that fails open is worse than none, so
 * this is stated rather than left to be rediscovered.
 */
export const AUDIT_EXCLUDED_ROUTES = [
  {
    // UploadsService.record() already logs every upload with file id, context,
    // owner, size and MIME type. Auditing it again records strictly less.
    path: 'uploads',
    method: RequestMethod.POST,
  },
  {
    // 204, clears a cookie, changes no stored state. Pure volume.
    path: 'auth/logout',
    method: RequestMethod.POST,
  },
];
