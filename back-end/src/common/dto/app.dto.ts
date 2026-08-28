import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'student@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password' })
  @IsNotEmpty()
  password: string;

  @ApiPropertyOptional({ example: 'IIITS' })
  @IsOptional()
  @IsString()
  tenant_code?: string;
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

/**
 * The login form refuses any password that is not 8+ characters with an
 * uppercase letter, a lowercase letter, a digit and a special character. The
 * server used to accept a 4-character password here, so a user could set one
 * successfully and then be permanently unable to sign in. The rule below is the
 * same one the login form applies, enforced server-side.
 */
export const PASSWORD_POLICY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
export const PASSWORD_POLICY_MESSAGE =
  'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number and a special character (@$!%*?&)';

export class ChangePasswordDto {
  @ApiProperty({ description: 'Current password' })
  @IsNotEmpty()
  current_password: string;

  @ApiProperty({ description: PASSWORD_POLICY_MESSAGE })
  @IsNotEmpty()
  @MinLength(8)
  @Matches(PASSWORD_POLICY, { message: PASSWORD_POLICY_MESSAGE })
  new_password: string;
}
