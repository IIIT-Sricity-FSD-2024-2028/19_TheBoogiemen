import { IsUUID, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReplyInputDto {
  @ApiProperty()
  @IsUUID()
  post_id: string;

  @ApiProperty()
  @IsString()
  content: string;
}
