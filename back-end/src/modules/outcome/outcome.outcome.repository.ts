import { Injectable } from '@nestjs/common';
import { LEARNING_OUTCOME, ASSESSMENT_OUTCOME, STUDENT_OUTCOME } from '../../common/types/interfaces';
import { MOCK_OUTCOMES, MOCK_STUDENT_OUTCOMES } from '../../common/types/mock-data';

@Injectable()
export class OutcomeRepository {
  public outcomes: LEARNING_OUTCOME[] = MOCK_OUTCOMES;
  public assessmentOutcomes: ASSESSMENT_OUTCOME[] = [];
  public studentOutcomes: STUDENT_OUTCOME[] = MOCK_STUDENT_OUTCOMES;

  constructor() {}

  async findOutcomeById(id: string): Promise<LEARNING_OUTCOME | undefined> { return this.outcomes.find(o => o.outcome_id === id); }

  async findAll(): Promise<LEARNING_OUTCOME[]> {
    return this.outcomes;
  }

  async create(data: LEARNING_OUTCOME): Promise<LEARNING_OUTCOME> {
    this.outcomes.push(data);
    return data;
  }

  async update(id: string, data: Partial<LEARNING_OUTCOME>): Promise<LEARNING_OUTCOME | null> {
    const idx = this.outcomes.findIndex(o => o.outcome_id === id);
    if(idx > -1) { Object.assign(this.outcomes[idx], data); return this.outcomes[idx]; }
    return null;
  }

  async delete(id: string): Promise<void> {
    const idx = this.outcomes.findIndex(o => o.outcome_id === id);
    if(idx > -1) this.outcomes.splice(idx, 1);
  }
  
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
