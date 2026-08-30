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
import { CurrentUser, CurrentUserId } from '../../common/decorators/current-user.decorator';
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

@ApiTags('Meetings')
@Controller('meetings')
export class MeetingController {
  constructor(private readonly meetingService: MeetingService) {}

  @Get('faculty-list')
  @Roles('student', 'faculty')
  @ApiOperation({ summary: 'Get list of available faculty members for meeting selection' })
  @ApiResponse({ status: 200, description: 'Faculty list returned successfully' })
  async getFacultyList() {
    const data = await this.meetingService.getFacultyList();
    return new BaseResponseDto(true, data, 'Faculty list fetched successfully');
  }

  @Get('student-list')
  @Roles('faculty')
  @ApiOperation({ summary: 'Get list of available students for direct meeting scheduling' })
  @ApiResponse({ status: 200, description: 'Student list returned successfully' })
  async getStudentList() {
    const data = await this.meetingService.getStudentList();
    return new BaseResponseDto(true, data, 'Student list fetched successfully');
  }

  @Post()
  @Roles('student')
  @ApiOperation({ summary: 'Student requests a new meeting with a faculty member' })
  @ApiResponse({ status: 201, description: 'Meeting requested successfully (status: PENDING)' })
  @ApiBody({ type: CreateMeetingDto })
  async createMeeting(
    @CurrentUserId() studentId: string,
    @Body() dto: CreateMeetingDto,
  ) {
    const data = await this.meetingService.createMeeting(studentId, dto);
    return new BaseResponseDto(true, data, 'Meeting requested successfully');
  }

  @Post('faculty-schedule')
  @Roles('faculty')
  @ApiOperation({ summary: 'Faculty directly schedules a meeting with a student' })
  @ApiResponse({ status: 201, description: 'Meeting scheduled directly (status: SCHEDULED)' })
  @ApiBody({ type: FacultyCreateMeetingDto })
  async facultyCreateMeeting(
    @CurrentUserId() facultyId: string,
    @Body() dto: FacultyCreateMeetingDto,
  ) {
    const data = await this.meetingService.facultyCreateMeeting(facultyId, dto);
    return new BaseResponseDto(true, data, 'Meeting scheduled successfully');
  }

  @Get('my')
  @Roles('student', 'faculty')
  @ApiOperation({ summary: 'Get meetings for currently logged in student or faculty' })
  @ApiResponse({ status: 200, description: 'List of meetings' })
  async getMyMeetings(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.meetingService.getMyMeetings(user);
    return new BaseResponseDto(true, data, 'Meetings fetched successfully');
  }

  @Get('faculty/requests')
  @Roles('faculty')
  @ApiOperation({ summary: 'Get pending meeting requests for current faculty' })
  @ApiResponse({ status: 200, description: 'List of pending meeting requests' })
  async getFacultyRequests(@CurrentUserId() facultyId: string) {
    const data = await this.meetingService.getFacultyRequests(facultyId);
    return new BaseResponseDto(true, data, 'Pending meeting requests fetched successfully');
  }

  @Get(':id')
  @Roles('student', 'faculty')
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
  @Roles('faculty')
  @ApiOperation({ summary: 'Faculty accepts a pending meeting request and confirms schedule' })
  @ApiParam({ name: 'id', description: 'Meeting ID' })
  @ApiBody({ type: AcceptMeetingDto })
  @ApiResponse({ status: 200, description: 'Meeting scheduled successfully' })
  async acceptMeeting(
    @Param('id') id: string,
    @CurrentUserId() facultyId: string,
    @Body() dto: AcceptMeetingDto,
  ) {
    const data = await this.meetingService.acceptMeeting(id, facultyId, dto);
    return new BaseResponseDto(true, data, 'Meeting accepted and scheduled successfully');
  }

  @Patch(':id/deny')
  @Roles('faculty')
  @ApiOperation({ summary: 'Faculty denies a pending meeting request' })
  @ApiParam({ name: 'id', description: 'Meeting ID' })
  @ApiBody({ type: DenyMeetingDto })
  @ApiResponse({ status: 200, description: 'Meeting denied' })
  async denyMeeting(
    @Param('id') id: string,
    @CurrentUserId() facultyId: string,
    @Body() dto: DenyMeetingDto,
  ) {
    const data = await this.meetingService.denyMeeting(id, facultyId, dto);
    return new BaseResponseDto(true, data, 'Meeting denied');
  }

  @Patch(':id/ask-reschedule')
  @Roles('faculty')
  @ApiOperation({ summary: 'Faculty proposes an alternative date/time for a pending meeting' })
  @ApiParam({ name: 'id', description: 'Meeting ID' })
  @ApiBody({ type: AskRescheduleDto })
  @ApiResponse({ status: 200, description: 'Reschedule proposal sent to student' })
  async askReschedule(
    @Param('id') id: string,
    @CurrentUserId() facultyId: string,
    @Body() dto: AskRescheduleDto,
  ) {
    const data = await this.meetingService.askReschedule(id, facultyId, dto);
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
  ) {
    const data = await this.meetingService.studentAcceptReschedule(id, studentId);
    return new BaseResponseDto(true, data, 'Reschedule accepted; meeting confirmed');
  }

  @Patch(':id/decline-reschedule')
  @Roles('student')
  @ApiOperation({ summary: 'Student declines faculty proposed reschedule time (returns to PENDING)' })
  @ApiParam({ name: 'id', description: 'Meeting ID' })
  @ApiResponse({ status: 200, description: 'Proposal declined' })
  async studentDeclineReschedule(
    @Param('id') id: string,
    @CurrentUserId() studentId: string,
  ) {
    const data = await this.meetingService.studentDeclineReschedule(id, studentId);
    return new BaseResponseDto(true, data, 'Reschedule declined; meeting returned to pending');
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
    @Body() dto: RequestRescheduleDto,
  ) {
    const data = await this.meetingService.studentRequestReschedule(id, studentId, dto);
    return new BaseResponseDto(true, data, 'Reschedule request sent to faculty');
  }

  @Patch(':id/handle-student-reschedule')
  @Roles('faculty')
  @ApiOperation({ summary: 'Faculty accepts, denies, or counter-proposes student reschedule request' })
  @ApiParam({ name: 'id', description: 'Meeting ID' })
  @ApiBody({ type: HandleStudentRescheduleDto })
  @ApiResponse({ status: 200, description: 'Reschedule request handled' })
  async handleStudentReschedule(
    @Param('id') id: string,
    @CurrentUserId() facultyId: string,
    @Body() dto: HandleStudentRescheduleDto,
  ) {
    const data = await this.meetingService.handleStudentReschedule(id, facultyId, dto);
    return new BaseResponseDto(true, data, 'Student reschedule request processed');
  }

  @Patch(':id/reschedule')
  @Roles('faculty')
  @ApiOperation({ summary: 'Faculty directly updates schedule of an already scheduled meeting' })
  @ApiParam({ name: 'id', description: 'Meeting ID' })
  @ApiBody({ type: FacultyRescheduleDto })
  @ApiResponse({ status: 200, description: 'Meeting rescheduled directly' })
  async facultyReschedule(
    @Param('id') id: string,
    @CurrentUserId() facultyId: string,
    @Body() dto: FacultyRescheduleDto,
  ) {
    const data = await this.meetingService.facultyReschedule(id, facultyId, dto);
    return new BaseResponseDto(true, data, 'Meeting rescheduled successfully');
  }

  @Patch(':id/complete')
  @Roles('faculty')
  @ApiOperation({ summary: 'Faculty marks scheduled meeting as COMPLETED and records outcomes' })
  @ApiParam({ name: 'id', description: 'Meeting ID' })
  @ApiBody({ type: CompleteMeetingDto })
  @ApiResponse({ status: 200, description: 'Meeting completed' })
  async completeMeeting(
    @Param('id') id: string,
    @CurrentUserId() facultyId: string,
    @Body() dto: CompleteMeetingDto,
  ) {
    const data = await this.meetingService.completeMeeting(id, facultyId, dto);
    return new BaseResponseDto(true, data, 'Meeting marked as completed');
  }

  @Patch(':id/cancel')
  @Roles('student', 'faculty')
  @ApiOperation({ summary: 'Cancel a pending or scheduled meeting' })
  @ApiParam({ name: 'id', description: 'Meeting ID' })
  @ApiResponse({ status: 200, description: 'Meeting cancelled' })
  async cancelMeeting(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
  ) {
    const data = await this.meetingService.cancelMeeting(id, userId);
    return new BaseResponseDto(true, data, 'Meeting cancelled');
  }
}
