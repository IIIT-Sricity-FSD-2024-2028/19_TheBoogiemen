import { Controller, Post, Body, UseGuards, SetMetadata } from '@nestjs/common';
import { ApiTags, ApiHeader, ApiResponse, ApiBody } from '@nestjs/swagger';
import { ReportService } from './report.report.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { GenerateProgressInputDto } from './dto/generate-progress.input.dto';
import { ProgressReportOutputDto } from './dto/progress-report.output.dto';
import { BaseResponseDto } from '../../common/dto/base-response.dto';

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
}
