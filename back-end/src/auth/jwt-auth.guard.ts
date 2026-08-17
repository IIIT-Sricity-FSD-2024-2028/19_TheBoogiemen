/**
 * jwt-auth.guard.ts — verifies the bearer token and establishes request.user.
 *
 * Registered as the FIRST global guard, ahead of RolesGuard, so that by the time
 * any authorization decision is made the identity behind it has been proven
 * cryptographically rather than asserted in a header.
 */

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from './public.decorator';
import { JwtPayload, isRole } from './jwt-payload';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger('JwtAuthGuard');

  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const token = this.extractBearerToken(request);

    if (!token) {
      throw new UnauthorizedException('Authentication required');
    }

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch (err: any) {
      // Distinguish only in the log — the client gets a uniform message either way.
      const reason = err?.name === 'TokenExpiredError' ? 'expired' : 'invalid signature or format';
      this.logger.warn(`Rejected token on ${request.method} ${request.url}: ${reason}`);
      throw new UnauthorizedException(
        err?.name === 'TokenExpiredError'
          ? 'Your session has expired. Please sign in again.'
          : 'Invalid authentication token',
      );
    }

    // A token that verifies but carries a malformed payload is still unusable —
    // downstream code treats `sub` and `role` as guaranteed.
    if (!payload?.sub || !isRole(payload.role)) {
      this.logger.warn(`Token verified but payload malformed on ${request.method} ${request.url}`);
      throw new UnauthorizedException('Invalid authentication token');
    }

    request.user = payload;
    return true;
  }

  private extractBearerToken(request: any): string | null {
    const header = request?.headers?.authorization;
    if (typeof header !== 'string') return null;
    const [scheme, value] = header.split(' ');
    if (!/^Bearer$/i.test(scheme ?? '') || !value) return null;
    return value.trim() || null;
  }
}
