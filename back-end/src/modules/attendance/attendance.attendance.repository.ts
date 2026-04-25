import { Injectable } from '@nestjs/common';
import { ATTENDANCE_LOG, ENROLLMENT, SECTION_INFO } from '../../common/types/interfaces';
import { MOCK_ATTENDANCE, MOCK_ENROLLMENTS, MOCK_SECTIONS } from '../../common/types/mock-data';

@Injectable()
export class AttendanceRepository {
  public logs: ATTENDANCE_LOG[] = MOCK_ATTENDANCE;
  public enrollments: ENROLLMENT[] = MOCK_ENROLLMENTS;
  public sections: SECTION_INFO[] = MOCK_SECTIONS;

  constructor() {}
}
