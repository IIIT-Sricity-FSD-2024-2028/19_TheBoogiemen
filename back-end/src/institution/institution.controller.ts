import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { InstitutionService } from './institution.service';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiBody } from '@nestjs/swagger';

@ApiTags('Institution Setup')
@Controller('institution')
export class InstitutionController {
  constructor(private readonly institutionService: InstitutionService) {}

  @Post('setup')
  @Roles('institution_owner', 'institution_admin')
  @ApiOperation({ summary: 'Complete first-run institution setup' })
  @ApiHeader({ name: 'x-organization-id', description: 'Tenant Context' })
  @ApiHeader({ name: 'role', description: 'Must be institution_owner or institution_admin' })
  async setupInstitution(@Req() req: any, @Body() body: any) {
    return this.institutionService.setupInstitution(req.tenantId, body);
  }

  @Post('import/students')
  @Roles('institution_owner', 'institution_admin', 'academic_head')
  @ApiOperation({ summary: 'Import students via JSON array (simulating CSV parsing)' })
  @ApiHeader({ name: 'x-organization-id', description: 'Tenant Context' })
  @ApiHeader({ name: 'role', description: 'Must be institution_owner or admin' })
  @ApiBody({ schema: { type: 'array', items: { type: 'object' } } })
  async importStudents(@Req() req: any, @Body() body: any[]) {
    return this.institutionService.importStudents(req.tenantId, body);
  }

  @Post('import/faculty')
  @Roles('institution_owner', 'institution_admin', 'academic_head')
  @ApiOperation({ summary: 'Import faculty via JSON array (simulating CSV parsing)' })
  @ApiHeader({ name: 'x-organization-id', description: 'Tenant Context' })
  @ApiHeader({ name: 'role', description: 'Must be institution_owner or admin' })
  @ApiBody({ schema: { type: 'array', items: { type: 'object' } } })
  async importFaculty(@Req() req: any, @Body() body: any[]) {
    return this.institutionService.importFaculty(req.tenantId, body);
  }
}
