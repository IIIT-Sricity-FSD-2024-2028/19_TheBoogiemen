import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ResearchRepository } from './research.research.repository';
import { NotificationService } from '../../common/services/notification.service';
import { UploadMilestoneInputDto } from './dto/upload-milestone.input.dto';
import { ReviewMilestoneInputDto } from './dto/review-milestone.input.dto';
import { MilestoneOutputDto } from './dto/milestone.output.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ResearchService {
  constructor(
    private readonly researchRepo: ResearchRepository,
    private readonly notificationService: NotificationService
  ) {}

  async uploadMilestone(studentId: string, dto: UploadMilestoneInputDto): Promise<MilestoneOutputDto> {
    const project = await this.researchRepo.findProjectById(dto.project_id);
    if (!project) throw new NotFoundException('Project not found');
    if (project.student_id !== studentId) throw new ForbiddenException('Not your project');
    
    if (dto.file_type !== 'PDF' && dto.file_type !== 'DOCX') throw new BadRequestException('Invalid file type');

    const milestone = await this.researchRepo.createMilestone({
      milestone_id: uuidv4(),
      project_id: project.project_id,
      file_type: dto.file_type,
      description: dto.description,
      submission_date: new Date().toISOString(),
      status: 'PENDING_REVIEW'
    });

    this.notificationService.notify(project.faculty_id, `New milestone uploaded for project ${project.project_id}`);

    return milestone;
  }

  async reviewMilestone(facultyId: string, dto: ReviewMilestoneInputDto): Promise<MilestoneOutputDto> {
    const milestone = await this.researchRepo.findMilestoneById(dto.milestone_id);
    if (!milestone) throw new NotFoundException('Milestone not found');

    const project = await this.researchRepo.findProjectById(milestone.project_id);
    if (!project) throw new NotFoundException('Project not found');

    if (project.faculty_id !== facultyId) throw new ForbiddenException('You are not the reviewer for this project');

    const updated = await this.researchRepo.updateMilestone(dto.milestone_id, {
      comments: dto.comments,
      status: dto.status
    });

    if (!updated) throw new NotFoundException('Milestone could not be updated');

    this.notificationService.notify(project.student_id, `Milestone reviewed: ${dto.status}`);

    return {
      milestone_id: updated.milestone_id,
      project_id: updated.project_id,
      status: updated.status,
      comments: updated.comments
    };
  }

  async getAllProjects() {
    return this.researchRepo.findAllProjects();
  }

  async getProjectById(id: string) {
    const project = await this.researchRepo.findProjectById(id);
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async updateProject(id: string, dto: any) {
    const project = await this.researchRepo.findProjectById(id);
    if (!project) throw new NotFoundException('Project not found');
    
    return this.researchRepo.updateProject(id, {
      title: dto.title || project.title,
      domain: dto.domain || project.domain,
      type: dto.type || project.type,
      student_id: dto.student_id || project.student_id,
      faculty_id: dto.faculty_id || project.faculty_id
    });
  }

  async patchProject(id: string, dto: any) {
    const project = await this.researchRepo.findProjectById(id);
    if (!project) throw new NotFoundException('Project not found');
    
    return this.researchRepo.updateProject(id, dto);
  }

  async deleteProject(id: string) {
    const project = await this.researchRepo.findProjectById(id);
    if (!project) throw new NotFoundException('Project not found');
    
    await this.researchRepo.deleteProject(id);
  }

  async deleteMilestone(id: string) {
    const milestone = await this.researchRepo.findMilestoneById(id);
    if (!milestone) throw new NotFoundException('Milestone not found');
    
    await this.researchRepo.deleteMilestone(id);
  }
}
