/**
 * logger.config.ts — the single place logging behaviour is defined.
 *
 * Replaces a hand-rolled interceptor plus scattered `console.*` calls with one
 * structured pipeline. Framework output, HTTP request logs and application logs
 * all flow through this configuration.
 *
 * Redaction is the part to be careful with: `pino-http` serialises request
 * headers by default, and `Authorization` carries a real JWT. Anything added to
 * a log line must be assumed to reach disk, so credentials are censored here
 * rather than at each call site.
 */

import { randomUUID } from 'crypto';
import * as path from 'path';
import type { IncomingMessage, ServerResponse } from 'http';
import type { Params } from 'nestjs-pino';
import { stdTimeFunctions } from 'pino';
import type { TransportTargetOptions } from 'pino';

/** Header used to carry a correlation id in from a proxy, and back out to the client. */
export const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Paths censored on every log line.
 *
 * Explicit paths rather than wildcards: pino compiles these once at logger
 * creation, and wildcard matching is measurably slower.
 */
const REDACT_PATHS = [
  // Credentials in transit
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  // Credentials in request bodies
  'req.body.password',
  'req.body.current_password',
  'req.body.new_password',
  'req.body.password_hash',
  'req.body.token',
];

const isProduction = () =>
  (process.env.NODE_ENV ?? '').trim().toLowerCase() === 'production';

// ── Persistent log files ─────────────────────────────────────────────────────
//
// Logs previously existed only as terminal scrollback: closing the window lost
// them, and nothing survived a restart. Every line is now also appended to a
// dated file so there is a permanent record to go back to.
//
// Two files per day, deliberately:
//   app-YYYY-MM-DD.log     everything at the configured level
//   error-YYYY-MM-DD.log   level "error" and above only
//
// The second is not redundant. The app log is dominated by one INFO line per
// request, so a fault is a handful of lines among thousands. The error file is
// the one to open first when something broke, and it is small enough to read
// end to end.

/**
 * Where log files live. Resolved to an absolute path so it does not depend on
 * the working directory the process happened to be started from.
 */
export const LOG_DIR = path.resolve(
  process.cwd(),
  process.env.LOG_DIR ?? 'logs',
);

/** Escape hatch for CI and for anyone who wants console-only output. */
const fileLoggingEnabled = () =>
  (process.env.LOG_TO_FILE ?? 'true').trim().toLowerCase() !== 'false';

/**
 * Date stamp for the filename, in LOCAL time.
 *
 * The timestamp inside each line is UTC (ISO-8601, see `timestamp` below),
 * which is correct for correlating across machines. The filename is the
 * opposite problem — a human looking for "yesterday's log" means their own
 * yesterday, so local time is the useful choice there.
 *
 * ponytail: the stamp is computed once, at boot. A process running across
 * midnight keeps writing to the day it started on, and restarts within a day
 * append to the same file (which is what you want). If this ever needs to roll
 * on a real schedule, or to delete old files, swap these two targets for
 * `pino-roll` — same shape, one dependency, `frequency: 'daily'`.
 */
function todayStamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * Where log lines are written.
 *
 * Redaction and serialisation happen on the logger, upstream of every target,
 * so the censoring in REDACT_PATHS applies to the files too. That is the whole
 * reason it can be trusted: a credential written to a terminal scrolls away, a
 * credential written to a file is there until someone deletes it.
 *
 * `pino/file` ships inside pino — no new dependency. Each target runs in a
 * worker thread, so formatting and disk I/O stay off the event loop.
 */
function buildTargets(
  level: string,
  production: boolean,
): TransportTargetOptions[] {
  const targets: TransportTargetOptions[] = [
    production
      ? // destination 1 is stdout. Kept in production so a container runtime or
        // process manager still sees the stream it expects.
        { target: 'pino/file', level, options: { destination: 1 } }
      : {
          target: 'pino-pretty',
          level,
          options: {
            singleLine: true,
            colorize: true,
            translateTime: 'SYS:HH:MM:ss.l',
            ignore: 'pid,hostname',
          },
        },
  ];

  if (!fileLoggingEnabled()) return targets;

  const stamp = todayStamp();

  // `mkdir: true` creates LOG_DIR on first write, so a fresh clone needs no
  // setup step and no directory committed to git.
  targets.push({
    target: 'pino/file',
    level,
    options: {
      destination: path.join(LOG_DIR, `app-${stamp}.log`),
      mkdir: true,
    },
  });

  targets.push({
    target: 'pino/file',
    level: 'error',
    options: {
      destination: path.join(LOG_DIR, `error-${stamp}.log`),
      mkdir: true,
    },
  });

  return targets;
}

/**
 * Requests we never want a line for.
 *
 * The backend also serves the whole frontend, so without this every page load
 * emits a line per static asset — four of five lines would be noise. Anything
 * outside the /api prefix is a static file.
 */
function shouldIgnore(req: IncomingMessage): boolean {
  const url = req.url ?? '';
  if (url.startsWith('/api')) return false;
  return true;
}

/**
 * Map HTTP status to log level.
 *
 * The previous interceptor logged every 4xx at `error`, which made a routine 401
 * look like a server fault. A 4xx is the client being told "no" — that is a
 * warning at most; only 5xx indicates something broke on our side.
 */
function customLogLevel(
  _req: IncomingMessage,
  res: ServerResponse,
  err?: Error,
): 'info' | 'warn' | 'error' {
  if (err || res.statusCode >= 500) return 'error';
  if (res.statusCode >= 400) return 'warn';
  return 'info';
}

export function buildLoggerConfig(): Params {
  const production = isProduction();
  const level = process.env.LOG_LEVEL ?? (production ? 'info' : 'debug');

  return {
    pinoHttp: {
      level,

      /**
       * ISO-8601 instead of pino's default epoch milliseconds.
       *
       * `"time":1756314740466` is fine for a line you read as it scrolls past,
       * and useless in a file opened three months later. `"time":"2026-08-27T
       * 17:12:20.466Z"` is greppable by date and sorts correctly as text.
       *
       * pino-pretty still renders it as a local wall-clock time in the console,
       * so the terminal output is unchanged.
       */
      timestamp: stdTimeFunctions.isoTime,

      // Console plus two dated files. Human-readable in development, one JSON
      // object per line everywhere else. pino-pretty is a devDependency and must
      // never load in production — it is a formatting transform that undoes most
      // of pino's throughput advantage.
      transport: { targets: buildTargets(level, production) },

      redact: { paths: REDACT_PATHS, censor: '[redacted]' },

      // Honour an inbound correlation id so a request can be traced across a
      // proxy; otherwise mint one.
      genReqId: (req: IncomingMessage, res: ServerResponse) => {
        const inbound = req.headers[REQUEST_ID_HEADER];
        const id =
          (Array.isArray(inbound) ? inbound[0] : inbound) || randomUUID();
        // Echo it back so a user reporting a failure can quote an id we can find.
        res.setHeader(REQUEST_ID_HEADER, id);
        return id;
      },

      customLogLevel,

      autoLogging: { ignore: shouldIgnore },

      /**
       * Identity on every request line, taken from the verified JWT claims that
       * JwtAuthGuard placed on the request. Guards run before the response is
       * emitted, so `req.user` is populated by the time this is read.
       *
       * Never read a `role` or `user-id` header here — those are client-supplied
       * and were the original authorization bypass.
       */
      customProps: (req: IncomingMessage) => {
        const user = (req as any).user;
        return user ? { userId: user.sub, role: user.role } : {};
      },

      customSuccessMessage: (req: IncomingMessage, res: ServerResponse) =>
        `${req.method} ${req.url} ${res.statusCode}`,
      customErrorMessage: (req: IncomingMessage, res: ServerResponse) =>
        `${req.method} ${req.url} ${res.statusCode}`,

      serializers: {
        req(req: any) {
          const base = {
            id: req.id,
            method: req.method,
            url: req.url,
          };
          // Bodies only at debug, and never for GET. Redaction above still
          // applies to whatever is included here.
          if (
            req.method !== 'GET' &&
            req.raw?.body &&
            typeof req.raw.body === 'object' &&
            Object.keys(req.raw.body).length > 0
          ) {
            return { ...base, body: req.raw.body };
          }
          return base;
        },
        res: (res: any) => ({ statusCode: res.statusCode }),
        // Response bodies are never logged: the login response carries a token.
      },
    },
  };
}
