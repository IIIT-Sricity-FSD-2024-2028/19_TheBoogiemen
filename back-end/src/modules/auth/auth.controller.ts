import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiBody, ApiResponse } from '@nestjs/swagger';
import { MOCK_USERS, MOCK_STUDENTS, MOCK_FACULTY } from '../../common/types/mock-data';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  @Post('login')
  @ApiBody({ schema: { type: 'object', properties: { email: { type: 'string' }, password: { type: 'string' }, role: { type: 'string' } } } })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() body: { email: string; password: string; role?: string }) {
    const { email, password, role } = body;

    // Find user by email
    const user = MOCK_USERS.find(u => u.email === email && u.password_hash === password);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // If a specific role was requested, check compatibility
    // Frontend sends 'head' for academic_head and 'superuser' for admin
    if (role) {
      const normalizedRole = role === 'head' ? 'academic_head' : role === 'superuser' ? 'admin' : role;
      if (user.role !== normalizedRole) {
        throw new UnauthorizedException(
          `Account is for ${user.role}, not ${role}. Please use the correct login portal.`
        );
      }
    }

    // Build the currentUser object that the frontend expects in sessionStorage
    let extra: Record<string, any> = {};
    const student = MOCK_STUDENTS.find(s => s.user_id === user.user_id);
    const faculty = MOCK_FACULTY.find(f => f.user_id === user.user_id);

    if (student) {
      extra = {
        name: `${student.first_name} ${student.last_name}`,
        branch: student.branch,
        batch: student.batch,
        program: student.program,
        student_id: student.student_id,
      };
    } else if (faculty) {
      extra = {
        name: `${faculty.first_name} ${faculty.last_name}`,
        designation: faculty.designation,
        department_id: faculty.department_id,
        faculty_id: faculty.faculty_id,
      };
    } else {
      extra = { name: user.username };
    }

    const currentUser = {
      user_id: user.user_id,
      email: user.email,
      role: user.role,
      username: user.username,
      ...extra,
    };

    return {
      success: true,
      data: { currentUser },
      message: 'Login successful',
    };
  }
}
