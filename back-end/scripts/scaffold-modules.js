const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src/modules');

const modules = [
  { name: 'fee', entity1: 'FeePayment', entity2: 'FeeStructure' },
  { name: 'report', entity1: 'Report', entity2: 'Section' },
  { name: 'user', entity1: 'User', entity2: 'Faculty' },
  { name: 'attendance', entity1: 'AttendanceLog', entity2: 'Enrollment' },
  { name: 'resource', entity1: 'Resource', entity2: 'Event' },
  { name: 'research', entity1: 'ResearchProject', entity2: 'ResearchMilestone' },
  { name: 'forum', entity1: 'ForumPost', entity2: 'Topic' },
  { name: 'leave', entity1: 'LeaveRequest', entity2: 'AttendanceLog' },
  { name: 'assessment', entity1: 'Assessment', entity2: 'MarksEntry' },
  { name: 'outcome', entity1: 'LearningOutcome', entity2: 'StudentOutcome' }
];

if (!fs.existsSync(srcDir)) {
  fs.mkdirSync(srcDir, { recursive: true });
}

function ucfirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function camelCase(str) {
  return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
}

modules.forEach(mod => {
  const modDir = path.join(srcDir, mod.name);
  const dtoDir = path.join(modDir, 'dto');
  if (!fs.existsSync(modDir)) fs.mkdirSync(modDir);
  if (!fs.existsSync(dtoDir)) fs.mkdirSync(dtoDir);

  const classNamePrefix = ucfirst(camelCase(mod.name));

  // .module.ts
  const moduleCode = `import { Module, forwardRef } from '@nestjs/common';
import { ${classNamePrefix}Controller } from './${mod.name}.${mod.name}.controller';
import { ${classNamePrefix}Service } from './${mod.name}.${mod.name}.service';
import { ${classNamePrefix}Repository } from './${mod.name}.${mod.name}.repository';
import { NotificationService } from '../../common/services/notification.service';

@Module({
  controllers: [${classNamePrefix}Controller],
  providers: [${classNamePrefix}Service, ${classNamePrefix}Repository, NotificationService],
  exports: [${classNamePrefix}Service],
})
export class ${classNamePrefix}Module {}
`;
  fs.writeFileSync(path.join(modDir, `${mod.name}.${mod.name}.module.ts`), moduleCode);

  // .controller.ts template
  const controllerCode = `import { Controller, Post, Get, Patch, Body, Param, UseGuards, SetMetadata } from '@nestjs/common';
import { ApiTags, ApiHeader, ApiResponse, ApiBody } from '@nestjs/swagger';
import { ${classNamePrefix}Service } from './${mod.name}.${mod.name}.service';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('${ucfirst(mod.name)}')
@ApiHeader({ name: 'x-user-role', required: true })
@UseGuards(RolesGuard)
@Controller('${mod.name === 'user' ? 'users' : mod.name === 'report' ? 'reports' : mod.name === 'course' ? 'courses' : mod.name === 'assessment' ? 'assessments' : mod.name === 'leave' ? 'leaves' : mod.name === 'resource' ? 'resources' : mod.name === 'forum' ? 'forum' : mod.name === 'outcome' ? 'outcomes' : mod.name}')
export class ${classNamePrefix}Controller {
  constructor(private readonly ${camelCase(mod.name)}Service: ${classNamePrefix}Service) {}

  // Add specific endpoints generated manually
}
`;
  fs.writeFileSync(path.join(modDir, `${mod.name}.${mod.name}.controller.ts`), controllerCode);

  // .service.ts template
  const serviceCode = `import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { ${classNamePrefix}Repository } from './${mod.name}.${mod.name}.repository';
import { NotificationService } from '../../common/services/notification.service';

@Injectable()
export class ${classNamePrefix}Service {
  constructor(
    private readonly ${camelCase(mod.name)}Repo: ${classNamePrefix}Repository,
    private readonly notificationService: NotificationService
  ) {}

  // Workflows to be implemented
}
`;
  fs.writeFileSync(path.join(modDir, `${mod.name}.${mod.name}.service.ts`), serviceCode);

  // .repository.ts template
  const repoCode = `import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { SEED } from '../../common/types/seed-constants';
import * as Interfaces from '../../common/types/interfaces';

@Injectable()
export class ${classNamePrefix}Repository {
  private items = [];

  constructor() {
    this.seed();
  }

  private seed() {
    // Seed using SEED constants
  }

  async findAll() { return this.items; }
  async findOneById(id: string) { return this.items.find((i: any) => i.id === id || i.${mod.name}_id === id); }
  async create(data: any) { this.items.push(data); return data; }
  async update(id: string, data: any) {
    const idx = this.items.findIndex((i: any) => i.id === id || i.${mod.name}_id === id);
    if(idx > -1) { this.items[idx] = { ...this.items[idx], ...data }; return this.items[idx]; }
    return null;
  }
}
`;
  fs.writeFileSync(path.join(modDir, `${mod.name}.${mod.name}.repository.ts`), repoCode);

});

console.log("Scaffold complete.");
