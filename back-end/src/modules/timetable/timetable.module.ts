import { Module } from '@nestjs/common';
import { TimetableController } from './timetable.controller';
import { TimetableService } from './timetable.service';
import { DatabaseModule } from '../../database/database.module';
import { FileLoggerService } from '../../common/services/file-logger.service';

@Module({
  imports: [DatabaseModule],
  controllers: [TimetableController],
  providers: [TimetableService, FileLoggerService],
  exports: [TimetableService],
})
export class TimetableModule {}
