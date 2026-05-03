import { IsUUID, IsEnum, IsISO8601 } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum EventTypeEnum {
  LECTURE = 'lecture',
  ASSESSMENT = 'assessment',
  SEMINAR = 'seminar'
}

export class ScheduleEventInputDto {
  @ApiProperty()
  @IsUUID()
  resource_id: string;

  @ApiProperty()
  @IsISO8601()
  start_time: string;

  @ApiProperty()
  @IsISO8601()
  end_time: string;

  @ApiProperty({ enum: EventTypeEnum })
  @IsEnum(EventTypeEnum)
  event_type: 'lecture' | 'assessment' | 'seminar';
}
