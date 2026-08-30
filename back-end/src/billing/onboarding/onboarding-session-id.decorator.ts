/**
 * onboarding-session-id.decorator.ts — the verified draft session id.
 *
 * Same pattern as common/decorators/current-user.decorator.ts's
 * @CurrentUserId(): read only what OnboardingSessionGuard already verified,
 * never re-derive it from anything the client could edit.
 */

import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';

export const OnboardingSessionId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    if (!request.onboardingSessionId) {
      // Reaching here means a route reads this without OnboardingSessionGuard
      // in front of it — a wiring mistake, not something a client can trigger.
      throw new InternalServerErrorException(
        'OnboardingSessionId requested on a route without OnboardingSessionGuard.',
      );
    }
    return request.onboardingSessionId;
  },
);
