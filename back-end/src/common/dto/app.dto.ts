import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

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

  @ApiPropertyOptional({
    description: 'Portal chosen on the sign-in page. When given, the account role must belong to it.',
    enum: ['student', 'faculty', 'hod', 'director', 'finance', 'spoc', 'support'],
  })
  @IsOptional()
  @IsIn(['student', 'faculty', 'hod', 'director', 'finance', 'spoc', 'support'])
  portal?: string;
}

export class SignupDto {
  @ApiProperty({ example: 'student@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Same policy as change-password' })
  @IsNotEmpty()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {
    message: 'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number and a special character (@$!%*?&)',
  })
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

export class ForgotPasswordDto {
  @ApiProperty({ example: 'student@example.com' })
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Single-use token from the reset link' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ description: PASSWORD_POLICY_MESSAGE })
  @IsNotEmpty()
  @MinLength(8)
  @Matches(PASSWORD_POLICY, { message: PASSWORD_POLICY_MESSAGE })
  new_password: string;
}

export class UpdateMyProfileDto {
  @ApiPropertyOptional({ example: '9876543210' })
  @IsOptional()
  @Matches(/^[0-9+\-\s]{7,15}$/, { message: 'Phone must be 7-15 digits (spaces, + and - allowed)' })
  phone?: string;

  @ApiPropertyOptional({ example: 'Hostel Block A, Room 101' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  @ApiPropertyOptional({ description: 'file_id returned by POST /uploads, or null to remove the photo' })
  @IsOptional()
  @IsString()
  photo_file_id?: string | null;
}
