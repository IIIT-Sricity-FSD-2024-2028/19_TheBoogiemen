import { IsUUID, IsString, IsISO8601, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApplyLeaveInputDto {
  @ApiProperty()
  @IsUUID()
  student_id: string;

  @ApiProperty()
  @IsISO8601()
  start_date: string;

  @ApiProperty()
  @IsISO8601()
  end_date: string;

  @ApiProperty()
  @IsString()
  reason: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  doc_ref?: string;
}
