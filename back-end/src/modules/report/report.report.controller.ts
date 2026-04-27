import { Controller, Post, Body, UseGuards, SetMetadata, Get, Param, Put, Patch, Delete } from '@nestjs/common';
import { ApiTags, ApiHeader, ApiResponse, ApiBody } from '@nestjs/swagger';
import { ReportService } from './report.report.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { EnvGuard } from '../../common/guards/env.guard';
import { GenerateProgressInputDto } from './dto/generate-progress.input.dto';
import { ProgressReportOutputDto } from './dto/progress-report.output.dto';
import { BaseResponseDto } from '../../common/dto/base-response.dto';
import { MOCK_STUDENTS, MOCK_SECTIONS } from '../../common/types/mock-data';

@ApiTags('Report')
@ApiHeader({ name: 'x-user-role', required: true })
@UseGuards(RolesGuard)
@Controller('reports')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Post('progress')
  @SetMetadata('roles', ['faculty'])
  @ApiBody({ type: GenerateProgressInputDto })
  @ApiResponse({ status: 201, type: [ProgressReportOutputDto] })
  async generateReport(@Body() dto: GenerateProgressInputDto) {
    const data = await this.reportService.generateReport(dto);
    return new BaseResponseDto(true, data, 'report generation successful');
  }

  @Get('mock-data')
  @SetMetadata('roles', ['faculty', 'student', 'admin', 'academic_head'])
  @UseGuards(EnvGuard)
  @ApiResponse({ status: 200, description: 'Fetch mock data for testing UUIDs' })
  getMockData() {
    return new BaseResponseDto(true, {
      students: MOCK_STUDENTS,
      sections: MOCK_SECTIONS
    }, 'mock data fetched');
  }

  @Get()
  @SetMetadata('roles', ['admin', 'faculty', 'student'])
  @ApiResponse({ status: 200, description: 'Fetch all saved reports' })
  async getAllReports() {
    const data = await this.reportService.getAllReports();
    return new BaseResponseDto(true, data, 'reports fetched successfully');
  }

  @Get(':id')
  @SetMetadata('roles', ['admin', 'faculty', 'student'])
  @ApiResponse({ status: 200, description: 'Fetch saved report by ID' })
  async getReportById(@Param('id') id: string) {
    const data = await this.reportService.getReportById(id);
    return new BaseResponseDto(true, data, 'report fetched successfully');
  }

  @Post()
  @SetMetadata('roles', ['admin', 'faculty'])
  @ApiResponse({ status: 201, description: 'Create saved report' })
  async createReport(@Body() dto: any) {
    const data = await this.reportService.createReport(dto);
    return new BaseResponseDto(true, data, 'report created successfully');
  }

  @Put(':id')
  @SetMetadata('roles', ['admin', 'faculty'])
  @ApiResponse({ status: 200, description: 'Full update of report' })
  async updateReport(@Param('id') id: string, @Body() dto: any) {
    const data = await this.reportService.updateReport(id, dto);
    return new BaseResponseDto(true, data, 'report updated successfully');
  }

  @Patch(':id')
  @SetMetadata('roles', ['admin', 'faculty'])
  @ApiResponse({ status: 200, description: 'Partial update of report' })
  async patchReport(@Param('id') id: string, @Body() dto: any) {
    const data = await this.reportService.patchReport(id, dto);
    return new BaseResponseDto(true, data, 'report patched successfully');
  }

  @Delete(':id')
  @SetMetadata('roles', ['admin', 'faculty'])
  @ApiResponse({ status: 200, description: 'Delete report' })
  async deleteReport(@Param('id') id: string) {
    await this.reportService.deleteReport(id);
    return new BaseResponseDto(true, null, 'report deleted successfully');
  }
}
