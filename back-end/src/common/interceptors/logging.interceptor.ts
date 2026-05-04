import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const { method, url, body, headers } = request;
    const userAgent = headers['user-agent'] || 'N/A';
    const role = headers['role'] || 'none';
    const userId = headers['user-id'] || 'anonymous';
    const controllerName = context.getClass().name;
    const handlerName = context.getHandler().name;

    const now = Date.now();
    const timestamp = new Date().toISOString();

    // ── Incoming Request Log ──
    this.logger.log(
      `\n` +
      `┌──────────────────────────────────────────────────────────────\n` +
      `│ 📨 INCOMING REQUEST\n` +
      `│ Timestamp : ${timestamp}\n` +
      `│ Method    : ${method}\n` +
      `│ URL       : ${url}\n` +
      `│ Controller: ${controllerName}\n` +
      `│ Handler   : ${handlerName}()\n` +
      `│ Role      : ${role}\n` +
      `│ User-ID   : ${userId}\n` +
      `│ User-Agent: ${userAgent.substring(0, 80)}\n` +
      (Object.keys(body || {}).length > 0
        ? `│ Body      : ${JSON.stringify(body).substring(0, 200)}\n`
        : `│ Body      : (empty)\n`) +
      `├──────────────────────────────────────────────────────────────`
    );

    return next.handle().pipe(
      tap((data) => {
        const statusCode = response.statusCode;
        const duration = Date.now() - now;

        // ── Outgoing Response Log ──
        this.logger.log(
          `│ ✅ RESPONSE SENT\n` +
          `│ Status    : ${statusCode}\n` +
          `│ Duration  : ${duration}ms\n` +
          `│ Data Keys : ${data ? (typeof data === 'object' ? Object.keys(data).join(', ') : typeof data) : 'null'}\n` +
          `└──────────────────────────────────────────────────────────────`
        );
      }),
      catchError((error) => {
        const duration = Date.now() - now;

        // ── Error Response Log ──
        this.logger.error(
          `│ ❌ ERROR RESPONSE\n` +
          `│ Status    : ${error.status || 500}\n` +
          `│ Duration  : ${duration}ms\n` +
          `│ Error     : ${error.message || 'Unknown error'}\n` +
          `└──────────────────────────────────────────────────────────────`
        );

        throw error;
      }),
    );
  }
}
