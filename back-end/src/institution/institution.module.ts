import { Module } from '@nestjs/common';
import { InstitutionController } from './institution.controller';
import { InstitutionService } from './institution.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from '../core/entities/organization.entity';
import { User } from '../core/entities/user.entity';
import { OrganizationMembership } from '../core/entities/organization-membership.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Organization, User, OrganizationMembership])],
  controllers: [InstitutionController],
  providers: [InstitutionService],
})
export class InstitutionModule {}
