import { IsUUID, IsNumber, IsOptional, IsEnum, IsString, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateFeePaymentInputDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  student_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  fee_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  transaction_id?: string;

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
