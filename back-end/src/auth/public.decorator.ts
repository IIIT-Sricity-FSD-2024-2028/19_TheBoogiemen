/**
 * public.decorator.ts — the only way to opt a route out of authentication.
 *
 * Authentication is deny-by-default: JwtAuthGuard rejects every request without
 * a valid token unless the handler carries @Public(). Previously authorization
 * was opt-in via @Roles, which is why 17 routes ended up silently world-readable
 * simply by omitting a decorator. Forgetting a decorator now fails closed.
 *
 * Adding @Public() to a route is a security decision — it should be justified in
 * review, not applied to silence a 401.
 */

import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
