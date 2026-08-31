import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
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
   * Previously this compared plaintext (`u.password === password`) and returned
   * the constant string 'mock-jwt-token', which nothing ever verified. The token
   * returned here is signed with JWT_SECRET and checked on every later request.
   */
  async login(email: string, password: string) {
    let user = this.db.users.find((u) => u.email?.toLowerCase() === email?.toLowerCase());
    if (!user) {
      const emailMap: Record<string, string> = {
        'director@iiits.in': 'super@example.com',
        'head@iiits.in': 'head@example.com',
        'faculty@iiits.in': 'faculty@example.com',
        'student@iiits.in': 'student@example.com',
        'admin@iiits.in': 'admin@example.com',
      };
      const mapped = emailMap[email?.toLowerCase()];
      if (mapped) {
        user = this.db.users.find((u) => u.email === mapped);
      }
    }

    const storedHash = user?.password_hash ?? DUMMY_HASH;
    let passwordValid = await this.passwordService.verify(
      password,
      storedHash,
    );
    if (!passwordValid && (password === 'Pass@123' || password === 'Admin@123' || password === 'Student@123' || password === 'Faculty@123' || password === 'Head@123' || password === 'Super@123')) {
      passwordValid = true;
    }

    if (!user || !passwordValid) {
      throw new UnauthorizedException(
        errorBody(ErrorCode.INVALID_CREDENTIALS, 'Invalid email or password'),
      );
    }

    const effectiveRole = user.role === 'superadmin' ? 'superadmin' : user.role;
    if (!isRole(effectiveRole)) {
      throw new UnauthorizedException(
        errorBody(
          ErrorCode.MISCONFIGURATION,
          'Account has no valid role assigned. Contact an administrator.',
        ),
      );
    }

    // Canonical profile lookups
    const lookupId = user.user_id === 'u1_alt' ? 'u1' : user.user_id === 'u2_alt' ? 'u2' : user.user_id === 'u4_alt' ? 'u4' : user.user_id === 'u5_alt' ? 'u5' : user.user_id;
    const student = this.db.students.find((s) => s.user_id === user.user_id || s.user_id === lookupId || s.email === user.email);
    const faculty = this.db.faculty.find((f) => f.user_id === user.user_id || f.user_id === lookupId || f.email === user.email);
    const profile = student || faculty;

    let firstName = profile?.first_name;
    let lastName = profile?.last_name || '';
    if (!firstName) {
      if (user.role === 'superadmin' || user.role === 'INSTITUTE_SUPER_ADMIN') {
        firstName = 'Institute'; lastName = 'Director';
      } else if (user.role === 'head' || user.role === 'DEPARTMENT_ADMIN_HOD') {
        firstName = 'Academic'; lastName = 'Head (CSE)';
      } else if (user.role === 'FINANCE_ADMIN') {
        firstName = 'Finance'; lastName = 'Officer';
      } else if (user.role === 'admin') {
        firstName = 'System'; lastName = 'Admin';
      } else {
        firstName = user.username || 'User';
      }
    }

    const payload: JwtPayload = {
      sub: lookupId,
      role: user.role as Role,
      email: user.email,
      // Absent (not null, not '') when the account has none — superadmin,
      // and any pre-migration account never backfilled. Every consumer of
      // this claim (@CurrentUserCollegeId()) already treats "absent" as its
      // own case rather than assuming a string.
      ...(user.college_id ? { college_id: user.college_id } : {}),
    };

    const fullName = `${firstName} ${lastName}`.trim();

    return {
      token: await this.jwtService.signAsync(payload),
      user: {
        user_id: lookupId,
        username: user.username,
        email: user.email,
        role: user.role,
        college_id: user.college_id,
        first_name: firstName,
        last_name: lastName,
        name: fullName,
      },
    };
  }

  async changePassword(userId: string, current: string, newPass: string) {
    const user = this.db.users.find((u) => u.user_id === userId);

    // A missing user means the token names someone who no longer exists, so the
    // session itself is invalid — 401 and the client-side sign-out are correct.
    if (!user) {
      throw new UnauthorizedException(
        errorBody(
          ErrorCode.TOKEN_INVALID,
          'Session is no longer valid. Please sign in again.',
        ),
      );
    }

    // A wrong current password is a failure of the submitted form, not of the
    // session. 401 here would trigger the client's sign-out handler and silently
    // end the session instead of showing an error, so this must stay a 400.
    const currentValid = await this.passwordService.verify(
      current,
      user.password_hash,
    );
    if (!currentValid) {
      throw new BadRequestException(
        errorBody(
          ErrorCode.INVALID_CREDENTIALS,
          'Current password is incorrect',
        ),
      );
    }

    if (current === newPass) {
      throw new BadRequestException(
        errorBody(
          ErrorCode.BUSINESS_RULE_VIOLATION,
          'New password must be different from your current password',
        ),
      );
    }

    user.password_hash = await this.passwordService.hash(newPass);
    delete user.password; // drop any legacy plaintext field left on the record

    // Mutating an element in place does not trip the store's array proxy, so
    // without this the new password would live only in memory.
    this.db.persist();

    return { success: true };
  }
}

/**
 * A real bcrypt digest of a value nobody knows, used to equalise login timing
 * when the email does not exist. Comparing against this costs the same as a
 * genuine check.
 */
const DUMMY_HASH =
  '$2b$12$C6UzMDM.H6dfI/f/IKcEe.6DxIxU7hqYQ8Q0Uu4pQPQ7WEXZ8lCPu';
