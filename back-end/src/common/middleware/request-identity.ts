import type { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { AUTH_COOKIE } from '../../auth/auth-cookie';

export interface RequestIdentity {
  userId: string | null;
  role: string | null;
  collegeId: string | null;
}

const ANONYMOUS: RequestIdentity = { userId: null, role: null, collegeId: null };

/**
 * Who sent this request, from the signed session token — never from
 * client-supplied headers such as `user-id`, `role` or `x-tenant-id`.
 *
 * Middleware runs before JwtAuthGuard, so the token is verified here too
 * (signature and expiry). Invalid or missing tokens yield an anonymous
 * identity; the guard still decides whether the request is allowed.
 * The result is cached on the request so each middleware verifies once.
 */
export function requestIdentity(req: Request, jwt: JwtService): RequestIdentity {
  const cached = (req as any).__identity as RequestIdentity | undefined;
  if (cached) return cached;
  let identity = ANONYMOUS;
  const header = req.headers.authorization;
  const token = (req as any).cookies?.[AUTH_COOKIE] || (header?.startsWith('Bearer ') ? header.slice(7) : null);
  if (token) {
    try {
      const claims: any = jwt.verify(token);
      identity = { userId: claims.sub ?? null, role: claims.role ?? null, collegeId: claims.college_id ?? null };
    } catch {
      identity = ANONYMOUS;
    }
  }
  (req as any).__identity = identity;
  return identity;
}
