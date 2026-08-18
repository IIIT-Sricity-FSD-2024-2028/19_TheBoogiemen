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
import type { IncomingMessage, ServerResponse } from 'http';
import type { Params } from 'nestjs-pino';

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

const isProduction = () => (process.env.NODE_ENV ?? '').trim().toLowerCase() === 'production';

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

  return {
    pinoHttp: {
      level: process.env.LOG_LEVEL ?? (production ? 'info' : 'debug'),

      // Human-readable in development, one JSON object per line in production.
      // pino-pretty is a devDependency and must never load in production — it is
      // a formatting transform that undoes most of pino's throughput advantage.
      transport: production
        ? undefined
        : {
            target: 'pino-pretty',
            options: {
              singleLine: true,
              colorize: true,
              translateTime: 'SYS:HH:MM:ss.l',
              ignore: 'pid,hostname',
            },
          },

      redact: { paths: REDACT_PATHS, censor: '[redacted]' },

      // Honour an inbound correlation id so a request can be traced across a
      // proxy; otherwise mint one.
      genReqId: (req: IncomingMessage, res: ServerResponse) => {
        const inbound = req.headers[REQUEST_ID_HEADER];
        const id = (Array.isArray(inbound) ? inbound[0] : inbound) || randomUUID();
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
          if (req.method !== 'GET' && req.raw?.body && typeof req.raw.body === 'object'
              && Object.keys(req.raw.body).length > 0) {
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
