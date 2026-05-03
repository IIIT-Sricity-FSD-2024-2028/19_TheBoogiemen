import { Controller, Post, Patch, Body, UseGuards, SetMetadata, Get, Param, Put, Delete } from '@nestjs/common';
import { ApiTags, ApiHeader, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AssessmentService } from './assessment.assessment.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { EnvGuard } from '../../common/guards/env.guard';
import { CreateAssessmentInputDto } from './dto/create-assessment.input.dto';
import { UpdateAssessmentInputDto } from './dto/update-assessment.input.dto';
import { GradeInputDto } from './dto/grade.input.dto';
import { SyllabusUpdateInputDto } from './dto/syllabus-update.input.dto';
import { AssessmentOutputDto, MarksEntryOutputDto } from './dto/assessment.output.dto';
import { BaseResponseDto } from '../../common/dto/base-response.dto';
import { SEED } from '../../common/types/seed-constants';
import { MOCK_ASSESSMENTS, MOCK_COURSES, MOCK_MARKS } from '../../common/types/mock-data';

@ApiTags('Assessment')
@ApiHeader({ name: 'x-user-role', required: true })
@UseGuards(RolesGuard)
@Controller()
export class AssessmentController {
  constructor(private readonly assessmentService: AssessmentService) {}

  @Post('assessments')
  @SetMetadata('roles', ['faculty'])
  @ApiBody({ type: CreateAssessmentInputDto })
  @ApiResponse({ status: 201, type: AssessmentOutputDto })
  async createAssessment(@Body() dto: CreateAssessmentInputDto) {
    const facultyId = SEED.FACULTY[0];
    const data = await this.assessmentService.createAssessment(facultyId, dto);
    return new BaseResponseDto(true, data, 'assessment created');
  }

  @Patch('assessments/grade')
  @SetMetadata('roles', ['faculty'])
  @ApiBody({ type: GradeInputDto })
  @ApiResponse({ status: 200, type: MarksEntryOutputDto })
  async gradeAssessment(@Body() dto: GradeInputDto) {
    const facultyId = SEED.FACULTY[0];
    const data = await this.assessmentService.submitAndGrade(facultyId, dto);
    return new BaseResponseDto(true, data, 'assessment graded');
  }

  @Post('assessments/:id/submit')
  @SetMetadata('roles', ['student'])
  @ApiResponse({ status: 201, description: 'Assessment submitted successfully' })
  async submitAssessment(@Param('id') id: string, @Body() dto: any) {
    return new BaseResponseDto(true, { id, ...dto }, 'assessment submitted');
  }

  @Post('assessments/:id/questions')
  @SetMetadata('roles', ['faculty'])
  @ApiResponse({ status: 201, description: 'Question added to assessment' })
  async addQuestion(@Param('id') id: string, @Body() dto: any) {
    return new BaseResponseDto(true, { id, ...dto }, 'question added');
  }

  @Patch('courses/syllabus')
  @SetMetadata('roles', ['faculty'])
  @ApiBody({ type: SyllabusUpdateInputDto })
  @ApiResponse({ status: 200 })
  async updateSyllabus(@Body() dto: SyllabusUpdateInputDto) {
    const facultyId = SEED.FACULTY[0];
    const data = await this.assessmentService.updateSyllabus(facultyId, dto);
    return new BaseResponseDto(true, data, 'syllabus updated');
  }

  @Get('mock-data')
  @SetMetadata('roles', ['faculty', 'student', 'admin', 'academic_head'])
  @UseGuards(EnvGuard)
  @ApiResponse({ status: 200, description: 'Fetch mock data for testing UUIDs' })
  getMockData() {
    return new BaseResponseDto(true, {
      assessments: MOCK_ASSESSMENTS,
      courses: MOCK_COURSES,
      marks: MOCK_MARKS
    }, 'mock data fetched');
  }

  @Get('assessments')
  @SetMetadata('roles', ['admin', 'faculty', 'student'])
  @ApiResponse({ status: 200, description: 'Fetch all assessments' })
  async getAllAssessments() {
    const data = await this.assessmentService.getAllAssessments();
    return new BaseResponseDto(true, data, 'assessments fetched successfully');
  }

  @Get('assessments/:id')
  @SetMetadata('roles', ['admin', 'faculty', 'student'])
  @ApiResponse({ status: 200, description: 'Fetch assessment by ID' })
  async getAssessmentById(@Param('id') id: string) {
    const data = await this.assessmentService.getAssessmentById(id);
    return new BaseResponseDto(true, data, 'assessment fetched successfully');
  }

  @Put('assessments/:id')
  @SetMetadata('roles', ['admin', 'faculty'])
  @ApiBody({ type: UpdateAssessmentInputDto })
  @ApiResponse({ status: 200, description: 'Full update of assessment' })
  async updateAssessment(@Param('id') id: string, @Body() dto: UpdateAssessmentInputDto) {
    const data = await this.assessmentService.updateAssessment(id, dto);
    return new BaseResponseDto(true, data, 'assessment updated successfully');
  }

  @Patch('assessments/:id')
  @SetMetadata('roles', ['admin', 'faculty'])
  @ApiBody({ type: UpdateAssessmentInputDto })
  @ApiResponse({ status: 200, description: 'Partial update of assessment' })
  async patchAssessment(@Param('id') id: string, @Body() dto: UpdateAssessmentInputDto) {
    const data = await this.assessmentService.patchAssessment(id, dto);
    return new BaseResponseDto(true, data, 'assessment patched successfully');
  }

  @Delete('assessments/:id')
  @SetMetadata('roles', ['admin', 'faculty'])
  @ApiResponse({ status: 200, description: 'Delete assessment' })
  async deleteAssessment(@Param('id') id: string) {
    await this.assessmentService.deleteAssessment(id);
    return new BaseResponseDto(true, null, 'assessment deleted successfully');
  }
}
