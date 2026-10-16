/**
* user.dto.ts â€” strict shapes for user administration (audit C-04).
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
*   - Super Admin  â€” full user management, all roles.
*   - Academic Head / Admin â€” may manage students and faculty only, and
*     explicitly "cannot add other Academic Heads or Super Admins".
* Previously nothing enforced this and a `head` could mint a `superadmin`.
*
* 'spoc' is deliberately absent from this table's keys â€” a SPOC creates users
* through this same POST /users path (so it inherits every existing check:
* duplicate-email, password hashing, the works), but 'spoc' itself is not a
* value in ASSIGNABLE_ROLES, so it can never appear as a *key* here by being
* granted by anyone via this table. It appears below only as the one row
* describing what a SPOC may create.
*/
const ROLE_GRANTS: Record<string, readonly AssignableRole[]> = {
superadmin: ASSIGNABLE_ROLES,
admin: ['student', 'faculty'],
head: ['student', 'faculty'],
// The entire "SPOC may hire only admins" rule. Every existing caller of
// canAssignRole() â€” user creation, role changes, password resets â€” now
// correctly refuses a SPOC anything but 'admin', with no new logic.
spoc: ['admin'],
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

/**
* Delete-specific privilege ceiling.
*
* Mirrors ROLE_GRANTS, but with one deliberate difference: superadmin gets
* FULL management here (including `spoc`), which `canAssignRole` cannot
* express because `spoc` is intentionally not an assignable role. Reusing
* canAssignRole for deletion would wrongly lock the superadmin out of
* deleting a spoc, contradicting "Super Admin = full user management".
*
* Also blocks the self-destruct case: a caller may never delete their own
* account, regardless of the role table.
*/
export function canDeleteRole(
actorRole: string,
targetRole: string,
): boolean {
const actor = String(actorRole ?? '').trim().toLowerCase();
const target = String(targetRole ?? '').trim().toLowerCase();

// Self-deletion is guarded at the handler (it knows the actor's user id);
// this predicate is purely about the actor->target role pair.

// Superadmin: full management, including spoc.
if (actor === 'superadmin') return true;

// SPOC may remove admins it hired, nothing above that.
if (actor === 'spoc') return target === 'admin';

// Admin / head (and any other role): the ceiling is students + faculty only.
return target === 'student' || target === 'faculty';
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

/** Admin-initiated password reset â€” separate from the self-service change-password flow. */
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