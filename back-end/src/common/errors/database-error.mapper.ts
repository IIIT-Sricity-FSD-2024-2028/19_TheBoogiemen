/**
 * database-error.mapper.ts — translate PostgreSQL errors into Nest exceptions.
 *
 * Without this every constraint violation is an unhandled driver error, so the
 * filter reports 500 "Internal server error" for what is usually the caller's
 * fault. Two things go wrong with that: the client cannot tell a duplicate from
 * a genuine outage, and the raw driver message ("duplicate key value violates
 * unique constraint \"marks_entry_student_id_assessment_id_key\"") leaks table
 * and column names to whoever triggered it.
 *
 * Every branch returns one of Nest's built-in HttpException subclasses. The
 * public message is written for a user; the driver's own detail goes to the log
 * only, via the filter.
 *
 * SQLSTATE reference: https://www.postgresql.org/docs/current/errcodes-appendix.html
 */

import {
  BadRequestException,
  ConflictException,
  HttpException,
  InternalServerErrorException,
  RequestTimeoutException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ErrorCode, errorBody } from './error-codes';

/** Shape node-postgres attaches to a driver error. */
export interface PgError extends Error {
  code?: string;
  constraint?: string;
  table?: string;
  column?: string;
  detail?: string;
  schema?: string;
}

/** A driver error carries a five-character SQLSTATE; application errors do not. */
export function isPgError(err: unknown): err is PgError {
  return (
    err instanceof Error &&
    typeof (err as PgError).code === 'string' &&
    /^[0-9A-Z]{5}$/.test((err as PgError).code as string)
  );
}

/**
 * Constraint names the application relies on, mapped to a message that explains
 * the rule rather than the schema. Anything not listed still maps to the right
 * status — it just gets a generic message.
 */
const CONSTRAINT_MESSAGES: Record<string, string> = {
  attendance_log_pkey: 'This attendance record already exists.',
  attendance_log_student_id_course_id_date_key:
    'Attendance for this student, course and date has already been recorded.',
  marks_entry_student_id_assessment_id_key:
    'Marks for this student and assessment have already been entered.',
  enrollment_student_id_course_id_key: 'This student is already enrolled in this course.',
  users_email_key: 'That email address is already registered.',
  courses_course_code_key: 'That course code is already in use.',
  departments_department_code_key: 'That department code is already in use.',
  users_role_check: 'That is not a valid role.',
  attendance_log_status_check: 'Attendance status must be present, absent or excused.',
  leave_applications_status_check: 'Leave status must be pending, approved or rejected.',
  syllabus_progress_progress_check: 'Progress must be between 0 and 100.',
};

const messageFor = (constraint: string | undefined, fallback: string) =>
  (constraint && CONSTRAINT_MESSAGES[constraint]) || fallback;

/**
 * Map a driver error to the equivalent Nest exception.
 *
 * Returns null when the error is not a PostgreSQL error, so callers can rethrow
 * it untouched rather than mislabelling an application bug as a database fault.
 */
export function mapDatabaseError(err: unknown): HttpException | null {
  if (!isPgError(err)) return null;

  const code = err.code as string;
  const constraint = err.constraint;
  const details = constraint ? { constraint } : undefined;

  switch (code) {
    // ── Integrity violations: the caller sent something the schema refuses ───
    case '23505': // unique_violation
      return new ConflictException(
        errorBody(
          ErrorCode.DUPLICATE_RESOURCE,
          messageFor(constraint, 'That record already exists.'),
          details,
        ),
      );

    case '23503': // foreign_key_violation — points at a row that does not exist
      return new BadRequestException(
        errorBody(
          ErrorCode.CONSTRAINT_VIOLATION,
          messageFor(constraint, 'A referenced record does not exist.'),
          details,
        ),
      );

    case '23502': // not_null_violation
      return new BadRequestException(
        errorBody(
          ErrorCode.VALIDATION_FAILED,
          err.column ? `"${err.column}" is required.` : 'A required field is missing.',
          err.column ? { field: err.column } : undefined,
        ),
      );

    case '23514': // check_violation
      return new BadRequestException(
        errorBody(
          ErrorCode.BUSINESS_RULE_VIOLATION,
          messageFor(constraint, 'That value is not allowed for this field.'),
          details,
        ),
      );

    case '23P01': // exclusion_violation
      return new ConflictException(
        errorBody(ErrorCode.CONSTRAINT_VIOLATION, 'That record conflicts with an existing one.', details),
      );

    // ── Malformed input: wrong type, too long, bad datetime ─────────────────
    case '22P02': // invalid_text_representation
    case '22007': // invalid_datetime_format
    case '22008': // datetime_field_overflow
      return new BadRequestException(
        errorBody(ErrorCode.MALFORMED_REQUEST, 'One of the supplied values has the wrong format.'),
      );

    case '22001': // string_data_right_truncation
      return new BadRequestException(
        errorBody(ErrorCode.VALIDATION_FAILED, 'One of the supplied values is too long.'),
      );

    case '22003': // numeric_value_out_of_range
      return new BadRequestException(
        errorBody(ErrorCode.VALIDATION_FAILED, 'A numeric value is out of range.'),
      );

    // ── Contention: retryable, and genuinely a conflict ──────────────────────
    case '40001': // serialization_failure
    case '40P01': // deadlock_detected
      return new ConflictException(
        errorBody(
          ErrorCode.CONSTRAINT_VIOLATION,
          'The request conflicted with another operation. Please try again.',
        ),
      );

    case '57014': // query_canceled (statement timeout)
      return new RequestTimeoutException(
        errorBody(ErrorCode.DATABASE_ERROR, 'The request took too long and was cancelled.'),
      );

    // ── Availability: our problem, but transient — 503 invites a retry ───────
    case '53300': // too_many_connections — the Aiven free-tier ceiling is 20
    case '53400': // configuration_limit_exceeded
      return new ServiceUnavailableException(
        errorBody(ErrorCode.DATABASE_UNAVAILABLE, 'The service is busy. Please try again shortly.'),
      );

    case '57P01': // admin_shutdown
    case '57P02': // crash_shutdown
    case '57P03': // cannot_connect_now
      return new ServiceUnavailableException(
        errorBody(ErrorCode.DATABASE_UNAVAILABLE, 'The database is unavailable. Please try again shortly.'),
      );

    default:
      // Class 08 (connection), 53 (insufficient resources), 58 (system) are all
      // transient infrastructure faults rather than caller mistakes.
      if (code.startsWith('08') || code.startsWith('53') || code.startsWith('58')) {
        return new ServiceUnavailableException(
          errorBody(ErrorCode.DATABASE_UNAVAILABLE, 'The database is unavailable. Please try again shortly.'),
        );
      }
      // Class 42 (syntax / undefined table / undefined column) means we shipped
      // broken SQL. That is a 500, and the detail must not reach the client.
      return new InternalServerErrorException(
        errorBody(ErrorCode.DATABASE_ERROR, 'Internal server error'),
      );
  }
}
