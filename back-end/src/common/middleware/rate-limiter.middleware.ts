import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

interface RateLimitBucket {
  count: number;
  resetTime: number;
}

@Injectable()
export class RateLimiterMiddleware implements NestMiddleware {
  private buckets = new Map<string, RateLimitBucket>();
  private readonly WINDOW_MS = 60 * 1000; // 1 minute window
  private readonly MAX_REQUESTS = 200; // 200 requests per minute per IP

  use(req: Request, res: Response, next: NextFunction) {
    const ip = req.ip || (req.socket ? req.socket.remoteAddress || 'unknown' : 'unknown');
    const now = Date.now();

    let bucket = this.buckets.get(ip);
    if (!bucket || now > bucket.resetTime) {
      bucket = { count: 1, resetTime: now + this.WINDOW_MS };
      this.buckets.set(ip, bucket);
    } else {
      bucket.count += 1;
    }

    res.setHeader('X-RateLimit-Limit', this.MAX_REQUESTS);
    res.setHeader(
      'X-RateLimit-Remaining',
      Math.max(0, this.MAX_REQUESTS - bucket.count)
    );
    res.setHeader(
      'X-RateLimit-Reset',
      Math.ceil(bucket.resetTime / 1000)
    );

    if (bucket.count > this.MAX_REQUESTS) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again in a few moments.',
          retryAfterSeconds: Math.ceil((bucket.resetTime - now) / 1000),
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    next();
  }
}
