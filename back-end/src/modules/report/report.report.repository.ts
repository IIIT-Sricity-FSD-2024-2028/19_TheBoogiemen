import { Injectable } from '@nestjs/common';
import { SECTION_INFO, ENROLLMENT, MARKS_ENTRY, USER, STUDENT } from '../../common/types/interfaces';
import { SEED } from '../../common/types/seed-constants';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ReportRepository {
  public sections: SECTION_INFO[] = [];
  public enrollments: ENROLLMENT[] = [];
  public marks: MARKS_ENTRY[] = [];
  public students: STUDENT[] = [];

  constructor() {
    this.sections.push({
      section_id: SEED.SECTIONS[0],
      course_id: SEED.COURSES[0],
      faculty_id: SEED.FACULTY[0],
    });
    this.enrollments.push(
      { enrollment_id: uuidv4(), student_id: SEED.STUDENTS[0], section_id: SEED.SECTIONS[0] },
      { enrollment_id: uuidv4(), student_id: SEED.STUDENTS[1], section_id: SEED.SECTIONS[0] }
    );
    this.marks.push(
      { entry_id: uuidv4(), assessment_id: SEED.ASSESSMENTS[0], student_id: SEED.STUDENTS[0], marks: 45, status: 'GRADED' },
      { entry_id: uuidv4(), assessment_id: SEED.ASSESSMENTS[1], student_id: SEED.STUDENTS[0], marks: 90, status: 'GRADED' },
      { entry_id: uuidv4(), assessment_id: SEED.ASSESSMENTS[0], student_id: SEED.STUDENTS[1], marks: 30, status: 'GRADED' }
    );
    this.students.push(
      { student_id: SEED.STUDENTS[0], user_id: 'user1', first_name: 'Alice', last_name: 'Smith' },
      { student_id: SEED.STUDENTS[1], user_id: 'user2', first_name: 'Bob', last_name: 'Jones' },
    );
  }
}
