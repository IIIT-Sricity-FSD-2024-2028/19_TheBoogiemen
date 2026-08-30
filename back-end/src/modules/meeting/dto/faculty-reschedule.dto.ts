import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import { MeetingType } from '../enums/meeting-type.enum';
import { MeetingPlatform } from '../enums/meeting-platform.enum';

export class FacultyRescheduleDto {
  @ApiProperty({ example: '2026-09-08', description: 'Updated confirmed date (YYYY-MM-DD)' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'scheduledDate must be formatted as YYYY-MM-DD' })
  scheduledDate: string;

  @ApiProperty({ example: '11:00', description: 'Updated confirmed start time (HH:mm)' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'scheduledStartTime must be formatted as HH:mm' })
  scheduledStartTime: string;

  @ApiProperty({ example: '11:30', description: 'Updated confirmed end time (HH:mm)' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'scheduledEndTime must be formatted as HH:mm' })
  scheduledEndTime: string;

  @ApiPropertyOptional({ example: 'Department meeting at the original time.', description: 'Reason for reschedule' })
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
