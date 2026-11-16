import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class DenyMeetingDto {
  @ApiPropertyOptional({ description: 'Reason for denying the meeting request' })
  @IsString()
  @IsOptional()
  reason?: string;
}
