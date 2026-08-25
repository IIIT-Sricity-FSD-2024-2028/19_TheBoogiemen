/**
 * auth-cookie.ts — the session cookie.
 *
 * The token moves out of localStorage and into an httpOnly cookie:
 *
 *   httpOnly          JavaScript cannot read it, so XSS can no longer steal it.
 *                     This matters concretely here: the audit found 132
 *                     unescaped innerHTML sites and a working stored-XSS chain,
 *                     and a token in localStorage was one getItem() away.
 *   sameSite=strict   The browser will not attach it to cross-site requests,
 *                     which is the CSRF defence. The frontend is served from the
 *                     same origin as the API, so nothing legitimate is lost and
 *                     no CSRF token library is needed.
 *   secure            HTTPS only. Off on localhost, which is plain http.
 *
 * What this does NOT fix: XSS can still *use* the session by issuing same-origin
 * fetches from the victim's browser — the browser attaches the cookie. It just
 * cannot exfiltrate the credential. Closing that needs the output escaping in
 * audit finding C-06.
 */

import type { CookieOptions, Response } from 'express';

export const AUTH_COOKIE = 'bp_session';

const isProduction = () => (process.env.NODE_ENV ?? '').trim().toLowerCase() === 'production';

/**
 * Attributes must be identical on set and clear, or the browser treats them as
 * two different cookies and the "cleared" one quietly survives.
 */
function baseOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'strict',
    secure: isProduction(),
    path: '/',
  };
}

export function setAuthCookie(res: Response, token: string, maxAgeMs: number): void {
  res.cookie(AUTH_COOKIE, token, { ...baseOptions(), maxAge: maxAgeMs });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE, baseOptions());
}

/**
 * Remaining lifetime of a token, read from its own `exp` claim.
 *
 * The cookie then expires exactly when the token does, so the two cannot
 * disagree — a cookie outliving its token produces requests rejected for no
 * visible reason.
 *
 * Decodes without verifying: this runs immediately after we signed the token
 * ourselves, and the value only decides a cookie lifetime.
 */
export function tokenTtlMs(token: string, fallbackMs = 2 * 60 * 60 * 1000): number {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    const remaining = payload.exp * 1000 - Date.now();
    if (Number.isFinite(remaining) && remaining > 0) return remaining;
  } catch {
    // Malformed token — fall through to the default.
  }
  return fallbackMs;
}
