import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as path from 'path';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable global validation with type coercion
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, transformOptions: { enableImplicitConversion: true } }));

  // Serve static files from frontend directory BEFORE setting global prefix
  const frontendPath = '/Users/gayathridevi/Documents/FFSD/front-end';
  console.log('Serving static files from:', frontendPath);
  app.use(express.static(frontendPath));

  // Set global prefix
  app.setGlobalPrefix('api');

  // Enable CORS for frontend integration
  app.enableCors();

  const config = new DocumentBuilder()
    .setTitle('BarelyPassing API')
    .setDescription('Academic Progress & Outcome Tracking API. Headers required: "role" (student|faculty|admin|head|superadmin), "user-id" (e.g., u1).')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(5001);
  console.log(`Application is running on: http://localhost:5001`);
  console.log(`Frontend: http://localhost:5001`);
  console.log(`API Docs: http://localhost:5001/api/docs`);
}
bootstrap();
