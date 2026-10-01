import { Module } from '@nestjs/common';
import { AcademicsModule } from '../academics/academics.module';
import { AttendanceModule } from '../attendance/attendance.module';
import { StudentsController } from './students.controller';

@Module({ imports: [AcademicsModule, AttendanceModule], controllers: [StudentsController] })
export class StudentsModule {}
