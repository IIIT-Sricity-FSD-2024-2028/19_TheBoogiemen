import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';

const SENSITIVE_FIELDS = ['password', 'new_password', 'current_password', 'token'];

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body } = request;
    const now = Date.now();

    // Read from the verified token, not from headers. `request.user` is populated
    // by JwtAuthGuard; it is absent on @Public() routes and on rejected requests,
    // which is exactly what "anonymous" should mean in the log.
    const role = request.user?.role ?? 'anonymous';
    const userId = request.user?.sub ?? 'unknown';

    // Status is captured from the response, or from the thrown error when the
    // handler failed — previously failures were never logged at all.
    let failureStatus: number | undefined;

    return next.handle().pipe(
      catchError((err) => {
        failureStatus = err?.status ?? err?.getStatus?.() ?? 500;
        throw err;
      }),
      // finalize() runs after success AND after an error, and — unlike tap() —
      // anything thrown here cannot convert a successful response into a 500.
      // A bug in this interceptor previously turned every DELETE into an error
      // response even though the delete itself had already succeeded.
      finalize(() => {
        try {
          const response = context.switchToHttp().getResponse();
          const statusCode = failureStatus ?? response?.statusCode ?? 200;
          const duration = Date.now() - now;

          const message = `[${method}] ${url} - Status: ${statusCode} - Role: ${role} - User: ${userId} - Duration: ${duration}ms`;

          if (statusCode >= 400) {
            this.logger.error(message);
          } else {
            this.logger.log(message);
          }

          // `body` is undefined whenever no body parser ran — a bodyless DELETE,
          // or any request without a JSON Content-Type. Guard before touching it.
          if (method !== 'GET' && body && typeof body === 'object') {
            const keys = Object.keys(body);
            if (keys.length > 0) {
              const sanitizedBody: Record<string, any> = { ...body };
              for (const field of SENSITIVE_FIELDS) {
                if (sanitizedBody[field] !== undefined) sanitizedBody[field] = '********';
              }
              this.logger.debug(`Body: ${JSON.stringify(sanitizedBody)}`);
            }
          }
        } catch (loggingError) {
          // Logging must never affect the response.
          this.logger.warn(`Failed to log request ${method} ${url}: ${loggingError}`);
        }
      }),
    );
  }
}
