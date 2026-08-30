import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { MeetingType } from '../enums/meeting-type.enum';
import { MeetingPlatform } from '../enums/meeting-platform.enum';

export class CreateMeetingDto {
  @ApiProperty({ description: 'ID of the faculty member to meet' })
  @IsString()
  @IsNotEmpty()
  facultyId: string;

  @ApiProperty({ description: 'Purpose of the meeting' })
  @IsString()
  @IsNotEmpty()
  purpose: string;

  @ApiPropertyOptional({ description: 'Detailed reason or description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: '2026-09-05', description: 'Requested meeting date (YYYY-MM-DD)' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'requestedDate must be formatted as YYYY-MM-DD' })
  requestedDate: string;

  @ApiProperty({ example: '10:00', description: 'Requested start time (HH:mm)' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'requestedStartTime must be formatted as HH:mm' })
  requestedStartTime: string;

  @ApiProperty({ example: '10:30', description: 'Requested end time (HH:mm)' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'requestedEndTime must be formatted as HH:mm' })
  requestedEndTime: string;

  @ApiProperty({ enum: MeetingType, example: MeetingType.ONLINE })
  @IsEnum(MeetingType)
  meetingType: MeetingType;

  @ApiPropertyOptional({ enum: MeetingPlatform, example: MeetingPlatform.GOOGLE_MEET })
  @IsEnum(MeetingPlatform)
  @IsOptional()
  meetingPlatform?: MeetingPlatform;

  @ApiPropertyOptional({ description: 'In-person meeting location (if IN_PERSON)' })
  @IsString()
  @IsOptional()
  location?: string;
}
