import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LeaveOutputDto {
  @ApiProperty()
  leave_id: string;

  @ApiProperty()
  student_id: string;

  @ApiProperty()
  start_date: string;

  @ApiProperty()
  end_date: string;

  @ApiProperty()
  reason: string;

  @ApiPropertyOptional()
  doc_ref?: string;

  @ApiProperty()
  status: string;
}
