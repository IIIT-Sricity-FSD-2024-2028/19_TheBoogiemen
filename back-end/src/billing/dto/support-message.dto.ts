import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

/** Shared by both directions: a SPOC's first/next message, and superadmin's reply. */
export class SendSupportMessageDto {
  @ApiProperty({ example: 'Our renewal quote looks off — 600 students, not 6000.' })
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(4000)
  content: string;
}
