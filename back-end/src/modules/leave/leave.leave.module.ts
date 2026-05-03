import { Module } from '@nestjs/common';
import { LeaveController } from './leave.leave.controller';
import { LeaveService } from './leave.leave.service';
import { LeaveRepository } from './leave.leave.repository';
import { NotificationService } from '../../common/services/notification.service';

@Module({
  controllers: [LeaveController],
  providers: [LeaveService, LeaveRepository, NotificationService],
  exports: [LeaveService],
})
export class LeaveModule {}
