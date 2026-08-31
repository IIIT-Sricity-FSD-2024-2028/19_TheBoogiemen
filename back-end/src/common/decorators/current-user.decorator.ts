/**
 * current-user.decorator.ts — the authenticated principal, from the token.
 *
 * Replaces `@Headers('user-id')`, which appeared at 32 handler sites and let any
 * caller act as any user simply by editing a header. `request.user` is set only
 * by JwtAuthGuard after signature verification, so it cannot be forged.
 *
 *   @Get('me')
 *   getProfile(@CurrentUser() user: AuthenticatedUser) { ... user.sub ... }
 *
 *   @Get('me')
 *   getProfile(@CurrentUserId() userId: string) { ... }
 */

import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';
import { AuthenticatedUser } from '../../auth/jwt-payload';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest();
    if (!request.user) {
      // Reaching here means the route is @Public() but reads the current user —
      // a wiring mistake, not something a client can trigger.
      throw new InternalServerErrorException(
        'CurrentUser requested on a route without authentication. Remove @Public() or stop reading the user.',
      );
    }
    return request.user;
  },
);

export const CurrentUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    if (!request.user?.sub) {
      throw new InternalServerErrorException(
        'CurrentUserId requested on a route without authentication.',
      );
    }
    return request.user.sub;
  },
);

/**
 * The caller's verified role. Replaces `@Headers('role')`, which was the
 * authorization bypass itself — a client could claim any role it liked.
 */
export const CurrentUserRole = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    if (!request.user?.role) {
      throw new InternalServerErrorException(
        'CurrentUserRole requested on a route without authentication.',
      );
    }
    return request.user.role;
  },
);

/**
 * The caller's college, from the verified token — never a path or body
 * parameter a caller could edit to reach another college's data. This is the
 * one thing standing between "a SPOC sees their own college" and "a SPOC sees
 * everyone's": every billing/support route resolves the college this way,
 * never from anything the client sends.
 *
 * Returns `null` rather than throwing when the claim is absent — unlike
 * `sub` and `role`, "no college" is a legitimate value (superadmin, the
 * vendor operator, belongs to none). A route that requires one checks for
 * `null` itself and throws its own, route-specific error; this decorator only
 * guarantees the value is genuine, not that it is present.
 */
export const CurrentUserCollegeId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | null => {
    const request = ctx.switchToHttp().getRequest();
    if (!request.user) {
      throw new InternalServerErrorException(
        'CurrentUserCollegeId requested on a route without authentication.',
      );
    }
    return request.user.college_id ?? null;
  },
);
