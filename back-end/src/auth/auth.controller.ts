import { Controller, Post, Body, Res, HttpCode, BadRequestException, UnauthorizedException } from '@nestjs/common';
import type { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { LoginDto, SignupDto, ChangePasswordDto } from '../common/dto/app.dto';
import { InMemoryDbService } from '../database/in-memory-db.service';
import { Public } from './public.decorator';
import { CurrentUserId } from '../common/decorators/current-user.decorator';
import { setAuthCookie, clearAuthCookie, tokenTtlMs } from './auth-cookie';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ErrorCode, errorBody } from '../common/errors/error-codes';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private db: InMemoryDbService,
    private passwordService: PasswordService,
    @InjectPinoLogger(AuthController.name) private readonly logger: PinoLogger,
  ) {}

  @Post('login')
  @Public()
  @ApiOperation({ summary: 'User login with email and password' })
  @ApiBody({ type: LoginDto, description: 'Login credentials' })
  @ApiResponse({ status: 200, description: 'Login successful - returns token and user info' })
  @ApiResponse({ status: 400, description: 'Invalid email or password format' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() body: LoginDto, @Res({ passthrough: true }) res: Response) {
    try {
      if (!body.email || !body.password) {
        this.logger.warn({ outcome: 'missing_credentials' }, 'Login rejected');
        throw new BadRequestException(
      errorBody(ErrorCode.BUSINESS_RULE_VIOLATION, 'Email and password are required'),
    );
      }
      const result = await this.authService.login(body.email, body.password);

      // The browser receives the token as an httpOnly cookie it cannot read.
      const ttlMs = tokenTtlMs(result.token);
      setAuthCookie(res, result.token, ttlMs);

      this.logger.info(
        { userId: result.user.user_id, role: result.user.role },
        'Login successful',
      );
      return {
        success: true,
        user: result.user,
        // Replaces the client decoding the JWT for a proactive sign-out — it
        // cannot read the cookie any more. A timestamp, not a credential.
        expires_at: Date.now() + ttlMs,
        // Still returned so Swagger's Authorize button and curl keep working.
        // The frontend ignores this and relies on the cookie.
        token: result.token,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
        // Deliberately no email: failed-login lines would otherwise accumulate a
        // list of addresses an attacker probed. The request id is enough to
        // correlate with the surrounding request log.
        this.logger.warn({ outcome: 'invalid_credentials' }, 'Login failed');
        throw error;
      }
      this.logger.error({ err: error }, 'Login failed unexpectedly');
      throw new UnauthorizedException(
      errorBody(ErrorCode.AUTHENTICATION_REQUIRED, 'Login failed'),
    );
    }
  }

  @Post('signup')
  @Public()
  @ApiOperation({ summary: 'Student self-registration' })
  @ApiBody({ type: SignupDto })
  @ApiResponse({ status: 201, description: 'Registration successful' })
  @ApiResponse({ status: 400, description: 'Invalid input or email already exists' })
  async signup(@Body() body: SignupDto) {
    try {
      // Validate input
      if (!body.email || !body.password || !body.role) {
        throw new BadRequestException(
      errorBody(ErrorCode.BUSINESS_RULE_VIOLATION, 'Email, password, and role are required'),
    );
      }

      // Check if email already exists
      if (this.db.users.find(u => u.email === body.email)) {
        throw new BadRequestException(
      errorBody(ErrorCode.DUPLICATE_RESOURCE, 'Email already registered'),
    );
      }

      // Self-registration is limited to students. Faculty accounts confer the
      // ability to mark attendance and enter grades for real students, so they
      // must be provisioned by an administrator through POST /users, where the
      // role privilege ceiling applies.
      if (body.role !== 'student') {
        throw new BadRequestException(
          errorBody(
            ErrorCode.BUSINESS_RULE_VIOLATION,
            'Only student accounts can self-register. Faculty and staff accounts are created by an administrator.',
          ),
        );
      }

      // Build user record
      const username = body.username || `${body.first_name || ''} ${body.last_name || ''}`.trim() || body.email.split('@')[0];
      const id = `u${Date.now()}`;
      const newUser = {
        user_id: id,
        username,
        first_name: body.first_name || username.split(' ')[0] || 'User',
        last_name:  body.last_name  || username.split(' ').slice(1).join(' ') || '',
        password_hash: await this.passwordService.hash(body.password),
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
          // H-07: length-derived ids re-use values that already exist.
          enrollment_id: uuidv4(),
          student_id: id,
          course_id:  'c1',
          year_id:    'y1',
          status:     'active',
          section:    body.section || 'A'
        });
      }
      // No faculty branch: self-registration is student-only (see the role check
      // above). Faculty records are created by POST /users.

      return { success: true, message: 'Registration successful. You can now login.', user_id: id };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(
      errorBody(ErrorCode.BUSINESS_RULE_VIOLATION, `Registration failed: ${error.message}`),
    );
    }
  }

  @Post('change-password')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change your own password' })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input or current password incorrect' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async changePassword(@Body() body: ChangePasswordDto, @CurrentUserId() userId: string) {
    try {
      // The subject comes from the verified token, so a caller can only ever
      // change their own password. Previously this took a `user-id` header,
      // which meant anyone could target any account.
      if (!body.current_password || !body.new_password) {
        throw new BadRequestException(
      errorBody(ErrorCode.BUSINESS_RULE_VIOLATION, 'Current and new passwords are required'),
    );
      }
      // changePassword throws a specific BadRequest/Unauthorized on failure; it
      // never returns a falsy result, so the old `if (!result)` branch was dead
      // and only served to mask the real reason from the user.
      await this.authService.changePassword(userId, body.current_password, body.new_password);
      this.logger.info({ userId }, 'Password changed');
      return { success: true, message: 'Password changed successfully' };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new BadRequestException(
      errorBody(ErrorCode.BUSINESS_RULE_VIOLATION, `Password change failed: ${error.message}`),
    );
    }
  }

  @Post('logout')
  @Public()
  @HttpCode(204)
  @ApiOperation({ summary: 'Clear the session cookie' })
  logout(@Res({ passthrough: true }) res: Response) {
    // Public on purpose: clearing a cookie needs no proof of identity, and an
    // already-expired session must still be able to sign out cleanly.
    clearAuthCookie(res);
  }
}
