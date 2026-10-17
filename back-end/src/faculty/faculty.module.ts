import { Module } from '@nestjs/common';
import { FacultyController } from './faculty.controller';
import { FacultyService } from './faculty.service';

@Module({
  controllers: [FacultyController],
  providers: [FacultyService],
})
export class FacultyModule {}
