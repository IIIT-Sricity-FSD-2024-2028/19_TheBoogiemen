import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsOptional, IsString, Matches } from 'class-validator';
import { MeetingType } from '../enums/meeting-type.enum';
import { MeetingPlatform } from '../enums/meeting-platform.enum';

export class HandleStudentRescheduleDto {
  @ApiProperty({ enum: ['ACCEPT', 'DENY', 'PROPOSE'], example: 'ACCEPT' })
  @IsIn(['ACCEPT', 'DENY', 'PROPOSE'])
  action: 'ACCEPT' | 'DENY' | 'PROPOSE';

  @ApiPropertyOptional({ description: 'Reason if denying the reschedule request' })
  @IsString()
  @IsOptional()
  denialReason?: string;

  @ApiPropertyOptional({ example: '2026-09-08', description: 'Alternative date if PROPOSE' })
  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'proposedDate must be formatted as YYYY-MM-DD' })
  proposedDate?: string;

  @ApiPropertyOptional({ example: '14:00', description: 'Alternative start time if PROPOSE' })
  @IsString()
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'proposedStartTime must be formatted as HH:mm' })
  proposedStartTime?: string;

  @ApiPropertyOptional({ example: '14:30', description: 'Alternative end time if PROPOSE' })
  @IsString()
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'proposedEndTime must be formatted as HH:mm' })
  proposedEndTime?: string;

  @ApiPropertyOptional({ description: 'Reason for counter-proposal' })
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
