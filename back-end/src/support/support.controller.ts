import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/jwt-payload';
import { InMemoryDbService } from '../database/in-memory-db.service';
import { campusScope } from '../core/scope';
import { CATEGORIES, PRIORITIES, SLA_HOURS, SupportService } from './support.service';

const RAISERS = ['spoc', 'superadmin', 'admin', 'INSTITUTE_SUPER_ADMIN', 'head', 'DEPARTMENT_ADMIN_HOD', 'FINANCE_ADMIN'] as const;
const STAFF = ['PLATFORM_SUPER_ADMIN', 'PLATFORM_SUPPORT_MANAGER', 'PLATFORM_TECH_SUPPORT', 'PLATFORM_SUPPORT_AGENT', 'PLATFORM_SALES_SUPPORT'] as const;

/** College staff raising and following their own tickets. */
@ApiTags('Support (college)')
@ApiBearerAuth()
@Controller('support')
export class CollegeSupportController {
  constructor(private readonly support: SupportService, private readonly db: InMemoryDbService) {}

  @Get('meta')
  meta() {
    return { categories: CATEGORIES, priorities: PRIORITIES, sla_hours: SLA_HOURS };
  }

  @Get('tickets')
  @Roles(...RAISERS)
  list(@CurrentUser() u: AuthenticatedUser) { return this.support.collegeList(campusScope(this.db, u)); }

  @Post('tickets')
  @Roles(...RAISERS)
  create(@CurrentUser() u: AuthenticatedUser, @Body() b: any) { return this.support.create(campusScope(this.db, u), b); }

  @Get('tickets/:id')
  @Roles(...RAISERS)
  get(@CurrentUser() u: AuthenticatedUser, @Param('id') id: string) { return this.support.collegeGet(campusScope(this.db, u), id); }

  @Post('tickets/:id/reply')
  @Roles(...RAISERS)
  @HttpCode(200)
  reply(@CurrentUser() u: AuthenticatedUser, @Param('id') id: string, @Body() b: { text: string }) { return this.support.collegeReply(campusScope(this.db, u), id, b?.text); }

  @Post('tickets/:id/reopen')
  @Roles(...RAISERS)
  @HttpCode(200)
  reopen(@CurrentUser() u: AuthenticatedUser, @Param('id') id: string) { return this.support.reopen(campusScope(this.db, u), id); }

  @Post('tickets/:id/close')
  @Roles(...RAISERS)
  @HttpCode(200)
  close(@CurrentUser() u: AuthenticatedUser, @Param('id') id: string) { return this.support.close(campusScope(this.db, u), id); }
}

/** Platform support staff, with level-based rules. */
@ApiTags('Support (platform)')
@ApiBearerAuth()
@Controller('platform')
export class PlatformSupportController {
  constructor(private readonly support: SupportService) {}

  private a(u: AuthenticatedUser) { return this.support.actor(u); }

  @Get('summary')
  @Roles(...STAFF)
  summary(@CurrentUser() u: AuthenticatedUser) { return this.support.summary(this.a(u)); }

  @Get('tickets')
  @Roles(...STAFF)
  list(@CurrentUser() u: AuthenticatedUser, @Query() q: any) { return this.support.list(this.a(u), q); }

  @Get('tickets/:id')
  @Roles(...STAFF)
  get(@CurrentUser() u: AuthenticatedUser, @Param('id') id: string) { return this.support.get(this.a(u), id); }

  @Post('tickets/:id/reply')
  @Roles(...STAFF)
  @HttpCode(200)
  reply(@CurrentUser() u: AuthenticatedUser, @Param('id') id: string, @Body() b: any) { return this.support.reply(this.a(u), id, b); }

  @Post('tickets/:id/assign')
  @Roles(...STAFF)
  @HttpCode(200)
  assign(@CurrentUser() u: AuthenticatedUser, @Param('id') id: string, @Body() b: { assignee_id: string }) { return this.support.assign(this.a(u), id, b?.assignee_id); }

  @Post('tickets/:id/escalate')
  @Roles(...STAFF)
  @HttpCode(200)
  escalate(@CurrentUser() u: AuthenticatedUser, @Param('id') id: string, @Body() b: any) { return this.support.escalate(this.a(u), id, b); }

  @Post('tickets/:id/status')
  @Roles(...STAFF)
  @HttpCode(200)
  status(@CurrentUser() u: AuthenticatedUser, @Param('id') id: string, @Body() b: { status: string }) { return this.support.setStatus(this.a(u), id, b?.status); }

  @Post('tickets/:id/priority')
  @Roles(...STAFF)
  @HttpCode(200)
  priority(@CurrentUser() u: AuthenticatedUser, @Param('id') id: string, @Body() b: { priority: string }) { return this.support.setPriority(this.a(u), id, b?.priority); }

  @Get('team')
  @Roles(...STAFF)
  team() { return this.support.team(); }

  @Post('team')
  @Roles('PLATFORM_SUPER_ADMIN')
  addStaff(@CurrentUser() u: AuthenticatedUser, @Body() b: any) { return this.support.addStaff(this.a(u), b); }

  @Patch('team/:id')
  @Roles('PLATFORM_SUPER_ADMIN')
  updateStaff(@CurrentUser() u: AuthenticatedUser, @Param('id') id: string, @Body() b: any) { return this.support.updateStaff(this.a(u), id, b); }

  @Get('institutions')
  @Roles('PLATFORM_SUPER_ADMIN', 'PLATFORM_SUPPORT_MANAGER', 'PLATFORM_SALES_SUPPORT', 'PLATFORM_TECH_SUPPORT')
  institutions() { return this.support.institutions(); }

  @Patch('institutions/:id')
  @Roles('PLATFORM_SUPER_ADMIN')
  updateInstitution(@CurrentUser() u: AuthenticatedUser, @Param('id') id: string, @Body() b: any) { return this.support.updateInstitution(this.a(u), id, b); }

  @Get('onboarding')
  @Roles('PLATFORM_SUPER_ADMIN', 'PLATFORM_SUPPORT_MANAGER', 'PLATFORM_SALES_SUPPORT')
  onboarding() { return this.support.onboarding(); }

  @Get('analytics')
  @Roles('PLATFORM_SUPER_ADMIN', 'PLATFORM_SUPPORT_MANAGER')
  analytics() { return this.support.analytics(); }
}
