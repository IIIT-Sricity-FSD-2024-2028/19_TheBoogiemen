/**
 * validation.factory.ts — turn class-validator output into one structured shape.
 *
 * Nest's default emits `message` as a flat string array:
 *
 *   { "message": ["email must be an email", "password must be longer than..."] }
 *
 * which forces the client to parse prose to know which field failed. This maps
 * the same information to a field-keyed object while keeping a human-readable
 * summary, and still throws Nest's own BadRequestException.
 *
 * Nested errors are flattened with dotted paths (`address.city`) so a nested DTO
 * is as addressable as a flat one.
 */

import { BadRequestException, ValidationPipeOptions } from '@nestjs/common';
import type { ValidationError } from 'class-validator';
import { ErrorCode } from './error-codes';

export interface FieldErrors {
  [field: string]: string[];
}

function flatten(errors: ValidationError[], parentPath = ''): FieldErrors {
  const out: FieldErrors = {};

  for (const error of errors) {
    const path = parentPath ? `${parentPath}.${error.property}` : error.property;

    // A parent of nested errors has an empty `constraints` object. Emitting it
    // would put `{"address": []}` next to `{"address.city": [...]}`, so a client
    // rendering field errors would show an empty entry for a field that is fine.
    if (error.constraints && Object.keys(error.constraints).length > 0) {
      out[path] = Object.values(error.constraints);
    }
    if (error.children?.length) {
      for (const [childPath, messages] of Object.entries(flatten(error.children, path))) {
        out[childPath] = [...(out[childPath] ?? []), ...messages];
      }
    }
  }

  return out;
}

/**
 * Passed to ValidationPipe as `exceptionFactory`.
 *
 * `forbidNonWhitelisted` reports unknown keys as `property X should not exist`;
 * those are surfaced separately as `rejectedFields` because the fix is different
 * — the caller should stop sending the field, not correct its value.
 */
export function validationExceptionFactory(errors: ValidationError[]): BadRequestException {
  const fields = flatten(errors);

  const rejectedFields = Object.entries(fields)
    .filter(([, messages]) => messages.some((m) => m.includes('should not exist')))
    .map(([field]) => field);

  const summary =
    rejectedFields.length && rejectedFields.length === Object.keys(fields).length
      ? `Unexpected field(s): ${rejectedFields.join(', ')}`
      : `Validation failed for ${Object.keys(fields).length} field(s)`;

  return new BadRequestException({
    code: ErrorCode.VALIDATION_FAILED,
    message: summary,
    details: {
      fields,
      ...(rejectedFields.length ? { rejectedFields } : {}),
    },
  });
}

/**
 * The one validation configuration for the whole application.
 *
 * `forbidNonWhitelisted` is on globally. Previously it applied to four routes
 * only, so everywhere else an unknown key was silently dropped — which is how a
 * caller could send `role` to a profile-update endpoint and get a 200 back
 * having changed nothing.
 */
export const VALIDATION_PIPE_OPTIONS: ValidationPipeOptions = {
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
  exceptionFactory: validationExceptionFactory,
};
