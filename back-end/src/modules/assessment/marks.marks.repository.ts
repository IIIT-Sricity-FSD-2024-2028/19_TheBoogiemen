import { Injectable } from '@nestjs/common';
import { MARKS_ENTRY } from '../../common/types/interfaces';
import { MOCK_MARKS } from '../../common/types/mock-data';

@Injectable()
export class MarksRepository {
  public items: MARKS_ENTRY[] = MOCK_MARKS;

  constructor() {}

  async findOneById(id: string): Promise<MARKS_ENTRY | undefined> { return this.items.find(m => m.entry_id === id); }
  async findByAssessmentAndStudent(assessmentId: string, studentId: string): Promise<MARKS_ENTRY | undefined> {
    return this.items.find(m => m.assessment_id === assessmentId && m.student_id === studentId);
  }
  async create(data: MARKS_ENTRY): Promise<MARKS_ENTRY> { this.items.push(data); return data; }
}
