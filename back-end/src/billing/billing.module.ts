/**
 * billing.module.ts — the SPOC / vendor platform.
 *
 * Three concerns: colleges (provisioning — both superadmin-manual and, as of
 * ONBOARDING_PIPELINE_PLAN.md, self-service), support (the SPOC <->
 * superadmin channel), and onboarding (the public pricing + mock-payment
 * pipeline that makes self-service provisioning possible). Postgres-backed
 * repositories are not here — same status as every table in this schema
 * set, provisioned but not the live read/write path (InMemoryDbService is).
 */
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { CollegesController } from './colleges.controller';
import { CollegesService } from './colleges.service';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';
import { OnboardingController } from './onboarding/onboarding.controller';
import { OnboardingService } from './onboarding/onboarding.service';
import { OnboardingSessionGuard } from './onboarding/onboarding-session.guard';
import { OnboardingRateLimitMiddleware } from './onboarding/onboarding-rate-limit.middleware';
import { PAYMENT_GATEWAY } from './payments/payment-gateway.interface';
import { MockGateway } from './payments/mock.gateway';

@Module({
  controllers: [CollegesController, SupportController, OnboardingController],
  providers: [
    CollegesService,
    SupportService,
    OnboardingService,
    OnboardingSessionGuard,
    OnboardingRateLimitMiddleware,
    // The only binding today. Swapping in a real gateway later is a new
    // class against PaymentGateway plus changing this one line — see that
    // interface's own docstring.
    { provide: PAYMENT_GATEWAY, useClass: MockGateway },
  ],
})
export class BillingModule implements NestModule {
  /**
   * Scoped to OnboardingController alone — absent from the stack for
   * colleges/support, exactly how AuthRateLimitMiddleware is scoped to
   * AuthController alone and nowhere else.
   */
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(OnboardingRateLimitMiddleware).forRoutes(OnboardingController);
  }
}
