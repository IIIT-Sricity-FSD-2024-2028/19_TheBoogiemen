import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFeeAuditInputDto {
  @ApiProperty({ description: 'String representing the academic year', example: '2026' })
  @IsString()
  @IsNotEmpty()
  year_id: string;
}
