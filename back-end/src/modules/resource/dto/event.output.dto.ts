import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EventOutputDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  resource_id: string;

  @ApiProperty()
  start_time: string;

  @ApiProperty()
  end_time: string;

  @ApiProperty()
  event_type: string;

  @ApiPropertyOptional()
  venue_id?: string;
}
