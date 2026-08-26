/**
 * roles.guard.ts — authorization from verified token claims.
 *
 * This guard used to read `request.headers['role']`, which the client set freely:
 * `curl -H "role: superadmin"` was a complete authorization bypass. It now reads
 * `request.user.role`, populated by JwtAuthGuard from a signature-verified token.
 *
 * Runs after JwtAuthGuard, so `request.user` is guaranteed present on any route
 * that is not @Public().
 */

import { Injectable, CanActivate, ExecutionContext, SetMetadata, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './public.decorator';
import { Role } from './jwt-payload';
import { ErrorCode, errorBody } from '../common/errors/error-codes';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') return true;

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @Roles on the handler means "any authenticated user". Authentication
    // itself was already enforced by JwtAuthGuard.
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const role = request.user?.role;

    if (!role) {
      // Should be unreachable: JwtAuthGuard rejects unauthenticated requests first.
      throw new ForbiddenException(
        errorBody(ErrorCode.AUTHENTICATION_REQUIRED, 'No authenticated role on request'),
      );
    }

    if (!requiredRoles.includes(role)) {
      // 403, not 401 — the caller is authenticated, just not permitted. The
      // frontend relies on this distinction: 401 signs you out, 403 does not.
      throw new ForbiddenException(
        errorBody(
          ErrorCode.INSUFFICIENT_ROLE,
          `Requires one of: ${requiredRoles.join(', ')}. Your role is '${role}'.`,
          { requiredRoles, actualRole: role },
        ),
      );
    }

    return true;
  }
}
