import { Module } from '@nestjs/common';
import { PlatformController } from './platform.controller';
import { PlatformService } from './platform.service';
import { DatabaseModule } from '../database/database.module';
import { FileLoggerService } from '../common/services/file-logger.service';

@Module({
  imports: [DatabaseModule],
  controllers: [PlatformController],
  providers: [PlatformService, FileLoggerService],
  exports: [PlatformService],
})
export class PlatformModule {}
