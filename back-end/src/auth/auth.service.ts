import { BadRequestException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { InMemoryDbService } from '../database/in-memory-db.service';
import { PasswordService } from './password.service';
import { JwtPayload, Role, isRole } from './jwt-payload';
import { ErrorCode, errorBody } from '../common/errors/error-codes';

@Injectable()
export class AuthService {
  constructor(
    private db: InMemoryDbService,
    private jwtService: JwtService,
    private passwordService: PasswordService,
  ) {}

  /**
   * Verify credentials and issue a signed access token.
   *
   * Each account accepts only its own password. The shared "demo" passwords and
   * the email alias map that used to live here let anyone sign in to any
   * account (including admin and platform accounts) and have been removed.
   */
  async login(email: string, password: string, portal?: string) {
    const user = this.findUserByEmail(email);

    // Always run one bcrypt comparison so a missing account costs the same time
    // as a wrong password and cannot be detected by timing.
    const passwordValid = await this.passwordService.verify(password, user?.password_hash ?? DUMMY_HASH);

    if (!user || !passwordValid) {
      throw new UnauthorizedException(
        errorBody(ErrorCode.INVALID_CREDENTIALS, 'Invalid email or password'),
      );
    }
    if (user.status === 'inactive') {
      throw new ForbiddenException(errorBody(ErrorCode.INSUFFICIENT_ROLE, 'This account has been deactivated. Contact your institute.'));
    }
    const college = user.college_id ? this.db.colleges.find((c) => c.college_id === user.college_id) : null;
    if (college?.status === 'suspended') {
      throw new ForbiddenException(errorBody(ErrorCode.INSUFFICIENT_ROLE, "Your institute's access is suspended. Contact your institute administrator."));
    }
    if (!isRole(user.role)) {
      throw new UnauthorizedException(
        errorBody(ErrorCode.MISCONFIGURATION, 'Account has no valid role assigned. Contact an administrator.'),
      );
    }

    // The sign-in page asks which portal the user is entering. Checked only
    // after the password, so it cannot be used to probe which emails exist.
    if (portal) {
      const actual = portalForRole(user.role);
      if (actual !== portal) {
        throw new ForbiddenException(
          errorBody(
            ErrorCode.ROLE_MISMATCH,
            actual
              ? `This is a ${PORTAL_LABELS[actual]} account. Choose "${PORTAL_LABELS[actual]}" to sign in.`
              : 'This account cannot sign in to this portal.',
            { expected: portal, actual },
          ),
        );
      }
    }

    const sessionUser = this.buildSessionUser(user);
    const payload: JwtPayload = {
      sub: sessionUser.user_id,
      role: user.role as Role,
      email: user.email,
      ...(user.college_id ? { college_id: user.college_id } : {}),
    };

    return {
      token: await this.jwtService.signAsync(payload),
      user: sessionUser,
    };
  }

  /**
   * The user object returned by login and GET /auth/me, rebuilt from the
   * verified token so a page refresh never has to trust browser storage.
   */
  getSessionUser(claims: JwtPayload) {
    const user = this.findUserForClaims(claims);
    if (!user) {
      throw new UnauthorizedException(
        errorBody(ErrorCode.TOKEN_INVALID, 'Session is no longer valid. Please sign in again.'),
      );
    }
    return {
      user: this.buildSessionUser(user),
      expires_at: claims.exp ? claims.exp * 1000 : null,
    };
  }

  findUserByEmail(email: string) {
    const needle = String(email ?? '').trim().toLowerCase();
    if (!needle) return undefined;
    return this.db.users.find((u) => u.email?.toLowerCase() === needle);
  }

  /**
   * Some seed accounts share a user_id (student@example.com and
   * student@iiits.in are both u1), so the email claim picks the exact row.
   */
  findUserForClaims(claims: Pick<JwtPayload, 'sub' | 'email'>) {
    return (
      this.db.users.find((u) => u.user_id === claims.sub && (!claims.email || u.email === claims.email)) ??
      this.db.users.find((u) => u.user_id === claims.sub)
    );
  }

  private buildSessionUser(user: any) {
    const student = this.db.students.find((s) => s.user_id === user.user_id || s.email === user.email);
    const faculty = this.db.faculty.find((f) => f.user_id === user.user_id || f.email === user.email);
    const profile: any = student || faculty || user;

    let firstName = profile?.first_name;
    let lastName = profile?.last_name || '';
    if (!firstName) {
      const defaults: Record<string, [string, string]> = {
        superadmin: ['Institute', 'Director'],
        INSTITUTE_SUPER_ADMIN: ['Institute', 'Director'],
        head: ['Academic', 'Head'],
        DEPARTMENT_ADMIN_HOD: ['Academic', 'Head'],
        FINANCE_ADMIN: ['Finance', 'Officer'],
        admin: ['System', 'Admin'],
      };
      [firstName, lastName] = defaults[user.role] ?? [user.username || 'User', ''];
    }

    const college = user.college_id ? this.db.colleges.find((c) => c.college_id === user.college_id) : null;
    const dept = user.department_id ? this.db.departments.find((d) => d.department_id === user.department_id) : null;
    const sub = user.college_id ? this.db.subscriptions.find((x) => x.college_id === user.college_id) : null;
    return {
      user_id: user.user_id,
      username: user.username,
      email: user.email,
      role: user.role,
      college_id: user.college_id ?? null,
      college: college ? { college_id: college.college_id, name: college.name, code: college.code ?? null } : null,
      department: dept ? { department_id: dept.department_id, code: dept.department_code, name: dept.department_name } : null,
      // Licensed modules decide which sections a portal shows; the API enforces the same.
      modules: sub ? sub.modules ?? [] : ['research', 'fees', 'forum', 'analytics'],
      display_id: user.display_id ?? null,
      first_name: firstName,
      last_name: lastName,
      name: `${firstName} ${lastName}`.trim(),
      phone: user.phone ?? profile?.phone ?? null,
      address: user.address ?? null,
      photo_file_id: user.photo_file_id ?? null,
      must_change_password: !!user.must_change_password,
      tier_level: user.tier_level ?? null,
    };
  }

  async changePassword(claims: Pick<JwtPayload, 'sub' | 'email'>, current: string, newPass: string) {
    const user = this.findUserForClaims(claims);

    // A missing user means the token names someone who no longer exists, so the
    // session itself is invalid — 401 and the client-side sign-out are correct.
    if (!user) {
      throw new UnauthorizedException(
        errorBody(ErrorCode.TOKEN_INVALID, 'Session is no longer valid. Please sign in again.'),
      );
    }

    // A wrong current password is a failure of the submitted form, not of the
    // session, so this stays a 400 (a 401 would sign the user out).
    const currentValid = await this.passwordService.verify(current, user.password_hash);
    if (!currentValid) {
      throw new BadRequestException(
        errorBody(ErrorCode.INVALID_CREDENTIALS, 'Current password is incorrect'),
      );
    }
    if (current === newPass) {
      throw new BadRequestException(
        errorBody(ErrorCode.BUSINESS_RULE_VIOLATION, 'New password must be different from your current password'),
      );
    }

    user.password_hash = await this.passwordService.hash(newPass);
    delete user.password;
    user.must_change_password = false;
    // In-place edits do not trip the store's array proxy, so persist explicitly.
    this.db.persist();
    return { success: true };
  }

  /** Self-service profile fields. Names, email and role stay admin-managed. */
  updateMyProfile(claims: JwtPayload, body: { phone?: string; address?: string; photo_file_id?: string | null }) {
    const user: any = this.findUserForClaims(claims);
    if (!user) {
      throw new UnauthorizedException(
        errorBody(ErrorCode.TOKEN_INVALID, 'Session is no longer valid. Please sign in again.'),
      );
    }
    if (body.photo_file_id) {
      const file: any = (this.db.uploads as any[]).find((u) => u.file_id === body.photo_file_id);
      if (!file || file.uploaded_by !== claims.sub || file.context !== 'profile_photo' ||
          !['image/jpeg', 'image/png'].includes(file.mime_type)) {
        throw new BadRequestException(
          errorBody(ErrorCode.BUSINESS_RULE_VIOLATION, 'Profile photo must be a JPG or PNG you uploaded as a profile photo.'),
        );
      }
    }
    if (body.phone !== undefined) user.phone = body.phone.trim() || null;
    if (body.address !== undefined) user.address = body.address.trim() || null;
    if (body.photo_file_id !== undefined) user.photo_file_id = body.photo_file_id || null;

    // Keep the student/faculty profile phone in step, since those pages read it.
    const profile: any =
      this.db.students.find((s) => s.user_id === user.user_id) ?? this.db.faculty.find((f) => f.user_id === user.user_id);
    if (profile && body.phone !== undefined) profile.phone = user.phone;

    this.db.persist();
    return { success: true, user: this.buildSessionUser(user) };
  }

  /**
   * Starts a password reset. Always succeeds from the caller's point of view so
   * the response cannot be used to discover which emails have accounts.
   * Only a SHA-256 of the token is stored; the raw token exists only in the link.
   */
  requestPasswordReset(email: string): { token: string | null } {
    const user = this.findUserByEmail(email);
    if (!user) return { token: null };

    const now = Date.now();
    // One live reset per account: older unused tokens stop working.
    for (const r of this.db.password_resets as any[]) {
      if (r.email === user.email && !r.used_at) r.used_at = new Date(now).toISOString();
    }

    const token = randomBytes(32).toString('hex');
    this.db.password_resets.push({
      reset_id: `pr${now}`,
      user_id: user.user_id,
      email: user.email,
      token_hash: hashToken(token),
      expires_at: new Date(now + RESET_TTL_MS).toISOString(),
      used_at: null,
      created_at: new Date(now).toISOString(),
    } as any);
    return { token };
  }

  async resetPassword(token: string, newPass: string) {
    const record: any = (this.db.password_resets as any[]).find((r) => r.token_hash === hashToken(token));
    if (!record || record.used_at || new Date(record.expires_at).getTime() < Date.now()) {
      throw new BadRequestException(
        errorBody(ErrorCode.BUSINESS_RULE_VIOLATION, 'This reset link is invalid or has expired. Request a new one.'),
      );
    }
    const user = this.findUserForClaims({ sub: record.user_id, email: record.email });
    if (!user) {
      throw new BadRequestException(
        errorBody(ErrorCode.BUSINESS_RULE_VIOLATION, 'This reset link is invalid or has expired. Request a new one.'),
      );
    }
    user.password_hash = await this.passwordService.hash(newPass);
    delete user.password;
    user.must_change_password = false;
    record.used_at = new Date().toISOString();
    this.db.persist();
    return { success: true };
  }
}

const RESET_TTL_MS = 15 * 60 * 1000;
const hashToken = (token: string) => createHash('sha256').update(String(token)).digest('hex');

/**
 * A real bcrypt digest of a value nobody knows, used to equalise login timing
 * when the email does not exist. Comparing against this costs the same as a
 * genuine check.
 */
const DUMMY_HASH = '$2b$12$C6UzMDM.H6dfI/f/IKcEe.6DxIxU7hqYQ8Q0Uu4pQPQ7WEXZ8lCPu';

const PORTAL_ROLES: Record<string, string[]> = {
  student: ['student'],
  faculty: ['faculty'],
  hod: ['head', 'DEPARTMENT_ADMIN_HOD'],
  director: ['superadmin', 'admin', 'INSTITUTE_SUPER_ADMIN'],
  finance: ['FINANCE_ADMIN'],
  spoc: ['spoc'],
  support: ['PLATFORM_SUPER_ADMIN', 'PLATFORM_SUPPORT_MANAGER', 'PLATFORM_TECH_SUPPORT', 'PLATFORM_SUPPORT_AGENT', 'PLATFORM_SALES_SUPPORT'],
};

const PORTAL_LABELS: Record<string, string> = {
  student: 'Student',
  faculty: 'Faculty',
  hod: 'HOD',
  director: 'Director',
  finance: 'Finance',
  spoc: 'Institute SPOC',
  support: 'Platform Support',
};

export function portalForRole(role: string): string | null {
  return Object.keys(PORTAL_ROLES).find((key) => PORTAL_ROLES[key].includes(role)) ?? null;
}
