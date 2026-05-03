import { ApiProperty } from '@nestjs/swagger';

export class StudentOutcomeOutputDto {
  @ApiProperty()
  student_id: string;

  @ApiProperty()
  outcome_id: string;

  @ApiProperty()
  outcome_title: string;

  @ApiProperty()
  achievement_level: string;

  @ApiProperty()
  raw_percentage: number;
}
