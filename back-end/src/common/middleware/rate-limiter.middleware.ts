import { HttpStatus, Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

@Injectable()
export class RateLimiterMiddleware implements NestMiddleware {
  private readonly windowMs = 60 * 1000; // 1 minute window
  private readonly maxRequests = 200; // 200 requests per minute
  private readonly store = new Map<string, RateLimitRecord>();

  use(req: Request, res: Response, next: NextFunction) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const record = this.store.get(ip);

    if (!record || record.resetAt <= now) {
      this.store.set(ip, { count: 1, resetAt: now + this.windowMs });
      res.setHeader('X-RateLimit-Limit', this.maxRequests);
      res.setHeader('X-RateLimit-Remaining', this.maxRequests - 1);
      res.setHeader('X-RateLimit-Reset', Math.ceil((now + this.windowMs) / 1000));
      return next();
    }

    record.count++;
    const remaining = Math.max(0, this.maxRequests - record.count);
    res.setHeader('X-RateLimit-Limit', this.maxRequests);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetAt / 1000));

    if (record.count > this.maxRequests) {
      res.status(HttpStatus.TOO_MANY_REQUESTS).json({
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Maximum ${this.maxRequests} requests per minute.`,
        retryAfter: Math.ceil((record.resetAt - now) / 1000),
      });
      return;
    }

    next();
  }
}
