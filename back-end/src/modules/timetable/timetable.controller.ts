import { Controller, Post, Get, Query, Body, Headers } from '@nestjs/common';
import { TimetableService } from './timetable.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Roles } from '../../auth/roles.guard';

@ApiTags('Timetable Generation')
@Controller('timetable')
export class TimetableController {
  constructor(private readonly timetableService: TimetableService) {}

  @Post('generate')
  @Roles('admin', 'superadmin', 'head', 'INSTITUTE_SUPER_ADMIN', 'DEPARTMENT_ADMIN_HOD')
  @ApiOperation({ summary: 'Generate conflict-free weekly timetable (Issue #49)' })
  async generateTimetable(
    @Body('section') section: string = 'A',
    @Body('reset') reset: boolean = true
  ) {
    return this.timetableService.generateSectionTimetable(section, reset);
  }

  @Get('clashes')
  @ApiOperation({ summary: 'Check for room and faculty timetable clashes' })
  async checkTimetableClashes() {
    return this.timetableService.checkClashes();
  }
}
