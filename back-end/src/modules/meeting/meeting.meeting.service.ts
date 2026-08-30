import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { MeetingRepository } from './meeting.meeting.repository';
import { NotificationService } from '../../common/services/notification.service';
import { AuthenticatedUser } from '../../auth/jwt-payload';
import { ErrorCode, errorBody } from '../../common/errors/error-codes';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { AcceptMeetingDto } from './dto/accept-meeting.dto';
import { DenyMeetingDto } from './dto/deny-meeting.dto';
import { AskRescheduleDto } from './dto/ask-reschedule.dto';
import { RequestRescheduleDto } from './dto/request-reschedule.dto';
import { HandleStudentRescheduleDto } from './dto/handle-student-reschedule.dto';
import { FacultyRescheduleDto } from './dto/faculty-reschedule.dto';
import { FacultyCreateMeetingDto } from './dto/faculty-create-meeting.dto';
import { CompleteMeetingDto } from './dto/complete-meeting.dto';
import { MeetingStatus } from './enums/meeting-status.enum';
import { MeetingType } from './enums/meeting-type.enum';
import { MeetingPlatform } from './enums/meeting-platform.enum';
import { RescheduleBy } from './enums/reschedule-by.enum';
import { MeetingEntity } from './entities/meeting.entity';

@Injectable()
export class MeetingService {
  constructor(
    private readonly meetingRepo: MeetingRepository,
    private readonly notificationService: NotificationService,
  ) {}

  private validateTimeRange(startTime: string, endTime: string): void {
    if (startTime >= endTime) {
      throw new BadRequestException(
        errorBody(
          ErrorCode.BUSINESS_RULE_VIOLATION,
          `Start time (${startTime}) must be strictly before end time (${endTime})`,
        ),
      );
    }
  }

  private validateOnlineLink(meetingType: MeetingType, link?: string): void {
    if (meetingType === MeetingType.ONLINE) {
      if (!link || !link.trim()) {
        throw new BadRequestException(
          errorBody(
            ErrorCode.BUSINESS_RULE_VIOLATION,
            'Online meetings require a meeting link (e.g. Google Meet link)',
          ),
        );
      }
      if (!/^https?:\/\/.+/i.test(link.trim())) {
        throw new BadRequestException(
          errorBody(
            ErrorCode.VALIDATION_FAILED,
            'Meeting link must be a valid URL starting with http:// or https://',
          ),
        );
      }
    }
  }

  private validateInPersonLocation(meetingType: MeetingType, location?: string): void {
    if (meetingType === MeetingType.IN_PERSON) {
      if (!location || !location.trim()) {
        throw new BadRequestException(
          errorBody(
            ErrorCode.BUSINESS_RULE_VIOLATION,
            'In-person meetings require a location / room description',
          ),
        );
      }
    }
  }

  private validateFutureDateTime(dateStr: string, startTimeStr: string): void {
    if (!dateStr || !startTimeStr) return;
    const meetingDateTime = new Date(`${dateStr}T${startTimeStr}:00`);
    const now = new Date();
    // 60-second grace window to allow for network transmission when selecting current minute
    if (meetingDateTime.getTime() < now.getTime() - 60000) {
      throw new BadRequestException(
        errorBody(
          ErrorCode.BUSINESS_RULE_VIOLATION,
          `Cannot schedule meeting in the past (${dateStr} ${startTimeStr}). On the current date, meetings can only be scheduled from current time onwards.`,
        ),
      );
    }
  }

  async getFacultyList() {
    return this.meetingRepo.getFacultyList();
  }

  async getStudentList() {
    return this.meetingRepo.getStudentList();
  }

  async facultyCreateMeeting(facultyId: string, dto: FacultyCreateMeetingDto): Promise<MeetingEntity> {
    this.validateTimeRange(dto.scheduledStartTime, dto.scheduledEndTime);
    this.validateFutureDateTime(dto.scheduledDate, dto.scheduledStartTime);
    this.validateOnlineLink(dto.meetingType, dto.meetingLink);
    this.validateInPersonLocation(dto.meetingType, dto.location);

    const overlaps = await this.meetingRepo.findFacultyOverlappingMeetings(
      facultyId,
      dto.scheduledDate,
      dto.scheduledStartTime,
      dto.scheduledEndTime,
    );
    if (overlaps.length > 0) {
      throw new ConflictException(
        errorBody(
          ErrorCode.CONSTRAINT_VIOLATION,
          `You already have another meeting scheduled on ${dto.scheduledDate} overlapping ${dto.scheduledStartTime}–${dto.scheduledEndTime}`,
        ),
      );
    }

    const now = new Date().toISOString();
    const newMeeting: MeetingEntity = {
      meeting_id: uuidv4(),
      student_id: dto.studentId,
      faculty_id: facultyId,
      purpose: dto.purpose,
      description: dto.description || '',
      requested_date: dto.scheduledDate,
      requested_start_time: dto.scheduledStartTime,
      requested_end_time: dto.scheduledEndTime,
      scheduled_date: dto.scheduledDate,
      scheduled_start_time: dto.scheduledStartTime,
      scheduled_end_time: dto.scheduledEndTime,
      status: MeetingStatus.SCHEDULED,
      meeting_type: dto.meetingType,
      meeting_platform: dto.meetingType === MeetingType.ONLINE ? MeetingPlatform.GOOGLE_MEET : undefined,
      meeting_link: dto.meetingLink || undefined,
      location: dto.meetingType === MeetingType.IN_PERSON ? dto.location : undefined,
      faculty_remarks: dto.facultyRemarks || undefined,
      created_at: now,
      updated_at: now,
    };

    const saved = await this.meetingRepo.create(newMeeting);

    this.notificationService.notify(
      dto.studentId,
      `📅 Meeting scheduled: ${dto.purpose} on ${dto.scheduledDate} at ${dto.scheduledStartTime}–${dto.scheduledEndTime}`,
    );

    return saved;
  }

  async createMeeting(studentId: string, dto: CreateMeetingDto): Promise<MeetingEntity> {
    this.validateTimeRange(dto.requestedStartTime, dto.requestedEndTime);
    this.validateFutureDateTime(dto.requestedDate, dto.requestedStartTime);

    const now = new Date().toISOString();
    const newMeeting: MeetingEntity = {
      meeting_id: uuidv4(),
      student_id: studentId,
      faculty_id: dto.facultyId,
      purpose: dto.purpose,
      description: dto.description || '',
      requested_date: dto.requestedDate,
      requested_start_time: dto.requestedStartTime,
      requested_end_time: dto.requestedEndTime,
      status: MeetingStatus.PENDING,
      meeting_type: dto.meetingType,
      meeting_platform: dto.meetingType === MeetingType.ONLINE ? (dto.meetingPlatform || MeetingPlatform.GOOGLE_MEET) : undefined,
      location: dto.meetingType === MeetingType.IN_PERSON ? dto.location : undefined,
      created_at: now,
      updated_at: now,
    };

    const saved = await this.meetingRepo.create(newMeeting);

    this.notificationService.notify(
      dto.facultyId,
      `New meeting request submitted by student for ${dto.requestedDate} ${dto.requestedStartTime}`,
    );

    return saved;
  }

  async getMyMeetings(user: AuthenticatedUser): Promise<MeetingEntity[]> {
    if (user.role === 'student') {
      return this.meetingRepo.findByStudentId(user.sub);
    }
    if (user.role === 'faculty') {
      return this.meetingRepo.findByFacultyId(user.sub);
    }
    // Admin/head roles can view based on role
    return this.meetingRepo.findByFacultyId(user.sub);
  }

  async getFacultyRequests(facultyId: string): Promise<MeetingEntity[]> {
    return this.meetingRepo.findFacultyRequests(facultyId);
  }

  async getMeetingById(id: string, user: AuthenticatedUser): Promise<MeetingEntity> {
    const meeting = await this.meetingRepo.findById(id);
    if (!meeting) {
      throw new NotFoundException(
        errorBody(ErrorCode.RESOURCE_NOT_FOUND, `Meeting with id ${id} not found`),
      );
    }

    const isAuthorized =
      meeting.student_id === user.sub ||
      meeting.faculty_id === user.sub ||
      ['admin', 'head', 'superadmin'].includes(user.role);

    if (!isAuthorized) {
      throw new ForbiddenException(
        errorBody(ErrorCode.NOT_RESOURCE_OWNER, 'You do not have permission to view this meeting'),
      );
    }

    return meeting;
  }

  async acceptMeeting(id: string, facultyId: string, dto: AcceptMeetingDto): Promise<MeetingEntity> {
    const meeting = await this.meetingRepo.findById(id);
    if (!meeting) {
      throw new NotFoundException(
        errorBody(ErrorCode.RESOURCE_NOT_FOUND, 'Meeting not found'),
      );
    }

    if (meeting.faculty_id !== facultyId) {
      throw new ForbiddenException(
        errorBody(ErrorCode.NOT_RESOURCE_OWNER, 'You can only accept meeting requests assigned to you'),
      );
    }

    if (meeting.status !== MeetingStatus.PENDING) {
      throw new BadRequestException(
        errorBody(
          ErrorCode.INVALID_STATE_TRANSITION,
          `Cannot accept meeting in ${meeting.status} state. Meeting must be PENDING.`,
        ),
      );
    }

    this.validateTimeRange(dto.scheduledStartTime, dto.scheduledEndTime);
    this.validateFutureDateTime(dto.scheduledDate, dto.scheduledStartTime);

    const meetingType = dto.meetingType || meeting.meeting_type;
    const meetingPlatform = meetingType === MeetingType.ONLINE ? (dto.meetingPlatform || MeetingPlatform.GOOGLE_MEET) : undefined;
    const meetingLink = dto.meetingLink || meeting.meeting_link;
    const location = dto.location || meeting.location;

    this.validateOnlineLink(meetingType, meetingLink);
    this.validateInPersonLocation(meetingType, location);

    // Overlap check for faculty
    const overlaps = await this.meetingRepo.findFacultyOverlappingMeetings(
      facultyId,
      dto.scheduledDate,
      dto.scheduledStartTime,
      dto.scheduledEndTime,
      meeting.meeting_id,
    );

    if (overlaps.length > 0) {
      throw new ConflictException(
        errorBody(
          ErrorCode.CONSTRAINT_VIOLATION,
          `You already have another meeting scheduled on ${dto.scheduledDate} between ${overlaps[0].scheduled_start_time} and ${overlaps[0].scheduled_end_time}`,
        ),
      );
    }

    const updated = await this.meetingRepo.update(id, {
      status: MeetingStatus.SCHEDULED,
      scheduled_date: dto.scheduledDate,
      scheduled_start_time: dto.scheduledStartTime,
      scheduled_end_time: dto.scheduledEndTime,
      meeting_type: meetingType,
      meeting_platform: meetingPlatform,
      meeting_link: meetingType === MeetingType.ONLINE ? meetingLink : undefined,
      location: meetingType === MeetingType.IN_PERSON ? location : undefined,
      faculty_remarks: dto.facultyRemarks || meeting.faculty_remarks,
      reschedule_requested_by: undefined,
      proposed_date: undefined,
      proposed_start_time: undefined,
      proposed_end_time: undefined,
      reschedule_reason: undefined,
    });

    this.notificationService.notify(
      meeting.student_id,
      `Your meeting request has been scheduled for ${dto.scheduledDate} at ${dto.scheduledStartTime}`,
    );

    return updated!;
  }

  async denyMeeting(id: string, facultyId: string, dto: DenyMeetingDto): Promise<MeetingEntity> {
    const meeting = await this.meetingRepo.findById(id);
    if (!meeting) {
      throw new NotFoundException(
        errorBody(ErrorCode.RESOURCE_NOT_FOUND, 'Meeting not found'),
      );
    }

    if (meeting.faculty_id !== facultyId) {
      throw new ForbiddenException(
        errorBody(ErrorCode.NOT_RESOURCE_OWNER, 'You can only deny meeting requests assigned to you'),
      );
    }

    if (meeting.status !== MeetingStatus.PENDING) {
      throw new BadRequestException(
        errorBody(
          ErrorCode.INVALID_STATE_TRANSITION,
          `Cannot deny meeting in ${meeting.status} state. Meeting must be PENDING.`,
        ),
      );
    }

    const updated = await this.meetingRepo.update(id, {
      status: MeetingStatus.DENIED,
      denial_reason: dto.reason || 'Meeting request denied by faculty',
    });

    this.notificationService.notify(
      meeting.student_id,
      `Your meeting request was denied: ${dto.reason || 'No reason provided'}`,
    );

    return updated!;
  }

  async askReschedule(id: string, facultyId: string, dto: AskRescheduleDto): Promise<MeetingEntity> {
    const meeting = await this.meetingRepo.findById(id);
    if (!meeting) {
      throw new NotFoundException(
        errorBody(ErrorCode.RESOURCE_NOT_FOUND, 'Meeting not found'),
      );
    }

    if (meeting.faculty_id !== facultyId) {
      throw new ForbiddenException(
        errorBody(ErrorCode.NOT_RESOURCE_OWNER, 'You can only reschedule meeting requests assigned to you'),
      );
    }

    if (meeting.status !== MeetingStatus.PENDING) {
      throw new BadRequestException(
        errorBody(
          ErrorCode.INVALID_STATE_TRANSITION,
          `Cannot ask to reschedule meeting in ${meeting.status} state. Meeting must be PENDING.`,
        ),
      );
    }

    this.validateTimeRange(dto.proposedStartTime, dto.proposedEndTime);
    this.validateFutureDateTime(dto.proposedDate, dto.proposedStartTime);

    const meetingType = dto.meetingType || meeting.meeting_type;
    const meetingPlatform = meetingType === MeetingType.ONLINE ? (dto.meetingPlatform || MeetingPlatform.GOOGLE_MEET) : undefined;
    const meetingLink = dto.meetingLink || meeting.meeting_link;
    const location = dto.location || meeting.location;

    const updated = await this.meetingRepo.update(id, {
      status: MeetingStatus.RESCHEDULE_REQUESTED,
      reschedule_requested_by: RescheduleBy.FACULTY,
      proposed_date: dto.proposedDate,
      proposed_start_time: dto.proposedStartTime,
      proposed_end_time: dto.proposedEndTime,
      reschedule_reason: dto.rescheduleReason || 'Faculty proposed an alternative time',
      meeting_type: meetingType,
      meeting_platform: meetingPlatform,
      meeting_link: meetingType === MeetingType.ONLINE ? meetingLink : undefined,
      location: meetingType === MeetingType.IN_PERSON ? location : undefined,
    });

    this.notificationService.notify(
      meeting.student_id,
      `Faculty requested to reschedule meeting to ${dto.proposedDate} ${dto.proposedStartTime}`,
    );

    return updated!;
  }

  async studentAcceptReschedule(id: string, studentId: string): Promise<MeetingEntity> {
    const meeting = await this.meetingRepo.findById(id);
    if (!meeting) {
      throw new NotFoundException(
        errorBody(ErrorCode.RESOURCE_NOT_FOUND, 'Meeting not found'),
      );
    }

    if (meeting.student_id !== studentId) {
      throw new ForbiddenException(
        errorBody(ErrorCode.NOT_RESOURCE_OWNER, 'You can only accept reschedules for your own meetings'),
      );
    }

    if (
      meeting.status !== MeetingStatus.RESCHEDULE_REQUESTED ||
      meeting.reschedule_requested_by !== RescheduleBy.FACULTY
    ) {
      throw new BadRequestException(
        errorBody(
          ErrorCode.INVALID_STATE_TRANSITION,
          'Meeting is not awaiting student approval for faculty reschedule',
        ),
      );
    }

    if (!meeting.proposed_date || !meeting.proposed_start_time || !meeting.proposed_end_time) {
      throw new BadRequestException(
        errorBody(ErrorCode.BUSINESS_RULE_VIOLATION, 'Proposed schedule is incomplete'),
      );
    }

    // Overlap check
    const overlaps = await this.meetingRepo.findFacultyOverlappingMeetings(
      meeting.faculty_id,
      meeting.proposed_date,
      meeting.proposed_start_time,
      meeting.proposed_end_time,
      meeting.meeting_id,
    );

    if (overlaps.length > 0) {
      throw new ConflictException(
        errorBody(
          ErrorCode.CONSTRAINT_VIOLATION,
          'The proposed slot is no longer available due to a faculty schedule conflict',
        ),
      );
    }

    const updated = await this.meetingRepo.update(id, {
      status: MeetingStatus.SCHEDULED,
      scheduled_date: meeting.proposed_date,
      scheduled_start_time: meeting.proposed_start_time,
      scheduled_end_time: meeting.proposed_end_time,
      reschedule_requested_by: undefined,
      proposed_date: undefined,
      proposed_start_time: undefined,
      proposed_end_time: undefined,
    });

    this.notificationService.notify(
      meeting.faculty_id,
      `Student accepted proposed meeting time on ${meeting.proposed_date} at ${meeting.proposed_start_time}`,
    );

    return updated!;
  }

  async studentDeclineReschedule(id: string, studentId: string): Promise<MeetingEntity> {
    const meeting = await this.meetingRepo.findById(id);
    if (!meeting) {
      throw new NotFoundException(
        errorBody(ErrorCode.RESOURCE_NOT_FOUND, 'Meeting not found'),
      );
    }

    if (meeting.student_id !== studentId) {
      throw new ForbiddenException(
        errorBody(ErrorCode.NOT_RESOURCE_OWNER, 'You can only decline reschedules for your own meetings'),
      );
    }

    if (
      meeting.status !== MeetingStatus.RESCHEDULE_REQUESTED ||
      meeting.reschedule_requested_by !== RescheduleBy.FACULTY
    ) {
      throw new BadRequestException(
        errorBody(
          ErrorCode.INVALID_STATE_TRANSITION,
          'Meeting is not awaiting student response for faculty reschedule',
        ),
      );
    }

    // Per specifications: If declined, return to PENDING so another time can be proposed
    const updated = await this.meetingRepo.update(id, {
      status: MeetingStatus.PENDING,
      reschedule_requested_by: undefined,
      proposed_date: undefined,
      proposed_start_time: undefined,
      proposed_end_time: undefined,
    });

    this.notificationService.notify(
      meeting.faculty_id,
      'Student declined the proposed reschedule. Request returned to PENDING.',
    );

    return updated!;
  }

  async studentRequestReschedule(
    id: string,
    studentId: string,
    dto: RequestRescheduleDto,
  ): Promise<MeetingEntity> {
    const meeting = await this.meetingRepo.findById(id);
    if (!meeting) {
      throw new NotFoundException(
        errorBody(ErrorCode.RESOURCE_NOT_FOUND, 'Meeting not found'),
      );
    }

    if (meeting.student_id !== studentId) {
      throw new ForbiddenException(
        errorBody(ErrorCode.NOT_RESOURCE_OWNER, 'You can only request reschedule for your own meetings'),
      );
    }

    if (meeting.status !== MeetingStatus.SCHEDULED) {
      throw new BadRequestException(
        errorBody(
          ErrorCode.INVALID_STATE_TRANSITION,
          `Cannot request reschedule for a meeting in ${meeting.status} state. Meeting must be SCHEDULED.`,
        ),
      );
    }

    this.validateTimeRange(dto.proposedStartTime, dto.proposedEndTime);
    this.validateFutureDateTime(dto.proposedDate, dto.proposedStartTime);

    const updated = await this.meetingRepo.update(id, {
      status: MeetingStatus.RESCHEDULE_REQUESTED,
      reschedule_requested_by: RescheduleBy.STUDENT,
      proposed_date: dto.proposedDate,
      proposed_start_time: dto.proposedStartTime,
      proposed_end_time: dto.proposedEndTime,
      reschedule_reason: dto.rescheduleReason || 'Student requested to reschedule confirmed meeting',
    });

    this.notificationService.notify(
      meeting.faculty_id,
      `Student requested to reschedule meeting to ${dto.proposedDate} ${dto.proposedStartTime}`,
    );

    return updated!;
  }

  async handleStudentReschedule(
    id: string,
    facultyId: string,
    dto: HandleStudentRescheduleDto,
  ): Promise<MeetingEntity> {
    const meeting = await this.meetingRepo.findById(id);
    if (!meeting) {
      throw new NotFoundException(
        errorBody(ErrorCode.RESOURCE_NOT_FOUND, 'Meeting not found'),
      );
    }

    if (meeting.faculty_id !== facultyId) {
      throw new ForbiddenException(
        errorBody(ErrorCode.NOT_RESOURCE_OWNER, 'You can only respond to reschedule requests for your meetings'),
      );
    }

    if (
      meeting.status !== MeetingStatus.RESCHEDULE_REQUESTED ||
      meeting.reschedule_requested_by !== RescheduleBy.STUDENT
    ) {
      throw new BadRequestException(
        errorBody(
          ErrorCode.INVALID_STATE_TRANSITION,
          'Meeting is not awaiting faculty response for student reschedule request',
        ),
      );
    }

    if (dto.action === 'ACCEPT') {
      if (!meeting.proposed_date || !meeting.proposed_start_time || !meeting.proposed_end_time) {
        throw new BadRequestException(
          errorBody(ErrorCode.BUSINESS_RULE_VIOLATION, 'Student proposed schedule is incomplete'),
        );
      }

      const overlaps = await this.meetingRepo.findFacultyOverlappingMeetings(
        facultyId,
        meeting.proposed_date,
        meeting.proposed_start_time,
        meeting.proposed_end_time,
        meeting.meeting_id,
      );

      if (overlaps.length > 0) {
        throw new ConflictException(
          errorBody(
            ErrorCode.CONSTRAINT_VIOLATION,
            `You already have another meeting scheduled on ${meeting.proposed_date} at ${overlaps[0].scheduled_start_time}`,
          ),
        );
      }

      const meetingType = dto.meetingType || meeting.meeting_type;
      const meetingLink = dto.meetingLink || meeting.meeting_link;
      const location = dto.location || meeting.location;

      const updated = await this.meetingRepo.update(id, {
        status: MeetingStatus.SCHEDULED,
        scheduled_date: meeting.proposed_date,
        scheduled_start_time: meeting.proposed_start_time,
        scheduled_end_time: meeting.proposed_end_time,
        meeting_type: meetingType,
        meeting_platform: meetingType === MeetingType.ONLINE ? (dto.meetingPlatform || MeetingPlatform.GOOGLE_MEET) : undefined,
        meeting_link: meetingType === MeetingType.ONLINE ? meetingLink : undefined,
        location: meetingType === MeetingType.IN_PERSON ? location : undefined,
        reschedule_requested_by: undefined,
        proposed_date: undefined,
        proposed_start_time: undefined,
        proposed_end_time: undefined,
        reschedule_reason: undefined,
      });

      this.notificationService.notify(
        meeting.student_id,
        `Faculty accepted your reschedule request for ${meeting.proposed_date} at ${meeting.proposed_start_time}`,
      );

      return updated!;
    }

    if (dto.action === 'DENY') {
      // Per specifications: Original confirmed time remains unchanged, status returns to SCHEDULED
      const updated = await this.meetingRepo.update(id, {
        status: MeetingStatus.SCHEDULED,
        denial_reason: dto.denialReason || 'Faculty declined reschedule request; original schedule stands',
        reschedule_requested_by: undefined,
        proposed_date: undefined,
        proposed_start_time: undefined,
        proposed_end_time: undefined,
      });

      this.notificationService.notify(
        meeting.student_id,
        `Faculty declined your reschedule request. The original meeting schedule on ${meeting.scheduled_date} at ${meeting.scheduled_start_time} remains unchanged.`,
      );

      return updated!;
    }

    if (dto.action === 'PROPOSE') {
      if (!dto.proposedDate || !dto.proposedStartTime || !dto.proposedEndTime) {
        throw new BadRequestException(
          errorBody(
            ErrorCode.BUSINESS_RULE_VIOLATION,
            'Proposed date, start time, and end time are required to counter-propose',
          ),
        );
      }

      this.validateTimeRange(dto.proposedStartTime, dto.proposedEndTime);
      this.validateFutureDateTime(dto.proposedDate, dto.proposedStartTime);

      const meetingType = dto.meetingType || meeting.meeting_type;
      const meetingLink = dto.meetingLink || meeting.meeting_link;
      const location = dto.location || meeting.location;

      const updated = await this.meetingRepo.update(id, {
        status: MeetingStatus.RESCHEDULE_REQUESTED,
        reschedule_requested_by: RescheduleBy.FACULTY,
        proposed_date: dto.proposedDate,
        proposed_start_time: dto.proposedStartTime,
        proposed_end_time: dto.proposedEndTime,
        reschedule_reason: dto.rescheduleReason || 'Faculty proposed an alternative time slot',
        meeting_type: meetingType,
        meeting_platform: meetingType === MeetingType.ONLINE ? (dto.meetingPlatform || MeetingPlatform.GOOGLE_MEET) : undefined,
        meeting_link: meetingType === MeetingType.ONLINE ? meetingLink : undefined,
        location: meetingType === MeetingType.IN_PERSON ? location : undefined,
      });

      this.notificationService.notify(
        meeting.student_id,
        `Faculty counter-proposed meeting time on ${dto.proposedDate} at ${dto.proposedStartTime}`,
      );

      return updated!;
    }

    throw new BadRequestException(
      errorBody(ErrorCode.VALIDATION_FAILED, 'Invalid action specified for handling student reschedule'),
    );
  }

  async facultyReschedule(
    id: string,
    facultyId: string,
    dto: FacultyRescheduleDto,
  ): Promise<MeetingEntity> {
    const meeting = await this.meetingRepo.findById(id);
    if (!meeting) {
      throw new NotFoundException(
        errorBody(ErrorCode.RESOURCE_NOT_FOUND, 'Meeting not found'),
      );
    }

    if (meeting.faculty_id !== facultyId) {
      throw new ForbiddenException(
        errorBody(ErrorCode.NOT_RESOURCE_OWNER, 'You can only reschedule meetings assigned to you'),
      );
    }

    if (meeting.status !== MeetingStatus.SCHEDULED) {
      throw new BadRequestException(
        errorBody(
          ErrorCode.INVALID_STATE_TRANSITION,
          `Cannot reschedule meeting in ${meeting.status} state. Meeting must be SCHEDULED.`,
        ),
      );
    }

    this.validateTimeRange(dto.scheduledStartTime, dto.scheduledEndTime);
    this.validateFutureDateTime(dto.scheduledDate, dto.scheduledStartTime);

    const meetingType = dto.meetingType || meeting.meeting_type;
    const meetingPlatform = meetingType === MeetingType.ONLINE ? (dto.meetingPlatform || MeetingPlatform.GOOGLE_MEET) : undefined;
    const meetingLink = dto.meetingLink || meeting.meeting_link;
    const location = dto.location || meeting.location;

    this.validateOnlineLink(meetingType, meetingLink);
    this.validateInPersonLocation(meetingType, location);

    const overlaps = await this.meetingRepo.findFacultyOverlappingMeetings(
      facultyId,
      dto.scheduledDate,
      dto.scheduledStartTime,
      dto.scheduledEndTime,
      meeting.meeting_id,
    );

    if (overlaps.length > 0) {
      throw new ConflictException(
        errorBody(
          ErrorCode.CONSTRAINT_VIOLATION,
          `You already have another meeting scheduled on ${dto.scheduledDate} between ${overlaps[0].scheduled_start_time} and ${overlaps[0].scheduled_end_time}`,
        ),
      );
    }

    const updated = await this.meetingRepo.update(id, {
      status: MeetingStatus.SCHEDULED,
      scheduled_date: dto.scheduledDate,
      scheduled_start_time: dto.scheduledStartTime,
      scheduled_end_time: dto.scheduledEndTime,
      reschedule_reason: dto.rescheduleReason || 'Faculty updated the confirmed schedule',
      meeting_type: meetingType,
      meeting_platform: meetingPlatform,
      meeting_link: meetingType === MeetingType.ONLINE ? meetingLink : undefined,
      location: meetingType === MeetingType.IN_PERSON ? location : undefined,
      reschedule_requested_by: undefined,
      proposed_date: undefined,
      proposed_start_time: undefined,
      proposed_end_time: undefined,
    });

    this.notificationService.notify(
      meeting.student_id,
      `Faculty rescheduled your meeting to ${dto.scheduledDate} at ${dto.scheduledStartTime}. Reason: ${dto.rescheduleReason || 'Schedule updated'}`,
    );

    return updated!;
  }

  async completeMeeting(id: string, facultyId: string, dto: CompleteMeetingDto): Promise<MeetingEntity> {
    const meeting = await this.meetingRepo.findById(id);
    if (!meeting) {
      throw new NotFoundException(
        errorBody(ErrorCode.RESOURCE_NOT_FOUND, 'Meeting not found'),
      );
    }

    if (meeting.faculty_id !== facultyId) {
      throw new ForbiddenException(
        errorBody(ErrorCode.NOT_RESOURCE_OWNER, 'You can only complete meetings assigned to you'),
      );
    }

    if (meeting.status !== MeetingStatus.SCHEDULED) {
      throw new BadRequestException(
        errorBody(
          ErrorCode.INVALID_STATE_TRANSITION,
          `Cannot complete meeting in ${meeting.status} state. Meeting must be SCHEDULED.`,
        ),
      );
    }

    const updated = await this.meetingRepo.update(id, {
      status: MeetingStatus.COMPLETED,
      discussion_notes: dto.discussionNotes,
      outcome: dto.outcome,
      action_items: dto.actionItems,
      faculty_remarks: dto.facultyRemarks,
    });

    this.notificationService.notify(
      meeting.student_id,
      'Your meeting has been marked as COMPLETED. Discussion notes and outcome are available in your dashboard.',
    );

    return updated!;
  }

  async cancelMeeting(id: string, userId: string): Promise<MeetingEntity> {
    const meeting = await this.meetingRepo.findById(id);
    if (!meeting) {
      throw new NotFoundException(
        errorBody(ErrorCode.RESOURCE_NOT_FOUND, 'Meeting not found'),
      );
    }

    if (meeting.student_id !== userId && meeting.faculty_id !== userId) {
      throw new ForbiddenException(
        errorBody(ErrorCode.NOT_RESOURCE_OWNER, 'You do not have permission to cancel this meeting'),
      );
    }

    if (
      meeting.status === MeetingStatus.COMPLETED ||
      meeting.status === MeetingStatus.DENIED ||
      meeting.status === MeetingStatus.CANCELLED
    ) {
      throw new BadRequestException(
        errorBody(
          ErrorCode.INVALID_STATE_TRANSITION,
          `Cannot cancel meeting in terminal status ${meeting.status}`,
        ),
      );
    }

    const updated = await this.meetingRepo.update(id, {
      status: MeetingStatus.CANCELLED,
    });

    const recipient = meeting.student_id === userId ? meeting.faculty_id : meeting.student_id;
    this.notificationService.notify(recipient, 'Meeting has been CANCELLED');

    return updated!;
  }
}
