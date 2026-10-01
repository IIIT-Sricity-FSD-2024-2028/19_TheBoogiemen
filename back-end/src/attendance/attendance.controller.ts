import { Body, Controller, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/jwt-payload';
import { InMemoryDbService } from '../database/in-memory-db.service';
import { campusScope } from '../core/scope';
import { AttendanceService } from './attendance.service';

@ApiTags('Attendance')
@ApiBearerAuth()
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService, private readonly db: InMemoryDbService) {}

  private s(u: AuthenticatedUser) {
    return campusScope(this.db, u);
  }

  @Get('session')
  @Roles('faculty', 'head', 'DEPARTMENT_ADMIN_HOD', 'superadmin', 'admin', 'INSTITUTE_SUPER_ADMIN')
  session(@CurrentUser() u: AuthenticatedUser, @Query('course_section_id') id: string, @Query('date') date: string) {
    return this.attendance.session(this.s(u), id, date);
  }

  @Put('session')
  @Roles('faculty', 'head', 'DEPARTMENT_ADMIN_HOD')
  mark(@CurrentUser() u: AuthenticatedUser, @Body() body: any) {
    return this.attendance.mark(this.s(u), body);
  }

  @Get('me')
  @Roles('student')
  mine(@CurrentUser() u: AuthenticatedUser) {
    return this.attendance.mine(this.s(u));
  }

  @Get('corrections')
  @Roles('student', 'faculty', 'head', 'DEPARTMENT_ADMIN_HOD', 'superadmin', 'admin', 'INSTITUTE_SUPER_ADMIN')
  corrections(@CurrentUser() u: AuthenticatedUser, @Query() q: any) {
    return this.attendance.corrections(this.s(u), q);
  }

  @Post('corrections')
  @Roles('student')
  request(@CurrentUser() u: AuthenticatedUser, @Body() body: any) {
    return this.attendance.requestCorrection(this.s(u), body);
  }

  @Post('corrections/:id/decide')
  @Roles('faculty', 'head', 'DEPARTMENT_ADMIN_HOD')
  @HttpCode(200)
  decide(@CurrentUser() u: AuthenticatedUser, @Param('id') id: string, @Body() body: any) {
    return this.attendance.decide(this.s(u), id, body);
  }
}
