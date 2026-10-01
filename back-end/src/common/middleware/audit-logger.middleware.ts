import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { FileLoggerService } from '../services/file-logger.service';
import { requestIdentity } from './request-identity';

const SENSITIVE_FIELDS = new Set(['password', 'password_hash', 'token', 'secret', 'authorization', 'cookie']);

function sanitizePayload(payload: any): any {
  if (!payload || typeof payload !== 'object') return payload;
  if (Array.isArray(payload)) return payload.map(sanitizePayload);
  const copy: Record<string, any> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (SENSITIVE_FIELDS.has(key.toLowerCase())) {
      copy[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      copy[key] = sanitizePayload(value);
    } else {
      copy[key] = value;
    }
  }
  return copy;
}

@Injectable()
export class AuditLoggerMiddleware implements NestMiddleware {
  constructor(private readonly fileLogger: FileLoggerService, private readonly jwt: JwtService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method.toUpperCase());
    if (!isMutation) return next();

    const timestamp = new Date().toISOString();
    // The actor is taken from the verified session token only.
    const identity = requestIdentity(req, this.jwt);
    const actorId = identity.userId || 'anonymous';
    const actorRole = identity.role || 'guest';
    const resource = req.originalUrl;
    const method = req.method;
    const ip = req.ip || req.socket.remoteAddress || '';
    const sanitizedBody = sanitizePayload(req.body);

    res.on('finish', () => {
      // Only log completed requests
      this.fileLogger.logAudit({
        actorId,
        actorRole,
        action: `${method} ${resource}`,
        resource,
        method,
        status: res.statusCode,
        ip,
        timestamp,
        payload: sanitizedBody,
      });
    });

    next();
  }
}
