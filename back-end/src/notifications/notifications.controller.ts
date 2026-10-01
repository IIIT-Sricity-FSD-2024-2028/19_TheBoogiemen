import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/jwt-payload';
import { Roles } from '../auth/roles.guard';

class MarkReadDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  ids: string[];
}

class CreateAnnouncementDto {
  @ApiProperty({ example: 'Mid-semester exams' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title: string;

  @ApiProperty({ example: 'Exams begin on 10 October. Timetable is on the notice board.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message: string;

  @ApiProperty({ enum: ['all', 'student', 'faculty', 'staff'] })
  @IsIn(['all', 'student', 'faculty', 'staff'])
  audience: 'all' | 'student' | 'faculty' | 'staff';

  @ApiProperty({ required: false, description: 'Faculty: the section whose students receive it' })
  @IsOptional()
  @IsString()
  course_section_id?: string;
}

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller()
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get('notifications/me')
  @ApiOperation({ summary: 'Notifications for the signed-in user, derived from real records' })
  list(@CurrentUser() user: AuthenticatedUser) {
    const data = this.notifications.listFor(user);
    return { success: true, data, unread: data.filter((n) => !n.read).length };
  }

  @Post('notifications/read')
  @HttpCode(200)
  @ApiOperation({ summary: 'Mark notifications as read' })
  @ApiBody({ type: MarkReadDto })
  markRead(@CurrentUser() user: AuthenticatedUser, @Body() body: MarkReadDto) {
    return this.notifications.markRead(user.sub, body.ids);
  }

  @Get('announcements')
  @ApiOperation({ summary: 'Announcements addressed to the caller' })
  announcements(@CurrentUser() user: AuthenticatedUser) {
    return { success: true, data: this.notifications.listAnnouncements(user) };
  }

  @Get('announcements/sent')
  @Roles('faculty', 'head', 'DEPARTMENT_ADMIN_HOD', 'superadmin', 'admin', 'INSTITUTE_SUPER_ADMIN')
  sent(@CurrentUser() user: AuthenticatedUser) {
    return { success: true, data: this.notifications.sentAnnouncements(user) };
  }

  @Post('announcements')
  @Roles('faculty', 'head', 'DEPARTMENT_ADMIN_HOD', 'admin', 'superadmin', 'INSTITUTE_SUPER_ADMIN')
  @ApiOperation({ summary: 'Publish an announcement (faculty: to one of their sections; HOD: department; director: college)' })
  @ApiBody({ type: CreateAnnouncementDto })
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateAnnouncementDto) {
    return this.notifications.createAnnouncement(user, body);
  }
}
