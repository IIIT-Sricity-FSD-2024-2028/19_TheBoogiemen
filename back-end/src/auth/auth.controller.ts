import { Controller, Get, Patch, Post, Body, Res, HttpCode, BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { LoginDto, SignupDto, ChangePasswordDto, ForgotPasswordDto, ResetPasswordDto, UpdateMyProfileDto } from '../common/dto/app.dto';
import { InMemoryDbService } from '../database/in-memory-db.service';
import { Public } from './public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from './jwt-payload';
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
      const result = await this.authService.login(body.email, body.password, body.portal);

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
      if (error instanceof UnauthorizedException || error instanceof BadRequestException || error instanceof ForbiddenException) {
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
      if (this.db.users.find(u => u.email?.toLowerCase() === body.email.trim().toLowerCase())) {
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
        email: body.email.trim(),
        role: body.role,
        ...(this.db.colleges.some((c: any) => c.college_id === 'c-default') ? { college_id: 'c-default' } : {}),
      };

      this.db.users.push(newUser);

      if (newUser.role === 'student') {
        // Only what the student told us is stored. CGPA, date of birth and
        // course enrollments are set by the institute, not invented here.
        this.db.students.push({
          user_id: id,
          first_name: newUser.first_name,
          last_name:  newUser.last_name,
          branch:     body.branch  || null,
          batch:      body.batch   || null,
          cgpa:       null,
          section:    body.section || null,
          email:      body.email,
          join_date:  new Date().toISOString().split('T')[0],
          dob:        null,
          phone:      null,
        } as any);
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
  async changePassword(@Body() body: ChangePasswordDto, @CurrentUser() claims: AuthenticatedUser) {
    const userId = claims.sub;
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
      await this.authService.changePassword(claims, body.current_password, body.new_password);
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

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Current session: the signed-in user and when the session expires' })
  @ApiResponse({ status: 200, description: '{ success, user, expires_at }' })
  @ApiResponse({ status: 401, description: 'No valid session' })
  me(@CurrentUser() claims: AuthenticatedUser) {
    // The frontend calls this on every page load instead of trusting whatever
    // is in browser storage, so a revoked or expired cookie is noticed at once.
    return { success: true, ...this.authService.getSessionUser(claims) };
  }

  @Patch('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update your own phone, address or profile photo' })
  @ApiBody({ type: UpdateMyProfileDto })
  updateMe(@CurrentUser() claims: AuthenticatedUser, @Body() body: UpdateMyProfileDto) {
    return this.authService.updateMyProfile(claims, body);
  }

  @Post('forgot-password')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Start a password reset (same response whether or not the email exists)' })
  @ApiBody({ type: ForgotPasswordDto })
  forgotPassword(@Body() body: ForgotPasswordDto) {
    const { token } = this.authService.requestPasswordReset(body.email);
    const response: Record<string, unknown> = {
      success: true,
      message: 'If an account exists for that email, a reset link has been issued. It expires in 15 minutes.',
    };
    if (token) {
      const resetPath = `/reset-password?token=${token}`;
      // There is no mail server in this project. Outside production the link
      // is logged and returned so the flow can be demonstrated; in production
      // it must be delivered by email and is never put in the response.
      if (!isProduction()) {
        this.logger.info({ resetPath }, 'Password reset link issued (development only)');
        response.dev_reset_url = resetPath;
      } else {
        this.logger.info('Password reset link issued');
      }
    }
    return response;
  }

  @Post('reset-password')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Set a new password using a reset token' })
  @ApiBody({ type: ResetPasswordDto })
  async resetPassword(@Body() body: ResetPasswordDto) {
    await this.authService.resetPassword(body.token, body.new_password);
    return { success: true, message: 'Password updated. You can now sign in with your new password.' };
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

const isProduction = () => (process.env.NODE_ENV ?? '').trim().toLowerCase() === 'production';
