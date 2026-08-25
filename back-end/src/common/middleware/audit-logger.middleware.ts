import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { FileLoggerService } from '../services/file-logger.service';

@Injectable()
export class AuditLoggerMiddleware implements NestMiddleware {
  constructor(private readonly fileLogger: FileLoggerService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, headers, body } = req;
    const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

    if (isMutation) {
      const actor = (headers['user-id'] as string) || (headers['role'] as string) || 'unknown_actor';
      const role = (headers['role'] as string) || 'guest';
      const ip = req.ip || (req.socket ? req.socket.remoteAddress || '' : '');

      res.on('finish', () => {
        if (res.statusCode >= 200 && res.statusCode < 400) {
          // Sanitize body to avoid leaking passwords in audit logs
          const sanitizedBody = { ...body };
          if (sanitizedBody.password) sanitizedBody.password = '***REDACTED***';

          this.fileLogger.logAudit(
            `${method} ${originalUrl}`,
            `${actor} (${role})`,
            originalUrl,
            {
              statusCode: res.statusCode,
              ip,
              body: sanitizedBody,
            }
          );
        }
      });
    }

    next();
  }
}
