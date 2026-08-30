import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { InMemoryDbService } from '../database/in-memory-db.service';
import { syncLeaveAttendance } from '../common/leave-attendance.sync';
import { ErrorCode, errorBody } from '../common/errors/error-codes';
import {
  isSameCollege,
  scopeToCollege,
  writeCollegeId,
} from '../common/tenancy/scope-to-college';

@Injectable()
export class AdminService {
  constructor(private db: InMemoryDbService) {}

  async getLeaves(collegeId: string | null) {
    return scopeToCollege(this.db.leave_applications, collegeId);
  }

  async updateLeaveStatus(
    leaveId: string,
    status: string,
    collegeId: string | null,
  ) {
    const leave = this.db.leave_applications.find(
      (l) => l.leave_id === leaveId,
    );
    if (!isSameCollege(leave, collegeId))
      throw new NotFoundException(
        errorBody(ErrorCode.RESOURCE_NOT_FOUND, 'Leave application not found'),
      );

    const normalized = String(status ?? '')
      .trim()
      .toLowerCase();
    if (!['pending', 'approved', 'rejected'].includes(normalized)) {
      throw new BadRequestException(
        errorBody(
          ErrorCode.BUSINESS_RULE_VIOLATION,
          'status must be one of: pending, approved, rejected',
        ),
      );
    }

    leave.status = normalized;
    this.db.persist();

    // M-02: this is the second leave-approval path (PUT /api/admin/leave/:id).
    // It must keep attendance in step exactly as PATCH /api/leave/:id does,
    // otherwise approving here would still leave the student marked absent.
    syncLeaveAttendance(this.db, leave, normalized);
    return leave;
  }

  async getTimetable(section: string, collegeId: string | null) {
    const grid = scopeToCollege(this.db.timetable, collegeId).filter(
      (t) => t.section === section,
    );
    return {
      grid,
      days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      times: ['09:00', '10:00', '11:00', '12:00'],
    };
  }

  async getEvents(collegeId: string | null) {
    return scopeToCollege(this.db.events, collegeId);
  }

  async createEvent(data: any, actorCollegeId: string | null) {
    // H-07: length-derived ids collide as soon as anything is deleted.
    const newEvent = {
      event_id: uuidv4(),
      ...data,
      college_id: writeCollegeId(actorCollegeId),
    };
    this.db.events.push(newEvent);
    return newEvent;
  }

  async getDiscussions(collegeId: string | null) {
    return scopeToCollege(this.db.discussion_posts, collegeId);
  }
}
