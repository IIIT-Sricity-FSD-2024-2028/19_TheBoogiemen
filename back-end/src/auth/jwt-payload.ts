/**
 * jwt-payload.ts — the contract between token issuance and every consumer.
 *
 * These claims are the ONLY source of identity and authorization. Nothing in the
 * application may read a `role` or `user-id` request header again: those are
 * attacker-controlled, which is precisely what this migration removes.
 *
 * A JWT is signed, not encrypted — the holder can read every claim. Never put
 * anything here that the user should not see.
 */

export const ROLES = [
  'student',
  'faculty',
  'admin',
  'head',
  'superadmin',
  // The vendor's own contact at a customer college. Deliberately last and
  // deliberately never added to ASSIGNABLE_ROLES in common/dto/user.dto.ts —
  // a SPOC is provisioned only through POST /billing/colleges, never through
  // POST /users. See roles.guard.ts: every route lists its roles explicitly,
  // so adding this role grants nothing by itself — a route only opens to
  // 'spoc' where '@Roles(...,'spoc')' names it outright.
  'spoc',
] as const;
export type Role = (typeof ROLES)[number];

export function isRole(value: unknown): value is Role {
  return (
    typeof value === 'string' && (ROLES as readonly string[]).includes(value)
  );
}

export interface JwtPayload {
  /** user_id — the authenticated principal. */
  sub: string;
  role: Role;
  email?: string;
  /**
   * The college this principal belongs to. Present for every role except
   * superadmin (the vendor operator, who belongs to no single college) and,
   * for now, students/faculty/admin/head created before the multi-college
   * migration backfilled 'c-default' onto them.
   *
   * Baked into the token at login, exactly like `role` — never re-derived
   * from a per-request database lookup, and never client-suppliable. A route
   * that needs to scope a query to "my college" reads this claim via
   * @CurrentUserCollegeId(), the same pattern @CurrentUserId() already
   * established for `sub`.
   */
  college_id?: string;
  /** Issued-at / expiry, populated by the signer. */
  iat?: number;
  exp?: number;
}

/** Shape attached to `request.user` once JwtAuthGuard has verified the token. */
export type AuthenticatedUser = JwtPayload;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
