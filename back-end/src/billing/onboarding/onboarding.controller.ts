/**
 * onboarding.controller.ts — the public self-service pipeline's 5 routes.
 *
 * Every route here is @Public() — none of them authenticate as an
 * application role, because none of them run as one; there is no `spoc`
 * account yet. @Public() satisfies RolesGuard's strict "every route
 * declares @Roles() or @Public()" rule (roles.guard.ts) without implying
 * these routes are unprotected: four of the five also carry
 * @UseGuards(OnboardingSessionGuard), which is the real protection —
 * proof of continuity from stage 1, via the bp_onboarding cookie.
 */

import { Body, Controller, Get, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../auth/public.decorator';
import { setAuthCookie, tokenTtlMs } from '../../auth/auth-cookie';
import { computeQuote } from '../pricing/pricing.service';
import { EstimateDto } from '../dto/estimate.dto';
import { OnboardingStartDto } from '../dto/onboarding-start.dto';
import { OnboardingMetricsDto } from '../dto/onboarding-metrics.dto';
import { OnboardingService } from './onboarding.service';
import { OnboardingSessionGuard } from './onboarding-session.guard';
import { OnboardingSessionId } from './onboarding-session-id.decorator';
import { setOnboardingCookie, clearOnboardingCookie } from './onboarding-cookie';

@ApiTags('Billing — Onboarding')
@Controller('billing')
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  @Post('estimate')
  @Public()
  @ApiOperation({ summary: 'Stateless live price preview — nothing is stored' })
  async estimate(@Body() body: EstimateDto) {
    return { success: true, data: computeQuote(body) };
  }

  @Post('onboarding/start')
  @Public()
  @ApiOperation({ summary: 'Stage 1 — account and college details; issues the onboarding cookie' })
  async start(
    @Body() body: OnboardingStartDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { token, ttlMs } = await this.onboarding.start(body);
    setOnboardingCookie(res, token, ttlMs);
    return { success: true };
  }

  @Get('onboarding/quote')
  @Public()
  @UseGuards(OnboardingSessionGuard)
  @ApiOperation({ summary: 'Re-fetch the current draft\'s quote (page-refresh resilience)' })
  async getQuote(@OnboardingSessionId() sessionId: string) {
    const quote = await this.onboarding.getQuote(sessionId);
    return { success: true, data: quote };
  }

  @Post('onboarding/quote')
  @Public()
  @UseGuards(OnboardingSessionGuard)
  @ApiOperation({ summary: 'Stage 2 — commit metrics as a real, persisted quote' })
  async commitQuote(
    @Body() body: OnboardingMetricsDto,
    @OnboardingSessionId() sessionId: string,
  ) {
    const quote = await this.onboarding.commitQuote(sessionId, body);
    return { success: true, data: quote };
  }

  @Post('onboarding/quote/accept')
  @Public()
  @UseGuards(OnboardingSessionGuard)
  @ApiOperation({ summary: 'Stage 3 — accept the quote and open a mock payment order' })
  async acceptQuote(@OnboardingSessionId() sessionId: string) {
    const order = await this.onboarding.acceptQuote(sessionId);
    return { success: true, data: order };
  }

  @Post('onboarding/payments/fail')
  @Public()
  @UseGuards(OnboardingSessionGuard)
  @ApiOperation({ summary: 'Mock checkout "Simulate Failure" — the quote stays valid for a retry' })
  async failPayment(@OnboardingSessionId() sessionId: string) {
    await this.onboarding.failPayment(sessionId);
    return { success: true };
  }

  @Post('onboarding/payments/confirm')
  @Public()
  @UseGuards(OnboardingSessionGuard)
  @ApiOperation({ summary: 'Stage 4 — mock checkout "Simulate Successful Payment"; fulfillment' })
  @ApiResponse({ status: 201, description: 'College, SPOC and subscription created; caller is now signed in' })
  async confirmPayment(
    @OnboardingSessionId() sessionId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { token, user } = await this.onboarding.confirmPayment(sessionId);
    const ttlMs = tokenTtlMs(token);
    setAuthCookie(res, token, ttlMs);
    clearOnboardingCookie(res);
    return { success: true, user, expires_at: Date.now() + ttlMs };
  }
}
