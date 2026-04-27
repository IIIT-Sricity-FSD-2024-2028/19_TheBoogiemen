import { Controller, Post, Patch, Body, Param, UseGuards, SetMetadata, Req, Get, Put, Delete } from '@nestjs/common';
import { ApiTags, ApiHeader, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { ResearchService } from './research.research.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { EnvGuard } from '../../common/guards/env.guard';
import { UploadMilestoneInputDto } from './dto/upload-milestone.input.dto';
import { ReviewMilestoneInputDto } from './dto/review-milestone.input.dto';
import { UpdateProjectInputDto } from './dto/update-project.input.dto';
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
  @UseGuards(EnvGuard)
  @ApiResponse({ status: 200, description: 'Fetch mock data for testing UUIDs' })
  getMockData() {
    return new BaseResponseDto(true, {
      projects: MOCK_RESEARCH_PROJECTS
    }, 'mock data fetched');
  }

  @Get()
  @SetMetadata('roles', ['admin', 'faculty', 'student', 'academic_head'])
  @ApiResponse({ status: 200, description: 'Fetch all projects' })
  async getAllProjects() {
    const data = await this.researchService.getAllProjects();
    return new BaseResponseDto(true, data, 'projects fetched successfully');
  }

  @Get(':id')
  @SetMetadata('roles', ['admin', 'faculty', 'student', 'academic_head'])
  @ApiResponse({ status: 200, description: 'Fetch project by ID' })
  async getProjectById(@Param('id') id: string) {
    const data = await this.researchService.getProjectById(id);
    return new BaseResponseDto(true, data, 'project fetched successfully');
  }

  @Put(':id')
  @SetMetadata('roles', ['admin', 'faculty'])
  @ApiBody({ type: UpdateProjectInputDto })
  @ApiResponse({ status: 200, description: 'Full update of project' })
  async updateProject(@Param('id') id: string, @Body() dto: UpdateProjectInputDto) {
    const data = await this.researchService.updateProject(id, dto);
    return new BaseResponseDto(true, data, 'project updated successfully');
  }

  @Patch(':id')
  @SetMetadata('roles', ['admin', 'faculty'])
  @ApiBody({ type: UpdateProjectInputDto })
  @ApiResponse({ status: 200, description: 'Partial update of project' })
  async patchProject(@Param('id') id: string, @Body() dto: UpdateProjectInputDto) {
    const data = await this.researchService.patchProject(id, dto);
    return new BaseResponseDto(true, data, 'project patched successfully');
  }

  @Delete(':id')
  @SetMetadata('roles', ['admin', 'faculty'])
  @ApiResponse({ status: 200, description: 'Delete project' })
  async deleteProject(@Param('id') id: string) {
    await this.researchService.deleteProject(id);
    return new BaseResponseDto(true, null, 'project deleted successfully');
  }

  @Delete('milestones/:id')
  @SetMetadata('roles', ['admin', 'faculty', 'student'])
  @ApiResponse({ status: 200, description: 'Delete milestone' })
  async deleteMilestone(@Param('id') id: string) {
    await this.researchService.deleteMilestone(id);
    return new BaseResponseDto(true, null, 'milestone deleted successfully');
  }
}
