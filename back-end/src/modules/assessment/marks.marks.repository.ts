import { Injectable } from '@nestjs/common';
import { MARKS_ENTRY } from '../../common/types/interfaces';
import { SEED } from '../../common/types/seed-constants';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MarksRepository {
  public items: MARKS_ENTRY[] = [];

  constructor() {
    this.items.push(
      { entry_id: uuidv4(), assessment_id: SEED.ASSESSMENTS[0], student_id: SEED.STUDENTS[0], marks: 85, status: 'GRADED' },
      { entry_id: uuidv4(), assessment_id: SEED.ASSESSMENTS[0], student_id: SEED.STUDENTS[1], marks: 45, status: 'GRADED' },
      { entry_id: uuidv4(), assessment_id: SEED.ASSESSMENTS[1], student_id: SEED.STUDENTS[0], marks: 0, status: 'PENDING' }
    );
  }

  async findOneById(id: string): Promise<MARKS_ENTRY | undefined> { return this.items.find(m => m.entry_id === id); }
  async findByAssessmentAndStudent(assessmentId: string, studentId: string): Promise<MARKS_ENTRY | undefined> {
    return this.items.find(m => m.assessment_id === assessmentId && m.student_id === studentId);
  }
  async create(data: MARKS_ENTRY): Promise<MARKS_ENTRY> { this.items.push(data); return data; }
}
