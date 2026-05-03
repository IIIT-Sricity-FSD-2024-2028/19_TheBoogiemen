import { Module } from '@nestjs/common';
import { ForumController } from './forum.forum.controller';
import { ForumService } from './forum.forum.service';
import { ForumRepository } from './forum.forum.repository';
import { NotificationService } from '../../common/services/notification.service';

@Module({
  controllers: [ForumController],
  providers: [ForumService, ForumRepository, NotificationService],
  exports: [ForumService],
})
export class ForumModule {}
