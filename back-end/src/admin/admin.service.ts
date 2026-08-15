import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { InMemoryDbService } from '../database/in-memory-db.service';
import { syncLeaveAttendance } from '../common/leave-attendance.sync';

@Injectable()
export class AdminService {
  constructor(private db: InMemoryDbService) {}

  async getLeaves() {
    return this.db.leave_applications;
  }

  async updateLeaveStatus(leaveId: string, status: string) {
    const leave = this.db.leave_applications.find((l) => l.leave_id === leaveId);
    if (!leave) throw new NotFoundException('Leave application not found');

    const normalized = String(status ?? '').trim().toLowerCase();
    if (!['pending', 'approved', 'rejected'].includes(normalized)) {
      throw new BadRequestException('status must be one of: pending, approved, rejected');
    }

    leave.status = normalized;
    this.db.persist();

    // M-02: this is the second leave-approval path (PUT /api/admin/leave/:id).
    // It must keep attendance in step exactly as PATCH /api/leave/:id does,
    // otherwise approving here would still leave the student marked absent.
    syncLeaveAttendance(this.db, leave, normalized);
    return leave;
  }

  async getTimetable(section: string) {
    const grid = this.db.timetable.filter((t) => t.section === section);
    return { grid, days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], times: ['09:00', '10:00', '11:00', '12:00'] };
  }

  async getEvents() {
    return this.db.events;
  }

  async createEvent(data: any) {
    // H-07: length-derived ids collide as soon as anything is deleted.
    const newEvent = { event_id: uuidv4(), ...data };
    this.db.events.push(newEvent);
    return newEvent;
  }

  async getDiscussions() {
    return this.db.discussion_posts;
  }
}
