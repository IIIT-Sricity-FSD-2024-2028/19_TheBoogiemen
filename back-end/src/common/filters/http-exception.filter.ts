import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { Request, Response } from 'express';
import { REQUEST_ID_HEADER } from '../../config/logger.config';
import { ErrorCode, defaultCodeForStatus } from '../errors/error-codes';
import { mapDatabaseError } from '../errors/database-error.mapper';

/**
 * The single exit point for every error the application produces.
 *
 * Responsibilities, in order:
 *   1. Normalise anything thrown into one of Nest's HttpException subclasses.
 *      Database driver errors are translated by mapDatabaseError; anything else
 *      unrecognised becomes a 500.
 *   2. Emit one consistent response envelope, always carrying a machine-readable
 *      `code` so clients branch on that rather than on message prose.
 *   3. Never leak internals on a 5xx — the real message and stack go to the log,
 *      the client gets a generic string and a request id to quote.
 *   4. Log at a level matching severity: 5xx is our bug (error, with stack), 4xx
 *      is the caller being told no (debug — pino-http already emits a warn line
 *      per request, so logging here at warn would double every 401).
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    // Non-HTTP contexts have no response to write to; let them propagate.
    if (host.getType() !== 'http') throw exception;

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const httpException = this.normalise(exception);
    const status = httpException.getStatus();
    const { code, message, details } = this.destructure(httpException, status);

    const requestId = (request as any).id ?? request.header?.(REQUEST_ID_HEADER);

    const logContext = {
      requestId,
      method: request.method,
      url: request.url,
      statusCode: status,
      code,
      userId: (request as any).user?.sub,
    };

    if (status >= 500) {
      this.logger.error({
        ...logContext,
        // The ORIGINAL exception, not the normalised one — the driver error and
        // stack trace are the whole point of this line.
        err: exception,
        msg: `Unhandled exception on ${request.method} ${request.url}`,
      });
    } else {
      this.logger.debug({
        ...logContext,
        reason: message,
        ...(details ? { details } : {}),
        msg: `Request rejected: ${request.method} ${request.url}`,
      });
    }

    // The response may already be partially written (a stream that failed
    // midway); writing again throws and masks the original error.
    if (response.headersSent) return;

    response.status(status).json({
      success: false,
      statusCode: status,
      code,
      // 5xx messages describe our internals and must not reach the caller.
      // 4xx messages are written for the user and are safe to return.
      message: status >= 500 ? 'Internal server error' : message,
      ...(status < 500 && details ? { details } : {}),
      path: request.url,
      requestId,
      timestamp: new Date().toISOString(),
    });
  }

  /** Coerce anything thrown into an HttpException. */
  private normalise(exception: unknown): HttpException {
    if (exception instanceof HttpException) return exception;

    // Driver errors carry a SQLSTATE and map to precise statuses — a unique
    // violation is a 409, not a 500.
    const mapped = mapDatabaseError(exception);
    if (mapped) return mapped;

    // Body-parser failures arrive as plain Errors with a status property.
    const status = (exception as any)?.status ?? (exception as any)?.statusCode;
    if (typeof status === 'number' && status >= 400 && status < 600) {
      return new HttpException(
        {
          code: defaultCodeForStatus(status),
          message:
            status < 500
              ? String((exception as any).message ?? 'Request failed')
              : 'Internal server error',
        },
        status,
      );
    }

    return new InternalServerErrorException({
      code: ErrorCode.INTERNAL_ERROR,
      message: 'Internal server error',
    });
  }

  /**
   * Pull `code`, `message` and `details` out of an exception body.
   *
   * Nest exceptions accept either a string or an object, and class-validator's
   * default factory produces `message` as an array — all three shapes have to
   * collapse into the same envelope.
   */
  private destructure(
    exception: HttpException,
    status: number,
  ): { code: ErrorCode; message: string; details?: unknown } {
    const body = exception.getResponse();

    if (typeof body === 'string') {
      return { code: defaultCodeForStatus(status), message: body };
    }

    const asRecord = body as Record<string, unknown>;
    const rawMessage = asRecord.message;

    const message = Array.isArray(rawMessage)
      ? rawMessage.join(', ')                    // class-validator default shape
      : typeof rawMessage === 'string'
        ? rawMessage
        : exception.message || 'Request failed';

    const code = (typeof asRecord.code === 'string'
      ? asRecord.code
      : defaultCodeForStatus(status)) as ErrorCode;

    return { code, message, details: asRecord.details };
  }
}
