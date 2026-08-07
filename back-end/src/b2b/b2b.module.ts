import { Module } from '@nestjs/common';
import { B2bController } from './b2b.controller';
import { B2bService } from './b2b.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKey } from '../core/entities/api-key.entity';
import { Organization } from '../core/entities/organization.entity';
import { User } from '../core/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ApiKey, Organization, User])],
  controllers: [B2bController],
  providers: [B2bService],
})
export class B2bModule {}
