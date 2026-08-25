import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { FileLoggerService } from '../services/file-logger.service';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly fileLogger: FileLoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: any = 'Internal server error occurred';
    let errorName = 'InternalServerError';
    let details: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const obj = res as any;
        message = obj.message || obj.error || 'Http Exception';
        errorName = obj.error || exception.name;
        details = obj.details || null;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      errorName = exception.name;
      details = exception.stack ? exception.stack.split('\n').slice(0, 3) : null;
    }

    const userId = (request.headers['user-id'] as string) || '';
    const requestId = `err_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Log the error to error.log file immediately
    this.fileLogger.logError({
      message: Array.isArray(message) ? message.join(', ') : String(message),
      statusCode: status,
      path: request.originalUrl || request.url,
      method: request.method,
      stack: exception instanceof Error ? exception.stack : undefined,
      userId,
      details: {
        errorName,
        requestId,
        body: request.body,
        query: request.query,
      },
    });

    const errorPayload = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.originalUrl || request.url,
      method: request.method,
      error: errorName,
      message,
      requestId,
      ...(details && process.env.NODE_ENV !== 'production' ? { details } : {}),
    };

    response.status(status).json(errorPayload);
  }
}
