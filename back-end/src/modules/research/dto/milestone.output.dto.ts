import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MilestoneOutputDto {
  @ApiProperty()
  milestone_id: string;

  @ApiProperty()
  project_id: string;

  @ApiPropertyOptional()
  title?: string;

  @ApiPropertyOptional()
  submission_date?: string;

  @ApiPropertyOptional()
  file_type?: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  comments?: string;

  @ApiProperty()
  status: string;
}
