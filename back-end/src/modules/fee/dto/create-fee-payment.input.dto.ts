import { IsUUID, IsNumber, IsOptional, IsEnum, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFeePaymentInputDto {
  @ApiProperty()
  @IsUUID()
  student_id: string;

  @ApiProperty()
  @IsUUID()
  fee_id: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount_paid?: number;

  @ApiPropertyOptional({ enum: ['PENDING', 'PAID'] })
  @IsOptional()
  @IsEnum(['PENDING', 'PAID'])
  status?: 'PENDING' | 'PAID';
}
