import { Module } from '@nestjs/common';
import { MeetingController } from './meeting.meeting.controller';
import { MeetingService } from './meeting.meeting.service';
import { MeetingRepository } from './meeting.meeting.repository';
import { DatabaseModule } from '../../database/database.module';
import { NotificationService } from '../../common/services/notification.service';

@Module({
  imports: [DatabaseModule],
  controllers: [MeetingController],
  providers: [MeetingService, MeetingRepository, NotificationService],
  exports: [MeetingService, MeetingRepository],
})
export class MeetingModule {}
