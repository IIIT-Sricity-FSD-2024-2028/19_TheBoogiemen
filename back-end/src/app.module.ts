import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoreModule } from './core/core.module';
import { Organization } from './core/entities/organization.entity';
import { User } from './core/entities/user.entity';
import { OrganizationMembership } from './core/entities/organization-membership.entity';
import { ApiKey } from './core/entities/api-key.entity';
import { IntegrationConfig } from './core/entities/integration-config.entity';
import { Course } from './core/entities/course.entity';
import { Enrollment } from './core/entities/enrollment.entity';
import { Assessment } from './core/entities/assessment.entity';
import { Submission } from './core/entities/submission.entity';
import { MarksEntry } from './core/entities/marks-entry.entity';
import { AttendanceLog } from './core/entities/attendance-log.entity';
import { LeaveRequest } from './core/entities/leave-request.entity';
import { ForumPost } from './core/entities/forum-post.entity';
import { ForumReply } from './core/entities/forum-reply.entity';
import { Event } from './core/entities/event.entity';
import { ResearchProject } from './core/entities/research-project.entity';
import { RolesGuard } from './auth/roles.guard';
import { TenantGuard } from './common/guards/tenant.guard';
import { AuthModule } from './auth/auth.module';
import { StudentsModule } from './students/students.module';
import { FacultyModule } from './faculty/faculty.module';
import { AdminModule } from './admin/admin.module';

// Pranjal's modular backend (Workflow-based)
import { ReportModule } from './modules/report/report.report.module';
import { UserModule } from './modules/user/user.user.module';
import { AttendanceModule } from './modules/attendance/attendance.attendance.module';
import { ResourceModule } from './modules/resource/resource.resource.module';
import { ResearchModule } from './modules/research/research.research.module';
import { ForumModule } from './modules/forum/forum.forum.module';
import { LeaveModule } from './modules/leave/leave.leave.module';
import { FeeModule } from './modules/fee/fee.fee.module';
import { AssessmentModule } from './modules/assessment/assessment.assessment.module';
import { OutcomeModule } from './modules/outcome/outcome.outcome.module';
import { PublicModule } from './public/public.module';
import { PlatformModule } from './platform/platform.module';
import { InstitutionModule } from './institution/institution.module';
import { B2bModule } from './b2b/b2b.module';
import { BillingModule } from './billing/billing.module';
import { IntegrationModule } from './integration/integration.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: 'barelypassing.sqlite',
      entities: [Organization, User, OrganizationMembership, ApiKey, IntegrationConfig, Course, Enrollment, Assessment, Submission, MarksEntry, AttendanceLog, LeaveRequest, ForumPost, ForumReply, Event, ResearchProject],
      synchronize: true, // Automatically sync DB schema in dev mode
    }),
    CoreModule,
    DatabaseModule,
    AuthModule,
    StudentsModule,
    FacultyModule,
    AdminModule,
    // Pranjal's workflow modules
    ReportModule,
    UserModule,
    AttendanceModule,
    ResourceModule,
    ResearchModule,
    ForumModule,
    LeaveModule,
    FeeModule,
    AssessmentModule,
    OutcomeModule,
    PublicModule,
    PlatformModule,
    InstitutionModule,
    B2bModule,
    BillingModule,
    IntegrationModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: TenantGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
