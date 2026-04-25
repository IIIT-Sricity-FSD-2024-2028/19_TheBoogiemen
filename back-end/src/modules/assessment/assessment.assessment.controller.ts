import { Controller, Post, Patch, Body, UseGuards, SetMetadata } from '@nestjs/common';
import { ApiTags, ApiHeader, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AssessmentService } from './assessment.assessment.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateAssessmentInputDto } from './dto/create-assessment.input.dto';
import { GradeInputDto } from './dto/grade.input.dto';
import { SyllabusUpdateInputDto } from './dto/syllabus-update.input.dto';
import { AssessmentOutputDto, MarksEntryOutputDto } from './dto/assessment.output.dto';
import { BaseResponseDto } from '../../common/dto/base-response.dto';
import { SEED } from '../../common/types/seed-constants';

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

  @Patch('courses/syllabus')
  @SetMetadata('roles', ['faculty'])
  @ApiBody({ type: SyllabusUpdateInputDto })
  @ApiResponse({ status: 200 })
  async updateSyllabus(@Body() dto: SyllabusUpdateInputDto) {
    const facultyId = SEED.FACULTY[0];
    const data = await this.assessmentService.updateSyllabus(facultyId, dto);
    return new BaseResponseDto(true, data, 'syllabus updated');
  }
}
