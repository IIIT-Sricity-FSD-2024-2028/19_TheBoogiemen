import { Injectable } from '@nestjs/common';
import { SECTION_INFO, ENROLLMENT, MARKS_ENTRY, USER, STUDENT } from '../../common/types/interfaces';
import { MOCK_SECTIONS, MOCK_ENROLLMENTS, MOCK_MARKS, MOCK_STUDENTS } from '../../common/types/mock-data';

@Injectable()
export class ReportRepository {
  public sections: SECTION_INFO[] = MOCK_SECTIONS;
  public enrollments: ENROLLMENT[] = MOCK_ENROLLMENTS;
  public marks: MARKS_ENTRY[] = MOCK_MARKS;
  public students: STUDENT[] = MOCK_STUDENTS;

  constructor() {}
}
