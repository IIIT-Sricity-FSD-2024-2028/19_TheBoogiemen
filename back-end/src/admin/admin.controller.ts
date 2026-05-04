import { Controller, Get, Post, Put, Body, Query, Param } from '@nestjs/common';
import { AdminService } from './admin.service';
import { Roles } from '../auth/roles.guard';
import { ApiTags, ApiOperation , ApiBody} from '@nestjs/swagger';

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('leave')
  @Roles('admin', 'head')
  @ApiOperation({ summary: 'Get all leave applications' })
  async getLeaves() {
    return this.adminService.getLeaves();
  }

  @Put('leave/:id')
  @Roles('admin', 'head')
  @ApiOperation({ summary: 'Update leave application status' })
  async updateLeaveStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.adminService.updateLeaveStatus(id, status);
  }

  @Get('timetable')
  @ApiOperation({ summary: 'Get timetable for a section' })
  async getTimetable(@Query('section') section: string = 'A') {
    return this.adminService.getTimetable(section);
  }

  @Get('events')
  @ApiOperation({ summary: 'Get all events' })
  async getEvents() {
    return this.adminService.getEvents();
  }

  @Post('events')
  @Roles('admin')
  @ApiOperation({ summary: 'Create a new event' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  async createEvent(@Body() body: any) {
    return this.adminService.createEvent(body);
  }

  @Get('discussions')
  @ApiOperation({ summary: 'Get all discussion posts' })
  async getDiscussions() {
    return this.adminService.getDiscussions();
  }
}
