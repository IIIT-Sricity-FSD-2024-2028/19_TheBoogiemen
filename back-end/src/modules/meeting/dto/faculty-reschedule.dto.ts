import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import { MeetingType } from '../enums/meeting-type.enum';
import { MeetingPlatform } from '../enums/meeting-platform.enum';

export class FacultyRescheduleDto {
  @ApiProperty({ example: '2026-11-25', description: 'Updated confirmed date (YYYY-MM-DD)' })
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

  @ApiPropertyOptional({ description: 'Reason for rescheduling' })
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

  @ApiPropertyOptional({ description: 'Updated Google Meet link (for ONLINE)' })
  @IsString()
  @IsOptional()
  meetingLink?: string;

  @ApiPropertyOptional({ description: 'Updated building/room location (for IN_PERSON)' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({ description: 'Remarks or instructions for student' })
  @IsString()
  @IsOptional()
  facultyRemarks?: string;
}
