/**
 * onboarding-session.guard.ts — proves continuity across the onboarding
 * wizard's steps, without ever granting real access to anything.
 *
 * Route-scoped via @UseGuards(), exactly like EnvGuard already is
 * (common/guards/env.guard.ts) — this is not a global guard, because it
 * applies to exactly four routes, not the whole application.
 *
 * Why a signed token with no `sub`/`role` claim is the real safety
 * mechanism here, not a policy: JwtAuthGuard.extractToken()
 * (jwt-auth.guard.ts:92-93) only ever reads request.cookies[AUTH_COOKIE] —
 * 'bp_session' by name — so it never looks at 'bp_onboarding' at all. And
 * even if this token were somehow presented as a Bearer token on a real
 * route, JwtAuthGuard's own existing check —
 *
 *   if (!payload?.sub || !isRole(payload.role)) { throw ... TOKEN_INVALID }
 *
 * — already rejects it, because this payload has neither claim. No code in
 * the real auth pipeline had to be taught to refuse this token; the payload
 * shape makes it refuse by construction.
 *
 * Cookie-only, unlike JwtAuthGuard: there is no Bearer-token fallback here.
 * A real session token is handed back in the login response specifically so
 * it can be pasted into Swagger's Authorize button; an onboarding token is
 * never returned in a response body at all (see onboarding.controller.ts) —
 * it only ever exists as the Set-Cookie header itself — so there is nothing
 * to paste anywhere, and no fallback path to build for it.
 */

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ErrorCode, errorBody } from '../../common/errors/error-codes';
import { ONBOARDING_COOKIE } from './onboarding-cookie';

export interface OnboardingTokenPayload {
  purpose: 'onboarding';
  session_id: string;
}

function isOnboardingPayload(value: unknown): value is OnboardingTokenPayload {
  return (
    !!value &&
    typeof value === 'object' &&
    (value as any).purpose === 'onboarding' &&
    typeof (value as any).session_id === 'string' &&
    (value as any).session_id.length > 0
  );
}

@Injectable()
export class OnboardingSessionGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    @InjectPinoLogger(OnboardingSessionGuard.name)
    private readonly logger: PinoLogger,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;

    const request = context.switchToHttp().getRequest();
    const token = request?.cookies?.[ONBOARDING_COOKIE];

    if (typeof token !== 'string' || !token.trim()) {
      throw new UnauthorizedException(
        errorBody(
          ErrorCode.AUTHENTICATION_REQUIRED,
          'No onboarding session found. Please start again.',
        ),
      );
    }

    let payload: unknown;
    try {
      payload = await this.jwtService.verifyAsync(token.trim());
    } catch (err: any) {
      const reason =
        err?.name === 'TokenExpiredError' ? 'expired' : 'invalid signature or format';
      this.logger.warn(
        { reason, path: request.url },
        'Onboarding session token rejected',
      );
      throw new UnauthorizedException(
        errorBody(
          ErrorCode.TOKEN_EXPIRED,
          'Your onboarding session has expired. Please start again.',
        ),
      );
    }

    if (!isOnboardingPayload(payload)) {
      throw new UnauthorizedException(
        errorBody(
          ErrorCode.TOKEN_INVALID,
          'No onboarding session found. Please start again.',
        ),
      );
    }

    // Read via @OnboardingSessionId() (onboarding-session-id.decorator.ts),
    // the same pattern @CurrentUserId() already establishes for the real
    // auth payload.
    request.onboardingSessionId = payload.session_id;
    return true;
  }
}
