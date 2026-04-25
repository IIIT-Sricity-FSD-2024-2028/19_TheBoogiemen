import { IsUUID, IsEnum, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UploadMilestoneInputDto {
  @ApiProperty()
  @IsUUID()
  project_id: string;

  @ApiProperty({ enum: ['PDF', 'DOCX'] })
  @IsEnum(['PDF', 'DOCX'])
  file_type: 'PDF' | 'DOCX';

  @ApiProperty()
  @IsString()
  description: string;
}
