import { IsUUID, IsString, IsEnum, IsNumber, Min, IsISO8601 } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAssessmentInputDto {
  @ApiProperty()
  @IsUUID()
  course_id: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty({ enum: ['QUIZ', 'ASSIGNMENT', 'EXAM'] })
  @IsEnum(['QUIZ', 'ASSIGNMENT', 'EXAM'])
  type: 'QUIZ' | 'ASSIGNMENT' | 'EXAM';

  @ApiProperty()
  @IsNumber()
  @Min(1)
  max_marks: number;

  @ApiProperty()
  @IsISO8601()
  due_date: string;
}
