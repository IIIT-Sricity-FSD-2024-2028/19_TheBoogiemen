import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from './entities/organization.entity';
import { User } from './entities/user.entity';
import { OrganizationMembership } from './entities/organization-membership.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Organization, User, OrganizationMembership]),
  ],
  exports: [
    TypeOrmModule,
  ],
})
export class CoreModule {}
