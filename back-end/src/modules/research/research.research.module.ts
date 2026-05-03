import { Module } from '@nestjs/common';
import { ResearchController } from './research.research.controller';
import { ResearchService } from './research.research.service';
import { ResearchRepository } from './research.research.repository';
import { NotificationService } from '../../common/services/notification.service';

@Module({
  controllers: [ResearchController],
  providers: [ResearchService, ResearchRepository, NotificationService],
  exports: [ResearchService],
})
export class ResearchModule {}
