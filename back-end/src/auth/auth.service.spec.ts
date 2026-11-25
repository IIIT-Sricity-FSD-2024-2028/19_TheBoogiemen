/**
 * auth.service.spec.ts — resetPassword(), the pre-login forgot-password
 * flow's backend half. ForgotPasswordModal.jsx's own code-verification step
 * is a demo stand-in (the "code" is shown on screen, never emailed) left
 * exactly as documented there; this only covers what actually persists:
 * finding the account by email and setting its new password hash.
 *
 * PasswordService reads JWT_SECRET (via loadAuthConfig()) at construction —
 * fine in the running app, where main.ts loads .env before anything else.
 * Same scoped-to-this-file pattern onboarding.service.spec.ts already uses.
 */
process.env.JWT_SECRET ??= 'test-only-secret-not-used-for-anything-real-0000';

import { AuthService } from './auth.service';
import { PasswordService } from './password.service';

function fakeDb(users: any[]) {
  return { users, students: [], faculty: [], persist: jest.fn() } as any;
}

describe('AuthService.resetPassword', () => {
  const passwordService = new PasswordService();

  it('updates the matching account (case-insensitive email) to a new, hashed password', async () => {
    const user = { user_id: 'u1', email: 'Student@Example.com', password_hash: 'old-hash', role: 'student' };
    const db = fakeDb([user]);
    const auth = new AuthService(db, {} as any, passwordService);

    const result = await auth.resetPassword('student@example.com', 'NewPass1!');

    expect(result).toEqual({ success: true });
    expect(user.password_hash).not.toBe('old-hash');
    expect(await passwordService.verify('NewPass1!', user.password_hash)).toBe(true);
    expect(db.persist).toHaveBeenCalled();
  });

  it('drops any legacy plaintext password field left on the record', async () => {
    const user: any = { user_id: 'u1', email: 'a@b.com', password_hash: 'old', password: 'plaintext-leftover' };
    const db = fakeDb([user]);
    const auth = new AuthService(db, {} as any, passwordService);

    await auth.resetPassword('a@b.com', 'NewPass1!');

    expect(user.password).toBeUndefined();
  });

  it('reports success for an email with no matching account too, so the response never reveals which emails are registered', async () => {
    const db = fakeDb([]);
    const auth = new AuthService(db, {} as any, passwordService);

    const result = await auth.resetPassword('nobody@example.com', 'NewPass1!');

    expect(result).toEqual({ success: true });
    expect(db.persist).not.toHaveBeenCalled();
  });
});
