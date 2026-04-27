import { Injectable } from '@nestjs/common';
import { ATTENDANCE_LOG, ENROLLMENT, SECTION_INFO } from '../../common/types/interfaces';
import { MOCK_ATTENDANCE, MOCK_ENROLLMENTS, MOCK_SECTIONS } from '../../common/types/mock-data';

@Injectable()
export class AttendanceRepository {
  public logs: ATTENDANCE_LOG[] = MOCK_ATTENDANCE;
  public enrollments: ENROLLMENT[] = MOCK_ENROLLMENTS;
  public sections: SECTION_INFO[] = MOCK_SECTIONS;

  constructor() {}

  async findAll(): Promise<ATTENDANCE_LOG[]> {
    return this.logs;
  }

  async findOneById(id: string): Promise<ATTENDANCE_LOG | null> {
    return this.logs.find(l => l.log_id === id) || null;
  }

  async create(data: ATTENDANCE_LOG): Promise<ATTENDANCE_LOG> {
    this.logs.push(data);
    return data;
  }

  async update(id: string, data: Partial<ATTENDANCE_LOG>): Promise<ATTENDANCE_LOG | null> {
    const idx = this.logs.findIndex(l => l.log_id === id);
    if (idx > -1) {
      Object.assign(this.logs[idx], data);
      return this.logs[idx];
    }
    return null;
  }

  async delete(id: string): Promise<void> {
    const idx = this.logs.findIndex(l => l.log_id === id);
    if (idx > -1) this.logs.splice(idx, 1);
  }
}
