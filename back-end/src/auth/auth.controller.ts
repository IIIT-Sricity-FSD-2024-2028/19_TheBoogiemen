import {
  Controller,
  Post,
  Body,
  Res,
  HttpCode,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { Roles } from './roles.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { LoginDto, ChangePasswordDto } from '../common/dto/app.dto';
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
  @ApiResponse({
    status: 200,
    description: 'Login successful - returns token and user info',
  })
  @ApiResponse({ status: 400, description: 'Invalid email or password format' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      if (!body.email || !body.password) {
        this.logger.warn({ outcome: 'missing_credentials' }, 'Login rejected');
        throw new BadRequestException(
          errorBody(
            ErrorCode.BUSINESS_RULE_VIOLATION,
            'Email and password are required',
          ),
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
      if (
        error instanceof UnauthorizedException ||
        error instanceof BadRequestException
      ) {
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

  // A `POST /auth/signup` self-registration route used to live here. It
  // predates multi-tenancy: it had no way to ask which college a new student
  // belonged to, so a signup left `college_id` unset, which
  // CurrentUserCollegeId() then reads as `null` — the superadmin "see every
  // college" exemption. The route was also unreachable in practice (no
  // linked frontend page called it; front-end/signup.html was dead markup,
  // removed alongside this) so the fix is deletion, the same call made for
  // Group D in TENANT_ISOLATION_DIAGNOSIS.md, rather than building a college
  // picker for a page nothing links to. Real student accounts are created by
  // an admin via POST /users, which already stamps the admin's own
  // college_id (see admin/common.controller.ts createUser).

  @Post('change-password')
  // Explicit list, not a bare "any authenticated role": a future low-trust
  // role (a SPOC, say) must not gain this just by existing — see roles.guard.ts.
  @Roles('student', 'faculty', 'admin', 'head', 'superadmin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change your own password' })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or current password incorrect',
  })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async changePassword(
    @Body() body: ChangePasswordDto,
    @CurrentUserId() userId: string,
  ) {
    try {
      // The subject comes from the verified token, so a caller can only ever
      // change their own password. Previously this took a `user-id` header,
      // which meant anyone could target any account.
      if (!body.current_password || !body.new_password) {
        throw new BadRequestException(
          errorBody(
            ErrorCode.BUSINESS_RULE_VIOLATION,
            'Current and new passwords are required',
          ),
        );
      }
      // changePassword throws a specific BadRequest/Unauthorized on failure; it
      // never returns a falsy result, so the old `if (!result)` branch was dead
      // and only served to mask the real reason from the user.
      await this.authService.changePassword(
        userId,
        body.current_password,
        body.new_password,
      );
      this.logger.info({ userId }, 'Password changed');
      return { success: true, message: 'Password changed successfully' };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      throw new BadRequestException(
        errorBody(
          ErrorCode.BUSINESS_RULE_VIOLATION,
          `Password change failed: ${error.message}`,
        ),
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
