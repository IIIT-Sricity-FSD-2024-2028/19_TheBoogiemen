import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'student@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password' })
  @IsNotEmpty()
  password: string;
}

export class SignupDto {
  @ApiProperty({ example: 'student@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password' })
  @IsNotEmpty()
  @MinLength(4)
  password: string;

  @ApiProperty({ example: 'student', enum: ['student', 'faculty'] })
  @IsNotEmpty()
  role: string;

  @ApiPropertyOptional({ example: 'John' })
  @IsOptional()
  @IsString()
  first_name?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsOptional()
  @IsString()
  last_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  branch?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  batch?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  section?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  designation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  department?: string;
}

export class ChangePasswordDto {
  @ApiProperty({ description: 'Current password' })
  @IsNotEmpty()
  current_password: string;

  @ApiProperty({ description: 'New password' })
  @IsNotEmpty()
  @MinLength(4)
  new_password: string;
}
