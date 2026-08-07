import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { IntegrationService } from './integration.service';
import { IntegrationController } from './integration.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../core/entities/user.entity';
import { IntegrationConfig } from '../core/entities/integration-config.entity';
import { Course } from '../core/entities/course.entity';
import { Enrollment } from '../core/entities/enrollment.entity';
import { OrganizationMembership } from '../core/entities/organization-membership.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, IntegrationConfig, Course, Enrollment, OrganizationMembership]),
    ScheduleModule.forRoot(), // Enables CRON background workers
  ],
  controllers: [IntegrationController],
  providers: [IntegrationService],
})
export class IntegrationModule {}
