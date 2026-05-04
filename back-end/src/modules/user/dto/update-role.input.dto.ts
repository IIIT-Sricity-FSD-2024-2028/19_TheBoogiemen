import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum UserRoleEnum {
  STUDENT = 'student',
  FACULTY = 'faculty',
  ADMIN = 'admin',
  ACADEMIC_HEAD = 'academic_head'
}

export class UpdateRoleInputDto {
  @ApiProperty({ enum: UserRoleEnum })
  @IsEnum(UserRoleEnum)
  role: 'student' | 'faculty' | 'admin' | 'academic_head';
}
