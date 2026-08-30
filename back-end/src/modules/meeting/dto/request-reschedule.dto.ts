import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';

export class RequestRescheduleDto {
  @ApiProperty({ example: '2026-09-07', description: 'Student proposed new date (YYYY-MM-DD)' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'proposedDate must be formatted as YYYY-MM-DD' })
  proposedDate: string;

  @ApiProperty({ example: '14:00', description: 'Student proposed start time (HH:mm)' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'proposedStartTime must be formatted as HH:mm' })
  proposedStartTime: string;

  @ApiProperty({ example: '14:30', description: 'Student proposed end time (HH:mm)' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'proposedEndTime must be formatted as HH:mm' })
  proposedEndTime: string;

  @ApiPropertyOptional({ example: 'I have a class during the original time.', description: 'Reason for reschedule request' })
  @IsString()
  @IsOptional()
  rescheduleReason?: string;
}
