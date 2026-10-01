import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { FileLoggerService } from '../services/file-logger.service';
import { requestIdentity } from './request-identity';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  constructor(private readonly fileLogger: FileLoggerService, private readonly jwt: JwtService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const { method, originalUrl, ip, headers } = req;
    const userAgent = (headers['user-agent'] as string) || 'unknown';
    // Identity comes from the verified session token, never from headers a
    // client can set (the old user-id / x-tenant-id headers were spoofable).
    const identity = requestIdentity(req, this.jwt);
    const userId = identity.userId ?? '';
    const tenantId = identity.collegeId ?? '';

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
