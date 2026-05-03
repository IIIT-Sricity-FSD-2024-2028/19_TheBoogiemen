import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { RolesGuard } from './auth/roles.guard';
import { AuthModule } from './auth/auth.module';
import { StudentsModule } from './students/students.module';
import { FacultyModule } from './faculty/faculty.module';
import { AdminModule } from './admin/admin.module';

// Pranjal's modular backend (Workflow-based)
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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    StudentsModule,
    FacultyModule,
    AdminModule,
    // Pranjal's workflow modules
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
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
