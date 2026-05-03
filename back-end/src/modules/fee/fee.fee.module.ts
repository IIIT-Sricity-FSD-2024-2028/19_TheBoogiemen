import { Module } from '@nestjs/common';
import { FeeController } from './fee.fee.controller';
import { FeeService } from './fee.fee.service';
import { FeeRepository } from './fee.fee.repository';
import { FeeStructureRepository } from './fee-structure.fee-structure.repository';
import { NotificationService } from '../../common/services/notification.service';

@Module({
  controllers: [FeeController],
  providers: [FeeService, FeeRepository, FeeStructureRepository, NotificationService],
  exports: [FeeService],
})
export class FeeModule {}
