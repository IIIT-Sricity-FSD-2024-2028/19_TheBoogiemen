import { Controller, Get, Param, UseGuards, SetMetadata, Post, Put, Patch, Delete, Body } from '@nestjs/common';
import { ApiTags, ApiHeader, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { AttendanceService } from './attendance.attendance.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { EnvGuard } from '../../common/guards/env.guard';
import { GetAttendanceInputDto } from './dto/get-attendance.input.dto';
import { CreateAttendanceInputDto } from './dto/create-attendance.input.dto';
import { UpdateAttendanceInputDto } from './dto/update-attendance.input.dto';
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
  @UseGuards(EnvGuard)
  @ApiResponse({ status: 200, description: 'Fetch mock data for testing UUIDs' })
  getMockData() {
    return new BaseResponseDto(true, {
      attendance: MOCK_ATTENDANCE,
      enrollments: MOCK_ENROLLMENTS,
      sections: MOCK_SECTIONS
    }, 'mock data fetched');
  }

  @Get()
  @SetMetadata('roles', ['admin', 'academic_head', 'faculty'])
  @ApiResponse({ status: 200, description: 'Fetch all attendance logs' })
  async getAllLogs() {
    const data = await this.attendanceService.getAllLogs();
    return new BaseResponseDto(true, data, 'attendance logs fetched successfully');
  }

  @Get(':id')
  @SetMetadata('roles', ['admin', 'academic_head', 'faculty', 'student'])
  @ApiResponse({ status: 200, description: 'Fetch attendance log by ID' })
  async getLogById(@Param('id') id: string) {
    const data = await this.attendanceService.getLogById(id);
    return new BaseResponseDto(true, data, 'attendance log fetched successfully');
  }

  @Post()
  @SetMetadata('roles', ['admin', 'faculty', 'student'])
  @ApiBody({ type: CreateAttendanceInputDto })
  @ApiResponse({ status: 201, description: 'Create attendance log' })
  async createLog(@Body() dto: CreateAttendanceInputDto) {
    const data = await this.attendanceService.createLog(dto);
    return new BaseResponseDto(true, data, 'attendance log created successfully');
  }

  @Put(':id')
  @SetMetadata('roles', ['admin', 'faculty'])
  @ApiBody({ type: UpdateAttendanceInputDto })
  @ApiResponse({ status: 200, description: 'Full update of attendance log' })
  async updateLog(@Param('id') id: string, @Body() dto: UpdateAttendanceInputDto) {
    const data = await this.attendanceService.updateLog(id, dto);
    return new BaseResponseDto(true, data, 'attendance log updated successfully');
  }

  @Patch(':id')
  @SetMetadata('roles', ['admin', 'faculty'])
  @ApiBody({ type: UpdateAttendanceInputDto })
  @ApiResponse({ status: 200, description: 'Partial update of attendance log' })
  async patchLog(@Param('id') id: string, @Body() dto: UpdateAttendanceInputDto) {
    const data = await this.attendanceService.patchLog(id, dto);
    return new BaseResponseDto(true, data, 'attendance log patched successfully');
  }

  @Delete(':id')
  @SetMetadata('roles', ['admin', 'faculty'])
  @ApiResponse({ status: 200, description: 'Delete attendance log' })
  async deleteLog(@Param('id') id: string) {
    await this.attendanceService.deleteLog(id);
    return new BaseResponseDto(true, null, 'attendance log deleted successfully');
  }
}
