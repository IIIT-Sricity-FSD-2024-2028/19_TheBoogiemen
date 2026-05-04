import { ApiProperty } from '@nestjs/swagger';

export class AttendanceOutputDto {
  @ApiProperty()
  course_id: string;

  @ApiProperty()
  course_name: string;

  @ApiProperty()
  total_classes: number;

  @ApiProperty()
  attended: number;

  @ApiProperty()
  percentage: number;

  @ApiProperty()
  flagged: boolean;
}
