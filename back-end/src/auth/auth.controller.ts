import { Controller, Post, Body, Headers, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiHeader } from '@nestjs/swagger';
import { LoginDto, SignupDto, ChangePasswordDto } from '../common/dto/app.dto';
import { InMemoryDbService } from '../database/in-memory-db.service';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService, private db: InMemoryDbService) {}

  @Post('login')
  @ApiOperation({ summary: 'User login with email and password' })
  @ApiBody({ type: LoginDto, description: 'Login credentials' })
  @ApiResponse({ status: 200, description: 'Login successful - returns token and user info' })
  @ApiResponse({ status: 400, description: 'Invalid email or password format' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() body: LoginDto) {
    try {
      if (!body.email || !body.password) {
        throw new BadRequestException('Email and password are required');
      }
      const result = await this.authService.login(body.email, body.password);
      if (!result) {
        throw new UnauthorizedException('Invalid email or password');
      }
      return { success: true, ...result };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }
      throw new UnauthorizedException('Login failed');
    }
  }

  @Post('signup')
  @ApiOperation({ summary: 'User self-registration (Student or Faculty)' })
  @ApiBody({ type: SignupDto })
  @ApiResponse({ status: 201, description: 'Registration successful' })
  @ApiResponse({ status: 400, description: 'Invalid input or email already exists' })
  async signup(@Body() body: SignupDto) {
    try {
      // Validate input
      if (!body.email || !body.password || !body.role) {
        throw new BadRequestException('Email, password, and role are required');
      }

      // Check if email already exists
      if (this.db.users.find(u => u.email === body.email)) {
        throw new BadRequestException('Email already registered');
      }

      // Validate role
      if (!['student', 'faculty'].includes(body.role)) {
        throw new BadRequestException('Role must be student or faculty');
      }

      // Build user record
      const username = body.username || `${body.first_name || ''} ${body.last_name || ''}`.trim() || body.email.split('@')[0];
      const id = `u${Date.now()}`;
      const newUser = {
        user_id: id,
        username,
        first_name: body.first_name || username.split(' ')[0] || 'User',
        last_name:  body.last_name  || username.split(' ').slice(1).join(' ') || '',
        password: body.password,
        email: body.email,
        role: body.role
      };

      this.db.users.push(newUser);

      if (newUser.role === 'student') {
        this.db.students.push({
          user_id: id,
          first_name: newUser.first_name,
          last_name:  newUser.last_name,
          branch:     body.branch    || 'CSE',
          batch:      body.batch     || '2024-2028',
          cgpa:       7.0,
          section:    body.section   || 'A',
          email:      body.email,
          join_date:  new Date().toISOString().split('T')[0],
          dob:        '2005-01-01',
          phone:      ''
        });
        this.db.enrollment.push({
          enrollment_id: `e${this.db.enrollment.length + 1}`,
          student_id: id,
          course_id:  'c1',
          year_id:    'y1',
          status:     'active',
          section:    body.section || 'A'
        });
      } else if (newUser.role === 'faculty') {
        const deptMap: Record<string, string> = { ECE: 'dept2', CSE: 'dept1', MATH: 'dept1', PHY: 'dept1' };
        this.db.faculty.push({
          user_id:       id,
          first_name:    newUser.first_name,
          last_name:     newUser.last_name,
          designation:   body.designation || 'Assistant Professor',
          department_id: (body.department && deptMap[body.department]) || 'dept1',
          email:         body.email,
          phone:         ''
        });
      }

      return { success: true, message: 'Registration successful. You can now login.', user_id: id };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(`Registration failed: ${error.message}`);
    }
  }

  @Post('change-password')
  @ApiOperation({ summary: 'Change user password' })
  @ApiHeader({ name: 'user-id', description: 'User ID of logged-in user' })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input or current password incorrect' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async changePassword(@Body() body: ChangePasswordDto, @Headers('user-id') userId: string) {
    try {
      if (!userId) {
        throw new UnauthorizedException('User ID required');
      }
      if (!body.current_password || !body.new_password) {
        throw new BadRequestException('Current and new passwords are required');
      }
      const result = await this.authService.changePassword(userId, body.current_password, body.new_password);
      if (!result) {
        throw new BadRequestException('Current password is incorrect or user not found');
      }
      return { success: true, message: 'Password changed successfully' };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new BadRequestException(`Password change failed: ${error.message}`);
    }
  }
}
