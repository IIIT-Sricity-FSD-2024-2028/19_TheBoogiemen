import { IsUUID, IsISO8601, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAttendanceInputDto {
  @ApiProperty()
  @IsUUID()
  enrollment_id: string;

  @ApiProperty()
  @IsISO8601()
  date: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timeslot?: string;

  @ApiProperty({ enum: ['PRESENT', 'ABSENT', 'EXCUSED'] })
  @IsEnum(['PRESENT', 'ABSENT', 'EXCUSED'])
  status: 'PRESENT' | 'ABSENT' | 'EXCUSED';
}
