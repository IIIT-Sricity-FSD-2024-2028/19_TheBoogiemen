import { Injectable } from '@nestjs/common';
import { ASSESSMENT, COURSE } from '../../common/types/interfaces';
import { MOCK_ASSESSMENTS, MOCK_COURSES } from '../../common/types/mock-data';

@Injectable()
export class AssessmentRepository {
  public items: ASSESSMENT[] = MOCK_ASSESSMENTS;
  public courses: COURSE[] = MOCK_COURSES;

  constructor() {}

  async findCourseById(id: string): Promise<COURSE | undefined> { return this.courses.find(c => c.course_id === id); }
  async create(data: ASSESSMENT): Promise<ASSESSMENT> { this.items.push(data); return data; }
  async findOneById(id: string): Promise<ASSESSMENT | undefined> { return this.items.find(a => a.assessment_id === id); }
  async updateCourse(course: COURSE): Promise<COURSE> { return course; } // Mock since it mutates in place
}
