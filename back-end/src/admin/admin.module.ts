import { Module } from '@nestjs/common';
import { CommonController } from './common.controller';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from '../core/entities/course.entity';
import { Enrollment } from '../core/entities/enrollment.entity';
import { Assessment } from '../core/entities/assessment.entity';
import { Submission } from '../core/entities/submission.entity';
import { MarksEntry } from '../core/entities/marks-entry.entity';
import { AttendanceLog } from '../core/entities/attendance-log.entity';
import { LeaveRequest } from '../core/entities/leave-request.entity';
import { ForumPost } from '../core/entities/forum-post.entity';
import { ForumReply } from '../core/entities/forum-reply.entity';
import { Event } from '../core/entities/event.entity';
import { ResearchProject } from '../core/entities/research-project.entity';
import { User } from '../core/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Course, Enrollment, Assessment, Submission, MarksEntry, 
      AttendanceLog, LeaveRequest, ForumPost, ForumReply, 
      Event, ResearchProject, User
    ])
  ],
  controllers: [CommonController, AdminController],
  providers: [AdminService],
})
export class AdminModule {}
