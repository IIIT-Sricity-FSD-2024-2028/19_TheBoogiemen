import { Module } from '@nestjs/common';
import { MeetingController } from './meeting.meeting.controller';
import { MeetingService } from './meeting.meeting.service';
import { MeetingRepository } from './meeting.meeting.repository';
import { NotificationService } from '../../common/services/notification.service';

@Module({
  controllers: [MeetingController],
  providers: [MeetingService, MeetingRepository, NotificationService],
  exports: [MeetingService, MeetingRepository],
})
export class MeetingModule {}
