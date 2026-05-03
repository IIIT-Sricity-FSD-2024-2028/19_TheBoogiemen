import { ApiProperty } from '@nestjs/swagger';

export class PendingStudentDto {
  @ApiProperty()
  student_id: string;

  @ApiProperty()
  amount: number;
}

export class FeeAuditOutputDto {
  @ApiProperty()
  year_id: string;

  @ApiProperty()
  compliant_count: number;

  @ApiProperty()
  non_compliant_count: number;

  @ApiProperty({ type: [PendingStudentDto] })
  pending_students: PendingStudentDto[];
}
