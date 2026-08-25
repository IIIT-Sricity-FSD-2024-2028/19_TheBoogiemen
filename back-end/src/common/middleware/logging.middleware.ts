import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { FileLoggerService } from '../services/file-logger.service';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  constructor(private readonly fileLogger: FileLoggerService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const { method, originalUrl, ip, headers } = req;
    const userAgent = headers['user-agent'] || 'unknown';
    const userId = (headers['user-id'] as string) || '';
    const tenantId = (headers['x-tenant-id'] as string) || 't1';

    res.on('finish', () => {
      const durationMs = Date.now() - startTime;
      const statusCode = res.statusCode;

      // Color coding for console
      const statusColor =
        statusCode >= 500
          ? '\x1b[31m' // Red
          : statusCode >= 400
          ? '\x1b[33m' // Yellow
          : statusCode >= 300
          ? '\x1b[36m' // Cyan
          : '\x1b[32m'; // Green
      const resetColor = '\x1b[0m';

      console.log(
        `[HTTP] ${method.padEnd(6)} ${originalUrl.padEnd(35)} ${statusColor}${statusCode}${resetColor} - ${durationMs}ms - IP: ${ip} User: ${userId || 'guest'}`
      );

      // Persist access log to disk
      this.fileLogger.logAccess({
        method,
        url: originalUrl,
        status: statusCode,
        durationMs,
        ip: ip || (req.socket ? req.socket.remoteAddress || '' : ''),
        userAgent,
        userId,
        tenantId,
      });
    });

    next();
  }
}
