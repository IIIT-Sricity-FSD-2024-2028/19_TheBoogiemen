import { Module } from '@nestjs/common';
import { UserController } from './user.user.controller';
import { UserService } from './user.user.service';
import { UserRepository } from './user.user.repository';
import { NotificationService } from '../../common/services/notification.service';

@Module({
  controllers: [UserController],
  providers: [UserService, UserRepository, NotificationService],
  exports: [UserService],
})
export class UserModule {}
