import { Module } from '@nestjs/common';
import { PlatformController } from './platform.controller';
import { PlatformService } from './platform.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from '../core/entities/organization.entity';
import { User } from '../core/entities/user.entity';
import { OrganizationMembership } from '../core/entities/organization-membership.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Organization, User, OrganizationMembership])],
  controllers: [PlatformController],
  providers: [PlatformService],
})
export class PlatformModule {}
