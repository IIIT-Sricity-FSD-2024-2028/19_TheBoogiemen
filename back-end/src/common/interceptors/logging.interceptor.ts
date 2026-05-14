import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, headers } = request;
    const now = Date.now();

    const role = headers['role'] || 'anonymous';
    const userId = headers['user-id'] || 'unknown';

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        const statusCode = response.statusCode;
        const duration = Date.now() - now;

        const message = `[${method}] ${url} - Status: ${statusCode} - Role: ${role} - User: ${userId} - Duration: ${duration}ms`;
        
        if (statusCode >= 400) {
          this.logger.error(message);
        } else {
          this.logger.log(message);
        }

        // Log body for non-GET requests if it exists
        if (method !== 'GET' && Object.keys(body).length > 0) {
          // Sensitive data masking (basic)
          const sanitizedBody = { ...body };
          if (sanitizedBody.password) sanitizedBody.password = '********';
          this.logger.debug(`Body: ${JSON.stringify(sanitizedBody)}`);
        }
      }),
    );
  }
}
