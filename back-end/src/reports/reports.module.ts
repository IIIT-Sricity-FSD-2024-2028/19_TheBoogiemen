import { Module } from '@nestjs/common';
import { AcademicsModule } from '../academics/academics.module';
import { FeesModule } from '../fees/fees.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({ imports: [AcademicsModule, FeesModule], controllers: [ReportsController], providers: [ReportsService] })
export class ReportsModule {}
