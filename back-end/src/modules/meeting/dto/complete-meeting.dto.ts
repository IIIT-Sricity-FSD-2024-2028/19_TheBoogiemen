import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CompleteMeetingDto {
  @ApiPropertyOptional({ description: 'Discussion notes from the meeting' })
  @IsString()
  @IsOptional()
  discussionNotes?: string;

  @ApiPropertyOptional({ description: 'Summary of the meeting outcome' })
  @IsString()
  @IsOptional()
  outcome?: string;

  @ApiPropertyOptional({ description: 'Action items agreed upon during the meeting' })
  @IsString()
  @IsOptional()
  actionItems?: string;

  @ApiPropertyOptional({ description: 'Faculty remarks/evaluation' })
  @IsString()
  @IsOptional()
  facultyRemarks?: string;
}
