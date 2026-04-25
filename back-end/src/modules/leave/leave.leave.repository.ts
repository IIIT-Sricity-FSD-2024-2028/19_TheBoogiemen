import { Injectable } from '@nestjs/common';
import { LEAVE_REQUEST, ATTENDANCE_LOG, ENROLLMENT, SECTION_INFO } from '../../common/types/interfaces';
import { SEED } from '../../common/types/seed-constants';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LeaveRepository {
  public requests: LEAVE_REQUEST[] = [];
  public attendance_logs: ATTENDANCE_LOG[] = [];
  public enrollments: ENROLLMENT[] = [];
  public sections: SECTION_INFO[] = [];

  constructor() {
    this.requests.push(
      { leave_id: uuidv4(), student_id: SEED.STUDENTS[0], start_date: '2025-01-01', end_date: '2025-01-03', reason: 'Sick', status: 'PENDING' },
      { leave_id: uuidv4(), student_id: SEED.STUDENTS[1], start_date: '2025-02-01', end_date: '2025-02-02', reason: 'Family', status: 'APPROVED' }
    );
    this.enrollments.push({ enrollment_id: 'enr1', student_id: SEED.STUDENTS[0], section_id: SEED.SECTIONS[0] });
    this.sections.push({ section_id: SEED.SECTIONS[0], course_id: SEED.COURSES[0], faculty_id: SEED.FACULTY[0] });
    this.attendance_logs.push(
      { log_id: uuidv4(), enrollment_id: 'enr1', date: '2025-01-02', status: 'ABSENT' }
    );
  }

  async createLeave(data: LEAVE_REQUEST): Promise<LEAVE_REQUEST> { this.requests.push(data); return data; }
  async getLeave(id: string): Promise<LEAVE_REQUEST | undefined> { return this.requests.find(r => r.leave_id === id); }
  async updateLeaveStatus(id: string, status: 'APPROVED' | 'REJECTED'): Promise<LEAVE_REQUEST | null> {
    const l = await this.getLeave(id);
    if(l) { l.status = status; return l; }
    return null;
  }
}
