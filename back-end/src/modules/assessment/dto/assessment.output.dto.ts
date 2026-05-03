import { ApiProperty } from '@nestjs/swagger';

export class AssessmentOutputDto {
  @ApiProperty()
  assessment_id: string;

  @ApiProperty()
  course_id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  max_marks: number;

  @ApiProperty()
  due_date: string;
}

export class MarksEntryOutputDto {
  @ApiProperty()
  entry_id: string;

  @ApiProperty()
  assessment_id: string;

  @ApiProperty()
  student_id: string;

  @ApiProperty()
  marks: number;

  @ApiProperty()
  status: string;
}
