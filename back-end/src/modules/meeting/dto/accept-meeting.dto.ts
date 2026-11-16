import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { MeetingType } from '../enums/meeting-type.enum';
import { MeetingPlatform } from '../enums/meeting-platform.enum';

export class AcceptMeetingDto {
  @ApiProperty({ example: '2026-11-20', description: 'Confirmed meeting date (YYYY-MM-DD)' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'scheduledDate must be formatted as YYYY-MM-DD' })
  scheduledDate: string;

  @ApiProperty({ example: '10:00', description: 'Confirmed start time (HH:mm)' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'scheduledStartTime must be formatted as HH:mm' })
  scheduledStartTime: string;

  @ApiProperty({ example: '10:30', description: 'Confirmed end time (HH:mm)' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'scheduledEndTime must be formatted as HH:mm' })
  scheduledEndTime: string;

  @ApiPropertyOptional({ enum: MeetingType, example: MeetingType.ONLINE })
  @IsEnum(MeetingType)
  @IsOptional()
  meetingType?: MeetingType;

  @ApiPropertyOptional({ enum: MeetingPlatform, example: MeetingPlatform.GOOGLE_MEET })
  @IsEnum(MeetingPlatform)
  @IsOptional()
  meetingPlatform?: MeetingPlatform;

  @ApiPropertyOptional({ description: 'Google Meet or other valid meeting link (for ONLINE)' })
  @IsString()
  @IsOptional()
  meetingLink?: string;

  @ApiPropertyOptional({ description: 'Building/room location (for IN_PERSON)' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({ description: 'Faculty remarks or instructions' })
  @IsString()
  @IsOptional()
  facultyRemarks?: string;
}
