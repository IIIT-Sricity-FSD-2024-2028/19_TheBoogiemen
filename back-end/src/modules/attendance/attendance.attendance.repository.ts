import { Injectable } from '@nestjs/common';
import { ATTENDANCE_LOG, ENROLLMENT, SECTION_INFO } from '../../common/types/interfaces';
import { SEED } from '../../common/types/seed-constants';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AttendanceRepository {
  public logs: ATTENDANCE_LOG[] = [];
  public enrollments: ENROLLMENT[] = [];
  public sections: SECTION_INFO[] = [];

  constructor() {
    this.sections.push({
      section_id: SEED.SECTIONS[0],
      course_id: SEED.COURSES[0],
      faculty_id: SEED.FACULTY[0],
    });
    
    // Using simple deterministic UUIDs for enrolments here to map correctly
    const enrollmentId = uuidv4();
    this.enrollments.push({
      enrollment_id: enrollmentId,
      student_id: SEED.STUDENTS[0],
      section_id: SEED.SECTIONS[0],
    });

    for (let i = 0; i < 10; i++) {
      this.logs.push({
        log_id: uuidv4(),
        enrollment_id: enrollmentId,
        date: new Date().toISOString(),
        status: i < 7 ? 'PRESENT' : 'ABSENT', // 70% attendance to trigger flag
      });
    }
  }
}
