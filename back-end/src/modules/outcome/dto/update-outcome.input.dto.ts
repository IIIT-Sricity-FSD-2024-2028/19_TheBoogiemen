import { IsString, IsUUID, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateOutcomeInputDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  course_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}
