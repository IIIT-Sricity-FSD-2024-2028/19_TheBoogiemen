import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';

export class RequestRescheduleDto {
  @ApiProperty({ example: '2026-11-23', description: 'Student proposed new date (YYYY-MM-DD)' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'proposedDate must be formatted as YYYY-MM-DD' })
  proposedDate: string;

  @ApiProperty({ example: '15:00', description: 'Student proposed new start time (HH:mm)' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'proposedStartTime must be formatted as HH:mm' })
  proposedStartTime: string;

  @ApiProperty({ example: '15:30', description: 'Student proposed new end time (HH:mm)' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'proposedEndTime must be formatted as HH:mm' })
  proposedEndTime: string;

  @ApiPropertyOptional({ description: 'Reason for requesting reschedule' })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({ description: 'Reschedule reason alias' })
  @IsString()
  @IsOptional()
  rescheduleReason?: string;
}
