import { Injectable } from '@nestjs/common';
import { SECTION_INFO, ENROLLMENT, MARKS_ENTRY, USER, STUDENT } from '../../common/types/interfaces';
import { MOCK_SECTIONS, MOCK_ENROLLMENTS, MOCK_MARKS, MOCK_STUDENTS } from '../../common/types/mock-data';

@Injectable()
export class ReportRepository {
  public sections: SECTION_INFO[] = MOCK_SECTIONS;
  public enrollments: ENROLLMENT[] = MOCK_ENROLLMENTS;
  public marks: MARKS_ENTRY[] = MOCK_MARKS;
  public students: STUDENT[] = MOCK_STUDENTS;

  public savedReports: any[] = [];

  constructor() {}

  async findAll(): Promise<any[]> {
    return this.savedReports;
  }

  async findOneById(id: string): Promise<any | undefined> {
    return this.savedReports.find(r => r.id === id);
  }

  async create(data: any): Promise<any> {
    this.savedReports.push(data);
    return data;
  }

  async update(id: string, data: Partial<any>): Promise<any | null> {
    const idx = this.savedReports.findIndex(r => r.id === id);
    if (idx > -1) {
      Object.assign(this.savedReports[idx], data);
      return this.savedReports[idx];
    }
    return null;
  }

  async delete(id: string): Promise<void> {
    const idx = this.savedReports.findIndex(r => r.id === id);
    if (idx > -1) this.savedReports.splice(idx, 1);
  }
}
