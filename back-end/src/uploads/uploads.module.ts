import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { DatabaseModule } from '../database/database.module';
import { FileLoggerService } from '../common/services/file-logger.service';

@Module({
  imports: [DatabaseModule],
  controllers: [UploadsController],
  providers: [UploadsService, FileLoggerService],
  exports: [UploadsService],
})
export class UploadsModule {}
