import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import * as path from 'path';
import * as express from 'express';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

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
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, transformOptions: { enableImplicitConversion: true } }));
  logger.log('✅ Step 2/8: Validation pipes registered');

  // ── Step 3: Global Logging Interceptor ──
  logger.log('📋 Step 3/8: Registering global request/response logging interceptor...');
  app.useGlobalInterceptors(new LoggingInterceptor());
  logger.log('✅ Step 3/8: Logging interceptor registered — all HTTP requests will be logged');

  // ── Step 4: Static File Serving ──
  const frontendPath = '/Users/gayathridevi/Documents/FFSD/front-end';
  logger.log(`📂 Step 4/8: Serving static frontend files from: ${frontendPath}`);
  app.use(express.static(frontendPath));
  logger.log('✅ Step 4/8: Static file middleware configured');

  // ── Step 5: Global API Prefix ──
  logger.log('🏷️  Step 5/8: Setting global API prefix → /api');
  app.setGlobalPrefix('api');
  logger.log('✅ Step 5/8: All API routes prefixed with /api');

  // ── Step 6: CORS ──
  logger.log('🌐 Step 6/8: Enabling CORS for frontend integration...');
  app.enableCors();
  logger.log('✅ Step 6/8: CORS enabled (all origins)');

  // ── Step 7: Swagger Documentation ──
  logger.log('📖 Step 7/8: Building Swagger/OpenAPI documentation...');
  const config = new DocumentBuilder()
    .setTitle('BarelyPassing API')
    .setDescription('Academic Progress & Outcome Tracking API. Headers required: "role" (student|faculty|admin|head|superadmin), "user-id" (e.g., u1).')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  logger.log('✅ Step 7/8: Swagger docs available at /api/docs');

  // ── Step 8: Start Listening ──
  logger.log('🎧 Step 8/8: Starting HTTP server on port 5001...');
  await app.listen(5001);

  logger.log('');
  logger.log('═══════════════════════════════════════════════════════════');
  logger.log('  🎓 BarelyPassing Backend — RUNNING SUCCESSFULLY');
  logger.log('═══════════════════════════════════════════════════════════');
  logger.log(`  🌐 Frontend : http://localhost:5001`);
  logger.log(`  🔗 API Base : http://localhost:5001/api`);
  logger.log(`  📖 API Docs : http://localhost:5001/api/docs`);
  logger.log('═══════════════════════════════════════════════════════════');
  logger.log('  📋 Request logging is ACTIVE — every API call will be logged');
  logger.log('═══════════════════════════════════════════════════════════');
  logger.log('');
}
bootstrap();
