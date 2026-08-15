import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InMemoryDbService } from '../database/in-memory-db.service';

@Injectable()
export class AuthService {
  constructor(private db: InMemoryDbService) {}

  async login(email: string, password: string) {
    const user = this.db.users.find((u) => u.email === email && u.password === password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    
    const student = this.db.students.find((s) => s.user_id === user.user_id);
    const faculty = this.db.faculty.find((f) => f.user_id === user.user_id);
    const profile = student || faculty;

    // Return a mock token and user object
    return {
      token: 'mock-jwt-token',
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

    // A missing user means the session itself is no longer valid, so 401 (and the
    // client-side logout it triggers) is the correct response here.
    if (!user) {
      throw new UnauthorizedException('Session is no longer valid. Please sign in again.');
    }

    // A wrong *current password* is a failure of the submitted form, not of the
    // session. This used to throw 401, and the client treats any 401 as "session
    // expired" and logs the user out — so mistyping the current password silently
    // ended the session instead of showing an error. 400 keeps the user signed in.
    if (user.password !== current) {
      throw new BadRequestException('Current password is incorrect');
    }

    if (newPass === current) {
      throw new BadRequestException('New password must be different from your current password');
    }

    user.password = newPass;

    // Mutating an element in place does not trip the store's array proxy, so
    // without this the new password lived only in memory and reverted on restart.
    this.db.persist();

    return { success: true };
  }
}
