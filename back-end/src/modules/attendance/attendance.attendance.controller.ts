import { Controller, Get, Param, UseGuards, SetMetadata } from '@nestjs/common';
import { ApiTags, ApiHeader, ApiResponse, ApiParam } from '@nestjs/swagger';
import { AttendanceService } from './attendance.attendance.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { GetAttendanceInputDto } from './dto/get-attendance.input.dto';
import { AttendanceOutputDto } from './dto/attendance.output.dto';
import { BaseResponseDto } from '../../common/dto/base-response.dto';

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
}
