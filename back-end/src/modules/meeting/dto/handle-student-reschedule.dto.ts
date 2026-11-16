import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsOptional, IsString, Matches } from 'class-validator';
import { MeetingType } from '../enums/meeting-type.enum';
import { MeetingPlatform } from '../enums/meeting-platform.enum';

export class HandleStudentRescheduleDto {
  @ApiProperty({ enum: ['ACCEPT', 'DENY', 'PROPOSE'], example: 'ACCEPT' })
  @IsIn(['ACCEPT', 'DENY', 'PROPOSE'])
  action: 'ACCEPT' | 'DENY' | 'PROPOSE';

  @ApiPropertyOptional({ description: 'Reason for action (optional on ACCEPT, required on DENY)' })
  @IsString()
  @IsOptional()
  reason?: string;

  // Fields below are used when action === 'PROPOSE'
  @ApiPropertyOptional({ example: '2026-11-24', description: 'Counter-proposed date (YYYY-MM-DD)' })
  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'proposedDate must be formatted as YYYY-MM-DD' })
  proposedDate?: string;

  @ApiPropertyOptional({ example: '11:00', description: 'Counter-proposed start time (HH:mm)' })
  @IsString()
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'proposedStartTime must be formatted as HH:mm' })
  proposedStartTime?: string;

  @ApiPropertyOptional({ example: '11:30', description: 'Counter-proposed end time (HH:mm)' })
  @IsString()
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'proposedEndTime must be formatted as HH:mm' })
  proposedEndTime?: string;

  @ApiPropertyOptional({ enum: MeetingType, example: MeetingType.ONLINE })
  @IsEnum(MeetingType)
  @IsOptional()
  meetingType?: MeetingType;

  @ApiPropertyOptional({ enum: MeetingPlatform, example: MeetingPlatform.GOOGLE_MEET })
  @IsEnum(MeetingPlatform)
  @IsOptional()
  meetingPlatform?: MeetingPlatform;

  @ApiPropertyOptional({ description: 'Meeting link' })
  @IsString()
  @IsOptional()
  meetingLink?: string;

  @ApiPropertyOptional({ description: 'Location' })
  @IsString()
  @IsOptional()
  location?: string;
}
