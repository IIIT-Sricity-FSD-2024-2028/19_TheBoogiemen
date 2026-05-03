import { Module } from '@nestjs/common';
import { AttendanceController } from './attendance.attendance.controller';
import { AttendanceService } from './attendance.attendance.service';
import { AttendanceRepository } from './attendance.attendance.repository';
import { NotificationService } from '../../common/services/notification.service';

@Module({
  controllers: [AttendanceController],
  providers: [AttendanceService, AttendanceRepository, NotificationService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
