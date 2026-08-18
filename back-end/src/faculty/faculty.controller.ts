import { Controller, Get, Post, Body, Param, BadRequestException } from '@nestjs/common';
import { FacultyService } from './faculty.service';
import { Roles } from '../auth/roles.guard';
import { CurrentUserId } from '../common/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiResponse , ApiBody} from '@nestjs/swagger';

@ApiTags('Faculty')
@Controller('faculty')
export class FacultyController {
  constructor(private facultyService: FacultyService) {}

  @Get('me/profile')
  @Roles('faculty')
  @ApiOperation({ summary: 'Get current faculty profile' })
  @ApiResponse({ status: 200, description: 'Faculty profile with department info' })
  async getProfile(@CurrentUserId() userId: string) {
    return this.facultyService.getProfile(userId);
  }

  @Get('me/courses')
  @Roles('faculty')
  @ApiOperation({ summary: 'Get courses taught by current faculty' })
  @ApiResponse({ status: 200, description: 'List of courses assigned to this faculty' })
  async getMyCourses(@CurrentUserId() userId: string) {
    return this.facultyService.getMyCourses(userId);
  }

  @Get('me/timetable')
  @Roles('faculty')
  @ApiOperation({ summary: 'Get timetable grid for current faculty' })
  @ApiResponse({ status: 200, description: 'Weekly timetable grid object keyed by day and time' })
  async getTimetable(@CurrentUserId() userId: string) {
    return this.facultyService.getFacultyTimetable(userId);
  }

  @Get('me/students')
  @Roles('faculty')
  @ApiOperation({ summary: 'Get students enrolled in faculty courses with attendance and risk status' })
  @ApiResponse({ status: 200, description: 'List of students with attendance % and risk flags' })
  async getMyStudents(@CurrentUserId() userId: string) {
    return this.facultyService.getMyStudents(userId);
  }

  @Get('me/at-risk')
  @Roles('faculty', 'head', 'admin', 'superadmin')
  @ApiOperation({ summary: 'Get students who are at-risk (low CGPA)' })
  @ApiResponse({ status: 200, description: 'List of at-risk students with attendance data' })
  async getAtRisk() {
    return this.facultyService.getAtRiskStudents();
  }

  @Get('me/assessments')
  @Roles('faculty')
  @ApiOperation({ summary: 'Get assessments created by this faculty' })
  async getMyAssessments(@CurrentUserId() userId: string) {
    return this.facultyService.getAssessments(userId);
  }

  @Get('attendance/today/:courseId')
  @Roles('faculty')
  @ApiOperation({ summary: 'Get students for today attendance marking for a course' })
  async getTodayAttendance(@Param('courseId') courseId: string) {
    return this.facultyService.getTodayAttendance(courseId);
  }

  @Post('attendance')
  @Roles('faculty')
  @ApiOperation({ summary: 'Submit bulk attendance for a course session' })
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
  @ApiResponse({ status: 201, description: 'Marks recorded successfully' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  async postMarks(@Body() body: any) {
    return this.facultyService.postMarks(body);
  }
}
