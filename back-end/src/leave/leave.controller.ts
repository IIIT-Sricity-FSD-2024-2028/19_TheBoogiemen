import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/jwt-payload';
import { InMemoryDbService } from '../database/in-memory-db.service';
import { campusScope } from '../core/scope';
import { LeaveService } from './leave.service';

@ApiTags('Leave')
@ApiBearerAuth()
@Controller('leave')
export class LeaveController {
  constructor(private readonly leave: LeaveService, private readonly db: InMemoryDbService) {}

  private s(u: AuthenticatedUser) {
    return campusScope(this.db, u);
  }

  @Get()
  @Roles('student', 'faculty', 'head', 'DEPARTMENT_ADMIN_HOD', 'superadmin', 'admin', 'INSTITUTE_SUPER_ADMIN')
  list(@CurrentUser() u: AuthenticatedUser, @Query() q: any) {
    return this.leave.list(this.s(u), q);
  }

  @Post()
  @Roles('student', 'faculty', 'head', 'DEPARTMENT_ADMIN_HOD')
  apply(@CurrentUser() u: AuthenticatedUser, @Body() body: any) {
    return this.leave.apply(this.s(u), body);
  }

  @Post(':id/cancel')
  @Roles('student', 'faculty', 'head', 'DEPARTMENT_ADMIN_HOD')
  @HttpCode(200)
  cancel(@CurrentUser() u: AuthenticatedUser, @Param('id') id: string) {
    return this.leave.cancel(this.s(u), id);
  }

  @Post(':id/decide')
  @Roles('head', 'DEPARTMENT_ADMIN_HOD', 'superadmin', 'admin', 'INSTITUTE_SUPER_ADMIN')
  @HttpCode(200)
  decide(@CurrentUser() u: AuthenticatedUser, @Param('id') id: string, @Body() body: any) {
    return this.leave.decide(this.s(u), id, body);
  }
}
