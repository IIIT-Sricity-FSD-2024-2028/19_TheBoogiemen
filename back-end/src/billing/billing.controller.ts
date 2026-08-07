import { Controller, Get, Post, Body, Req } from '@nestjs/common';
import { BillingService } from './billing.service';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';

@ApiTags('Billing & Subscription')
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('subscription')
  @Roles('institution_owner')
  @ApiOperation({ summary: 'Get current subscription plan' })
  @ApiHeader({ name: 'x-organization-id', description: 'Tenant Context' })
  @ApiHeader({ name: 'role', description: 'Must be institution_owner' })
  async getSubscription(@Req() req: any) {
    return this.billingService.getSubscriptionDetails(req.tenantId);
  }

  @Post('upgrade')
  @Roles('institution_owner')
  @ApiOperation({ summary: 'Upgrade subscription plan (Mock)' })
  @ApiHeader({ name: 'x-organization-id', description: 'Tenant Context' })
  @ApiHeader({ name: 'role', description: 'Must be institution_owner' })
  async upgradeSubscription(@Req() req: any, @Body('plan') plan: string) {
    return this.billingService.updateSubscription(req.tenantId, plan);
  }
}
