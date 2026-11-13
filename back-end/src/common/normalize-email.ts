/**
 * normalize-email.ts — email is a case-insensitive identifier everywhere it
 * is used as one (login, duplicate checks, onboarding drafts), but every
 * comparison in this codebase used to be a bare `===`, so
 * "Student@Example.com" and "student@example.com" were treated as two
 * different accounts/emails depending on which case someone happened to
 * type. Canonicalize at both ends: normalize before storing a new email, and
 * normalize both sides of any comparison (covering records stored before
 * this existed).
 */

export function normalizeEmail(email: string | null | undefined): string {
  return (email ?? '').trim().toLowerCase();
}
