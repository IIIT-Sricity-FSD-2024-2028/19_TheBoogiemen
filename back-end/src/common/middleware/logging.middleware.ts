import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { FileLoggerService } from '../services/file-logger.service';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  constructor(private readonly fileLogger: FileLoggerService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const { method, originalUrl, ip, headers } = req;
    const userAgent = (headers['user-agent'] as string) || 'unknown';
    const userId = (headers['user-id'] as string) || ((req as any).user?.sub ?? '');
    const tenantId = (headers['x-tenant-id'] as string) || ((req as any).user?.tenant_id ?? '');

    res.on('finish', () => {
      const durationMs = Date.now() - startTime;
      const status = res.statusCode;

      this.fileLogger.logAccess({
        method,
        url: originalUrl,
        status,
        durationMs,
        ip: ip || req.socket.remoteAddress || '',
        userAgent,
        userId,
        tenantId,
      });
    });

    next();
  }
}
