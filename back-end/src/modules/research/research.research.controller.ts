import { Controller, Post, Patch, Body, Param, UseGuards, SetMetadata, Req, Get } from '@nestjs/common';
import { ApiTags, ApiHeader, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { ResearchService } from './research.research.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UploadMilestoneInputDto } from './dto/upload-milestone.input.dto';
import { ReviewMilestoneInputDto } from './dto/review-milestone.input.dto';
import { MilestoneOutputDto } from './dto/milestone.output.dto';
import { BaseResponseDto } from '../../common/dto/base-response.dto';
import { SEED } from '../../common/types/seed-constants';
import { MOCK_RESEARCH_PROJECTS } from '../../common/types/mock-data';

@ApiTags('Research')
@ApiHeader({ name: 'x-user-role', required: true })
@UseGuards(RolesGuard)
@Controller('research')
export class ResearchController {
  constructor(private readonly researchService: ResearchService) {}

  @Post('milestones')
  @SetMetadata('roles', ['student'])
  @ApiBody({ type: UploadMilestoneInputDto })
  @ApiResponse({ status: 201, type: MilestoneOutputDto })
  async uploadMilestone(@Body() dto: UploadMilestoneInputDto) {
    // Mock user context extraction
    const studentId = SEED.STUDENTS[0];
    const data = await this.researchService.uploadMilestone(studentId, dto);
    return new BaseResponseDto(true, data, 'milestone upload successful');
  }

  @Patch('milestones/:id/review')
  @SetMetadata('roles', ['faculty'])
  @ApiParam({ name: 'id', description: 'Milestone ID' })
  @ApiBody({ type: ReviewMilestoneInputDto })
  @ApiResponse({ status: 200, type: MilestoneOutputDto })
  async reviewMilestone(@Param('id') id: string, @Body() dto: ReviewMilestoneInputDto) {
    // Explicitly set the id from path since class-validator might not map param to dto seamlessly without complex setup
    dto.milestone_id = id;
    const facultyId = SEED.FACULTY[0];
    const data = await this.researchService.reviewMilestone(facultyId, dto);
    return new BaseResponseDto(true, data, 'review update successful');
  }

  @Get('mock-data')
  @SetMetadata('roles', ['faculty', 'student', 'admin', 'academic_head'])
  @ApiResponse({ status: 200, description: 'Fetch mock data for testing UUIDs' })
  getMockData() {
    return new BaseResponseDto(true, {
      projects: MOCK_RESEARCH_PROJECTS
    }, 'mock data fetched');
  }
}
