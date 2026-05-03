import { IsUUID, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePostInputDto {
  @ApiProperty()
  @IsUUID()
  topic_id: string;

  @ApiProperty()
  @IsString()
  @MinLength(10)
  content: string;
}
