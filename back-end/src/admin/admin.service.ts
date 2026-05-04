import { Injectable } from '@nestjs/common';
import { InMemoryDbService } from '../database/in-memory-db.service';

@Injectable()
export class AdminService {
  constructor(private db: InMemoryDbService) {}

  async getLeaves() {
    return this.db.leave_applications;
  }

  async updateLeaveStatus(leaveId: string, status: string) {
    const leave = this.db.leave_applications.find((l) => l.leave_id === leaveId);
    if (leave) leave.status = status;
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
    const eventId = `ev${this.db.events.length + 1}`;
    const newEvent = { event_id: eventId, ...data };
    this.db.events.push(newEvent);
    return newEvent;
  }

  async getDiscussions() {
    return this.db.discussion_posts;
  }
}
