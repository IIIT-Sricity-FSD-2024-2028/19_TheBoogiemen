/**
 * error-codes.ts — stable, machine-readable error identifiers.
 *
 * HTTP status alone is too coarse for a client to act on: a 400 could be a
 * malformed body, a duplicate record, or a business rule refusing the operation,
 * and each deserves different UI. The status stays authoritative for HTTP
 * semantics; this code says which of the many 400s it is.
 *
 * These are NOT exception classes. Every error in this application is thrown as
 * one of Nest's built-in HttpException subclasses — the code is carried in the
 * response body alongside it.
 *
 * Values are part of the API contract. Add freely; never rename or reuse.
 */
export enum ErrorCode {
  // ── 400 Bad Request ────────────────────────────────────────────────────────
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  MALFORMED_REQUEST = 'MALFORMED_REQUEST',
  IMMUTABLE_FIELD = 'IMMUTABLE_FIELD',
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
  INVALID_STATE_TRANSITION = 'INVALID_STATE_TRANSITION',

  // ── 401 Unauthorized ───────────────────────────────────────────────────────
  AUTHENTICATION_REQUIRED = 'AUTHENTICATION_REQUIRED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_INVALID = 'TOKEN_INVALID',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',

  // ── 403 Forbidden ──────────────────────────────────────────────────────────
  INSUFFICIENT_ROLE = 'INSUFFICIENT_ROLE',
  NOT_RESOURCE_OWNER = 'NOT_RESOURCE_OWNER',
  PRIVILEGE_CEILING = 'PRIVILEGE_CEILING',
  ENVIRONMENT_RESTRICTED = 'ENVIRONMENT_RESTRICTED',
  SEAT_LIMIT_EXCEEDED = 'SEAT_LIMIT_EXCEEDED',
  MODULE_NOT_LICENSED = 'MODULE_NOT_LICENSED',
  SUBSCRIPTION_EXPIRED = 'SUBSCRIPTION_EXPIRED',

  // ── 404 Not Found ──────────────────────────────────────────────────────────
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  ROUTE_NOT_FOUND = 'ROUTE_NOT_FOUND',

  // ── 409 Conflict ───────────────────────────────────────────────────────────
  DUPLICATE_RESOURCE = 'DUPLICATE_RESOURCE',
  CONSTRAINT_VIOLATION = 'CONSTRAINT_VIOLATION',

  // ── 413 / 415 / 429 ────────────────────────────────────────────────────────
  PAYLOAD_TOO_LARGE = 'PAYLOAD_TOO_LARGE',
  UNSUPPORTED_MEDIA_TYPE = 'UNSUPPORTED_MEDIA_TYPE',
  RATE_LIMITED = 'RATE_LIMITED',

  // ── 500 / 503 ──────────────────────────────────────────────────────────────
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  DATABASE_UNAVAILABLE = 'DATABASE_UNAVAILABLE',
  MISCONFIGURATION = 'MISCONFIGURATION',
}

/**
 * Attach a code (and optional details) to any Nest exception.
 *
 * Nest's exception constructors take an arbitrary object as their response body,
 * so this needs no subclassing:
 *
 *   throw new NotFoundException(
 *     errorBody(ErrorCode.RESOURCE_NOT_FOUND, 'Course not found', { courseId }),
 *   );
 */
export function errorBody(
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>,
) {
  return { code, message, ...(details ? { details } : {}) };
}

/** Fallback code for an exception thrown without one, keyed by HTTP status. */
export function defaultCodeForStatus(status: number): ErrorCode {
  switch (status) {
    case 400:
      return ErrorCode.MALFORMED_REQUEST;
    case 401:
      return ErrorCode.AUTHENTICATION_REQUIRED;
    case 403:
      return ErrorCode.INSUFFICIENT_ROLE;
    case 404:
      return ErrorCode.RESOURCE_NOT_FOUND;
    case 409:
      return ErrorCode.DUPLICATE_RESOURCE;
    case 413:
      return ErrorCode.PAYLOAD_TOO_LARGE;
    case 415:
      return ErrorCode.UNSUPPORTED_MEDIA_TYPE;
    case 429:
      return ErrorCode.RATE_LIMITED;
    case 503:
      return ErrorCode.DATABASE_UNAVAILABLE;
    default:
      return status >= 500
        ? ErrorCode.INTERNAL_ERROR
        : ErrorCode.MALFORMED_REQUEST;
  }
}
