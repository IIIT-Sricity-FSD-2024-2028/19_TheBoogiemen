import { Injectable } from '@nestjs/common';
import { LEARNING_OUTCOME, ASSESSMENT_OUTCOME, STUDENT_OUTCOME } from '../../common/types/interfaces';
import { SEED } from '../../common/types/seed-constants';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class OutcomeRepository {
  public outcomes: LEARNING_OUTCOME[] = [];
  public assessmentOutcomes: ASSESSMENT_OUTCOME[] = [];
  public studentOutcomes: STUDENT_OUTCOME[] = [];

  constructor() {
    this.outcomes.push(
      { outcome_id: SEED.OUTCOMES[0], course_id: SEED.COURSES[0], title: 'Understand logic' },
      { outcome_id: SEED.OUTCOMES[1], course_id: SEED.COURSES[0], title: 'Design algorithms' },
      { outcome_id: SEED.OUTCOMES[2], course_id: SEED.COURSES[1], title: 'Normalize schemas' }
    );
  }

  async findOutcomeById(id: string): Promise<LEARNING_OUTCOME | undefined> { return this.outcomes.find(o => o.outcome_id === id); }
  
  async createAssessmentOutcome(data: ASSESSMENT_OUTCOME): Promise<ASSESSMENT_OUTCOME> {
    this.assessmentOutcomes.push(data);
    return data;
  }

  async upsertStudentOutcome(data: STUDENT_OUTCOME): Promise<STUDENT_OUTCOME> {
    const idx = this.studentOutcomes.findIndex(s => s.student_id === data.student_id && s.outcome_id === data.outcome_id);
    if(idx > -1) {
      this.studentOutcomes[idx] = data;
      return data;
    }
    this.studentOutcomes.push(data);
    return data;
  }

  async findAssessmentOutcomes(assessmentId: string): Promise<ASSESSMENT_OUTCOME[]> {
    return this.assessmentOutcomes.filter(a => a.assessment_id === assessmentId);
  }

  async getStudentOutcomes(studentId: string): Promise<STUDENT_OUTCOME[]> {
    return this.studentOutcomes.filter(s => s.student_id === studentId);
  }
}
