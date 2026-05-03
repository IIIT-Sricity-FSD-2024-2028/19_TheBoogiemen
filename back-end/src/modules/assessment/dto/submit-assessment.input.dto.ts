import { IsUUID, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubmitAssessmentInputDto {
  @ApiProperty()
  @IsUUID()
  assessment_id: string;

  @ApiProperty()
  @IsUUID()
  student_id: string;

  @ApiProperty()
  @IsString()
  content: string;
}
