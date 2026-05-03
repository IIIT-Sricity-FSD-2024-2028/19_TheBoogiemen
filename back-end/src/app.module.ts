import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FeeModule } from './modules/fee/fee.fee.module';
import { ReportModule } from './modules/report/report.report.module';
import { UserModule } from './modules/user/user.user.module';
import { AttendanceModule } from './modules/attendance/attendance.attendance.module';
import { ResourceModule } from './modules/resource/resource.resource.module';
import { ResearchModule } from './modules/research/research.research.module';
import { ForumModule } from './modules/forum/forum.forum.module';
import { LeaveModule } from './modules/leave/leave.leave.module';
import { AssessmentModule } from './modules/assessment/assessment.assessment.module';
import { OutcomeModule } from './modules/outcome/outcome.outcome.module';
import { StateModule } from './modules/state/state.module';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { AuthController } from './auth.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    FeeModule,
    ReportModule,
    UserModule,
    AttendanceModule,
    ResourceModule,
    ResearchModule,
    ForumModule,
    LeaveModule,
    AssessmentModule,
    OutcomeModule,
    StateModule
  ],
  controllers: [AppController, AuthController],
  providers: [AppService],
})
export class AppModule {}
