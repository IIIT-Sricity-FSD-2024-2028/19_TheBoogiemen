import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import * as path from 'path';
import * as express from 'express';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  // bufferLogs holds Nest's own startup output until the Pino logger is
  // installed below, so bootstrap lines are formatted like everything else
  // instead of being lost or printed in Nest's default format.
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // 1. Route Nest's internal logging (route mapping, lifecycle, unhandled
  // exceptions) through Pino, so the process emits exactly one log format.
  const logger = app.get(Logger);
  app.useLogger(logger);
  app.flushLogs();

  // 2. Enable CORS
  // Identity and role travel in a signed JWT via the Authorization header.
  // The old 'role' and 'user-id' headers are gone — the server ignores them, and
  // allowing them here would only invite clients to keep sending them.
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });

  // 3. Structured error handling. HTTP request logging is handled by pino-http
  // (configured in logger.config.ts), which hooks the response lifecycle rather
  // than sitting in the response path — a logging fault can no longer alter a
  // response, which is what the interceptor this replaces used to do.
  app.useGlobalFilters(new AllExceptionsFilter(logger));

  // 4. Global Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true }
    })
  );

  // 5. Serve Static Files (Windows & Mac Compatible)
  // This resolves the 'front-end' folder relative to your current project location
  // Add one extra '..' to go out of the back-end folder and into the root
  const frontendPath = path.join(__dirname, '..', '..', '..', 'front-end');
  logger.log({ frontendPath, msg: 'Serving static frontend' });
  app.use(express.static(frontendPath));

  // 6. Global API Prefix
  // Note: All your endpoints will now start with /api (e.g., /api/auth/login)
  app.setGlobalPrefix('api');

  // 7. Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('BarelyPassing API')
    .setDescription(
      'Academic Progress & Outcome Tracking API.\n\n' +
      'Authenticate with POST /api/auth/login, then click **Authorize** and paste the returned token. ' +
      'All endpoints require a valid bearer token except login and signup.'
    )
    .setVersion('2.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
      'bearer',
    )
    .addSecurityRequirements('bearer')
    .build();
    
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // 8. Start Server
  const PORT = 5001;
  await app.listen(PORT);

  // One structured line rather than a five-line ASCII box: separator rows carry
  // no information once the output is JSON.
  // nestjs-pino's Logger is a Nest LoggerService: a second string argument is
  // treated as the *context*, not the message. Put `msg` on the object instead.
  logger.log({
    port: PORT,
    url: `http://localhost:${PORT}`,
    docs: `http://localhost:${PORT}/api/docs`,
    env: process.env.NODE_ENV ?? 'development',
    logLevel: process.env.LOG_LEVEL ?? 'debug',
    msg: 'Application started',
  });
}

bootstrap();