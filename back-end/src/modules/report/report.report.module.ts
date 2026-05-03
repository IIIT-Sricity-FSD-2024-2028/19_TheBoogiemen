import { Module } from '@nestjs/common';
import { ReportController } from './report.report.controller';
import { ReportService } from './report.report.service';
import { ReportRepository } from './report.report.repository';
import { NotificationService } from '../../common/services/notification.service';

@Module({
  controllers: [ReportController],
  providers: [ReportService, ReportRepository, NotificationService],
  exports: [ReportService],
})
export class ReportModule {}
