/**
 * errors.spec.ts — the error mechanism's own check.
 *
 * Covers the parts that fail silently rather than loudly: a SQLSTATE mapped to
 * the wrong status, a 5xx leaking its internal message, or a validation error
 * losing which field failed.
 *
 * Run: npm test
 */

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { ValidationError } from 'class-validator';
import { ErrorCode, errorBody, defaultCodeForStatus } from './error-codes';
import { mapDatabaseError, isPgError, PgError } from './database-error.mapper';
import { validationExceptionFactory } from './validation.factory';
import { AllExceptionsFilter } from '../filters/http-exception.filter';

const pgError = (code: string, extra: Partial<PgError> = {}): PgError =>
  Object.assign(new Error(`pg error ${code}`), { code, ...extra });

describe('error-codes', () => {
  it('builds a body carrying code, message and optional details', () => {
    expect(errorBody(ErrorCode.RESOURCE_NOT_FOUND, 'gone')).toEqual({
      code: ErrorCode.RESOURCE_NOT_FOUND,
      message: 'gone',
    });
    expect(errorBody(ErrorCode.IMMUTABLE_FIELD, 'nope', { fields: ['role'] })).toEqual({
      code: ErrorCode.IMMUTABLE_FIELD,
      message: 'nope',
      details: { fields: ['role'] },
    });
  });

  it('falls back to a status-appropriate code', () => {
    expect(defaultCodeForStatus(404)).toBe(ErrorCode.RESOURCE_NOT_FOUND);
    expect(defaultCodeForStatus(409)).toBe(ErrorCode.DUPLICATE_RESOURCE);
    expect(defaultCodeForStatus(503)).toBe(ErrorCode.DATABASE_UNAVAILABLE);
    expect(defaultCodeForStatus(500)).toBe(ErrorCode.INTERNAL_ERROR);
  });
});

describe('database-error.mapper', () => {
  it('recognises driver errors only by a five-character SQLSTATE', () => {
    expect(isPgError(pgError('23505'))).toBe(true);
    expect(isPgError(new Error('plain'))).toBe(false);
    expect(isPgError(Object.assign(new Error('x'), { code: 'ENOENT' }))).toBe(false);
  });

  it('maps a unique violation to 409, not 500', () => {
    const mapped = mapDatabaseError(pgError('23505', { constraint: 'users_email_key' }));
    expect(mapped).toBeInstanceOf(ConflictException);
    expect(mapped!.getStatus()).toBe(HttpStatus.CONFLICT);
    const body = mapped!.getResponse() as any;
    expect(body.code).toBe(ErrorCode.DUPLICATE_RESOURCE);
    expect(body.message).toBe('That email address is already registered.');
  });

  it('maps the marks-lock constraint to its business message', () => {
    const mapped = mapDatabaseError(
      pgError('23505', { constraint: 'marks_entry_student_id_assessment_id_key' }),
    );
    expect((mapped!.getResponse() as any).message).toMatch(/already been entered/);
  });

  it('maps a foreign-key violation to 400', () => {
    expect(mapDatabaseError(pgError('23503'))).toBeInstanceOf(BadRequestException);
  });

  it('maps a check violation to 400 with a business-rule code', () => {
    const mapped = mapDatabaseError(pgError('23514', { constraint: 'users_role_check' }));
    expect(mapped!.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    expect((mapped!.getResponse() as any).code).toBe(ErrorCode.BUSINESS_RULE_VIOLATION);
  });

  it('maps connection-exhaustion to 503 so a client knows to retry', () => {
    // 53300 is the Aiven free-tier ceiling being hit.
    expect(mapDatabaseError(pgError('53300'))).toBeInstanceOf(ServiceUnavailableException);
    expect(mapDatabaseError(pgError('08006'))).toBeInstanceOf(ServiceUnavailableException);
  });

  it('maps our own broken SQL to 500 without leaking the reason', () => {
    const mapped = mapDatabaseError(pgError('42703', { column: 'nope' })); // undefined_column
    expect(mapped).toBeInstanceOf(InternalServerErrorException);
    expect((mapped!.getResponse() as any).message).toBe('Internal server error');
  });

  it('returns null for a non-database error so callers can rethrow untouched', () => {
    expect(mapDatabaseError(new Error('application bug'))).toBeNull();
    expect(mapDatabaseError(new NotFoundException('x'))).toBeNull();
  });
});

describe('validationExceptionFactory', () => {
  const err = (property: string, constraints: Record<string, string>, children: ValidationError[] = []): ValidationError =>
    ({ property, constraints, children } as ValidationError);

  it('groups messages by field instead of a flat string array', () => {
    const ex = validationExceptionFactory([
      err('email', { isEmail: 'email must be an email' }),
      err('password', { minLength: 'password must be longer than 8' }),
    ]);
    const body = ex.getResponse() as any;
    expect(body.code).toBe(ErrorCode.VALIDATION_FAILED);
    expect(body.details.fields).toEqual({
      email: ['email must be an email'],
      password: ['password must be longer than 8'],
    });
  });

  it('flattens nested DTO errors to dotted paths', () => {
    const ex = validationExceptionFactory([
      err('address', {}, [err('city', { isString: 'city must be a string' })]),
    ]);
    expect((ex.getResponse() as any).details.fields).toEqual({
      'address.city': ['city must be a string'],
    });
  });

  it('separates rejected unknown fields from invalid values', () => {
    const ex = validationExceptionFactory([
      err('role', { whitelistValidation: 'property role should not exist' }),
    ]);
    const body = ex.getResponse() as any;
    expect(body.details.rejectedFields).toEqual(['role']);
    expect(body.message).toMatch(/Unexpected field/);
  });
});

describe('AllExceptionsFilter', () => {
  const run = (thrown: unknown) => {
    const json = jest.fn();
    const res: any = { status: jest.fn().mockReturnThis(), json, headersSent: false };
    const req: any = { method: 'POST', url: '/api/thing', id: 'req-1', header: () => undefined };
    const logger: any = { error: jest.fn(), debug: jest.fn() };

    const host: any = {
      getType: () => 'http',
      switchToHttp: () => ({ getResponse: () => res, getRequest: () => req }),
    };

    new AllExceptionsFilter(logger).catch(thrown, host);
    return { body: json.mock.calls[0][0], status: res.status.mock.calls[0][0], logger };
  };

  it('returns the code and message for a 4xx, and logs at debug', () => {
    const { body, status, logger } = run(
      new NotFoundException(errorBody(ErrorCode.RESOURCE_NOT_FOUND, 'Course not found')),
    );
    expect(status).toBe(404);
    expect(body).toMatchObject({
      success: false,
      statusCode: 404,
      code: ErrorCode.RESOURCE_NOT_FOUND,
      message: 'Course not found',
      requestId: 'req-1',
    });
    expect(logger.debug).toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('never leaks a 5xx message, and logs at error with the original exception', () => {
    const secret = new Error('connection string postgres://user:hunter2@host/db');
    const { body, status, logger } = run(secret);
    expect(status).toBe(500);
    expect(body.message).toBe('Internal server error');
    expect(JSON.stringify(body)).not.toMatch(/hunter2/);
    expect(logger.error).toHaveBeenCalled();
    // The ORIGINAL error must reach the log, or the 500 is undiagnosable.
    expect(logger.error.mock.calls[0][0].err).toBe(secret);
  });

  it('translates a driver error into its mapped status', () => {
    const { body, status } = run(pgError('23505', { constraint: 'users_email_key' }));
    expect(status).toBe(409);
    expect(body.code).toBe(ErrorCode.DUPLICATE_RESOURCE);
  });

  it('collapses class-validator array messages into one string', () => {
    const { body } = run(new BadRequestException({ message: ['a must be x', 'b must be y'] }));
    expect(body.message).toBe('a must be x, b must be y');
  });

  it('accepts a plain-string exception body', () => {
    const { body, status } = run(new ForbiddenException('Nope'));
    expect(status).toBe(403);
    expect(body.message).toBe('Nope');
    expect(body.code).toBe(ErrorCode.INSUFFICIENT_ROLE);
  });

  it('passes details through on a 4xx but never on a 5xx', () => {
    const ok = run(new BadRequestException(errorBody(ErrorCode.IMMUTABLE_FIELD, 'no', { fields: ['role'] })));
    expect(ok.body.details).toEqual({ fields: ['role'] });

    const bad = run(new InternalServerErrorException(errorBody(ErrorCode.DATABASE_ERROR, 'boom', { sql: 'SELECT 1' })));
    expect(bad.body.details).toBeUndefined();
  });

  it('does not write twice when the response has already started', () => {
    const json = jest.fn();
    const res: any = { status: jest.fn().mockReturnThis(), json, headersSent: true };
    const host: any = {
      getType: () => 'http',
      switchToHttp: () => ({
        getResponse: () => res,
        getRequest: () => ({ method: 'GET', url: '/x', header: () => undefined }),
      }),
    };
    new AllExceptionsFilter({ error: jest.fn(), debug: jest.fn() } as any).catch(new Error('late'), host);
    expect(json).not.toHaveBeenCalled();
  });
});
