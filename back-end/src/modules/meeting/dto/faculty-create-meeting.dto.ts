import { IsString, IsNotEmpty, IsOptional, IsEnum, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MeetingType } from '../enums/meeting-type.enum';

export class FacultyCreateMeetingDto {
  @ApiProperty({ description: 'User ID of the student', example: 'u1' })
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @ApiProperty({ description: 'Purpose/Topic of the meeting', example: 'Thesis Review & Feedback' })
  @IsString()
  @IsNotEmpty()
  purpose: string;

  @ApiPropertyOptional({ description: 'Detailed agenda or discussion points' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Meeting date in YYYY-MM-DD format', example: '2026-09-10' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'scheduledDate must be in YYYY-MM-DD format' })
  scheduledDate: string;

  @ApiProperty({ description: 'Start time in HH:mm 24h format', example: '10:00' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'scheduledStartTime must be in HH:mm 24-hour format' })
  scheduledStartTime: string;

  @ApiProperty({ description: 'End time in HH:mm 24h format', example: '10:30' })
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'scheduledEndTime must be in HH:mm 24-hour format' })
  scheduledEndTime: string;

  @ApiProperty({ enum: MeetingType, example: MeetingType.ONLINE })
  @IsEnum(MeetingType, { message: 'meetingType must be ONLINE or IN_PERSON' })
  meetingType: MeetingType;

  @ApiPropertyOptional({ description: 'Physical venue if IN_PERSON', example: 'Faculty Office Room 304' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Google Meet link if ONLINE', example: 'https://meet.google.com/abc-defg-hij' })
  @IsOptional()
  @IsString()
  meetingLink?: string;

  @ApiPropertyOptional({ description: 'Remarks or instructions for student', example: 'Please bring draft slides' })
  @IsOptional()
  @IsString()
  facultyRemarks?: string;
}
