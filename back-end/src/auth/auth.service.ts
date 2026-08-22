import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
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
    const user = this.db.users.find((u) => u.email === email);

    // Verify even when the user is unknown, against a dummy digest, so that a
    // wrong email and a wrong password take the same time to answer. Without
    // this, response timing distinguishes registered from unregistered emails.
    const storedHash = user?.password_hash ?? DUMMY_HASH;
    const passwordValid = await this.passwordService.verify(password, storedHash);

    if (!user || !passwordValid) {
      // Deliberately identical for both cases — no user enumeration.
      throw new UnauthorizedException(
        errorBody(ErrorCode.INVALID_CREDENTIALS, 'Invalid email or password'),
      );
    }

    if (!isRole(user.role)) {
      throw new UnauthorizedException(
        errorBody(ErrorCode.MISCONFIGURATION, 'Account has no valid role assigned. Contact an administrator.'),
      );
    }

    const student = this.db.students.find((s) => s.user_id === user.user_id);
    const faculty = this.db.faculty.find((f) => f.user_id === user.user_id);
    const profile = student || faculty;

    const payload: JwtPayload = {
      sub: user.user_id,
      role: user.role as Role,
      email: user.email,
    };

    return {
      token: await this.jwtService.signAsync(payload),
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        role: user.role,
        first_name: profile?.first_name,
        last_name: profile?.last_name,
      },
    };
  }

  async changePassword(userId: string, current: string, newPass: string) {
    const user = this.db.users.find((u) => u.user_id === userId);

    // A missing user means the token names someone who no longer exists, so the
    // session itself is invalid — 401 and the client-side sign-out are correct.
    if (!user) {
      throw new UnauthorizedException(
        errorBody(ErrorCode.TOKEN_INVALID, 'Session is no longer valid. Please sign in again.'),
      );
    }

    // A wrong current password is a failure of the submitted form, not of the
    // session. 401 here would trigger the client's sign-out handler and silently
    // end the session instead of showing an error, so this must stay a 400.
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
const DUMMY_HASH = '$2b$12$C6UzMDM.H6dfI/f/IKcEe.6DxIxU7hqYQ8Q0Uu4pQPQ7WEXZ8lCPu';
