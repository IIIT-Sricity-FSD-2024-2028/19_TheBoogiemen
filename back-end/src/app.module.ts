import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { RolesGuard } from './auth/roles.guard';
import { AuthModule } from './auth/auth.module';
import { StudentsModule } from './students/students.module';
import { FacultyModule } from './faculty/faculty.module';
import { AdminModule } from './admin/admin.module';

// B2B SaaS Platform Module
import { PlatformModule } from './platform/platform.module';

// Workflow Modules
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

// Evaluation: Mandatory Uploads & Timetable Modules
import { UploadsModule } from './uploads/uploads.module';
import { TimetableModule } from './modules/timetable/timetable.module';

// Evaluation: Mandatory Middleware & Services
import { FileLoggerService } from './common/services/file-logger.service';
import { LoggingMiddleware } from './common/middleware/logging.middleware';
import { SecurityMiddleware } from './common/middleware/security.middleware';
import { RateLimiterMiddleware } from './common/middleware/rate-limiter.middleware';
import { TenantContextMiddleware } from './common/middleware/tenant-context.middleware';
import { AuditLoggerMiddleware } from './common/middleware/audit-logger.middleware';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    PlatformModule,
    StudentsModule,
    FacultyModule,
    AdminModule,
    UploadsModule,
    TimetableModule,
    // Workflow modules
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
    FileLoggerService,
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
  exports: [FileLoggerService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // ── 1. Global Security Middleware ──
    consumer.apply(SecurityMiddleware).forRoutes('*');

    // ── 2. Global Logging Middleware (logs to access.log & app.log) ──
    consumer.apply(LoggingMiddleware).forRoutes('*');

    // ── 3. Global Rate Limiter Middleware ──
    consumer.apply(RateLimiterMiddleware).forRoutes('*');

    // ── 4. Router-Level Tenant Context Middleware (Multi-Tenant Isolation) ──
    consumer
      .apply(TenantContextMiddleware)
      .forRoutes(
        'admin',
        'faculty',
        'students',
        'platform',
        'fees',
        'uploads',
        'timetable',
        'courses',
        'leave',
        'attendance',
        'reports',
        'research'
      );

    // ── 5. Router-Level Audit Logger Middleware (for State Mutations) ──
    consumer
      .apply(AuditLoggerMiddleware)
      .forRoutes(
        { path: 'admin/*', method: RequestMethod.ALL },
        { path: 'users/*', method: RequestMethod.ALL },
        { path: 'users', method: RequestMethod.ALL },
        { path: 'courses/*', method: RequestMethod.ALL },
        { path: 'courses', method: RequestMethod.ALL },
        { path: 'marks/*', method: RequestMethod.ALL },
        { path: 'marks', method: RequestMethod.ALL },
        { path: 'leave/*', method: RequestMethod.ALL },
        { path: 'leave', method: RequestMethod.ALL },
        { path: 'fees/*', method: RequestMethod.ALL },
        { path: 'fees', method: RequestMethod.ALL },
        { path: 'uploads/*', method: RequestMethod.ALL },
        { path: 'timetable/*', method: RequestMethod.ALL }
      );
  }
}
