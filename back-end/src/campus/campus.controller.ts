import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/jwt-payload';
import { InMemoryDbService } from '../database/in-memory-db.service';
import { RequiresModule } from '../common/guards/requires-module.guard';
import { campusScope } from '../core/scope';
import { CampusService } from './campus.service';

const DIRECTOR = ['superadmin', 'admin', 'INSTITUTE_SUPER_ADMIN'] as const;
const HOD = ['head', 'DEPARTMENT_ADMIN_HOD'] as const;

@ApiTags('Campus')
@ApiBearerAuth()
@Controller()
export class CampusController {
  constructor(private readonly campus: CampusService, private readonly db: InMemoryDbService) {}

  private s(u: AuthenticatedUser) {
    return campusScope(this.db, u);
  }

  // Events
  @Get('events')
  events(@CurrentUser() u: AuthenticatedUser) { return this.campus.events(this.s(u)); }

  @Post('events')
  @Roles(...DIRECTOR, ...HOD)
  createEvent(@CurrentUser() u: AuthenticatedUser, @Body() b: any) { return this.campus.createEvent(this.s(u), b); }

  @Put('events/:id')
  @Roles(...DIRECTOR, ...HOD)
  updateEvent(@CurrentUser() u: AuthenticatedUser, @Param('id') id: string, @Body() b: any) { return this.campus.updateEvent(this.s(u), id, b); }

  @Delete('events/:id')
  @Roles(...DIRECTOR, ...HOD)
  deleteEvent(@CurrentUser() u: AuthenticatedUser, @Param('id') id: string) { return this.campus.deleteEvent(this.s(u), id); }

  // Resources and bookings
  @Get('resources')
  @Roles('faculty', ...HOD, ...DIRECTOR)
  resources(@CurrentUser() u: AuthenticatedUser) { return this.campus.resources(this.s(u)); }

  @Post('resources')
  @Roles(...DIRECTOR)
  createResource(@CurrentUser() u: AuthenticatedUser, @Body() b: any) { return this.campus.createResource(this.s(u), b); }

  @Patch('resources/:id')
  @Roles(...DIRECTOR)
  updateResource(@CurrentUser() u: AuthenticatedUser, @Param('id') id: string, @Body() b: any) { return this.campus.updateResource(this.s(u), id, b); }

  @Get('resource-bookings')
  @Roles('faculty', ...HOD, ...DIRECTOR)
  bookings(@CurrentUser() u: AuthenticatedUser, @Query() q: any) { return this.campus.bookings(this.s(u), q); }

  @Post('resource-bookings')
  @Roles('faculty', ...HOD)
  requestBooking(@CurrentUser() u: AuthenticatedUser, @Body() b: any) { return this.campus.requestBooking(this.s(u), b); }

  @Post('resource-bookings/:id/decide')
  @Roles(...HOD, ...DIRECTOR)
  @HttpCode(200)
  decideBooking(@CurrentUser() u: AuthenticatedUser, @Param('id') id: string, @Body() b: any) { return this.campus.decideBooking(this.s(u), id, b); }

  // Discussions (forum module)
  @Get('discussions')
  @RequiresModule('forum')
  @Roles('student', 'faculty', ...HOD, ...DIRECTOR)
  discussions(@CurrentUser() u: AuthenticatedUser) { return this.campus.discussions(this.s(u)); }

  @Get('discussions/:id')
  @RequiresModule('forum')
  @Roles('student', 'faculty', ...HOD, ...DIRECTOR)
  discussion(@CurrentUser() u: AuthenticatedUser, @Param('id') id: string) { return this.campus.discussion(this.s(u), id); }

  @Post('discussions')
  @RequiresModule('forum')
  @Roles('student', 'faculty', ...HOD)
  createPost(@CurrentUser() u: AuthenticatedUser, @Body() b: any) { return this.campus.createPost(this.s(u), b); }

  @Post('discussions/:id/replies')
  @RequiresModule('forum')
  @Roles('student', 'faculty', ...HOD)
  reply(@CurrentUser() u: AuthenticatedUser, @Param('id') id: string, @Body() b: any) { return this.campus.reply(this.s(u), id, b); }

  // Research (research module)
  @Get('research')
  @RequiresModule('research')
  @Roles('student', 'faculty', ...HOD, ...DIRECTOR)
  research(@CurrentUser() u: AuthenticatedUser) { return this.campus.research(this.s(u)); }

  @Post('research')
  @RequiresModule('research')
  @Roles('faculty', ...HOD)
  createProject(@CurrentUser() u: AuthenticatedUser, @Body() b: any) { return this.campus.createProject(this.s(u), b); }

  @Patch('research/:id')
  @RequiresModule('research')
  @Roles('student', 'faculty', ...HOD)
  updateProject(@CurrentUser() u: AuthenticatedUser, @Param('id') id: string, @Body() b: any) { return this.campus.updateProject(this.s(u), id, b); }

  // Meetings
  @Get('meetings')
  @Roles('student', 'faculty', ...HOD)
  meetings(@CurrentUser() u: AuthenticatedUser) { return this.campus.meetings(this.s(u)); }

  @Post('meetings')
  @Roles('faculty', ...HOD)
  createMeeting(@CurrentUser() u: AuthenticatedUser, @Body() b: any) { return this.campus.createMeeting(this.s(u), b); }
}
