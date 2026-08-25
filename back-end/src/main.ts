import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import * as path from 'path';
import * as express from 'express';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { FileLoggerService } from './common/services/file-logger.service';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // ── Step 1: Create NestJS Application ──
  logger.log('🚀 Step 1/8: Creating NestJS application instance...');
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });
  logger.log('✅ Step 1/8: NestJS application created successfully');

  // ── Step 2: Global Validation Pipes ──
  logger.log('🔧 Step 2/8: Registering global validation pipes (whitelist, transform)...');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    })
  );
  logger.log('✅ Step 2/8: Validation pipes registered');

  // ── Step 3: Global File Logger & Exception Filters ──
  logger.log('📋 Step 3/8: Registering global logging interceptor and disk exception filter...');
  const fileLogger = app.get(FileLoggerService);
  app.useGlobalFilters(new AllExceptionsFilter(fileLogger));
  app.useGlobalInterceptors(new LoggingInterceptor());
  logger.log('✅ Step 3/8: Logging interceptor & disk exception filter active');

  // ── Step 4: Static File Serving (Frontend & Uploads) ──
  const frontendPath = path.resolve(process.cwd(), '../front-end');
  const uploadsPath = path.resolve(process.cwd(), 'uploads');
  logger.log(`📂 Step 4/8: Serving static frontend files from: ${frontendPath}`);
  app.use(express.static(frontendPath, { index: 'login.html' }));
  app.use('/uploads', express.static(uploadsPath));
  logger.log('✅ Step 4/8: Static frontend and /uploads serving configured');

  // ── Step 5: Global API Prefix ──
  logger.log('🏷️  Step 5/8: Setting global API prefix → /api');
  app.setGlobalPrefix('api');
  logger.log('✅ Step 5/8: All API routes prefixed with /api');

  // ── Step 6: CORS ──
  logger.log('🌐 Step 6/8: Enabling CORS for frontend integration...');
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Origin,X-Requested-With,Content-Type,Accept,Authorization,role,user-id,x-tenant-id,tenant_code',
  });
  logger.log('✅ Step 6/8: CORS enabled with credentials support');

  // ── Step 7: Swagger Documentation ──
  logger.log('📖 Step 7/8: Building Swagger/OpenAPI documentation...');
  const config = new DocumentBuilder()
    .setTitle('BarelyPassing API — Academic Progress & Outcome Tracking')
    .setDescription(
      'FDFED Evaluation REST API with complete Middleware implementation (Logging, Error Handling, File Uploads, Security, Router-level Tenant Context & Audit). Headers required: "role", "user-id", "x-tenant-id".'
    )
    .setVersion('2.0')
    .addTag('Uploads & Progress Reports', 'File upload & progress report ingestion pipeline (Issue #50)')
    .addTag('Timetable Generation', 'Automated clash-free schedule generation (Issue #49)')
    .addTag('B2B SaaS Platform & System Logs', 'Tenant management, quota metering, and disk log inspection')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  logger.log('✅ Step 7/8: Swagger docs available at /api/docs');

  // ── Step 8: Start Listening ──
  const port = process.env.PORT || 5001;
  logger.log(`🎧 Step 8/8: Starting HTTP server on port ${port}...`);
  await app.listen(port);

  logger.log('');
  logger.log('═══════════════════════════════════════════════════════════');
  logger.log('  🎓 BarelyPassing Backend — FDFED Evaluation Ready');
  logger.log('═══════════════════════════════════════════════════════════');
  logger.log(`  🌐 Frontend     : http://localhost:${port}`);
  logger.log(`  🔗 API Base     : http://localhost:${port}/api`);
  logger.log(`  📖 Swagger Docs : http://localhost:${port}/api/docs`);
  logger.log(`  📁 Uploads Dir  : ${uploadsPath}`);
  logger.log(`  📄 Disk Logs    : ${path.resolve(process.cwd(), 'logs')}`);
  logger.log('═══════════════════════════════════════════════════════════');
  logger.log('  🛡️ All 5 Middleware Types are ACTIVE & PERSISTING TO DISK');
  logger.log('═══════════════════════════════════════════════════════════');
  logger.log('');
}
bootstrap();
