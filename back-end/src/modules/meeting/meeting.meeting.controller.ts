import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { MeetingService } from './meeting.meeting.service';
import { Roles } from '../../auth/roles.guard';
import {
  CurrentUser,
  CurrentUserId,
  CurrentUserCollegeId,
} from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/jwt-payload';
import { BaseResponseDto } from '../../common/dto/base-response.dto';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { FacultyCreateMeetingDto } from './dto/faculty-create-meeting.dto';
import { AcceptMeetingDto } from './dto/accept-meeting.dto';
import { DenyMeetingDto } from './dto/deny-meeting.dto';
import { AskRescheduleDto } from './dto/ask-reschedule.dto';
import { RequestRescheduleDto } from './dto/request-reschedule.dto';
import { HandleStudentRescheduleDto } from './dto/handle-student-reschedule.dto';
import { FacultyRescheduleDto } from './dto/faculty-reschedule.dto';
import { CompleteMeetingDto } from './dto/complete-meeting.dto';
import { MeetingType } from './enums/meeting-type.enum';

@ApiTags('Meetings')
@Controller('meetings')
export class MeetingController {
  constructor(private readonly meetingService: MeetingService) {}

  @Get('faculty-list')
  @Roles('student', 'faculty', 'admin', 'head', 'superadmin')
  @ApiOperation({ summary: 'Get list of available faculty members for meeting selection' })
  @ApiResponse({ status: 200, description: 'Faculty list returned successfully' })
  async getFacultyList(@CurrentUserCollegeId() collegeId: string | null) {
    const data = await this.meetingService.getFacultyList(collegeId);
    return new BaseResponseDto(true, data, 'Faculty list fetched successfully');
  }

  @Get('student-list')
  @Roles('faculty', 'admin', 'head', 'superadmin')
  @ApiOperation({ summary: 'Get list of available students for direct meeting scheduling' })
  @ApiResponse({ status: 200, description: 'Student list returned successfully' })
  async getStudentList(@CurrentUserCollegeId() collegeId: string | null) {
    const data = await this.meetingService.getStudentList(collegeId);
    return new BaseResponseDto(true, data, 'Student list fetched successfully');
  }

  @Get()
  @Roles('student', 'faculty', 'admin', 'head', 'superadmin')
  @ApiOperation({ summary: 'Get meetings for current user' })
  @ApiResponse({ status: 200, description: 'Meetings fetched successfully' })
  async getMeetingsDefault(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.meetingService.getMyMeetings(user);
    return new BaseResponseDto(true, data, 'Meetings fetched successfully');
  }

  @Get('my')
  @Roles('student', 'faculty', 'admin', 'head', 'superadmin')
  @ApiOperation({ summary: 'Get meetings for currently logged in student or faculty' })
  @ApiResponse({ status: 200, description: 'List of meetings' })
  async getMyMeetings(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.meetingService.getMyMeetings(user);
    return new BaseResponseDto(true, data, 'Meetings fetched successfully');
  }

  @Post()
  @Roles('student', 'faculty', 'admin', 'head')
  @ApiOperation({ summary: 'Create or schedule a meeting' })
  @ApiResponse({ status: 201, description: 'Meeting created or scheduled successfully' })
  async createMeeting(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentUserCollegeId() collegeId: string | null,
    @Body() body: any,
  ) {
    if (user.role === 'student') {
      const dto: CreateMeetingDto = {
        facultyId: body.facultyId || body.faculty_id,
        purpose: body.purpose || body.agenda || 'Student Meeting',
        description: body.description || body.agenda || '',
        requestedDate: body.requestedDate || body.date,
        requestedStartTime: body.requestedStartTime || body.startTime || body.time,
        requestedEndTime: body.requestedEndTime || body.endTime || '10:30',
        meetingType: (body.meetingType || body.mode || 'ONLINE').toUpperCase() as MeetingType,
        meetingPlatform: body.meetingPlatform,
        location: body.location,
        meetingLink: body.meetingLink || body.meeting_link,
      };
      const data = await this.meetingService.createMeeting(user.sub, collegeId, dto);
      return new BaseResponseDto(true, data, 'Meeting requested successfully');
    }

    // If faculty or admin creates directly:
    const dto: FacultyCreateMeetingDto = {
      studentId: body.studentId || body.student_id,
      purpose: body.purpose || body.agenda || 'Faculty Meeting',
      description: body.description || body.agenda || '',
      scheduledDate: body.scheduledDate || body.date,
      scheduledStartTime: body.scheduledStartTime || body.time || body.startTime,
      scheduledEndTime: body.scheduledEndTime || body.endTime || (body.time ? `${body.time.split(':')[0]}:45` : '10:45'),
      meetingType: (body.meetingType || body.mode || 'ONLINE').toUpperCase() as MeetingType,
      location: body.location,
      meetingLink: body.meetingLink || body.meeting_link || (body.mode === 'online' ? 'https://meet.google.com/new' : undefined),
      facultyRemarks: body.facultyRemarks || body.remarks,
    };
    const data = await this.meetingService.facultyCreateMeeting(user.sub, collegeId, dto);
    return new BaseResponseDto(true, data, 'Meeting scheduled successfully');
  }

  @Post('faculty-schedule')
  @Roles('faculty', 'admin', 'head')
  @ApiOperation({ summary: 'Faculty directly schedules a meeting with a student' })
  @ApiResponse({ status: 201, description: 'Meeting scheduled directly (status: SCHEDULED)' })
  @ApiBody({ type: FacultyCreateMeetingDto })
  async facultyCreateMeeting(
    @CurrentUserId() facultyId: string,
    @CurrentUserCollegeId() collegeId: string | null,
    @Body() dto: FacultyCreateMeetingDto,
  ) {
    const data = await this.meetingService.facultyCreateMeeting(facultyId, collegeId, dto);
    return new BaseResponseDto(true, data, 'Meeting scheduled successfully');
  }

  @Get('faculty/requests')
  @Roles('faculty', 'admin', 'head')
  @ApiOperation({ summary: 'Get pending meeting requests for current faculty' })
  @ApiResponse({ status: 200, description: 'List of pending meeting requests' })
  async getFacultyRequests(
    @CurrentUserId() facultyId: string,
    @CurrentUserCollegeId() collegeId: string | null,
  ) {
    const data = await this.meetingService.getFacultyRequests(facultyId, collegeId);
    return new BaseResponseDto(true, data, 'Pending meeting requests fetched successfully');
  }

  @Get(':id')
  @Roles('student', 'faculty', 'admin', 'head', 'superadmin')
  @ApiOperation({ summary: 'Get meeting detail by ID' })
  @ApiParam({ name: 'id', description: 'Meeting ID' })
  @ApiResponse({ status: 200, description: 'Meeting details' })
  async getMeetingById(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.meetingService.getMeetingById(id, user);
    return new BaseResponseDto(true, data, 'Meeting details fetched successfully');
  }

  @Patch(':id/accept')
  @Roles('faculty', 'admin', 'head')
  @ApiOperation({ summary: 'Faculty accepts a pending meeting request and confirms schedule' })
  @ApiParam({ name: 'id', description: 'Meeting ID' })
  @ApiBody({ type: AcceptMeetingDto })
  @ApiResponse({ status: 200, description: 'Meeting scheduled successfully' })
  async acceptMeeting(
    @Param('id') id: string,
    @CurrentUserId() facultyId: string,
    @CurrentUserCollegeId() collegeId: string | null,
    @Body() dto: AcceptMeetingDto,
  ) {
    const data = await this.meetingService.acceptMeeting(id, facultyId, collegeId, dto);
    return new BaseResponseDto(true, data, 'Meeting accepted and scheduled successfully');
  }

  @Patch(':id/deny')
  @Roles('faculty', 'admin', 'head')
  @ApiOperation({ summary: 'Faculty denies a pending meeting request' })
  @ApiParam({ name: 'id', description: 'Meeting ID' })
  @ApiBody({ type: DenyMeetingDto })
  @ApiResponse({ status: 200, description: 'Meeting denied' })
  async denyMeeting(
    @Param('id') id: string,
    @CurrentUserId() facultyId: string,
    @CurrentUserCollegeId() collegeId: string | null,
    @Body() dto: DenyMeetingDto,
  ) {
    const data = await this.meetingService.denyMeeting(id, facultyId, collegeId, dto);
    return new BaseResponseDto(true, data, 'Meeting denied');
  }

  @Patch(':id/ask-reschedule')
  @Roles('faculty', 'admin', 'head')
  @ApiOperation({ summary: 'Faculty proposes an alternative date/time for a pending meeting' })
  @ApiParam({ name: 'id', description: 'Meeting ID' })
  @ApiBody({ type: AskRescheduleDto })
  @ApiResponse({ status: 200, description: 'Reschedule proposal sent to student' })
  async askReschedule(
    @Param('id') id: string,
    @CurrentUserId() facultyId: string,
    @CurrentUserCollegeId() collegeId: string | null,
    @Body() dto: AskRescheduleDto,
  ) {
    const data = await this.meetingService.askReschedule(id, facultyId, collegeId, dto);
    return new BaseResponseDto(true, data, 'Reschedule proposal sent to student');
  }

  @Patch(':id/accept-reschedule')
  @Roles('student')
  @ApiOperation({ summary: 'Student accepts faculty proposed reschedule time' })
  @ApiParam({ name: 'id', description: 'Meeting ID' })
  @ApiResponse({ status: 200, description: 'Proposed schedule confirmed' })
  async studentAcceptReschedule(
    @Param('id') id: string,
    @CurrentUserId() studentId: string,
    @CurrentUserCollegeId() collegeId: string | null,
  ) {
    const data = await this.meetingService.studentAcceptReschedule(id, studentId, collegeId);
    return new BaseResponseDto(true, data, 'Reschedule accepted; meeting confirmed');
  }

  @Patch(':id/decline-reschedule')
  @Roles('student')
  @ApiOperation({ summary: 'Student declines faculty proposed reschedule time' })
  @ApiParam({ name: 'id', description: 'Meeting ID' })
  @ApiResponse({ status: 200, description: 'Proposal declined' })
  async studentDeclineReschedule(
    @Param('id') id: string,
    @CurrentUserId() studentId: string,
    @CurrentUserCollegeId() collegeId: string | null,
  ) {
    const data = await this.meetingService.studentDeclineReschedule(id, studentId, collegeId);
    return new BaseResponseDto(true, data, 'Reschedule proposal declined');
  }

  @Patch(':id/request-reschedule')
  @Roles('student')
  @ApiOperation({ summary: 'Student requests reschedule for an already scheduled meeting' })
  @ApiParam({ name: 'id', description: 'Meeting ID' })
  @ApiBody({ type: RequestRescheduleDto })
  @ApiResponse({ status: 200, description: 'Reschedule requested' })
  async studentRequestReschedule(
    @Param('id') id: string,
    @CurrentUserId() studentId: string,
    @CurrentUserCollegeId() collegeId: string | null,
    @Body() dto: RequestRescheduleDto,
  ) {
    const data = await this.meetingService.studentRequestReschedule(id, studentId, collegeId, dto);
    return new BaseResponseDto(true, data, 'Reschedule request sent to faculty');
  }

  @Patch(':id/handle-student-reschedule')
  @Roles('faculty', 'admin', 'head')
  @ApiOperation({ summary: 'Faculty accepts, denies, or counter-proposes student reschedule request' })
  @ApiParam({ name: 'id', description: 'Meeting ID' })
  @ApiBody({ type: HandleStudentRescheduleDto })
  @ApiResponse({ status: 200, description: 'Reschedule request handled' })
  async handleStudentReschedule(
    @Param('id') id: string,
    @CurrentUserId() facultyId: string,
    @CurrentUserCollegeId() collegeId: string | null,
    @Body() dto: HandleStudentRescheduleDto,
  ) {
    const data = await this.meetingService.handleStudentReschedule(id, facultyId, collegeId, dto);
    return new BaseResponseDto(true, data, 'Student reschedule request processed');
  }

  @Patch(':id/reschedule')
  @Roles('faculty', 'admin', 'head')
  @ApiOperation({ summary: 'Faculty directly updates schedule of an already scheduled meeting' })
  @ApiParam({ name: 'id', description: 'Meeting ID' })
  @ApiBody({ type: FacultyRescheduleDto })
  @ApiResponse({ status: 200, description: 'Meeting rescheduled directly' })
  async facultyReschedule(
    @Param('id') id: string,
    @CurrentUserId() facultyId: string,
    @CurrentUserCollegeId() collegeId: string | null,
    @Body() dto: FacultyRescheduleDto,
  ) {
    const data = await this.meetingService.facultyReschedule(id, facultyId, collegeId, dto);
    return new BaseResponseDto(true, data, 'Meeting rescheduled successfully');
  }

  @Patch(':id/complete')
  @Roles('faculty', 'admin', 'head')
  @ApiOperation({ summary: 'Faculty marks scheduled meeting as COMPLETED and records outcomes' })
  @ApiParam({ name: 'id', description: 'Meeting ID' })
  @ApiBody({ type: CompleteMeetingDto })
  @ApiResponse({ status: 200, description: 'Meeting completed' })
  async completeMeeting(
    @Param('id') id: string,
    @CurrentUserId() facultyId: string,
    @CurrentUserCollegeId() collegeId: string | null,
    @Body() dto: CompleteMeetingDto,
  ) {
    const data = await this.meetingService.completeMeeting(id, facultyId, collegeId, dto);
    return new BaseResponseDto(true, data, 'Meeting marked as completed');
  }

  @Patch(':id/cancel')
  @Roles('student', 'faculty', 'admin', 'head')
  @ApiOperation({ summary: 'Cancel a pending or scheduled meeting' })
  @ApiParam({ name: 'id', description: 'Meeting ID' })
  @ApiResponse({ status: 200, description: 'Meeting cancelled' })
  async cancelMeeting(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @CurrentUserCollegeId() collegeId: string | null,
    @Body('reason') reason?: string,
  ) {
    const data = await this.meetingService.cancelMeeting(id, user.sub, user.role, collegeId, reason);
    return new BaseResponseDto(true, data, 'Meeting cancelled');
  }
}
