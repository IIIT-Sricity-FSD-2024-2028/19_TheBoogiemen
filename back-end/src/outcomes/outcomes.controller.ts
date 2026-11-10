import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { OutcomesService } from './outcomes.service';
import { Roles } from '../auth/roles.guard';
import { CurrentUserCollegeId, CurrentUserId } from '../common/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { ErrorCode, errorBody } from '../common/errors/error-codes';

@ApiTags('Outcomes')
@Controller()
export class OutcomesController {
  constructor(private outcomes: OutcomesService) {}

  // ── Program Outcomes ─────────────────────────────────────────────────────

  @Get('program-outcomes')
  @Roles('student', 'faculty', 'admin', 'head', 'superadmin')
  @ApiOperation({ summary: "List this college's Program Outcomes" })
  async listProgramOutcomes(@CurrentUserCollegeId() collegeId: string | null) {
    return this.outcomes.listProgramOutcomes(collegeId);
  }

  @Post('program-outcomes')
  @Roles('admin', 'head', 'superadmin')
  @ApiOperation({ summary: 'Add a Program Outcome' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  async createProgramOutcome(@Body() body: any, @CurrentUserCollegeId() collegeId: string | null) {
    return this.outcomes.createProgramOutcome(body, collegeId);
  }

  @Delete('program-outcomes/:id')
  @Roles('admin', 'head', 'superadmin')
  @ApiOperation({ summary: 'Remove a Program Outcome' })
  async removeProgramOutcome(@Param('id') id: string, @CurrentUserCollegeId() collegeId: string | null) {
    return this.outcomes.removeProgramOutcome(id, collegeId);
  }

  // ── Learning Outcomes (Course Outcomes) ─────────────────────────────────

  @Get('learning-outcomes')
  @Roles('student', 'faculty', 'admin', 'head', 'superadmin')
  @ApiOperation({ summary: "List a course's Course Outcomes" })
  async listLearningOutcomes(
    @Query('course_id') courseId: string | undefined,
    @CurrentUserCollegeId() collegeId: string | null,
  ) {
    return this.outcomes.listLearningOutcomes(courseId, collegeId);
  }

  @Post('learning-outcomes')
  @Roles('faculty')
  @ApiOperation({ summary: 'Create a Course Outcome for a course you teach' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  async createLearningOutcome(
    @Body() body: any,
    @CurrentUserId() userId: string,
    @CurrentUserCollegeId() collegeId: string | null,
  ) {
    return this.outcomes.createLearningOutcome(body, userId, collegeId);
  }

  @Patch('learning-outcomes/:id')
  @Roles('faculty')
  @ApiOperation({ summary: 'Edit a Course Outcome' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  async updateLearningOutcome(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUserId() userId: string,
    @CurrentUserCollegeId() collegeId: string | null,
  ) {
    return this.outcomes.updateLearningOutcome(id, body, userId, collegeId);
  }

  @Put('learning-outcomes/:id/po-mapping')
  @Roles('faculty')
  @ApiOperation({ summary: 'Replace which Program Outcomes this Course Outcome maps to, and at what strength' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  async setPoMapping(
    @Param('id') id: string,
    @Body() body: { po_mapping: { po_id: string; strength: number }[] },
    @CurrentUserId() userId: string,
    @CurrentUserCollegeId() collegeId: string | null,
  ) {
    if (!Array.isArray(body?.po_mapping))
      throw new BadRequestException(errorBody(ErrorCode.BUSINESS_RULE_VIOLATION, 'po_mapping must be an array'));
    return this.outcomes.setPoMapping(id, body.po_mapping, userId, collegeId);
  }

  @Delete('learning-outcomes/:id')
  @Roles('faculty')
  @ApiOperation({ summary: 'Delete a Course Outcome' })
  async removeLearningOutcome(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
    @CurrentUserCollegeId() collegeId: string | null,
  ) {
    return this.outcomes.removeLearningOutcome(id, userId, collegeId);
  }

  // ── Topics ────────────────────────────────────────────────────────────────

  @Get('topics')
  @Roles('student', 'faculty', 'admin', 'head', 'superadmin')
  @ApiOperation({ summary: "List a course's syllabus topics" })
  async listTopics(
    @Query('course_id') courseId: string | undefined,
    @CurrentUserCollegeId() collegeId: string | null,
  ) {
    return this.outcomes.listTopics(courseId, collegeId);
  }

  @Post('topics')
  @Roles('faculty')
  @ApiOperation({ summary: 'Add a syllabus topic to a course you teach' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  async createTopic(
    @Body() body: any,
    @CurrentUserId() userId: string,
    @CurrentUserCollegeId() collegeId: string | null,
  ) {
    return this.outcomes.createTopic(body, userId, collegeId);
  }

  @Patch('topics/:id')
  @Roles('faculty')
  @ApiOperation({ summary: 'Edit a topic (title, order, or which Course Outcomes it maps to)' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  async updateTopic(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUserId() userId: string,
    @CurrentUserCollegeId() collegeId: string | null,
  ) {
    return this.outcomes.updateTopic(id, body, userId, collegeId);
  }

  @Delete('topics/:id')
  @Roles('faculty')
  @ApiOperation({ summary: 'Delete a topic' })
  async removeTopic(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
    @CurrentUserCollegeId() collegeId: string | null,
  ) {
    return this.outcomes.removeTopic(id, userId, collegeId);
  }

  // ── Topic completions (per course+section) ──────────────────────────────

  @Get('topic-completions')
  @Roles('student', 'faculty', 'admin', 'head', 'superadmin')
  @ApiOperation({ summary: 'List a course+section\'s topics with their completion %' })
  async getTopicsWithCompletion(
    @Query('course_id') courseId: string,
    @Query('section') section: string,
    @CurrentUserCollegeId() collegeId: string | null,
  ) {
    if (!courseId || !section)
      throw new BadRequestException(
        errorBody(ErrorCode.BUSINESS_RULE_VIOLATION, 'course_id and section are both required'),
      );
    return this.outcomes.getTopicsWithCompletion(courseId, section, collegeId);
  }

  @Patch('topic-completions')
  @Roles('faculty')
  @ApiOperation({ summary: 'Update one topic\'s completion % for a section you teach' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  async setTopicCompletion(
    @Body() body: any,
    @CurrentUserId() userId: string,
    @CurrentUserCollegeId() collegeId: string | null,
  ) {
    return this.outcomes.setTopicCompletion(body, userId, collegeId);
  }
}
