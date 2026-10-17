/**
 * onboarding-start.dto.ts — stage 1 of self-service onboarding: the
 * prospect's own details and their chosen password.
 *
 * Deliberately not SpocDetailsDto (create-college.dto.ts) even though the
 * fields overlap: that DTO's password is optional because a superadmin may
 * generate one on the SPOC's behalf. Here the SPOC is choosing their own
 * live credential, so it is required and held to the same strength policy
 * as every other self-chosen password in this app (ChangePasswordDto,
 * common/dto/app.dto.ts). CollegeDetailsDto — the shape, not the meaning —
 * is reused as-is; a college's name/city/state/type do not change depending
 * on who is describing them.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PASSWORD_POLICY, PASSWORD_POLICY_MESSAGE } from '../../common/dto/app.dto';
import { CollegeDetailsDto } from './create-college.dto';

export class OnboardingStartDto {
  @ApiProperty({ example: 'spoc@stxaviers.edu' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: PASSWORD_POLICY_MESSAGE })
  @Matches(PASSWORD_POLICY, { message: PASSWORD_POLICY_MESSAGE })
  password: string;

  @ApiPropertyOptional({ example: 'Anita' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  first_name?: string;

  @ApiPropertyOptional({ example: 'Rao' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  last_name?: string;

  @ApiPropertyOptional({ example: '9876543210' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiProperty({ type: CollegeDetailsDto })
  @ValidateNested()
  @Type(() => CollegeDetailsDto)
  college: CollegeDetailsDto;
}
