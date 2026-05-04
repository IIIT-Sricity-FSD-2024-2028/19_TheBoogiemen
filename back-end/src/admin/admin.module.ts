import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { CommonController } from './common.controller';
import { AdminService } from './admin.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [AdminController, CommonController],
  providers: [AdminService],
})
export class AdminModule {}

