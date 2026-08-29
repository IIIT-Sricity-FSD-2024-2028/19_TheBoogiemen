/**
 * billing.module.ts — the SPOC / vendor platform.
 *
 * Scope of this module today: colleges (provisioning) and support (the
 * SPOC <-> superadmin channel). Quotes, subscriptions and payments are not
 * here yet — they arrive with the pricing increment that actually
 * implements them, per SPOC_IMPLEMENTATION_PLAN.md's phased delivery.
 */
import { Module } from '@nestjs/common';
import { CollegesController } from './colleges.controller';
import { CollegesService } from './colleges.service';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';

@Module({
  controllers: [CollegesController, SupportController],
  providers: [CollegesService, SupportService],
})
export class BillingModule {}
