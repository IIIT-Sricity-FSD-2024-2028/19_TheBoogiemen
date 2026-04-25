import { Injectable } from '@nestjs/common';
import { RESEARCH_PROJECT, RESEARCH_MILESTONE } from '../../common/types/interfaces';
import { MOCK_RESEARCH_PROJECTS } from '../../common/types/mock-data';

@Injectable()
export class ResearchRepository {
  public projects: RESEARCH_PROJECT[] = MOCK_RESEARCH_PROJECTS;
  public milestones: RESEARCH_MILESTONE[] = [];

  constructor() {}

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
