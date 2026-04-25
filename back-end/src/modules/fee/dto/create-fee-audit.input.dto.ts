import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFeeAuditInputDto {
  @ApiProperty({ description: 'UUID of the academic year', example: 'uuid-string' })
  @IsUUID()
  year_id: string;
}
