import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import { MeetingType } from '../enums/meeting-type.enum';
import { MeetingPlatform } from '../enums/meeting-platform.enum';

export class AskRescheduleDto {
  @ApiProperty({ example: '2026-09-06', description: 'Proposed meeting date (YYYY-MM-DD)' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'proposedDate must be formatted as YYYY-MM-DD' })
  proposedDate: string;

  @ApiProperty({ example: '11:00', description: 'Proposed start time (HH:mm)' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'proposedStartTime must be formatted as HH:mm' })
  proposedStartTime: string;

  @ApiProperty({ example: '11:30', description: 'Proposed end time (HH:mm)' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'proposedEndTime must be formatted as HH:mm' })
  proposedEndTime: string;

  @ApiPropertyOptional({ description: 'Reason for requesting reschedule' })
  @IsString()
  @IsOptional()
  rescheduleReason?: string;

  @ApiPropertyOptional({ enum: MeetingType, example: MeetingType.ONLINE })
  @IsEnum(MeetingType)
  @IsOptional()
  meetingType?: MeetingType;

  @ApiPropertyOptional({ enum: MeetingPlatform, example: MeetingPlatform.GOOGLE_MEET })
  @IsEnum(MeetingPlatform)
  @IsOptional()
  meetingPlatform?: MeetingPlatform;

  @ApiPropertyOptional({ example: 'https://meet.google.com/abc-defg-hij', description: 'Google Meet link if ONLINE' })
  @IsString()
  @IsOptional()
  meetingLink?: string;

  @ApiPropertyOptional({ example: 'Block A, Room 203', description: 'Physical venue if IN_PERSON' })
  @IsString()
  @IsOptional()
  location?: string;
}
