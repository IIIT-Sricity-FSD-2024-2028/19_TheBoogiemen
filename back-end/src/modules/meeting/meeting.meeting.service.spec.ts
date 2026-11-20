import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { MeetingService } from './meeting.meeting.service';
import { MeetingRepository } from './meeting.meeting.repository';
import { NotificationService } from '../../common/services/notification.service';
import { InMemoryDbService } from '../../database/in-memory-db.service';
import { MeetingStatus } from './enums/meeting-status.enum';
import { MeetingType } from './enums/meeting-type.enum';
import { MeetingPlatform } from './enums/meeting-platform.enum';
import { RescheduleBy } from './enums/reschedule-by.enum';

describe('MeetingService', () => {
  let service: MeetingService;
  let repo: MeetingRepository;
  let memoryDb: InMemoryDbService;
  let notificationService: NotificationService;

  const futureDate = (daysAhead: number = 1) => {
    const d = new Date(Date.now() + daysAhead * 86400000);
    return d.toISOString().split('T')[0];
  };

  beforeEach(() => {
    const loggerMock: any = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };
    memoryDb = new InMemoryDbService(loggerMock);
    jest.spyOn(memoryDb, 'persist').mockImplementation(() => {});
    memoryDb.students = [
      { user_id: 's1', first_name: 'John', last_name: 'Doe', college_id: 'c-default' } as any,
    ];
    memoryDb.faculty = [
      { user_id: 'f1', first_name: 'Dr. Jane', last_name: 'Smith', college_id: 'c-default' } as any,
      { user_id: 'f2', first_name: 'Dr. Bob', last_name: 'Brown', college_id: 'c-default' } as any,
    ];
    memoryDb.users = [
      { user_id: 's1', role: 'student', username: 'john', college_id: 'c-default' } as any,
      { user_id: 'f1', role: 'faculty', username: 'jane', college_id: 'c-default' } as any,
      { user_id: 'f2', role: 'faculty', username: 'bob', college_id: 'c-default' } as any,
    ];
    memoryDb.meetings = [] as any;

    repo = new MeetingRepository(memoryDb);
    notificationService = new NotificationService(loggerMock);
    service = new MeetingService(repo, notificationService);
  });

  describe('createMeeting', () => {
    it('creates a PENDING meeting request', async () => {
      const d = futureDate(2);
      const meeting = await service.createMeeting('s1', 'c-default', {
        facultyId: 'f1',
        purpose: 'Academic Guidance',
        description: 'Need help with thesis',
        requestedDate: d,
        requestedStartTime: '10:00',
        requestedEndTime: '10:30',
        meetingType: MeetingType.ONLINE,
      });

      expect(meeting).toBeDefined();
      expect(meeting.status).toBe(MeetingStatus.PENDING);
      expect(meeting.student_id).toBe('s1');
      expect(meeting.faculty_id).toBe('f1');
      expect(meeting.college_id).toBe('c-default');
      expect(meeting.requested_date).toBe(d);
      expect(meeting.requested_start_time).toBe('10:00');
      expect(meeting.requested_end_time).toBe('10:30');
    });

    it('rejects invalid time range (startTime >= endTime)', async () => {
      const d = futureDate(2);
      await expect(
        service.createMeeting('s1', 'c-default', {
          facultyId: 'f1',
          purpose: 'Guidance',
          requestedDate: d,
          requestedStartTime: '11:00',
          requestedEndTime: '10:30',
          meetingType: MeetingType.ONLINE,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('acceptMeeting', () => {
    it('faculty accepts request, sets confirmed time and Google Meet link', async () => {
      const d1 = futureDate(2);
      const d2 = futureDate(3);
      const created = await service.createMeeting('s1', 'c-default', {
        facultyId: 'f1',
        purpose: 'Academic Guidance',
        requestedDate: d1,
        requestedStartTime: '10:00',
        requestedEndTime: '10:30',
        meetingType: MeetingType.ONLINE,
      });

      const accepted = await service.acceptMeeting(created.meeting_id, 'f1', 'c-default', {
        scheduledDate: d2,
        scheduledStartTime: '11:00',
        scheduledEndTime: '11:30',
        meetingType: MeetingType.ONLINE,
        meetingLink: 'https://meet.google.com/abc-defg-hij',
      });

      expect(accepted.status).toBe(MeetingStatus.SCHEDULED);
      expect(accepted.scheduled_date).toBe(d2);
      expect(accepted.scheduled_start_time).toBe('11:00');
      expect(accepted.scheduled_end_time).toBe('11:30');
      expect(accepted.meeting_link).toBe('https://meet.google.com/abc-defg-hij');
      // Original requested date remains untouched
      expect(accepted.requested_date).toBe(d1);
    });

    it('forbids another faculty from accepting the meeting', async () => {
      const d = futureDate(2);
      const created = await service.createMeeting('s1', 'c-default', {
        facultyId: 'f1',
        purpose: 'Academic Guidance',
        requestedDate: d,
        requestedStartTime: '10:00',
        requestedEndTime: '10:30',
        meetingType: MeetingType.ONLINE,
      });

      await expect(
        service.acceptMeeting(created.meeting_id, 'f2', 'c-default', {
          scheduledDate: d,
          scheduledStartTime: '11:00',
          scheduledEndTime: '11:30',
          meetingType: MeetingType.ONLINE,
          meetingLink: 'https://meet.google.com/abc',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('detects and prevents overlapping meetings for the same faculty', async () => {
      const d = futureDate(4);
      // Faculty directly schedules meeting 1
      await service.facultyCreateMeeting('f1', 'c-default', {
        studentId: 's1',
        purpose: 'Existing Meeting',
        scheduledDate: d,
        scheduledStartTime: '10:00',
        scheduledEndTime: '11:00',
        meetingType: MeetingType.ONLINE,
        meetingLink: 'https://meet.google.com/abc',
      });

      // Student creates meeting request 2
      const created2 = await service.createMeeting('s1', 'c-default', {
        facultyId: 'f1',
        purpose: 'Conflicting Request',
        requestedDate: d,
        requestedStartTime: '10:30',
        requestedEndTime: '11:30',
        meetingType: MeetingType.ONLINE,
      });

      // Accepting at overlapping time must throw ConflictException
      await expect(
        service.acceptMeeting(created2.meeting_id, 'f1', 'c-default', {
          scheduledDate: d,
          scheduledStartTime: '10:30',
          scheduledEndTime: '11:30',
          meetingType: MeetingType.ONLINE,
          meetingLink: 'https://meet.google.com/def',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('denyMeeting', () => {
    it('faculty denies request with reason', async () => {
      const d = futureDate(2);
      const created = await service.createMeeting('s1', 'c-default', {
        facultyId: 'f1',
        purpose: 'Need review',
        requestedDate: d,
        requestedStartTime: '10:00',
        requestedEndTime: '10:30',
        meetingType: MeetingType.ONLINE,
      });

      const denied = await service.denyMeeting(created.meeting_id, 'f1', 'c-default', {
        reason: 'Out of office on this date',
      });

      expect(denied.status).toBe(MeetingStatus.DENIED);
      expect(denied.denial_reason).toBe('Out of office on this date');
    });
  });

  describe('askReschedule and student response flow', () => {
    it('faculty proposes new time -> student accepts -> SCHEDULED', async () => {
      const d1 = futureDate(2);
      const d2 = futureDate(5);
      const created = await service.createMeeting('s1', 'c-default', {
        facultyId: 'f1',
        purpose: 'Lab Discussion',
        requestedDate: d1,
        requestedStartTime: '10:00',
        requestedEndTime: '10:30',
        meetingType: MeetingType.ONLINE,
      });

      const proposed = await service.askReschedule(created.meeting_id, 'f1', 'c-default', {
        proposedDate: d2,
        proposedStartTime: '14:00',
        proposedEndTime: '14:30',
        reason: 'Have a department seminar in the morning',
        meetingType: MeetingType.ONLINE,
        meetingLink: 'https://meet.google.com/prop',
      });

      expect(proposed.status).toBe(MeetingStatus.RESCHEDULE_PROPOSED);
      expect(proposed.proposed_date).toBe(d2);
      expect(proposed.proposed_start_time).toBe('14:00');

      const accepted = await service.studentAcceptReschedule(created.meeting_id, 's1', 'c-default');
      expect(accepted.status).toBe(MeetingStatus.SCHEDULED);
      expect(accepted.scheduled_date).toBe(d2);
      expect(accepted.scheduled_start_time).toBe('14:00');
      expect(accepted.scheduled_end_time).toBe('14:30');
    });

    it('faculty proposes new time -> student declines -> returns to original state', async () => {
      const d1 = futureDate(2);
      const d2 = futureDate(6);
      const created = await service.createMeeting('s1', 'c-default', {
        facultyId: 'f1',
        purpose: 'Lab Discussion',
        requestedDate: d1,
        requestedStartTime: '10:00',
        requestedEndTime: '10:30',
        meetingType: MeetingType.ONLINE,
      });

      await service.askReschedule(created.meeting_id, 'f1', 'c-default', {
        proposedDate: d2,
        proposedStartTime: '16:00',
        proposedEndTime: '16:30',
        reason: 'Busy morning',
      });

      const declined = await service.studentDeclineReschedule(created.meeting_id, 's1', 'c-default');
      expect(declined.status).toBe(MeetingStatus.PENDING);
      expect(declined.proposed_date).toBeUndefined();
    });
  });

  describe('student request reschedule on scheduled meeting', () => {
    it('student requests reschedule -> faculty accepts -> SCHEDULED at new time', async () => {
      const d1 = futureDate(3);
      const d2 = futureDate(7);
      const meeting = await service.facultyCreateMeeting('f1', 'c-default', {
        studentId: 's1',
        purpose: 'Progress check',
        scheduledDate: d1,
        scheduledStartTime: '10:00',
        scheduledEndTime: '10:30',
        meetingType: MeetingType.ONLINE,
        meetingLink: 'https://meet.google.com/test',
      });

      const requested = await service.studentRequestReschedule(meeting.meeting_id, 's1', 'c-default', {
        proposedDate: d2,
        proposedStartTime: '15:00',
        proposedEndTime: '15:30',
        reason: 'Exam collision',
      });

      expect(requested.status).toBe(MeetingStatus.RESCHEDULE_REQUESTED);
      expect(requested.reschedule_requested_by).toBe(RescheduleBy.STUDENT);

      const handled = await service.handleStudentReschedule(meeting.meeting_id, 'f1', 'c-default', {
        action: 'ACCEPT',
      });

      expect(handled.status).toBe(MeetingStatus.SCHEDULED);
      expect(handled.scheduled_date).toBe(d2);
      expect(handled.scheduled_start_time).toBe('15:00');
    });

    it('student requests reschedule -> faculty denies -> SCHEDULED at original time', async () => {
      const d1 = futureDate(3);
      const d2 = futureDate(8);
      const meeting = await service.facultyCreateMeeting('f1', 'c-default', {
        studentId: 's1',
        purpose: 'Progress check',
        scheduledDate: d1,
        scheduledStartTime: '10:00',
        scheduledEndTime: '10:30',
        meetingType: MeetingType.ONLINE,
        meetingLink: 'https://meet.google.com/test',
      });

      await service.studentRequestReschedule(meeting.meeting_id, 's1', 'c-default', {
        proposedDate: d2,
        proposedStartTime: '15:00',
        proposedEndTime: '15:30',
        reason: 'Preferred afternoon',
      });

      const handled = await service.handleStudentReschedule(meeting.meeting_id, 'f1', 'c-default', {
        action: 'DENY',
        reason: 'Slots are completely full on that day',
      });

      expect(handled.status).toBe(MeetingStatus.SCHEDULED);
      expect(handled.scheduled_date).toBe(d1);
      expect(handled.scheduled_start_time).toBe('10:00');
    });
  });

  describe('faculty direct reschedule & completion', () => {
    it('faculty directly reschedules a confirmed meeting', async () => {
      const d1 = futureDate(2);
      const d2 = futureDate(9);
      const created = await service.facultyCreateMeeting('f1', 'c-default', {
        studentId: 's1',
        purpose: 'Direct Schedule',
        scheduledDate: d1,
        scheduledStartTime: '10:00',
        scheduledEndTime: '10:30',
        meetingType: MeetingType.ONLINE,
        meetingLink: 'https://meet.google.com/test',
      });

      const rescheduled = await service.facultyReschedule(created.meeting_id, 'f1', 'c-default', {
        scheduledDate: d2,
        scheduledStartTime: '12:00',
        scheduledEndTime: '12:30',
        rescheduleReason: 'Dept meeting',
        meetingLink: 'https://meet.google.com/test2',
      });

      expect(rescheduled.status).toBe(MeetingStatus.SCHEDULED);
      expect(rescheduled.scheduled_date).toBe(d2);
      expect(rescheduled.scheduled_start_time).toBe('12:00');
    });

    it('faculty marks meeting as COMPLETED with notes and action items', async () => {
      const d = futureDate(1);
      const created = await service.facultyCreateMeeting('f1', 'c-default', {
        studentId: 's1',
        purpose: 'Review',
        scheduledDate: d,
        scheduledStartTime: '10:00',
        scheduledEndTime: '10:30',
        meetingType: MeetingType.ONLINE,
        meetingLink: 'https://meet.google.com/test',
      });

      const completed = await service.completeMeeting(created.meeting_id, 'f1', 'c-default', {
        discussionNotes: 'Reviewed Chapter 1 and 2',
        outcome: 'Satisfactory progress',
        actionItems: 'Submit Chapter 3 by next week',
        facultyRemarks: 'Good effort',
      });

      expect(completed.status).toBe(MeetingStatus.COMPLETED);
      expect(completed.discussion_notes).toBe('Reviewed Chapter 1 and 2');
      expect(completed.outcome).toBe('Satisfactory progress');
      expect(completed.action_items).toBe('Submit Chapter 3 by next week');
      expect(completed.faculty_remarks).toBe('Good effort');
      expect(completed.completion_timestamp).toBeDefined();
    });
  });

  describe('faculty direct scheduling and student list', () => {
    it('returns student list for faculty selection', async () => {
      const students = await service.getStudentList('c-default');
      expect(students).toBeDefined();
      expect(students.length).toBe(1);
      expect(students[0].user_id).toBe('s1');
      expect(students[0].name).toBe('John Doe');
    });

    it('faculty directly creates and schedules a meeting in SCHEDULED status', async () => {
      const d = futureDate(10);
      const meeting = await service.facultyCreateMeeting('f1', 'c-default', {
        studentId: 's1',
        purpose: 'Direct Research Sync',
        description: 'Discuss GPU benchmarks',
        scheduledDate: d,
        scheduledStartTime: '15:00',
        scheduledEndTime: '15:30',
        meetingType: MeetingType.ONLINE,
        meetingLink: 'https://meet.google.com/direct-link',
        facultyRemarks: 'Please have slides ready',
      });

      expect(meeting).toBeDefined();
      expect(meeting.status).toBe(MeetingStatus.SCHEDULED);
      expect(meeting.student_id).toBe('s1');
      expect(meeting.faculty_id).toBe('f1');
      expect(meeting.scheduled_date).toBe(d);
      expect(meeting.scheduled_start_time).toBe('15:00');
      expect(meeting.meeting_link).toBe('https://meet.google.com/direct-link');
    });
  });

  describe('Current date and time onwards validation', () => {
    it('rejects scheduling on a past date', async () => {
      await expect(
        service.createMeeting('s1', 'c-default', {
          facultyId: 'f1',
          purpose: 'Past Date Request',
          requestedDate: '2020-01-01',
          requestedStartTime: '10:00',
          requestedEndTime: '10:30',
          meetingType: MeetingType.ONLINE,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('accepts scheduling at a future time', async () => {
      const d = futureDate(1);
      const meeting = await service.facultyCreateMeeting('f1', 'c-default', {
        studentId: 's1',
        purpose: 'Future Meeting',
        scheduledDate: d,
        scheduledStartTime: '14:00',
        scheduledEndTime: '14:30',
        meetingType: MeetingType.ONLINE,
        meetingLink: 'https://meet.google.com/future-link',
      });
      expect(meeting).toBeDefined();
      expect(meeting.status).toBe(MeetingStatus.SCHEDULED);
    });
  });
});
