import { Controller, Get, Post, Body, Headers, Param, BadRequestException } from '@nestjs/common';
import { FacultyService } from './faculty.service';
import { Roles } from '../auth/roles.guard';
import { ApiTags, ApiOperation, ApiHeader, ApiResponse , ApiBody} from '@nestjs/swagger';

@ApiTags('Faculty')
@Controller('faculty')
export class FacultyController {
  constructor(private facultyService: FacultyService) {}

  @Get('me/profile')
  @Roles('faculty')
  @ApiOperation({ summary: 'Get current faculty profile' })
  @ApiHeader({ name: 'role', description: 'Must be: faculty' })
  @ApiHeader({ name: 'user-id', description: 'User ID of the logged-in faculty' })
  @ApiResponse({ status: 200, description: 'Faculty profile with department info' })
  async getProfile(@Headers('user-id') userId: string) {
    if (!userId) throw new BadRequestException('user-id header required');
    return this.facultyService.getProfile(userId);
  }

  @Get('me/courses')
  @Roles('faculty')
  @ApiOperation({ summary: 'Get courses taught by current faculty' })
  @ApiHeader({ name: 'role', description: 'Must be: faculty' })
  @ApiHeader({ name: 'user-id', description: 'User ID of the logged-in faculty' })
  @ApiResponse({ status: 200, description: 'List of courses assigned to this faculty' })
  async getMyCourses(@Headers('user-id') userId: string) {
    if (!userId) throw new BadRequestException('user-id header required');
    return this.facultyService.getMyCourses(userId);
  }

  @Get('me/timetable')
  @Roles('faculty')
  @ApiOperation({ summary: 'Get timetable grid for current faculty' })
  @ApiHeader({ name: 'role', description: 'Must be: faculty' })
  @ApiHeader({ name: 'user-id', description: 'User ID of the logged-in faculty' })
  @ApiResponse({ status: 200, description: 'Weekly timetable grid object keyed by day and time' })
  async getTimetable(@Headers('user-id') userId: string) {
    if (!userId) throw new BadRequestException('user-id header required');
    return this.facultyService.getFacultyTimetable(userId);
  }

  @Get('me/students')
  @Roles('faculty')
  @ApiOperation({ summary: 'Get students enrolled in faculty courses with attendance and risk status' })
  @ApiHeader({ name: 'role', description: 'Must be: faculty' })
  @ApiHeader({ name: 'user-id', description: 'User ID of the logged-in faculty' })
  @ApiResponse({ status: 200, description: 'List of students with attendance % and risk flags' })
  async getMyStudents(@Headers('user-id') userId: string) {
    if (!userId) throw new BadRequestException('user-id header required');
    return this.facultyService.getMyStudents(userId);
  }

  @Get('me/at-risk')
  @Roles('faculty', 'head', 'admin', 'superadmin')
  @ApiOperation({ summary: 'Get students who are at-risk (low CGPA)' })
  @ApiHeader({ name: 'role', description: 'Role: faculty, head, admin, or superadmin' })
  @ApiResponse({ status: 200, description: 'List of at-risk students with attendance data' })
  async getAtRisk() {
    return this.facultyService.getAtRiskStudents();
  }

  @Get('me/assessments')
  @Roles('faculty')
  @ApiOperation({ summary: 'Get assessments created by this faculty' })
  @ApiHeader({ name: 'role', description: 'Must be: faculty' })
  @ApiHeader({ name: 'user-id', description: 'User ID of the logged-in faculty' })
  async getMyAssessments(@Headers('user-id') userId: string) {
    if (!userId) throw new BadRequestException('user-id header required');
    return this.facultyService.getAssessments(userId);
  }

  @Get('attendance/today/:courseId')
  @Roles('faculty')
  @ApiOperation({ summary: 'Get students for today attendance marking for a course' })
  @ApiHeader({ name: 'role', description: 'Must be: faculty' })
  @ApiHeader({ name: 'user-id', description: 'User ID of the logged-in faculty' })
  async getTodayAttendance(@Param('courseId') courseId: string) {
    return this.facultyService.getTodayAttendance(courseId);
  }

  @Post('attendance')
  @Roles('faculty')
  @ApiOperation({ summary: 'Submit bulk attendance for a course session' })
  @ApiHeader({ name: 'role', description: 'Must be: faculty' })
  @ApiResponse({ status: 201, description: 'Attendance recorded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  async recordAttendance(@Body() body: any) {
    if (!body.course_id || !body.date || !body.records) {
      throw new BadRequestException('course_id, date, and records are required');
    }
    return this.facultyService.recordAttendance(body);
  }

  @Post('marks')
  @Roles('faculty')
  @ApiOperation({ summary: 'Record marks for a student assessment' })
  @ApiHeader({ name: 'role', description: 'Must be: faculty' })
  @ApiResponse({ status: 201, description: 'Marks recorded successfully' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  async postMarks(@Body() body: any) {
    return this.facultyService.postMarks(body);
  }
}
