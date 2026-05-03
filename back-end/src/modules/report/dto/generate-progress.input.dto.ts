import { IsUUID, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateProgressInputDto {
  @ApiProperty({ description: 'Faculty UUID', example: 'uuid-string' })
  @IsUUID()
  faculty_id: string;

  @ApiPropertyOptional({ description: 'Course UUID', example: 'uuid-string' })
  @IsOptional()
  @IsUUID()
  course_id?: string;
}
