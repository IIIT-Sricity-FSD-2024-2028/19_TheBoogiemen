import { Injectable } from '@nestjs/common';
import { LEAVE_REQUEST, ATTENDANCE_LOG, ENROLLMENT, SECTION_INFO } from '../../common/types/interfaces';
import { MOCK_LEAVE_REQUESTS, MOCK_ATTENDANCE, MOCK_ENROLLMENTS, MOCK_SECTIONS } from '../../common/types/mock-data';

@Injectable()
export class LeaveRepository {
  public requests: LEAVE_REQUEST[] = MOCK_LEAVE_REQUESTS;
  public attendance_logs: ATTENDANCE_LOG[] = MOCK_ATTENDANCE;
  public enrollments: ENROLLMENT[] = MOCK_ENROLLMENTS;
  public sections: SECTION_INFO[] = MOCK_SECTIONS;

  constructor() {}

  async createLeave(data: LEAVE_REQUEST): Promise<LEAVE_REQUEST> { this.requests.push(data); return data; }
  async getLeave(id: string): Promise<LEAVE_REQUEST | undefined> { return this.requests.find(r => r.leave_id === id); }
  async updateLeaveStatus(id: string, status: 'APPROVED' | 'REJECTED'): Promise<LEAVE_REQUEST | null> {
    const l = await this.getLeave(id);
    if(l) { l.status = status; return l; }
    return null;
  }
}
