import { Injectable } from '@nestjs/common';
import { RESEARCH_PROJECT, RESEARCH_MILESTONE } from '../../common/types/interfaces';
import { SEED } from '../../common/types/seed-constants';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ResearchRepository {
  public projects: RESEARCH_PROJECT[] = [];
  public milestones: RESEARCH_MILESTONE[] = [];

  constructor() {
    this.projects.push(
      { project_id: SEED.PROJECTS[0], student_id: SEED.STUDENTS[0], faculty_id: SEED.FACULTY[0], title: 'Quantum ML', type: 'Thesis' },
      { project_id: SEED.PROJECTS[1], student_id: SEED.STUDENTS[1], faculty_id: SEED.FACULTY[1], title: 'Bioinformatics', type: 'Project' }
    );
    this.milestones.push(
      { milestone_id: uuidv4(), project_id: SEED.PROJECTS[0], title: 'Draft 1', status: 'PENDING_REVIEW' },
      { milestone_id: uuidv4(), project_id: SEED.PROJECTS[1], title: 'Final Eval', status: 'APPROVED' }
    );
  }

  async findProjectById(id: string): Promise<RESEARCH_PROJECT | undefined> {
    return this.projects.find(p => p.project_id === id);
  }

  async findMilestoneById(id: string): Promise<RESEARCH_MILESTONE | undefined> {
    return this.milestones.find(m => m.milestone_id === id);
  }

  async createMilestone(data: RESEARCH_MILESTONE): Promise<RESEARCH_MILESTONE> {
    this.milestones.push(data);
    return data;
  }

  async updateMilestone(id: string, data: Partial<RESEARCH_MILESTONE>): Promise<RESEARCH_MILESTONE | null> {
    const idx = this.milestones.findIndex(m => m.milestone_id === id);
    if(idx > -1) { Object.assign(this.milestones[idx], data); return this.milestones[idx]; }
    return null;
  }
}
