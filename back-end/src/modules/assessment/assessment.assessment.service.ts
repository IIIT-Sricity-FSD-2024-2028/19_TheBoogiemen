import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { AssessmentRepository } from './assessment.assessment.repository';
import { MarksRepository } from './marks.marks.repository';
import { NotificationService } from '../../common/services/notification.service';
import { CreateAssessmentInputDto } from './dto/create-assessment.input.dto';
import { GradeInputDto } from './dto/grade.input.dto';
import { SyllabusUpdateInputDto } from './dto/syllabus-update.input.dto';
import { AssessmentOutputDto, MarksEntryOutputDto } from './dto/assessment.output.dto';
import { OutcomeService } from '../outcome/outcome.outcome.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AssessmentService {
  constructor(
    private readonly assessmentRepo: AssessmentRepository,
    private readonly marksRepo: MarksRepository,
    private readonly notificationService: NotificationService,
    @Inject(forwardRef(() => OutcomeService))
    private readonly outcomeService: OutcomeService
  ) {}

  async createAssessment(facultyId: string, dto: CreateAssessmentInputDto): Promise<AssessmentOutputDto> {
    const course = await this.assessmentRepo.findCourseById(dto.course_id);
    if (!course) throw new NotFoundException('Course not found');

    const assessment = await this.assessmentRepo.create({
      assessment_id: uuidv4(),
      course_id: dto.course_id,
      title: dto.title,
      type: dto.type,
      max_marks: dto.max_marks,
      due_date: dto.due_date
    });

    // Mock notify enrolled students
    this.notificationService.notify('ALL_STUDENTS_IN_'+dto.course_id, 'New assessment created');

    return assessment;
  }

  async submitAndGrade(facultyId: string, dto: GradeInputDto): Promise<MarksEntryOutputDto> {
    const entry = await this.marksRepo.findOneById(dto.entry_id);
    if (!entry) throw new NotFoundException('Marks entry not found');

    const assessment = await this.assessmentRepo.findOneById(entry.assessment_id);
    if (!assessment) throw new NotFoundException('Assessment not found');

    if (dto.marks > assessment.max_marks) throw new BadRequestException('Marks exceed max marks');

    entry.marks = dto.marks;
    entry.status = 'GRADED';

    await this.outcomeService.updateAchievementLevel(entry.entry_id, entry.marks, assessment.max_marks);

    return entry;
  }

  async updateSyllabus(facultyId: string, dto: SyllabusUpdateInputDto) {
    const course = await this.assessmentRepo.findCourseById(dto.course_id);
    if (!course) throw new NotFoundException('Course not found');

    course.syllabus.push(dto.topic);
    course.completed_topics++;
    const raw_percentage = (course.completed_topics / course.total_topics) * 100;

    this.notificationService.notify('ALL_STUDENTS_IN_'+dto.course_id, 'Syllabus updated');

    return {
      course_id: course.course_id,
      completed_topics: course.completed_topics,
      total_topics: course.total_topics,
      raw_percentage
    };
  }
}
