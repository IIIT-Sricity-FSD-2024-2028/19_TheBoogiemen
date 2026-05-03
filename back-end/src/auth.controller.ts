import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiBody } from '@nestjs/swagger';
import { MOCK_USERS, MOCK_STUDENTS, MOCK_FACULTY } from './common/types/mock-data';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  @Post('login')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string' },
        password: { type: 'string' },
        role: { type: 'string' }
      }
    }
  })
  login(@Body() body: any) {
    const { email, password, role } = body;
    const user = MOCK_USERS.find(u => u.email === email && u.password_hash === password);
    
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Normalize frontend role aliases to backend roles
    const normalizedRole = role === 'head' ? 'academic_head'
      : role === 'superuser' ? 'admin'
      : role;

    if (normalizedRole && user.role !== normalizedRole) {
      throw new UnauthorizedException(`Account is for ${user.role}, not ${role}`);
    }

    // Include some basic profile info based on role
    let profile = null;
    if (user.role === 'student') {
      profile = MOCK_STUDENTS.find(s => s.user_id === user.user_id);
    } else if (user.role === 'faculty') {
      profile = MOCK_FACULTY.find(f => f.user_id === user.user_id);
    }

    return {
      success: true,
      data: {
        currentUser: {
          user_id: user.user_id,
          email: user.email,
          name: profile ? `${(profile as any).first_name} ${(profile as any).last_name}` : user.username,
          role: user.role,
          username: user.username,
          ...(user.role === 'student' && profile ? {
            student_id: (profile as any).student_id,
            branch: (profile as any).branch,
            batch: (profile as any).batch,
            program: (profile as any).program,
          } : {}),
          ...(user.role === 'faculty' && profile ? {
            faculty_id: (profile as any).faculty_id,
            designation: (profile as any).designation,
            department_id: (profile as any).department_id,
          } : {}),
        }
      },
      message: 'Login successful'
    };
  }
}
