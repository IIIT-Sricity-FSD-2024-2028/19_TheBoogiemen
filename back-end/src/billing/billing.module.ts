import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from '../core/entities/organization.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Organization])],
  controllers: [BillingController],
  providers: [BillingService],
})
export class BillingModule {}
