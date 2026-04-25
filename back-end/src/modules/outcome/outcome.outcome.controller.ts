import { Controller, Post, Get, Body, Param, UseGuards, SetMetadata } from '@nestjs/common';
import { ApiTags, ApiHeader, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { OutcomeService } from './outcome.outcome.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { MapOutcomeInputDto } from './dto/map-outcome.input.dto';
import { StudentOutcomeOutputDto } from './dto/student-outcome.output.dto';
import { BaseResponseDto } from '../../common/dto/base-response.dto';

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
}
