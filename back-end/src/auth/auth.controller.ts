import { Controller, Post, Body, Headers, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiHeader } from '@nestjs/swagger';
import { LoginDto, SignupDto, ChangePasswordDto } from '../common/dto/app.dto';
import { InMemoryDbService } from '../database/in-memory-db.service';

@ApiTags('Authentication & Token Management')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService, private db: InMemoryDbService) {}

  @Post('login')
  @ApiOperation({ summary: 'User login with email, password & tenant context' })
  @ApiBody({ type: LoginDto, description: 'Login credentials and optional tenant_code' })
  @ApiResponse({ status: 200, description: 'Login successful - returns JWT access token, refresh token, tenant details & user info' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() body: any) {
    try {
      if (!body.email || !body.password) {
        throw new BadRequestException('Email and password are required');
      }
      const result = await this.authService.login(body.email, body.password, body.tenant_code || body.tenantId);
      return { success: true, ...result };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }
      throw new UnauthorizedException('Login failed');
    }
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh JWT Access Token using a valid Refresh Token' })
  @ApiBody({ schema: { type: 'object', properties: { refreshToken: { type: 'string' } } } })
  async refreshToken(@Body() body: { refreshToken: string }) {
    return this.authService.refreshToken(body.refreshToken);
  }

  @Post('signup')
  @ApiOperation({ summary: 'User self-registration within a subscribed institute' })
  @ApiBody({ type: SignupDto })
  async signup(@Body() body: any) {
    try {
      if (!body.email || !body.password || !body.role) {
        throw new BadRequestException('Email, password, and role are required');
      }

      if (this.db.users.find(u => u.email.toLowerCase() === body.email.toLowerCase())) {
        throw new BadRequestException('Email already registered');
      }

      const tenantId = body.tenant_id || body.tenantId || 't1';
      const username = body.username || `${body.first_name || ''} ${body.last_name || ''}`.trim() || body.email.split('@')[0];
      const id = `u${Date.now()}`;
      const newUser = {
        user_id: id,
        tenant_id: tenantId,
        username,
        name: username,
        password: body.password,
        email: body.email,
        role: body.role
      };

      this.db.users.push(newUser);

      if (newUser.role === 'student') {
        this.db.students.push({
          user_id: id,
          tenant_id: tenantId,
          first_name: body.first_name || username,
          last_name: body.last_name || '',
          branch: body.branch || 'CS',
          batch: body.batch || '2024-2028',
          cgpa: 7.5,
          section: body.section || 'A',
          email: body.email,
          join_date: new Date().toISOString().split('T')[0],
          dob: '2005-01-01',
          phone: ''
        });
      } else if (newUser.role === 'faculty') {
        this.db.faculty.push({
          user_id: id,
          tenant_id: tenantId,
          first_name: body.first_name || username,
          last_name: body.last_name || '',
          designation: body.designation || 'Assistant Professor',
          department_id: 'dept1',
          email: body.email,
          phone: ''
        });
      }

      return { success: true, message: 'Registration successful. You can now log in.', user_id: id };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(`Registration failed: ${error.message}`);
    }
  }

  @Post('change-password')
  @ApiOperation({ summary: 'Change user password' })
  @ApiHeader({ name: 'user-id', description: 'User ID of logged-in user' })
  async changePassword(@Body() body: ChangePasswordDto, @Headers('user-id') userId: string) {
    if (!userId) {
      throw new UnauthorizedException('User ID required');
    }
    return this.authService.changePassword(userId, body.current_password, body.new_password);
  }
}
