/**
 * auth-cookie.spec.ts — the cookie attributes are the security control here.
 *
 * A missing httpOnly puts the token back within reach of XSS; a missing
 * sameSite reopens CSRF; mismatched attributes on clear leave the session alive
 * after "sign out". None of those fail loudly, so they are asserted.
 */

import { AUTH_COOKIE, setAuthCookie, clearAuthCookie, tokenTtlMs } from './auth-cookie';

const mockRes = () => ({ cookie: jest.fn(), clearCookie: jest.fn() }) as any;

const makeToken = (expSecondsFromNow: number) => {
  const payload = Buffer.from(JSON.stringify({ sub: 'u1', exp: Math.floor(Date.now() / 1000) + expSecondsFromNow }))
    .toString('base64url');
  return `header.${payload}.signature`;
};

describe('setAuthCookie', () => {
  afterEach(() => { delete process.env.NODE_ENV; });

  it('is httpOnly so XSS cannot read the token', () => {
    const res = mockRes();
    setAuthCookie(res, 'tok', 1000);
    expect(res.cookie).toHaveBeenCalledWith(AUTH_COOKIE, 'tok', expect.objectContaining({ httpOnly: true }));
  });

  it('is SameSite=strict — the CSRF defence, since there is no CSRF token', () => {
    const res = mockRes();
    setAuthCookie(res, 'tok', 1000);
    expect(res.cookie.mock.calls[0][2].sameSite).toBe('strict');
  });

  it('is Secure in production and not on plain-http localhost', () => {
    process.env.NODE_ENV = 'production';
    const prod = mockRes();
    setAuthCookie(prod, 'tok', 1000);
    expect(prod.cookie.mock.calls[0][2].secure).toBe(true);

    process.env.NODE_ENV = 'development';
    const dev = mockRes();
    setAuthCookie(dev, 'tok', 1000);
    expect(dev.cookie.mock.calls[0][2].secure).toBe(false);
  });

  it('is scoped to the whole app', () => {
    const res = mockRes();
    setAuthCookie(res, 'tok', 1000);
    expect(res.cookie.mock.calls[0][2].path).toBe('/');
  });
});

describe('clearAuthCookie', () => {
  it('uses attributes identical to set, or the browser keeps the cookie', () => {
    const setRes = mockRes();
    const clearRes = mockRes();
    setAuthCookie(setRes, 'tok', 1000);
    clearAuthCookie(clearRes);

    const { maxAge, ...setOptions } = setRes.cookie.mock.calls[0][2];
    expect(clearRes.clearCookie.mock.calls[0][1]).toEqual(setOptions);
    expect(clearRes.clearCookie.mock.calls[0][0]).toBe(AUTH_COOKIE);
  });
});

describe('tokenTtlMs', () => {
  it('derives the lifetime from the token exp, so cookie and token agree', () => {
    const ttl = tokenTtlMs(makeToken(3600));
    expect(ttl).toBeGreaterThan(3_500_000);
    expect(ttl).toBeLessThanOrEqual(3_600_000);
  });

  it('falls back for a malformed token rather than throwing', () => {
    expect(tokenTtlMs('not-a-jwt')).toBe(2 * 60 * 60 * 1000);
    expect(tokenTtlMs('')).toBe(2 * 60 * 60 * 1000);
  });

  it('falls back for an already-expired token instead of a negative maxAge', () => {
    // A negative maxAge would delete the cookie the moment it is set.
    expect(tokenTtlMs(makeToken(-100))).toBe(2 * 60 * 60 * 1000);
  });
});
