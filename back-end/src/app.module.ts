import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import {
  AUDIT_EXCLUDED_ROUTES,
  RequestAuditMiddleware,
} from './common/middleware/request-audit.middleware';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { buildLoggerConfig } from './config/logger.config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { RolesGuard } from './auth/roles.guard';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { AuthModule } from './auth/auth.module';
import { StudentsModule } from './students/students.module';
import { FacultyModule } from './faculty/faculty.module';
import { AdminModule } from './admin/admin.module';
import { UploadsModule } from './uploads/uploads.module';
import { BillingModule } from './billing/billing.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Registered after ConfigModule so LOG_LEVEL from .env is already in
    // process.env when the logger is built. buildLoggerConfig() is a function,
    // not a constant, for exactly this reason — it reads env at call time.
    LoggerModule.forRoot(buildLoggerConfig()),
    DatabaseModule,
    AuthModule,
    StudentsModule,
    FacultyModule,
    AdminModule,
    UploadsModule,
    BillingModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    RequestAuditMiddleware,
    // Order matters. JwtAuthGuard must run first: it verifies the token and
    // populates request.user, which RolesGuard then reads. Nest applies
    // APP_GUARD providers in registration order.
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule implements NestModule {
  /**
   * Router-level middleware, applied across every API route.
   *
   * Two details here are load-bearing and both fail silently if changed:
   *
   * 1. The path is '*path', not '*'. Express 5 uses path-to-regexp v8, where an
   *    unnamed wildcard is a syntax error — `app.use('/*')` throws "Missing
   *    parameter name" at boot. A named wildcard is required.
   *
   * 2. Because '*path' is not one of Nest's "simple wildcards" (['*', '/*',
   *    '/*​/', '(.*)', '/(.*)']), it goes through the prefixed branch of
   *    RouteInfoPathExtractor and compiles to '/api/*path'. That is exactly the
   *    scope wanted: every API route, and none of the static frontend that
   *    express.static serves from the same origin. A bare '*' would skip the
   *    prefix, cover every .html and .css file too, and audit page loads.
   *
   * exclude() runs through the same extractor, so those paths are also written
   * without 'api/' — see AUDIT_EXCLUDED_ROUTES for the reasoning per route.
   */
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(RequestAuditMiddleware)
      .exclude(...AUDIT_EXCLUDED_ROUTES)
      .forRoutes({ path: '*path', method: RequestMethod.ALL });
  }
}
