import { IsUUID, IsISO8601, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAttendanceInputDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  enrollment_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timeslot?: string;

  @ApiPropertyOptional({ enum: ['PRESENT', 'ABSENT', 'EXCUSED'] })
  @IsOptional()
  @IsEnum(['PRESENT', 'ABSENT', 'EXCUSED'])
  status?: 'PRESENT' | 'ABSENT' | 'EXCUSED';
}
