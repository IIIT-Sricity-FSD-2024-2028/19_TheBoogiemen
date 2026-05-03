import { Injectable, UnauthorizedException } from '@nestjs/common';
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
    if (!user || user.password !== current) {
      throw new UnauthorizedException('Current password incorrect');
    }
    user.password = newPass;
    return { success: true };
  }
}
