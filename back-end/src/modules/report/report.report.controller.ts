import { Controller, Post, Body, UseGuards, SetMetadata, Get } from '@nestjs/common';
import { ApiTags, ApiHeader, ApiResponse, ApiBody } from '@nestjs/swagger';
import { ReportService } from './report.report.service';
import { RolesGuard } from '../../common/guards/roles.guard';
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
  @ApiResponse({ status: 200, description: 'Fetch mock data for testing UUIDs' })
  getMockData() {
    return new BaseResponseDto(true, {
      students: MOCK_STUDENTS,
      sections: MOCK_SECTIONS
    }, 'mock data fetched');
  }
}
