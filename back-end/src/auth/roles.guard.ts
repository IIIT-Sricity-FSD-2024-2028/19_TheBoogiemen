/**
 * roles.guard.ts — authorization from verified token claims.
 *
 * This guard used to read `request.headers['role']`, which the client set freely:
 * `curl -H "role: superadmin"` was a complete authorization bypass. It now reads
 * `request.user.role`, populated by JwtAuthGuard from a signature-verified token.
 *
 * Runs after JwtAuthGuard, so `request.user` is guaranteed present on any route
 * that is not @Public().
 *
 * Authorization is deny-by-default, same as @Public() made authentication
 * deny-by-default. Every one of the 172 routes in this application now carries
 * an explicit @Roles(...) (or @SetMetadata('roles', [...]) — identical, see
 * below) or @Public(). Before this, a route with neither was read as "any
 * authenticated user". A scan turned up 109 routes with no visible @Roles —
 * 88 of those already carried it via the @SetMetadata form the scan first
 * missed, but 21 genuinely relied on the open default, including
 * `DELETE /users/:id`, `POST /uploads` and every read on `admin/common
 * .controller.ts`. Those 21 now carry explicit roles too. A new route that
 * forgets the decorator now fails closed with a 500 naming the mistake,
 * instead of silently opening to anyone with a valid session. This matters
 * more than it did before: a future low-trust role (an external customer
 * contact, say) must never inherit access to a route just because nobody
 * remembered to restrict it.
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  SetMetadata,
  ForbiddenException,
  InternalServerErrorException,
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

    // A route reaching here has neither @Public() nor @Roles() — a wiring
    // mistake, not something a client can trigger. This is a 500, not a 403:
    // the caller did nothing wrong, the route is misconfigured. Every route
    // in the application declares one or the other; if this throws, the fix
    // is to add the missing decorator, never to catch and ignore this.
    if (!requiredRoles || requiredRoles.length === 0) {
      throw new InternalServerErrorException(
        errorBody(
          ErrorCode.MISCONFIGURATION,
          `Route ${request.method} ${request.url} has neither @Roles() nor @Public(). ` +
            'Add one — a missing declaration must never default to open.',
        ),
      );
    }

    const role = request.user?.role;

    if (!role) {
      // Should be unreachable: JwtAuthGuard rejects unauthenticated requests first.
      throw new ForbiddenException(
        errorBody(
          ErrorCode.AUTHENTICATION_REQUIRED,
          'No authenticated role on request',
        ),
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
