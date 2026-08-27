import {
  Controller,
  Get,
  Post,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { StudentsService } from './students.service';
import { Roles } from '../auth/roles.guard';
import { CurrentUserId } from '../common/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { ErrorCode, errorBody } from '../common/errors/error-codes';

@ApiTags('Students')
@Controller('students')
export class StudentsController {
  constructor(private studentsService: StudentsService) {}

  @Get('me')
  @Roles('student')
  @ApiOperation({ summary: 'Get current student profile' })
  @ApiResponse({ status: 200, description: 'Student profile data' })
  @ApiResponse({ status: 403, description: 'Access denied — students only' })
  async getProfile(@CurrentUserId() userId: string) {
    return this.studentsService.getProfile(userId);
  }

  @Get('me/attendance')
  @Roles('student')
  @ApiOperation({
    summary: 'Get attendance summary and records for current student',
  })
  @ApiResponse({
    status: 200,
    description: 'Attendance records and per-course summary',
  })
  async getAttendance(@CurrentUserId() userId: string) {
    return this.studentsService.getAttendance(userId);
  }

  @Get('me/courses')
  @Roles('student')
  @ApiOperation({ summary: 'Get enrolled courses for current student' })
  @ApiResponse({
    status: 200,
    description: 'List of enrolled courses with enrollment status',
  })
  async getCourses(@CurrentUserId() userId: string) {
    return this.studentsService.getCourses(userId);
  }

  @Get('me/marks')
  @Roles('student')
  @ApiOperation({ summary: 'Get marks/assessments for current student' })
  @ApiResponse({
    status: 200,
    description: 'Marks with assessment and course details',
  })
  async getMarks(@CurrentUserId() userId: string) {
    return this.studentsService.getMarks(userId);
  }

  @Get('me/fees')
  @Roles('student')
  @ApiOperation({ summary: 'Get fee records for current student' })
  @ApiResponse({ status: 200, description: 'Student fee records' })
  async getFees(@CurrentUserId() userId: string) {
    return this.studentsService.getFees(userId);
  }

  @Get('me/timetable')
  @Roles('student')
  @ApiOperation({
    summary: 'Get timetable for current student (based on their section)',
  })
  @ApiResponse({
    status: 200,
    description: 'Weekly timetable grid for student section',
  })
  async getTimetable(@CurrentUserId() userId: string) {
    return this.studentsService.getTimetable(userId);
  }

  @Post('enroll')
  @Roles('student')
  @ApiOperation({ summary: 'Enroll in a course' })
  @ApiResponse({ status: 201, description: 'Enrollment successful' })
  @ApiResponse({
    status: 400,
    description: 'Already enrolled or course not found',
  })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  async enroll(@Body() body: any, @CurrentUserId() userId: string) {
    const courseId = body.course_id || body.courseId;
    if (!courseId)
      throw new BadRequestException(
        errorBody(ErrorCode.BUSINESS_RULE_VIOLATION, 'course_id is required'),
      );
    return this.studentsService.enroll(userId, courseId);
  }
}
