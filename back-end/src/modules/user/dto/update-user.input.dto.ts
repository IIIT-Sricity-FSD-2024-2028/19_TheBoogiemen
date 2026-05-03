import { IsString, IsEmail, IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRoleEnum } from './update-role.input.dto';

export class UpdateUserInputDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ enum: UserRoleEnum })
  @IsOptional()
  @IsEnum(UserRoleEnum)
  role?: 'student' | 'faculty' | 'admin' | 'academic_head';
}
