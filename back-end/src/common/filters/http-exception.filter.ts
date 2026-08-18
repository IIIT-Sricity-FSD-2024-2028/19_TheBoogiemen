import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { Request, Response } from 'express';
import { REQUEST_ID_HEADER } from '../../config/logger.config';

/**
 * Global exception filter.
 *
 * This existed but was never registered, so unhandled errors surfaced through
 * Nest's default handler with no context and no structure. It is now wired up in
 * main.ts and logs through Pino.
 *
 * The level split matters: a 4xx is the client being told "no" and needs no
 * stack trace, while a 5xx is our bug and needs the full one. Logging every 4xx
 * at `error` — as the HTTP logging this replaces did — buries real faults under
 * routine 401s.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: unknown = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message = typeof res === 'string' ? res : (res as any).message ?? res;
    }

    // The correlation id pino-http assigned to this request. Returning it lets a
    // user quote something we can actually find in the logs.
    const requestId = (request as any).id ?? request.header?.(REQUEST_ID_HEADER);

    const context = {
      requestId,
      method: request.method,
      url: request.url,
      statusCode: status,
      userId: (request as any).user?.sub,
    };

    if (status >= 500) {
      this.logger.error({
        ...context,
        err: exception,
        msg: `Unhandled exception on ${request.method} ${request.url}`,
      });
    } else {
      // Expected rejection. pino-http already emits a `warn` line carrying the
      // method, url and status for this request, so logging at `warn` here would
      // double the volume of every 401/403/404. This line exists only to record
      // *why* it was rejected, which is a debugging detail.
      this.logger.debug({
        ...context,
        reason: message,
        msg: `Request rejected: ${request.method} ${request.url}`,
      });
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId,
      // A 5xx must never leak internals to the caller. 4xx messages are written
      // for the user and are safe to return.
      message: status >= 500 ? 'Internal server error' : message,
    });
  }
}
