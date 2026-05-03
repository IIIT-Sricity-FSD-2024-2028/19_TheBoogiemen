import { ApiProperty } from '@nestjs/swagger';

export class MarksDetailDto {
  @ApiProperty()
  assessment: string;

  @ApiProperty()
  score: number;

  @ApiProperty()
  max: number;
}

export class ProgressReportOutputDto {
  @ApiProperty()
  student_id: string;

  @ApiProperty()
  student_name: string;

  @ApiProperty({ type: [MarksDetailDto] })
  marks: MarksDetailDto[];

  @ApiProperty()
  internal_marks_placeholder: number;

  @ApiProperty()
  graded_placeholder: string;

  @ApiProperty()
  generated_at: string;
}
