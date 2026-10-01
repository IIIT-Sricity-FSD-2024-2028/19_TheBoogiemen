import { randomBytes } from 'crypto';

/** Short random id with a readable prefix, e.g. newId('lv') -> lv_8f3k2j9x. */
export function newId(prefix: string): string {
  return `${prefix}_${randomBytes(6).toString('base64url').toLowerCase()}`;
}

export const nowIso = () => new Date().toISOString();
export const today = () => new Date().toISOString().slice(0, 10);

export function fullName(p: any): string {
  if (!p) return '';
  return [p.first_name, p.last_name].filter(Boolean).join(' ') || p.username || '';
}

/** Strips credentials and internal fields before a user leaves the API. */
export function publicUser(u: any) {
  if (!u) return u;
  const { password_hash, password, ...rest } = u;
  return rest;
}

export const round1 = (n: number) => Math.round(n * 10) / 10;
