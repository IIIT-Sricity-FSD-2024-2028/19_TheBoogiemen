import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { buildLoggerConfig } from './config/logger.config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { RolesGuard } from './auth/roles.guard';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RequiresModuleGuard } from './common/guards/requires-module.guard';
import { AuthModule } from './auth/auth.module';
import { StudentsModule } from './students/students.module';
import { UploadsModule } from './uploads/uploads.module';
import { BillingModule } from './billing/billing.module';
import { NotificationsModule } from './notifications/notifications.module';
// Campus domain modules. Every record is scoped to the caller's college.
import { CollegeModule } from './college/college.module';
import { AcademicsModule } from './academics/academics.module';
import { AttendanceModule } from './attendance/attendance.module';
import { LeaveModule } from './leave/leave.module';
import { FeesModule } from './fees/fees.module';
import { CampusModule } from './campus/campus.module';
import { ReportsModule } from './reports/reports.module';
import { SupportModule } from './support/support.module';

// Mandatory FDFED Middleware Suite
import { FileLoggerService } from './common/services/file-logger.service';
import { LoggingMiddleware } from './common/middleware/logging.middleware';
import { SecurityMiddleware } from './common/middleware/security.middleware';
import { RateLimiterMiddleware } from './common/middleware/rate-limiter.middleware';
import { TenantContextMiddleware } from './common/middleware/tenant-context.middleware';
import { AuditLoggerMiddleware } from './common/middleware/audit-logger.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot(buildLoggerConfig()),
    DatabaseModule,
    AuthModule,
    CollegeModule,
    AcademicsModule,
    AttendanceModule,
    LeaveModule,
    FeesModule,
    CampusModule,
    ReportsModule,
    StudentsModule,
    SupportModule,
    UploadsModule,
    BillingModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    FileLoggerService,
    LoggingMiddleware,
    SecurityMiddleware,
    RateLimiterMiddleware,
    TenantContextMiddleware,
    AuditLoggerMiddleware,
    // Global Authentication & Authorization Guards
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RequiresModuleGuard,
    },
  ],
})
export class AppModule implements NestModule {
  /**
   * Router-level middleware registration for the 5 mandatory FDFED middleware types:
   * 1. Global Security Middleware (OWASP headers, stripped X-Powered-By)
   * 2. Global Logging Middleware (disk logging to logs/access.log & app.log)
   * 3. Global Rate Limiter & Token Quota Middleware (X-RateLimit-* headers, 429 status)
   * 4. Router-Level Tenant Context Middleware (Multi-Tenant Isolation, x-tenant-id injection)
   * 5. Router-Level Audit Logger Middleware (Mutation Auditing to logs/audit.log)
   */
  configure(consumer: MiddlewareConsumer): void {
    // 1. Security headers & CORS hygiene
    consumer
      .apply(SecurityMiddleware)
      .forRoutes({ path: '*path', method: RequestMethod.ALL });

    // 2. Access logging to disk & console
    consumer
      .apply(LoggingMiddleware)
      .forRoutes({ path: '*path', method: RequestMethod.ALL });

    // 3. IP token-bucket rate limiting
    consumer
      .apply(RateLimiterMiddleware)
      .forRoutes({ path: '*path', method: RequestMethod.ALL });

    // 4. Multi-Tenant Context injection
    consumer
      .apply(TenantContextMiddleware)
      .forRoutes({ path: '*path', method: RequestMethod.ALL });

    // 5. Data Mutation Audit Logging (POST, PUT, PATCH, DELETE)
    consumer
      .apply(AuditLoggerMiddleware)
      .forRoutes({ path: '*path', method: RequestMethod.ALL });
  }
}
