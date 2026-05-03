import { Injectable, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { OutcomeRepository } from './outcome.outcome.repository';
import { MapOutcomeInputDto } from './dto/map-outcome.input.dto';
import { StudentOutcomeOutputDto } from './dto/student-outcome.output.dto';
import { v4 as uuidv4 } from 'uuid';
import { MarksRepository } from '../assessment/marks.marks.repository';
import { AssessmentRepository } from '../assessment/assessment.assessment.repository';
import { STUDENT_OUTCOME } from '../../common/types/interfaces';

@Injectable()
export class OutcomeService {
  constructor(
    private readonly outcomeRepo: OutcomeRepository,
    @Inject(forwardRef(() => MarksRepository))
    private readonly marksRepo: MarksRepository,
    @Inject(forwardRef(() => AssessmentRepository))
    private readonly assessmentRepo: AssessmentRepository
  ) {}

  async mapAssessmentToOutcomes(dto: MapOutcomeInputDto) {
    if (dto.outcome_ids.length !== dto.weightages.length) {
      throw new BadRequestException('Mismatched outcome_ids and weightages length');
    }

    const created: any[] = [];
    for (let i = 0; i < dto.outcome_ids.length; i++) {
      const outcome = await this.outcomeRepo.findOutcomeById(dto.outcome_ids[i]);
      if (outcome) {
        const mapping = await this.outcomeRepo.createAssessmentOutcome({
          id: uuidv4(),
          assessment_id: dto.assessment_id,
          outcome_id: dto.outcome_ids[i],
          weightage: dto.weightages[i],
        });
        created.push(mapping);
      }
    }
    return created;
  }

  async updateAchievementLevel(marksEntryId: string, marks: number, maxMarks: number) {
    const raw_percentage = maxMarks === 0 ? 0 : (marks / maxMarks) * 100;
    let achievement_level: STUDENT_OUTCOME['achievement_level'] = 'NEEDS_IMPROVEMENT';

    if (raw_percentage >= 90) achievement_level = 'EXCELLENT';
    else if (raw_percentage >= 75) achievement_level = 'GOOD';
    else if (raw_percentage >= 50) achievement_level = 'SATISFACTORY';

    const entry = await this.marksRepo.findOneById(marksEntryId);
    if (!entry) return null;

    const mappedOutcomes = await this.outcomeRepo.findAssessmentOutcomes(entry.assessment_id);
    
    const results: any[] = [];
    for (const mapping of mappedOutcomes) {
      const outcomeDef = await this.outcomeRepo.findOutcomeById(mapping.outcome_id);
      if (outcomeDef) {
        const updated = await this.outcomeRepo.upsertStudentOutcome({
          id: uuidv4(),
          student_id: entry.student_id,
          outcome_id: mapping.outcome_id,
          outcome_title: outcomeDef.title,
          achievement_level,
          raw_percentage
        });
        results.push(updated);
      }
    }
    return results;
  }

  async getStudentOutcomes(studentId: string): Promise<StudentOutcomeOutputDto[]> {
    const outcomes = await this.outcomeRepo.getStudentOutcomes(studentId);
    return outcomes.map(o => ({
      student_id: o.student_id,
      outcome_id: o.outcome_id,
      outcome_title: o.outcome_title,
      achievement_level: o.achievement_level,
      raw_percentage: o.raw_percentage
    }));
  }

  async getAllOutcomes() {
    return this.outcomeRepo.findAll();
  }

  async getOutcomeById(id: string) {
    const outcome = await this.outcomeRepo.findOutcomeById(id);
    if (!outcome) throw new BadRequestException('Outcome not found');
    return outcome;
  }

  async createOutcome(dto: any) {
    return this.outcomeRepo.create({
      outcome_id: uuidv4(),
      course_id: dto.course_id,
      title: dto.title,
      description: dto.description || ''
    });
  }

  async updateOutcome(id: string, dto: any) {
    const outcome = await this.outcomeRepo.findOutcomeById(id);
    if (!outcome) throw new BadRequestException('Outcome not found');
    
    return this.outcomeRepo.update(id, {
      course_id: dto.course_id || outcome.course_id,
      title: dto.title || outcome.title,
      description: dto.description || outcome.description
    });
  }

  async patchOutcome(id: string, dto: any) {
    const outcome = await this.outcomeRepo.findOutcomeById(id);
    if (!outcome) throw new BadRequestException('Outcome not found');
    
    return this.outcomeRepo.update(id, dto);
  }

  async deleteOutcome(id: string) {
    const outcome = await this.outcomeRepo.findOutcomeById(id);
    if (!outcome) throw new BadRequestException('Outcome not found');
    
    await this.outcomeRepo.delete(id);
  }
}
