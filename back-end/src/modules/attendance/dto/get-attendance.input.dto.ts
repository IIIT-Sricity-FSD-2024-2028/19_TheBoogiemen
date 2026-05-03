import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetAttendanceInputDto {
  @ApiProperty({ description: 'UUID of the student', example: 'uuid-string' })
  @IsUUID()
  student_id: string;
}
