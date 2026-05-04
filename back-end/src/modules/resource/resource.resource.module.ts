import { Module } from '@nestjs/common';
import { ResourceController } from './resource.resource.controller';
import { ResourceService } from './resource.resource.service';
import { ResourceRepository } from './resource.resource.repository';
import { EventRepository } from './event.event.repository';
import { NotificationService } from '../../common/services/notification.service';

@Module({
  controllers: [ResourceController],
  providers: [ResourceService, ResourceRepository, EventRepository, NotificationService],
  exports: [ResourceService],
})
export class ResourceModule {}
