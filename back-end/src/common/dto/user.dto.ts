/**
 * user.dto.ts — strict shapes for user administration (audit C-04).
 *
 * `PUT /users/:id` previously took `@Body() body: any` and fed it straight into
 * `Object.assign(user, body)`, so a caller could set `role`, `password` or even
 * `user_id` on any account. These DTOs allowlist the mutable fields; combined
 * with `forbidNonWhitelisted` the server now rejects the extra keys outright
 * instead of silently ignoring them.
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export const ASSIGNABLE_ROLES = [
  'student',
  'faculty',
  'admin',
  'head',
  'superadmin',
] as const;
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

/**
 * Privilege ceiling. Mirrors the policy documented in README.md:
 *   - Super Admin  — full user management, all roles.
 *   - Academic Head / Admin — may manage students and faculty only, and
 *     explicitly "cannot add other Academic Heads or Super Admins".
 * Previously nothing enforced this and a `head` could mint a `superadmin`.
 */
const ROLE_GRANTS: Record<string, readonly AssignableRole[]> = {
  superadmin: ASSIGNABLE_ROLES,
  admin: ['student', 'faculty'],
  head: ['student', 'faculty'],
};

export function rolesAssignableBy(
  actorRole: string,
): readonly AssignableRole[] {
  return (
    ROLE_GRANTS[
      String(actorRole ?? '')
        .trim()
        .toLowerCase()
    ] ?? []
  );
}

export function canAssignRole(actorRole: string, targetRole: string): boolean {
  return rolesAssignableBy(actorRole).includes(
    String(targetRole ?? '')
      .trim()
      .toLowerCase() as AssignableRole,
  );
}

/** Fields a user administrator may change on an existing account. */
export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'jdoe' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  username?: string;

  @ApiPropertyOptional({ example: 'John' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  first_name?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  last_name?: string;

  @ApiPropertyOptional({ example: 'john.doe@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '9876543210' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;
}

/** Creating an account. `role` is validated here and authorised against the caller separately. */
export class CreateUserDto {
  @ApiProperty({ example: 'new.user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'student', enum: ASSIGNABLE_ROLES })
  @IsIn(ASSIGNABLE_ROLES as unknown as string[])
  role: AssignableRole;

  @ApiPropertyOptional({ example: 'Jane' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  first_name?: string;

  @ApiPropertyOptional({ example: 'Roe' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  last_name?: string;

  @ApiPropertyOptional({ example: 'jroe' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  username?: string;

  @ApiPropertyOptional({ example: '9876543210' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({
    description: 'Initial password. Minimum 8 characters.',
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}

/**
 * Role changes live on their own endpoint so a routine profile edit can never
 * carry one, and so the privilege ceiling is applied in exactly one place.
 */
export class UpdateUserRoleDto {
  @ApiProperty({ example: 'faculty', enum: ASSIGNABLE_ROLES })
  @IsIn(ASSIGNABLE_ROLES as unknown as string[])
  role: AssignableRole;
}

/** Admin-initiated password reset — separate from the self-service change-password flow. */
export class ResetUserPasswordDto {
  @ApiProperty({
    description:
      'New password. Minimum 8 characters with upper, lower, digit and special.',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    {
      message:
        'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number and a special character (@$!%*?&)',
    },
  )
  new_password: string;
}
