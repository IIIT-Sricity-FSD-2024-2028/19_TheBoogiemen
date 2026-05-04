import { ApiProperty } from '@nestjs/swagger';

export class PostOutputDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  topic_id: string;

  @ApiProperty()
  author_id: string;

  @ApiProperty()
  content: string;

  @ApiProperty()
  created_at: string;

  @ApiProperty()
  replies_count: number;
}
