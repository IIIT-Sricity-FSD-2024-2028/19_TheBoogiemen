import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as path from 'path';
import * as express from 'express';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Enable CORS FIRST
  // Identity and role now travel in a signed JWT via the Authorization header.
  // The old 'role' and 'user-id' headers are gone — the server ignores them, and
  // allowing them here would only invite clients to keep sending them.
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });

  // 2. Global Interceptors (Logging)
  app.useGlobalInterceptors(new LoggingInterceptor());

  // 3. Global Validation
  app.useGlobalPipes(
    new ValidationPipe({ 
      whitelist: true, 
      transform: true, 
      transformOptions: { enableImplicitConversion: true } 
    })
  );

  // 3. Serve Static Files (Windows & Mac Compatible)
  // This resolves the 'front-end' folder relative to your current project location
  // Add one extra '..' to go out of the back-end folder and into the root
  const frontendPath = path.join(__dirname, '..', '..', '..', 'front-end');
  console.log('Serving static files from:', frontendPath);
  app.use(express.static(frontendPath));

  // 4. Global API Prefix
  // Note: All your endpoints will now start with /api (e.g., /api/auth/login)
  app.setGlobalPrefix('api');

  // 5. Swagger Configuration
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

  // 6. Start Server
  const PORT = 5001;
  await app.listen(PORT);
  
  console.log('-------------------------------------------');
  console.log(`Application is running on: http://localhost:${PORT}`);
  console.log(`Frontend served from: http://localhost:${PORT}`);
  console.log(`API Docs: http://localhost:${PORT}/api/docs`);
  console.log('-------------------------------------------');
}

bootstrap();