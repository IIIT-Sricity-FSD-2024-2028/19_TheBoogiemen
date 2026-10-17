/**
 * onboarding-cookie.ts — the draft-session cookie.
 *
 * Mirrors auth-cookie.ts's shape exactly (same httpOnly/SameSite=Strict/
 * Secure attributes, same identical-on-set-and-clear discipline) because the
 * reasoning is identical: this cookie is a credential's carrier before the
 * credential itself is real.
 *
 * What is deliberately different from auth-cookie.ts: the cookie name
 * (bp_onboarding, never bp_session) and the token's own payload shape. That
 * second difference is the one that matters most — see the module docstring
 * on onboarding-session.guard.ts for why a payload with no `sub`/`role` is
 * what keeps this token out of the real auth pipeline by construction,
 * rather than by a check someone has to remember to add.
 */

import type { CookieOptions, Response } from 'express';

export const ONBOARDING_COOKIE = 'bp_onboarding';

const isProduction = () =>
  (process.env.NODE_ENV ?? '').trim().toLowerCase() === 'production';

function baseOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'strict',
    secure: isProduction(),
    path: '/',
  };
}

export function setOnboardingCookie(
  res: Response,
  token: string,
  maxAgeMs: number,
): void {
  res.cookie(ONBOARDING_COOKIE, token, { ...baseOptions(), maxAge: maxAgeMs });
}

export function clearOnboardingCookie(res: Response): void {
  res.clearCookie(ONBOARDING_COOKIE, baseOptions());
}
