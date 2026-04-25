import { Injectable } from '@nestjs/common';
import { ASSESSMENT, COURSE } from '../../common/types/interfaces';
import { SEED } from '../../common/types/seed-constants';

@Injectable()
export class AssessmentRepository {
  public items: ASSESSMENT[] = [];
  public courses: COURSE[] = [];

  constructor() {
    this.items.push(
      { assessment_id: SEED.ASSESSMENTS[0], course_id: SEED.COURSES[0], title: 'Midterm', type: 'EXAM', max_marks: 100, due_date: '2025-03-01' },
      { assessment_id: SEED.ASSESSMENTS[1], course_id: SEED.COURSES[0], title: 'Quiz 1', type: 'QUIZ', max_marks: 20, due_date: '2025-02-15' }
    );
    this.courses.push(
      { course_id: SEED.COURSES[0], course_name: 'Advanced Programming', completed_topics: 2, total_topics: 10, syllabus: ['Intro', 'OOP'] },
      { course_id: SEED.COURSES[1], course_name: 'Database Systems', completed_topics: 0, total_topics: 12, syllabus: [] }
    );
  }

  async findCourseById(id: string): Promise<COURSE | undefined> { return this.courses.find(c => c.course_id === id); }
  async create(data: ASSESSMENT): Promise<ASSESSMENT> { this.items.push(data); return data; }
  async findOneById(id: string): Promise<ASSESSMENT | undefined> { return this.items.find(a => a.assessment_id === id); }
  async updateCourse(course: COURSE): Promise<COURSE> { return course; } // Mock since it mutates in place
}
