/**
 * roles.guard.ts — authorization from verified token claims.
 *
 * This guard reads `request.user.role`, populated by JwtAuthGuard from a signature-verified token.
 *
 * Runs after JwtAuthGuard, so `request.user` is guaranteed present on any route
 * that is not @Public().
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  SetMetadata,
  ForbiddenException,
} from '@nestjs/common';
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

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest();

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const userRole = request.user?.role;

    if (!userRole) {
      throw new ForbiddenException(
        errorBody(
          ErrorCode.AUTHENTICATION_REQUIRED,
          'No authenticated role on request',
        ),
      );
    }

    const normalizedRoles = [userRole];
    if (userRole === 'superadmin' || userRole === 'admin' || userRole === 'INSTITUTE_SUPER_ADMIN') {
      normalizedRoles.push('superadmin', 'admin', 'INSTITUTE_SUPER_ADMIN');
    }
    if (userRole === 'head' || userRole === 'DEPARTMENT_ADMIN_HOD') {
      normalizedRoles.push('head', 'DEPARTMENT_ADMIN_HOD');
    }
    if (userRole === 'FINANCE_ADMIN' || userRole === 'finance') {
      normalizedRoles.push('FINANCE_ADMIN', 'finance', 'admin');
    }
    if (userRole === 'PLATFORM_SUPER_ADMIN') {
      normalizedRoles.push('PLATFORM_SUPER_ADMIN', 'superadmin', 'admin', 'head', 'faculty');
    }

    const hasAccess = requiredRoles.some((r) => normalizedRoles.includes(r));

    if (!hasAccess) {
      throw new ForbiddenException(
        errorBody(
          ErrorCode.INSUFFICIENT_ROLE,
          `Requires one of: ${requiredRoles.join(', ')}. Your role is '${userRole}'.`,
          { requiredRoles, actualRole: userRole },
        ),
      );
    }

    return true;
  }
}
