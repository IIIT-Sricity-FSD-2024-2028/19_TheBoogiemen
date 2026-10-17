import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';
import * as fs from 'fs';
import * as path from 'path';

async function generate() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle('BarelyPassing API')
    .setDescription('Academic Progress & Outcome Tracking API')
    .setVersion('1.0')
    .addApiKey({ type: 'apiKey', in: 'header', name: 'role' }, 'role')
    .addApiKey({ type: 'apiKey', in: 'header', name: 'user-id' }, 'user-id')
    .addSecurityRequirements('role')
    .addSecurityRequirements('user-id')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  
  const outputPath = path.resolve(__dirname, '../docs/swagger.json');
  fs.writeFileSync(outputPath, JSON.stringify(document, null, 2));
  console.log(`✅ Swagger JSON generated at ${outputPath}`);
  process.exit(0);
}
generate();
