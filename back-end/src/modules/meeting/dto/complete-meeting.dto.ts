import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CompleteMeetingDto {
  @ApiPropertyOptional({ description: 'Discussion notes from the meeting' })
  @IsString()
  @IsOptional()
  discussionNotes?: string;

  @ApiPropertyOptional({ description: 'Summary of the meeting outcome / progress reached' })
  @IsString()
  @IsOptional()
  outcome?: string;

  @ApiPropertyOptional({ description: 'Action items assigned to student' })
  @IsString()
  @IsOptional()
  actionItems?: string;

  @ApiPropertyOptional({ description: 'Faculty remarks or guidance' })
  @IsString()
  @IsOptional()
  facultyRemarks?: string;
}
