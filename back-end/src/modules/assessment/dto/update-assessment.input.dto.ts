import { IsString, IsEnum, IsNumber, Min, IsISO8601, IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAssessmentInputDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  course_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ enum: ['QUIZ', 'ASSIGNMENT', 'EXAM'] })
  @IsOptional()
  @IsEnum(['QUIZ', 'ASSIGNMENT', 'EXAM'])
  type?: 'QUIZ' | 'ASSIGNMENT' | 'EXAM';

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  max_marks?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  due_date?: string;
}
