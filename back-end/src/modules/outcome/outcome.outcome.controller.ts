import { Controller, Post, Get, Body, Param, UseGuards, SetMetadata, Put, Patch, Delete } from '@nestjs/common';
import { ApiTags, ApiHeader, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { OutcomeService } from './outcome.outcome.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { EnvGuard } from '../../common/guards/env.guard';
import { MapOutcomeInputDto } from './dto/map-outcome.input.dto';
import { UpdateOutcomeInputDto } from './dto/update-outcome.input.dto';
import { StudentOutcomeOutputDto } from './dto/student-outcome.output.dto';
import { BaseResponseDto } from '../../common/dto/base-response.dto';
import { MOCK_OUTCOMES, MOCK_STUDENT_OUTCOMES } from '../../common/types/mock-data';

@ApiTags('Outcome')
@ApiHeader({ name: 'x-user-role', required: true })
@UseGuards(RolesGuard)
@Controller('outcomes')
export class OutcomeController {
  constructor(private readonly outcomeService: OutcomeService) {}

  @Post('map')
  @SetMetadata('roles', ['faculty'])
  @ApiBody({ type: MapOutcomeInputDto })
  @ApiResponse({ status: 201 })
  async mapAssessmentToOutcomes(@Body() dto: MapOutcomeInputDto) {
    const data = await this.outcomeService.mapAssessmentToOutcomes(dto);
    return new BaseResponseDto(true, data, 'mapping successful');
  }

  @Get('student/:studentId')
  @SetMetadata('roles', ['student', 'faculty'])
  @ApiParam({ name: 'studentId', description: 'Student ID' })
  @ApiResponse({ status: 200, type: [StudentOutcomeOutputDto] })
  async getStudentOutcomes(@Param('studentId') studentId: string) {
    const data = await this.outcomeService.getStudentOutcomes(studentId);
    return new BaseResponseDto(true, data, 'outcomes fetched');
  }

  @Get('mock-data')
  @SetMetadata('roles', ['faculty', 'student', 'admin', 'academic_head'])
  @UseGuards(EnvGuard)
  @ApiResponse({ status: 200, description: 'Fetch mock data for testing UUIDs' })
  getMockData() {
    return new BaseResponseDto(true, {
      outcomes: MOCK_OUTCOMES,
      student_outcomes: MOCK_STUDENT_OUTCOMES
    }, 'mock data fetched');
  }

  @Get()
  @SetMetadata('roles', ['admin', 'faculty', 'student'])
  @ApiResponse({ status: 200, description: 'Fetch all outcomes' })
  async getAllOutcomes() {
    const data = await this.outcomeService.getAllOutcomes();
    return new BaseResponseDto(true, data, 'outcomes fetched successfully');
  }

  @Get(':id')
  @SetMetadata('roles', ['admin', 'faculty', 'student'])
  @ApiResponse({ status: 200, description: 'Fetch outcome by ID' })
  async getOutcomeById(@Param('id') id: string) {
    const data = await this.outcomeService.getOutcomeById(id);
    return new BaseResponseDto(true, data, 'outcome fetched successfully');
  }

  @Post()
  @SetMetadata('roles', ['admin', 'academic_head'])
  @ApiResponse({ status: 201, description: 'Create outcome' })
  async createOutcome(@Body() dto: any) {
    const data = await this.outcomeService.createOutcome(dto);
    return new BaseResponseDto(true, data, 'outcome created successfully');
  }

  @Put(':id')
  @SetMetadata('roles', ['admin', 'academic_head'])
  @ApiBody({ type: UpdateOutcomeInputDto })
  @ApiResponse({ status: 200, description: 'Full update of outcome' })
  async updateOutcome(@Param('id') id: string, @Body() dto: UpdateOutcomeInputDto) {
    const data = await this.outcomeService.updateOutcome(id, dto);
    return new BaseResponseDto(true, data, 'outcome updated successfully');
  }

  @Patch(':id')
  @SetMetadata('roles', ['admin', 'academic_head'])
  @ApiBody({ type: UpdateOutcomeInputDto })
  @ApiResponse({ status: 200, description: 'Partial update of outcome' })
  async patchOutcome(@Param('id') id: string, @Body() dto: UpdateOutcomeInputDto) {
    const data = await this.outcomeService.patchOutcome(id, dto);
    return new BaseResponseDto(true, data, 'outcome patched successfully');
  }

  @Delete(':id')
  @SetMetadata('roles', ['admin', 'academic_head'])
  @ApiResponse({ status: 200, description: 'Delete outcome' })
  async deleteOutcome(@Param('id') id: string) {
    await this.outcomeService.deleteOutcome(id);
    return new BaseResponseDto(true, null, 'outcome deleted successfully');
  }
}
