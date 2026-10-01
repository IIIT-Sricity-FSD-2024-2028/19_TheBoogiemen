import { Body, Controller, Get, HttpCode, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/jwt-payload';
import { InMemoryDbService } from '../database/in-memory-db.service';
import { campusScope } from '../core/scope';
import { CollegeService } from './college.service';

const ADMINS = ['spoc', 'superadmin', 'admin', 'INSTITUTE_SUPER_ADMIN'] as const;
const PEOPLE_MANAGERS = [...ADMINS, 'head', 'DEPARTMENT_ADMIN_HOD'] as const;

@ApiTags('College')
@ApiBearerAuth()
@Controller('college')
export class CollegeController {
  constructor(private readonly college: CollegeService, private readonly db: InMemoryDbService) {}

  private scope(user: AuthenticatedUser) {
    return campusScope(this.db, user);
  }

  @Get('settings')
  @ApiOperation({ summary: 'College profile, structure, grading, ID formats and custom fields' })
  settings(@CurrentUser() user: AuthenticatedUser) {
    return this.college.getSettings(this.scope(user));
  }

  @Put('settings/profile')
  @Roles(...ADMINS)
  profile(@CurrentUser() user: AuthenticatedUser, @Body() body: any) {
    return this.college.updateProfile(this.scope(user), body);
  }

  @Put('settings/structure')
  @Roles(...ADMINS)
  structure(@CurrentUser() user: AuthenticatedUser, @Body() body: any) {
    return this.college.updateStructure(this.scope(user), body);
  }

  @Put('settings/grading')
  @Roles(...ADMINS)
  grading(@CurrentUser() user: AuthenticatedUser, @Body() body: any) {
    return this.college.updateGrading(this.scope(user), body);
  }

  @Put('settings/id-formats')
  @Roles(...ADMINS)
  idFormats(@CurrentUser() user: AuthenticatedUser, @Body() body: any) {
    return this.college.updateIdFormats(this.scope(user), body);
  }

  @Put('settings/custom-fields')
  @Roles(...ADMINS)
  customFields(@CurrentUser() user: AuthenticatedUser, @Body() body: { custom_fields: any[] }) {
    return this.college.updateCustomFields(this.scope(user), body?.custom_fields);
  }

  @Post('settings/complete-setup')
  @Roles('spoc')
  @HttpCode(200)
  completeSetup(@CurrentUser() user: AuthenticatedUser) {
    return this.college.completeSetup(this.scope(user));
  }

  @Post('id-format/preview')
  @Roles(...ADMINS)
  @HttpCode(200)
  preview(@Body() body: { template: any[] }) {
    return this.college.previewFormat(body?.template);
  }

  @Get('overview')
  @Roles(...ADMINS)
  @ApiOperation({ summary: 'Plan, seat usage, people counts and setup progress' })
  overview(@CurrentUser() user: AuthenticatedUser) {
    return this.college.overview(this.scope(user));
  }

  @Get('departments')
  departments(@CurrentUser() user: AuthenticatedUser) {
    return this.college.departments(this.scope(user));
  }

  @Post('departments')
  @Roles(...ADMINS)
  createDepartment(@CurrentUser() user: AuthenticatedUser, @Body() body: any) {
    return this.college.createDepartment(this.scope(user), body);
  }

  @Patch('departments/:id')
  @Roles(...ADMINS)
  updateDepartment(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: any) {
    return this.college.updateDepartment(this.scope(user), id, body);
  }

  @Get('people')
  @Roles(...PEOPLE_MANAGERS, 'FINANCE_ADMIN', 'faculty')
  @ApiOperation({ summary: 'People of the college (HOD: own department; finance/faculty: students only)' })
  people(@CurrentUser() user: AuthenticatedUser, @Query() q: any) {
    return this.college.listPeople(this.scope(user), q);
  }

  @Get('people/:id')
  @Roles(...PEOPLE_MANAGERS, 'FINANCE_ADMIN')
  person(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.college.getPerson(this.scope(user), id);
  }

  @Post('people')
  @Roles(...PEOPLE_MANAGERS)
  @ApiOperation({ summary: 'Add one person; returns a one-time temporary password' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: any) {
    return this.college.createPerson(this.scope(user), body);
  }

  @Post('people/import')
  @Roles(...PEOPLE_MANAGERS)
  @HttpCode(200)
  @ApiOperation({ summary: 'CSV import: dry_run validates, otherwise creates valid rows' })
  import(@CurrentUser() user: AuthenticatedUser, @Body() body: { rows: any[]; dry_run?: boolean }) {
    return this.college.importPeople(this.scope(user), body?.rows, body?.dry_run !== false);
  }

  @Patch('people/:id')
  @Roles(...PEOPLE_MANAGERS)
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() body: any) {
    return this.college.updatePerson(this.scope(user), id, body);
  }

  @Post('people/:id/deactivate')
  @Roles(...PEOPLE_MANAGERS)
  @HttpCode(200)
  deactivate(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.college.setStatus(this.scope(user), id, 'inactive');
  }

  @Post('people/:id/reactivate')
  @Roles(...PEOPLE_MANAGERS)
  @HttpCode(200)
  reactivate(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.college.setStatus(this.scope(user), id, 'active');
  }

  @Post('people/:id/reset-password')
  @Roles(...PEOPLE_MANAGERS)
  @HttpCode(200)
  resetPassword(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.college.resetPassword(this.scope(user), id);
  }
}
