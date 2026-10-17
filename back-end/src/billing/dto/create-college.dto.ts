/**
 * create-college.dto.ts — provisioning a college and its SPOC in one action.
 *
 * Deliberately not two separate calls (create college, then create a user).
 * A college with no SPOC is a customer record nobody can act on; a SPOC with
 * no college is a role with nothing to be scoped to. Doing both atomically
 * means neither dangling state can exist.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CollegeDetailsDto {
  @ApiProperty({ example: 'St. Xavier College of Engineering' })
  @IsString()
  @MaxLength(160)
  name: string;

  @ApiPropertyOptional({ example: 'Mumbai' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @ApiPropertyOptional({ example: 'Maharashtra' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  state?: string;

  @ApiPropertyOptional({ example: 'private', enum: ['government', 'private', 'deemed'] })
  @IsOptional()
  @IsIn(['government', 'private', 'deemed'])
  type?: string;
}

export class SpocDetailsDto {
  @ApiProperty({ example: 'spoc@stxaviers.edu' })
  @IsEmail()
  email: string;

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

  // Same minimum as CreateUserDto (common/dto/user.dto.ts) — this is the same
  // kind of act: an operator provisioning an account for someone else, not
  // that person choosing their own password. There is no delivery channel
  // for this credential yet (NotificationService is a logged stub) — see the
  // response shape note in colleges.controller.ts.
  @ApiPropertyOptional({ description: 'Initial password. Minimum 8 characters.' })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}

export class CreateCollegeDto {
  @ApiProperty({ type: CollegeDetailsDto })
  @ValidateNested()
  @Type(() => CollegeDetailsDto)
  college: CollegeDetailsDto;

  @ApiProperty({ type: SpocDetailsDto })
  @ValidateNested()
  @Type(() => SpocDetailsDto)
  spoc: SpocDetailsDto;
}
