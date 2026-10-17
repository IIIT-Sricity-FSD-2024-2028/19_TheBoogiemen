import { Controller, Get, Post, Put, Body, Query, Param } from '@nestjs/common';
import { AdminService } from './admin.service';
import { Roles } from '../auth/roles.guard';
import { CurrentUserCollegeId } from '../common/decorators/current-user.decorator';
import { RequiresModule } from '../common/guards/requires-module.guard';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('leave')
  @Roles('admin', 'head')
  @ApiOperation({ summary: 'Get all leave applications' })
  async getLeaves(@CurrentUserCollegeId() collegeId: string | null) {
    return this.adminService.getLeaves(collegeId);
  }

  @Put('leave/:id')
  @Roles('admin', 'head')
  @ApiOperation({ summary: 'Update leave application status' })
  async updateLeaveStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @CurrentUserCollegeId() collegeId: string | null,
  ) {
    return this.adminService.updateLeaveStatus(id, status, collegeId);
  }

  @Get('timetable')
  @Roles('student', 'faculty', 'admin', 'head', 'superadmin')
  @ApiOperation({ summary: 'Get timetable for a section' })
  async getTimetable(
    @Query('section') section: string = 'A',
    @CurrentUserCollegeId() collegeId: string | null,
  ) {
    return this.adminService.getTimetable(section, collegeId);
  }

  @Get('events')
  @Roles('student', 'faculty', 'admin', 'head', 'superadmin')
  @ApiOperation({ summary: 'Get all events' })
  async getEvents(@CurrentUserCollegeId() collegeId: string | null) {
    return this.adminService.getEvents(collegeId);
  }

  @Post('events')
  @Roles('admin')
  @ApiOperation({ summary: 'Create a new event' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  async createEvent(
    @Body() body: any,
    @CurrentUserCollegeId() collegeId: string | null,
  ) {
    return this.adminService.createEvent(body, collegeId);
  }

  @Get('discussions')
  @Roles('student', 'faculty', 'admin', 'head', 'superadmin')
  @RequiresModule('forum')
  @ApiOperation({ summary: 'Get all discussion posts' })
  async getDiscussions(@CurrentUserCollegeId() collegeId: string | null) {
    return this.adminService.getDiscussions(collegeId);
  }
}
