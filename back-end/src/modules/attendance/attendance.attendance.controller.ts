import { Controller, Get, Param, UseGuards, SetMetadata } from '@nestjs/common';
import { ApiTags, ApiHeader, ApiResponse, ApiParam } from '@nestjs/swagger';
import { AttendanceService } from './attendance.attendance.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { GetAttendanceInputDto } from './dto/get-attendance.input.dto';
import { AttendanceOutputDto } from './dto/attendance.output.dto';
import { BaseResponseDto } from '../../common/dto/base-response.dto';
import { MOCK_ATTENDANCE, MOCK_ENROLLMENTS, MOCK_SECTIONS } from '../../common/types/mock-data';

@ApiTags('Attendance')
@ApiHeader({ name: 'x-user-role', required: true })
@UseGuards(RolesGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get('student/:student_id/subject-wise')
  @SetMetadata('roles', ['student', 'faculty', 'admin'])
  @ApiParam({ name: 'student_id', description: 'Student ID' })
  @ApiResponse({ status: 200, type: [AttendanceOutputDto] })
  async getSubjectWiseAttendance(@Param() params: GetAttendanceInputDto) {
    const data = await this.attendanceService.getSubjectWiseAttendance(params.student_id);
    return new BaseResponseDto(true, data, 'attendance fetched successfully');
  }

  @Get('mock-data')
  @SetMetadata('roles', ['faculty', 'student', 'admin', 'academic_head'])
  @ApiResponse({ status: 200, description: 'Fetch mock data for testing UUIDs' })
  getMockData() {
    return new BaseResponseDto(true, {
      attendance: MOCK_ATTENDANCE,
      enrollments: MOCK_ENROLLMENTS,
      sections: MOCK_SECTIONS
    }, 'mock data fetched');
  }
}
