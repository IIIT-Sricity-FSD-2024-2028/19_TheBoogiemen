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

  beforeEach(() => {
    const loggerMock: any = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };
    memoryDb = new InMemoryDbService(loggerMock);
    memoryDb.students = [
      { user_id: 's1', first_name: 'John', last_name: 'Doe' } as any,
    ];
    memoryDb.faculty = [
      { user_id: 'f1', first_name: 'Dr. Jane', last_name: 'Smith' } as any,
      { user_id: 'f2', first_name: 'Dr. Bob', last_name: 'Brown' } as any,
    ];
    memoryDb.users = [
      { user_id: 's1', role: 'student', username: 'john' } as any,
      { user_id: 'f1', role: 'faculty', username: 'jane' } as any,
      { user_id: 'f2', role: 'faculty', username: 'bob' } as any,
    ];

    repo = new MeetingRepository(memoryDb);
    notificationService = new NotificationService(loggerMock);
    service = new MeetingService(repo, notificationService);
  });

  describe('createMeeting', () => {
    it('creates a PENDING meeting request', async () => {
      const meeting = await service.createMeeting('s1', {
        facultyId: 'f1',
        purpose: 'Academic Guidance',
        description: 'Need help with thesis',
        requestedDate: '2026-09-05',
        requestedStartTime: '10:00',
        requestedEndTime: '10:30',
        meetingType: MeetingType.ONLINE,
      });

      expect(meeting).toBeDefined();
      expect(meeting.status).toBe(MeetingStatus.PENDING);
      expect(meeting.student_id).toBe('s1');
      expect(meeting.faculty_id).toBe('f1');
      expect(meeting.requested_date).toBe('2026-09-05');
      expect(meeting.requested_start_time).toBe('10:00');
      expect(meeting.requested_end_time).toBe('10:30');
    });

    it('rejects invalid time range (startTime >= endTime)', async () => {
      await expect(
        service.createMeeting('s1', {
          facultyId: 'f1',
          purpose: 'Guidance',
          requestedDate: '2026-09-05',
          requestedStartTime: '11:00',
          requestedEndTime: '10:30',
          meetingType: MeetingType.ONLINE,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('acceptMeeting', () => {
    it('faculty accepts request, sets confirmed time and Google Meet link', async () => {
      const created = await service.createMeeting('s1', {
        facultyId: 'f1',
        purpose: 'Academic Guidance',
        requestedDate: '2026-09-05',
        requestedStartTime: '10:00',
        requestedEndTime: '10:30',
        meetingType: MeetingType.ONLINE,
      });

      const accepted = await service.acceptMeeting(created.meeting_id, 'f1', {
        scheduledDate: '2026-09-06',
        scheduledStartTime: '11:00',
        scheduledEndTime: '11:30',
        meetingType: MeetingType.ONLINE,
        meetingLink: 'https://meet.google.com/abc-defg-hij',
        facultyRemarks: 'Confirmed slot',
      });

      expect(accepted.status).toBe(MeetingStatus.SCHEDULED);
      expect(accepted.scheduled_date).toBe('2026-09-06');
      expect(accepted.scheduled_start_time).toBe('11:00');
      expect(accepted.scheduled_end_time).toBe('11:30');
      expect(accepted.meeting_link).toBe('https://meet.google.com/abc-defg-hij');
      // Original requested date remains untouched
      expect(accepted.requested_date).toBe('2026-09-05');
    });

    it('forbids another faculty from accepting the meeting', async () => {
      const created = await service.createMeeting('s1', {
        facultyId: 'f1',
        purpose: 'Academic Guidance',
        requestedDate: '2026-09-05',
        requestedStartTime: '10:00',
        requestedEndTime: '10:30',
        meetingType: MeetingType.ONLINE,
      });

      await expect(
        service.acceptMeeting(created.meeting_id, 'f2', {
          scheduledDate: '2026-09-06',
          scheduledStartTime: '11:00',
          scheduledEndTime: '11:30',
          meetingType: MeetingType.ONLINE,
          meetingLink: 'https://meet.google.com/abc',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('detects and prevents overlapping meetings for the same faculty', async () => {
      const m1 = await service.createMeeting('s1', {
        facultyId: 'f1',
        purpose: 'M1',
        requestedDate: '2026-09-06',
        requestedStartTime: '11:00',
        requestedEndTime: '11:30',
        meetingType: MeetingType.ONLINE,
      });

      await service.acceptMeeting(m1.meeting_id, 'f1', {
        scheduledDate: '2026-09-06',
        scheduledStartTime: '11:00',
        scheduledEndTime: '11:30',
        meetingType: MeetingType.ONLINE,
        meetingLink: 'https://meet.google.com/m1',
      });

      const m2 = await service.createMeeting('s1', {
        facultyId: 'f1',
        purpose: 'M2',
        requestedDate: '2026-09-06',
        requestedStartTime: '11:15',
        requestedEndTime: '11:45',
        meetingType: MeetingType.ONLINE,
      });

      await expect(
        service.acceptMeeting(m2.meeting_id, 'f1', {
          scheduledDate: '2026-09-06',
          scheduledStartTime: '11:15',
          scheduledEndTime: '11:45',
          meetingType: MeetingType.ONLINE,
          meetingLink: 'https://meet.google.com/m2',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('denyMeeting', () => {
    it('faculty denies request with reason', async () => {
      const created = await service.createMeeting('s1', {
        facultyId: 'f1',
        purpose: 'Project Review',
        requestedDate: '2026-09-05',
        requestedStartTime: '10:00',
        requestedEndTime: '10:30',
        meetingType: MeetingType.ONLINE,
      });

      const denied = await service.denyMeeting(created.meeting_id, 'f1', {
        reason: 'Out of town on requested date',
      });

      expect(denied.status).toBe(MeetingStatus.DENIED);
      expect(denied.denial_reason).toBe('Out of town on requested date');
    });
  });

  describe('askReschedule and student response flow', () => {
    it('faculty proposes new time -> student accepts -> SCHEDULED', async () => {
      const created = await service.createMeeting('s1', {
        facultyId: 'f1',
        purpose: 'Guidance',
        requestedDate: '2026-09-05',
        requestedStartTime: '10:00',
        requestedEndTime: '10:30',
        meetingType: MeetingType.ONLINE,
      });

      const asked = await service.askReschedule(created.meeting_id, 'f1', {
        proposedDate: '2026-09-07',
        proposedStartTime: '14:00',
        proposedEndTime: '14:30',
        rescheduleReason: 'Busy in morning',
      });

      expect(asked.status).toBe(MeetingStatus.RESCHEDULE_REQUESTED);
      expect(asked.reschedule_requested_by).toBe(RescheduleBy.FACULTY);
      expect(asked.proposed_date).toBe('2026-09-07');

      const accepted = await service.studentAcceptReschedule(created.meeting_id, 's1');
      expect(accepted.status).toBe(MeetingStatus.SCHEDULED);
      expect(accepted.scheduled_date).toBe('2026-09-07');
      expect(accepted.scheduled_start_time).toBe('14:00');
    });

    it('faculty proposes new time -> student declines -> returns to PENDING', async () => {
      const created = await service.createMeeting('s1', {
        facultyId: 'f1',
        purpose: 'Guidance',
        requestedDate: '2026-09-05',
        requestedStartTime: '10:00',
        requestedEndTime: '10:30',
        meetingType: MeetingType.ONLINE,
      });

      await service.askReschedule(created.meeting_id, 'f1', {
        proposedDate: '2026-09-07',
        proposedStartTime: '14:00',
        proposedEndTime: '14:30',
      });

      const declined = await service.studentDeclineReschedule(created.meeting_id, 's1');
      expect(declined.status).toBe(MeetingStatus.PENDING);
    });
  });

  describe('student request reschedule on scheduled meeting', () => {
    it('student requests reschedule -> faculty accepts -> SCHEDULED at new time', async () => {
      const created = await service.createMeeting('s1', {
        facultyId: 'f1',
        purpose: 'Thesis',
        requestedDate: '2026-09-05',
        requestedStartTime: '10:00',
        requestedEndTime: '10:30',
        meetingType: MeetingType.ONLINE,
      });

      await service.acceptMeeting(created.meeting_id, 'f1', {
        scheduledDate: '2026-09-05',
        scheduledStartTime: '10:00',
        scheduledEndTime: '10:30',
        meetingType: MeetingType.ONLINE,
        meetingLink: 'https://meet.google.com/test',
      });

      const studentReq = await service.studentRequestReschedule(created.meeting_id, 's1', {
        proposedDate: '2026-09-08',
        proposedStartTime: '15:00',
        proposedEndTime: '15:30',
        rescheduleReason: 'Class clash',
      });

      expect(studentReq.status).toBe(MeetingStatus.RESCHEDULE_REQUESTED);
      expect(studentReq.reschedule_requested_by).toBe(RescheduleBy.STUDENT);

      const facultyHandled = await service.handleStudentReschedule(created.meeting_id, 'f1', {
        action: 'ACCEPT',
      });

      expect(facultyHandled.status).toBe(MeetingStatus.SCHEDULED);
      expect(facultyHandled.scheduled_date).toBe('2026-09-08');
      expect(facultyHandled.scheduled_start_time).toBe('15:00');
    });

    it('student requests reschedule -> faculty denies -> SCHEDULED at original time', async () => {
      const created = await service.createMeeting('s1', {
        facultyId: 'f1',
        purpose: 'Thesis',
        requestedDate: '2026-09-05',
        requestedStartTime: '10:00',
        requestedEndTime: '10:30',
        meetingType: MeetingType.ONLINE,
      });

      await service.acceptMeeting(created.meeting_id, 'f1', {
        scheduledDate: '2026-09-05',
        scheduledStartTime: '10:00',
        scheduledEndTime: '10:30',
        meetingType: MeetingType.ONLINE,
        meetingLink: 'https://meet.google.com/test',
      });

      await service.studentRequestReschedule(created.meeting_id, 's1', {
        proposedDate: '2026-09-08',
        proposedStartTime: '15:00',
        proposedEndTime: '15:30',
      });

      const facultyDenied = await service.handleStudentReschedule(created.meeting_id, 'f1', {
        action: 'DENY',
        denialReason: 'Cannot change slot',
      });

      expect(facultyDenied.status).toBe(MeetingStatus.SCHEDULED);
      expect(facultyDenied.scheduled_date).toBe('2026-09-05');
      expect(facultyDenied.scheduled_start_time).toBe('10:00');
    });
  });

  describe('faculty direct reschedule & completion', () => {
    it('faculty directly reschedules a confirmed meeting', async () => {
      const created = await service.createMeeting('s1', {
        facultyId: 'f1',
        purpose: 'Review',
        requestedDate: '2026-09-05',
        requestedStartTime: '10:00',
        requestedEndTime: '10:30',
        meetingType: MeetingType.ONLINE,
      });

      await service.acceptMeeting(created.meeting_id, 'f1', {
        scheduledDate: '2026-09-05',
        scheduledStartTime: '10:00',
        scheduledEndTime: '10:30',
        meetingType: MeetingType.ONLINE,
        meetingLink: 'https://meet.google.com/test',
      });

      const rescheduled = await service.facultyReschedule(created.meeting_id, 'f1', {
        scheduledDate: '2026-09-09',
        scheduledStartTime: '12:00',
        scheduledEndTime: '12:30',
        rescheduleReason: 'Dept meeting',
        meetingLink: 'https://meet.google.com/test2',
      });

      expect(rescheduled.status).toBe(MeetingStatus.SCHEDULED);
      expect(rescheduled.scheduled_date).toBe('2026-09-09');
      expect(rescheduled.scheduled_start_time).toBe('12:00');
    });

    it('faculty marks meeting as COMPLETED with notes and action items', async () => {
      const created = await service.createMeeting('s1', {
        facultyId: 'f1',
        purpose: 'Review',
        requestedDate: '2026-09-05',
        requestedStartTime: '10:00',
        requestedEndTime: '10:30',
        meetingType: MeetingType.ONLINE,
      });

      await service.acceptMeeting(created.meeting_id, 'f1', {
        scheduledDate: '2026-09-05',
        scheduledStartTime: '10:00',
        scheduledEndTime: '10:30',
        meetingType: MeetingType.ONLINE,
        meetingLink: 'https://meet.google.com/test',
      });

      const completed = await service.completeMeeting(created.meeting_id, 'f1', {
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
    });
  });

  describe('faculty direct scheduling and student list', () => {
    it('returns student list for faculty selection', async () => {
      const students = await service.getStudentList();
      expect(students).toBeDefined();
      expect(students.length).toBe(1);
      expect(students[0].user_id).toBe('s1');
      expect(students[0].first_name).toBe('John');
    });

    it('faculty directly creates and schedules a meeting in SCHEDULED status', async () => {
      const meeting = await service.facultyCreateMeeting('f1', {
        studentId: 's1',
        purpose: 'Direct Research Sync',
        description: 'Discuss GPU benchmarks',
        scheduledDate: '2026-09-12',
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
      expect(meeting.scheduled_date).toBe('2026-09-12');
      expect(meeting.scheduled_start_time).toBe('15:00');
      expect(meeting.meeting_link).toBe('https://meet.google.com/direct-link');
    });
  });
});
