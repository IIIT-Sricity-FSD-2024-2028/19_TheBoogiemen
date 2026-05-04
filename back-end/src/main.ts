import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as path from 'path';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Enable CORS FIRST
  // Added explicit support for your custom headers: 'role' and 'user-id'
  app.enableCors({
    origin: true, 
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, role, user-id, Authorization',
  });

  // 2. Request Logging Middleware
  app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    const ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    console.log(`[${timestamp}] ${req.method} ${req.url} - IP: ${ip}`);
    next();
  });

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
      'Academic Progress & Outcome Tracking API. Headers required: "role" (student|faculty|admin|head|superadmin), "user-id" (e.g., u1).'
    )
    .setVersion('1.0')
    .addApiKey({ type: 'apiKey', in: 'header', name: 'role' }, 'role')
    .addApiKey({ type: 'apiKey', in: 'header', name: 'user-id' }, 'user-id')
    .addSecurityRequirements('role')
    .addSecurityRequirements('user-id')
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