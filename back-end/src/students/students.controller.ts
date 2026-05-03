import { Controller, Get, Post, Body, Headers, BadRequestException } from '@nestjs/common';
import { StudentsService } from './students.service';
import { Roles } from '../auth/roles.guard';
import { ApiTags, ApiOperation, ApiHeader, ApiResponse } from '@nestjs/swagger';

@ApiTags('Students')
@Controller('students')
export class StudentsController {
  constructor(private studentsService: StudentsService) {}

  @Get('me')
  @Roles('student')
  @ApiOperation({ summary: 'Get current student profile' })
  @ApiHeader({ name: 'role', description: 'Must be: student' })
  @ApiHeader({ name: 'user-id', description: 'User ID of the logged-in student' })
  @ApiResponse({ status: 200, description: 'Student profile data' })
  @ApiResponse({ status: 403, description: 'Access denied — students only' })
  async getProfile(@Headers('user-id') userId: string) {
    if (!userId) throw new BadRequestException('user-id header required');
    return this.studentsService.getProfile(userId);
  }

  @Get('me/attendance')
  @Roles('student')
  @ApiOperation({ summary: 'Get attendance summary and records for current student' })
  @ApiHeader({ name: 'role', description: 'Must be: student' })
  @ApiHeader({ name: 'user-id', description: 'User ID of the logged-in student' })
  @ApiResponse({ status: 200, description: 'Attendance records and per-course summary' })
  async getAttendance(@Headers('user-id') userId: string) {
    if (!userId) throw new BadRequestException('user-id header required');
    return this.studentsService.getAttendance(userId);
  }

  @Get('me/courses')
  @Roles('student')
  @ApiOperation({ summary: 'Get enrolled courses for current student' })
  @ApiHeader({ name: 'role', description: 'Must be: student' })
  @ApiHeader({ name: 'user-id', description: 'User ID of the logged-in student' })
  @ApiResponse({ status: 200, description: 'List of enrolled courses with enrollment status' })
  async getCourses(@Headers('user-id') userId: string) {
    if (!userId) throw new BadRequestException('user-id header required');
    return this.studentsService.getCourses(userId);
  }

  @Get('me/marks')
  @Roles('student')
  @ApiOperation({ summary: 'Get marks/assessments for current student' })
  @ApiHeader({ name: 'role', description: 'Must be: student' })
  @ApiHeader({ name: 'user-id', description: 'User ID of the logged-in student' })
  @ApiResponse({ status: 200, description: 'Marks with assessment and course details' })
  async getMarks(@Headers('user-id') userId: string) {
    if (!userId) throw new BadRequestException('user-id header required');
    return this.studentsService.getMarks(userId);
  }

  @Get('me/fees')
  @Roles('student')
  @ApiOperation({ summary: 'Get fee records for current student' })
  @ApiHeader({ name: 'role', description: 'Must be: student' })
  @ApiHeader({ name: 'user-id', description: 'User ID of the logged-in student' })
  @ApiResponse({ status: 200, description: 'Student fee records' })
  async getFees(@Headers('user-id') userId: string) {
    if (!userId) throw new BadRequestException('user-id header required');
    return this.studentsService.getFees(userId);
  }

  @Get('me/timetable')
  @Roles('student')
  @ApiOperation({ summary: 'Get timetable for current student (based on their section)' })
  @ApiHeader({ name: 'role', description: 'Must be: student' })
  @ApiHeader({ name: 'user-id', description: 'User ID of the logged-in student' })
  @ApiResponse({ status: 200, description: 'Weekly timetable grid for student section' })
  async getTimetable(@Headers('user-id') userId: string) {
    if (!userId) throw new BadRequestException('user-id header required');
    return this.studentsService.getTimetable(userId);
  }

  @Post('enroll')
  @Roles('student')
  @ApiOperation({ summary: 'Enroll in a course' })
  @ApiHeader({ name: 'role', description: 'Must be: student' })
  @ApiHeader({ name: 'user-id', description: 'User ID of the logged-in student' })
  @ApiResponse({ status: 201, description: 'Enrollment successful' })
  @ApiResponse({ status: 400, description: 'Already enrolled or course not found' })
  async enroll(@Body() body: any, @Headers('user-id') userId: string) {
    if (!userId) throw new BadRequestException('user-id header required');
    const courseId = body.course_id || body.courseId;
    if (!courseId) throw new BadRequestException('course_id is required');
    return this.studentsService.enroll(userId, courseId);
  }
}
