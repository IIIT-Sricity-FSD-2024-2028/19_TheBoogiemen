import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  const config = new DocumentBuilder()
    .setTitle('Academic Management System API')
    .setDescription('In-memory NestJS backend')
    .setVersion('1.0')
    .addGlobalParameters({
      name: 'x-user-role',
      in: 'header',
      required: true,
      schema: { type: 'string', enum: ['student', 'faculty', 'admin', 'academic_head'] },
      description: 'Role for Role-Based Access Control',
    })
    .addTag('Fee', 'Workflow 1')
    .addTag('Report', 'Workflow 2')
    .addTag('User', 'Workflow 3')
    .addTag('Attendance', 'Workflow 3')
    .addTag('Resource', 'Workflow 4')
    .addTag('Research', 'Workflows 5 & 10')
    .addTag('Forum', 'Workflow 6')
    .addTag('Leave', 'Workflow 7')
    .addTag('Assessment', 'Workflows 8 & 9')
    .addTag('Outcome', 'Workflows 8 & 9')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const docsPath = path.join(process.cwd(), 'docs');
  if (!fs.existsSync(docsPath)) {
    fs.mkdirSync(docsPath, { recursive: true });
  }
  fs.writeFileSync(path.join(docsPath, 'swagger.json'), JSON.stringify(document, null, 2));

  await app.listen(3001);
}
bootstrap();
