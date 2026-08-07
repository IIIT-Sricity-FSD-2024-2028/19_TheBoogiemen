import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '../core/entities/organization.entity';

@Injectable()
export class BillingService {
  constructor(
    @InjectRepository(Organization) private orgRepository: Repository<Organization>
  ) {}

  async getSubscriptionDetails(tenantId: string) {
    const org = await this.orgRepository.findOne({ where: { id: tenantId } });
    if (!org) throw new BadRequestException('Organization not found');

    return {
      plan: org.subscriptionPlan || 'free',
      status: org.status,
      nextBillingDate: new Date(new Date().setMonth(new Date().getMonth() + 1)), // Mock date
      features: ['core_platform', 'unlimited_students']
    };
  }

  async updateSubscription(tenantId: string, plan: string) {
    const org = await this.orgRepository.findOne({ where: { id: tenantId } });
    if (!org) throw new BadRequestException('Organization not found');

    org.subscriptionPlan = plan;
    await this.orgRepository.save(org);

    return {
      success: true,
      message: `Successfully upgraded to ${plan} plan`,
      plan
    };
  }
}
