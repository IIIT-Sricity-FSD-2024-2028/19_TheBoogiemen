import { IsUUID, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GradeInputDto {
  @ApiProperty()
  @IsUUID()
  entry_id: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  marks: number;
}
