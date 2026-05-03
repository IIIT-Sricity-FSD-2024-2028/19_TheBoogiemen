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

    if (role && user.role !== role && !(role === 'admin' && user.role === 'admin')) {
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
        user_id: user.user_id,
        email: user.email,
        name: profile ? `${profile.first_name} ${profile.last_name}` : user.username,
        role: user.role,
        profile
      },
      message: 'Login successful'
    };
  }
}
