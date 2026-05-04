import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ApproveLeaveInputDto {
  @ApiProperty()
  @IsUUID()
  leave_id: string;
}
