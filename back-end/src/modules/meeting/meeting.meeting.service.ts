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
import { MeetingEntity, MeetingHistoryItem } from './entities/meeting.entity';
import { writeCollegeId } from '../../common/tenancy/scope-to-college';

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

  private validateNotPast(date: string, startTime: string): void {
    const meetingDate = new Date(`${date}T${startTime}:00`);
    const now = new Date();
    // Allow small 2-minute buffer for form submissions
    if (meetingDate.getTime() + 120000 < now.getTime()) {
      throw new BadRequestException(
        errorBody(
          ErrorCode.BUSINESS_RULE_VIOLATION,
          `Cannot schedule a meeting in the past (${date} ${startTime})`,
        ),
      );
    }
  }

  private appendHistory(
    existing: MeetingHistoryItem[] | undefined,
    action: string,
    actor: string,
    details?: string | Record<string, any>,
  ): MeetingHistoryItem[] {
    const list = existing ? [...existing] : [];
    list.push({
      timestamp: new Date().toISOString(),
      action,
      actor,
      details,
    });
    return list;
  }

  async getFacultyList(collegeId: string | null) {
    return this.meetingRepo.getFacultyList(collegeId);
  }

  async getStudentList(collegeId: string | null) {
    return this.meetingRepo.getStudentList(collegeId);
  }

  async createMeeting(
    studentId: string,
    collegeId: string | null,
    dto: CreateMeetingDto,
  ): Promise<MeetingEntity> {
    this.validateTimeRange(dto.requestedStartTime, dto.requestedEndTime);
    this.validateNotPast(dto.requestedDate, dto.requestedStartTime);

    if (dto.meetingType === MeetingType.ONLINE && dto.meetingLink) {
      this.validateOnlineLink(dto.meetingType, dto.meetingLink);
    }

    const meetingPlatform =
      dto.meetingType === MeetingType.ONLINE
        ? dto.meetingPlatform || MeetingPlatform.GOOGLE_MEET
        : undefined;

    const now = new Date().toISOString();
    const newMeeting: MeetingEntity = {
      meeting_id: uuidv4(),
      student_id: studentId,
      faculty_id: dto.facultyId,
      college_id: writeCollegeId(collegeId),
      purpose: dto.purpose,
      description: dto.description || '',
      requested_date: dto.requestedDate,
      requested_start_time: dto.requestedStartTime,
      requested_end_time: dto.requestedEndTime,
      status: MeetingStatus.PENDING,
      meeting_type: dto.meetingType,
      meeting_platform: meetingPlatform,
      meeting_link: dto.meetingLink,
      location: dto.location,
      meeting_history: [
        {
          timestamp: now,
          action: 'REQUEST_CREATED',
          actor: studentId,
          details: 'Student submitted meeting request',
        },
      ],
      created_at: now,
      updated_at: now,
    };

    const created = await this.meetingRepo.create(newMeeting);

    this.notificationService.notify(
      dto.facultyId,
      `New meeting request from student for ${dto.requestedDate} at ${dto.requestedStartTime}`,
    );

    return created;
  }

  async facultyCreateMeeting(
    facultyId: string,
    collegeId: string | null,
    dto: FacultyCreateMeetingDto,
  ): Promise<MeetingEntity> {
    this.validateTimeRange(dto.scheduledStartTime, dto.scheduledEndTime);
    this.validateNotPast(dto.scheduledDate, dto.scheduledStartTime);
    this.validateOnlineLink(dto.meetingType, dto.meetingLink);

    // Prevent scheduling conflict for faculty
    const overlaps = await this.meetingRepo.findOverlappingScheduled(
      facultyId,
      dto.scheduledDate,
      dto.scheduledStartTime,
      dto.scheduledEndTime,
      collegeId,
    );
    if (overlaps.length > 0) {
      throw new ConflictException(
        errorBody(
          ErrorCode.CONSTRAINT_VIOLATION,
          `You already have another meeting scheduled on ${dto.scheduledDate} overlapping ${dto.scheduledStartTime}-${dto.scheduledEndTime}`,
        ),
      );
    }

    const now = new Date().toISOString();
    const meetingPlatform =
      dto.meetingType === MeetingType.ONLINE
        ? dto.meetingPlatform || MeetingPlatform.GOOGLE_MEET
        : undefined;

    const newMeeting: MeetingEntity = {
      meeting_id: uuidv4(),
      student_id: dto.studentId,
      faculty_id: facultyId,
      college_id: writeCollegeId(collegeId),
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
      meeting_platform: meetingPlatform,
      meeting_link: dto.meetingLink,
      location: dto.location,
      faculty_remarks: dto.facultyRemarks,
      meeting_history: [
        {
          timestamp: now,
          action: 'FACULTY_SCHEDULED',
          actor: facultyId,
          details: 'Faculty directly scheduled meeting',
        },
      ],
      created_at: now,
      updated_at: now,
    };

    const created = await this.meetingRepo.create(newMeeting);

    this.notificationService.notify(
      dto.studentId,
      `Faculty scheduled a meeting with you on ${dto.scheduledDate} at ${dto.scheduledStartTime}`,
    );

    return created;
  }

  async getMyMeetings(user: AuthenticatedUser): Promise<MeetingEntity[]> {
    const collegeId = user.college_id ?? null;
    if (user.role === 'student') {
      return this.meetingRepo.findByStudentId(user.sub, collegeId);
    }
    if (user.role === 'faculty') {
      return this.meetingRepo.findByFacultyId(user.sub, collegeId);
    }
    // Admin, Head, Superadmin
    return this.meetingRepo.getAll(collegeId);
  }

  async getFacultyRequests(facultyId: string, collegeId: string | null): Promise<MeetingEntity[]> {
    return this.meetingRepo.findFacultyRequests(facultyId, collegeId);
  }

  async getMeetingById(id: string, user: AuthenticatedUser): Promise<MeetingEntity> {
    const collegeId = user.college_id ?? null;
    const meeting = await this.meetingRepo.findById(id, collegeId);
    if (!meeting) {
      throw new NotFoundException(
        errorBody(ErrorCode.RESOURCE_NOT_FOUND, `Meeting with id "${id}" not found`),
      );
    }

    const isPrivileged = ['admin', 'head', 'superadmin'].includes(user.role);
    if (!isPrivileged && meeting.student_id !== user.sub && meeting.faculty_id !== user.sub) {
      throw new ForbiddenException(
        errorBody(ErrorCode.NOT_RESOURCE_OWNER, 'You do not have permission to view this meeting'),
      );
    }

    return meeting;
  }

  async acceptMeeting(
    id: string,
    facultyId: string,
    collegeId: string | null,
    dto: AcceptMeetingDto,
  ): Promise<MeetingEntity> {
    const meeting = await this.meetingRepo.findById(id, collegeId);
    if (!meeting) {
      throw new NotFoundException(
        errorBody(ErrorCode.RESOURCE_NOT_FOUND, `Meeting with id "${id}" not found`),
      );
    }

    if (meeting.faculty_id !== facultyId) {
      throw new ForbiddenException(
        errorBody(ErrorCode.NOT_RESOURCE_OWNER, 'Only the assigned faculty member can accept this meeting'),
      );
    }

    if (meeting.status !== MeetingStatus.PENDING && meeting.status !== MeetingStatus.RESCHEDULE_PROPOSED) {
      throw new BadRequestException(
        errorBody(
          ErrorCode.BUSINESS_RULE_VIOLATION,
          `Cannot accept meeting in ${meeting.status} status; only PENDING or RESCHEDULE_PROPOSED meetings can be accepted`,
        ),
      );
    }

    this.validateTimeRange(dto.scheduledStartTime, dto.scheduledEndTime);
    this.validateNotPast(dto.scheduledDate, dto.scheduledStartTime);

    const meetingType = dto.meetingType || meeting.meeting_type;
    const meetingLink = dto.meetingLink || meeting.meeting_link;
    this.validateOnlineLink(meetingType, meetingLink);

    // Overlapping check
    const overlaps = await this.meetingRepo.findOverlappingScheduled(
      facultyId,
      dto.scheduledDate,
      dto.scheduledStartTime,
      dto.scheduledEndTime,
      collegeId,
      id,
    );
    if (overlaps.length > 0) {
      throw new ConflictException(
        errorBody(
          ErrorCode.CONSTRAINT_VIOLATION,
          `You already have another meeting scheduled on ${dto.scheduledDate} overlapping ${dto.scheduledStartTime}-${dto.scheduledEndTime}`,
        ),
      );
    }

    const history = this.appendHistory(
      meeting.meeting_history,
      'FACULTY_ACCEPTED',
      facultyId,
      `Accepted for ${dto.scheduledDate} ${dto.scheduledStartTime}-${dto.scheduledEndTime}`,
    );

    const updated = await this.meetingRepo.update(
      id,
      {
        status: MeetingStatus.SCHEDULED,
        scheduled_date: dto.scheduledDate,
        scheduled_start_time: dto.scheduledStartTime,
        scheduled_end_time: dto.scheduledEndTime,
        meeting_type: meetingType,
        meeting_platform: dto.meetingPlatform || meeting.meeting_platform || MeetingPlatform.GOOGLE_MEET,
        meeting_link: meetingLink,
        location: dto.location || meeting.location,
        faculty_remarks: dto.facultyRemarks || meeting.faculty_remarks,
        reschedule_requested_by: undefined,
        proposed_date: undefined,
        proposed_start_time: undefined,
        proposed_end_time: undefined,
        meeting_history: history,
      },
      collegeId,
    );

    this.notificationService.notify(
      meeting.student_id,
      `Your meeting request was accepted for ${dto.scheduledDate} at ${dto.scheduledStartTime}`,
    );

    return updated;
  }

  async denyMeeting(
    id: string,
    facultyId: string,
    collegeId: string | null,
    dto: DenyMeetingDto,
  ): Promise<MeetingEntity> {
    const meeting = await this.meetingRepo.findById(id, collegeId);
    if (!meeting) {
      throw new NotFoundException(
        errorBody(ErrorCode.RESOURCE_NOT_FOUND, `Meeting with id "${id}" not found`),
      );
    }

    if (meeting.faculty_id !== facultyId) {
      throw new ForbiddenException(
        errorBody(ErrorCode.NOT_RESOURCE_OWNER, 'Only the assigned faculty member can deny this meeting'),
      );
    }

    if (meeting.status !== MeetingStatus.PENDING && meeting.status !== MeetingStatus.RESCHEDULE_REQUESTED) {
      throw new BadRequestException(
        errorBody(
          ErrorCode.BUSINESS_RULE_VIOLATION,
          `Cannot deny meeting in status ${meeting.status}; must be PENDING or RESCHEDULE_REQUESTED`,
        ),
      );
    }

    const history = this.appendHistory(
      meeting.meeting_history,
      'FACULTY_DENIED',
      facultyId,
      dto.reason || 'Faculty declined request',
    );

    const updated = await this.meetingRepo.update(
      id,
      {
        status: MeetingStatus.DENIED,
        denial_reason: dto.reason || 'Faculty was unavailable',
        meeting_history: history,
      },
      collegeId,
    );

    this.notificationService.notify(
      meeting.student_id,
      `Your meeting request was denied: ${dto.reason || 'Faculty unavailable'}`,
    );

    return updated;
  }

  async askReschedule(
    id: string,
    facultyId: string,
    collegeId: string | null,
    dto: AskRescheduleDto,
  ): Promise<MeetingEntity> {
    const meeting = await this.meetingRepo.findById(id, collegeId);
    if (!meeting) {
      throw new NotFoundException(
        errorBody(ErrorCode.RESOURCE_NOT_FOUND, `Meeting with id "${id}" not found`),
      );
    }

    if (meeting.faculty_id !== facultyId) {
      throw new ForbiddenException(
        errorBody(ErrorCode.NOT_RESOURCE_OWNER, 'Only the assigned faculty member can propose another time'),
      );
    }

    if (meeting.status !== MeetingStatus.PENDING && meeting.status !== MeetingStatus.SCHEDULED) {
      throw new BadRequestException(
        errorBody(
          ErrorCode.BUSINESS_RULE_VIOLATION,
          `Cannot propose new time for meeting in ${meeting.status} status`,
        ),
      );
    }

    this.validateTimeRange(dto.proposedStartTime, dto.proposedEndTime);
    this.validateNotPast(dto.proposedDate, dto.proposedStartTime);

    const history = this.appendHistory(
      meeting.meeting_history,
      'FACULTY_PROPOSED_RESCHEDULE',
      facultyId,
      `Faculty proposed alternative slot: ${dto.proposedDate} ${dto.proposedStartTime}-${dto.proposedEndTime}. Reason: ${dto.reason || 'Schedule adjustment'}`,
    );

    const updated = await this.meetingRepo.update(
      id,
      {
        status: MeetingStatus.RESCHEDULE_PROPOSED,
        reschedule_requested_by: RescheduleBy.FACULTY,
        proposed_date: dto.proposedDate,
        proposed_start_time: dto.proposedStartTime,
        proposed_end_time: dto.proposedEndTime,
        reschedule_reason: dto.reason || 'Faculty proposed an alternative meeting slot',
        meeting_type: dto.meetingType || meeting.meeting_type,
        meeting_platform: dto.meetingPlatform || meeting.meeting_platform,
        meeting_link: dto.meetingLink || meeting.meeting_link,
        location: dto.location || meeting.location,
        meeting_history: history,
      },
      collegeId,
    );

    this.notificationService.notify(
      meeting.student_id,
      `Faculty proposed a new time for your meeting: ${dto.proposedDate} at ${dto.proposedStartTime}`,
    );

    return updated;
  }

  async studentAcceptReschedule(
    id: string,
    studentId: string,
    collegeId: string | null,
  ): Promise<MeetingEntity> {
    const meeting = await this.meetingRepo.findById(id, collegeId);
    if (!meeting) {
      throw new NotFoundException(
        errorBody(ErrorCode.RESOURCE_NOT_FOUND, `Meeting with id "${id}" not found`),
      );
    }

    if (meeting.student_id !== studentId) {
      throw new ForbiddenException(
        errorBody(ErrorCode.NOT_RESOURCE_OWNER, 'Only the requesting student can accept this proposal'),
      );
    }

    if (meeting.status !== MeetingStatus.RESCHEDULE_PROPOSED) {
      throw new BadRequestException(
        errorBody(
          ErrorCode.BUSINESS_RULE_VIOLATION,
          `No active reschedule proposal exists for meeting (status: ${meeting.status})`,
        ),
      );
    }

    if (!meeting.proposed_date || !meeting.proposed_start_time || !meeting.proposed_end_time) {
      throw new BadRequestException(
        errorBody(ErrorCode.BUSINESS_RULE_VIOLATION, 'Proposed date or time is missing'),
      );
    }

    // Faculty schedule conflict check
    const overlaps = await this.meetingRepo.findOverlappingScheduled(
      meeting.faculty_id,
      meeting.proposed_date,
      meeting.proposed_start_time,
      meeting.proposed_end_time,
      collegeId,
      id,
    );
    if (overlaps.length > 0) {
      throw new ConflictException(
        errorBody(
          ErrorCode.CONSTRAINT_VIOLATION,
          'The proposed slot is no longer available due to a faculty schedule conflict',
        ),
      );
    }

    const history = this.appendHistory(
      meeting.meeting_history,
      'STUDENT_ACCEPTED_RESCHEDULE',
      studentId,
      `Student accepted proposed time: ${meeting.proposed_date} ${meeting.proposed_start_time}-${meeting.proposed_end_time}`,
    );

    const updated = await this.meetingRepo.update(
      id,
      {
        status: MeetingStatus.SCHEDULED,
        scheduled_date: meeting.proposed_date,
        scheduled_start_time: meeting.proposed_start_time,
        scheduled_end_time: meeting.proposed_end_time,
        reschedule_requested_by: undefined,
        proposed_date: undefined,
        proposed_start_time: undefined,
        proposed_end_time: undefined,
        meeting_history: history,
      },
      collegeId,
    );

    this.notificationService.notify(
      meeting.faculty_id,
      `Student accepted your proposed meeting time for ${updated.scheduled_date} at ${updated.scheduled_start_time}`,
    );

    return updated;
  }

  async studentDeclineReschedule(
    id: string,
    studentId: string,
    collegeId: string | null,
  ): Promise<MeetingEntity> {
    const meeting = await this.meetingRepo.findById(id, collegeId);
    if (!meeting) {
      throw new NotFoundException(
        errorBody(ErrorCode.RESOURCE_NOT_FOUND, `Meeting with id "${id}" not found`),
      );
    }

    if (meeting.student_id !== studentId) {
      throw new ForbiddenException(
        errorBody(ErrorCode.NOT_RESOURCE_OWNER, 'Only the requesting student can decline this proposal'),
      );
    }

    if (meeting.status !== MeetingStatus.RESCHEDULE_PROPOSED) {
      throw new BadRequestException(
        errorBody(
          ErrorCode.BUSINESS_RULE_VIOLATION,
          `No active reschedule proposal exists for meeting (status: ${meeting.status})`,
        ),
      );
    }

    // If meeting was previously SCHEDULED, revert to SCHEDULED preserving original schedule;
    // If it was PENDING when proposed, return to PENDING.
    const revertStatus = meeting.scheduled_date ? MeetingStatus.SCHEDULED : MeetingStatus.PENDING;

    const history = this.appendHistory(
      meeting.meeting_history,
      'STUDENT_DECLINED_RESCHEDULE',
      studentId,
      `Student declined proposed reschedule. Meeting restored to ${revertStatus}`,
    );

    const updated = await this.meetingRepo.update(
      id,
      {
        status: revertStatus,
        reschedule_requested_by: undefined,
        proposed_date: undefined,
        proposed_start_time: undefined,
        proposed_end_time: undefined,
        meeting_history: history,
      },
      collegeId,
    );

    this.notificationService.notify(
      meeting.faculty_id,
      `Student declined the proposed reschedule. Meeting remains ${revertStatus}`,
    );

    return updated;
  }

  async studentRequestReschedule(
    id: string,
    studentId: string,
    collegeId: string | null,
    dto: RequestRescheduleDto,
  ): Promise<MeetingEntity> {
    const meeting = await this.meetingRepo.findById(id, collegeId);
    if (!meeting) {
      throw new NotFoundException(
        errorBody(ErrorCode.RESOURCE_NOT_FOUND, `Meeting with id "${id}" not found`),
      );
    }

    if (meeting.student_id !== studentId) {
      throw new ForbiddenException(
        errorBody(ErrorCode.NOT_RESOURCE_OWNER, 'Only the meeting participant student can request reschedule'),
      );
    }

    if (meeting.status !== MeetingStatus.SCHEDULED) {
      throw new BadRequestException(
        errorBody(
          ErrorCode.BUSINESS_RULE_VIOLATION,
          `Cannot request reschedule for meeting in ${meeting.status} status; only SCHEDULED meetings can be rescheduled`,
        ),
      );
    }

    this.validateTimeRange(dto.proposedStartTime, dto.proposedEndTime);
    this.validateNotPast(dto.proposedDate, dto.proposedStartTime);

    const history = this.appendHistory(
      meeting.meeting_history,
      'STUDENT_REQUESTED_RESCHEDULE',
      studentId,
      `Student requested reschedule to ${dto.proposedDate} ${dto.proposedStartTime}-${dto.proposedEndTime}. Reason: ${dto.rescheduleReason || dto.reason || 'Not specified'}`,
    );

    const updated = await this.meetingRepo.update(
      id,
      {
        status: MeetingStatus.RESCHEDULE_REQUESTED,
        reschedule_requested_by: RescheduleBy.STUDENT,
        proposed_date: dto.proposedDate,
        proposed_start_time: dto.proposedStartTime,
        proposed_end_time: dto.proposedEndTime,
        reschedule_reason: dto.rescheduleReason || dto.reason || 'Student requested a schedule adjustment',
        meeting_history: history,
      },
      collegeId,
    );

    this.notificationService.notify(
      meeting.faculty_id,
      `Student requested reschedule for meeting to ${dto.proposedDate} at ${dto.proposedStartTime}`,
    );

    return updated;
  }

  async handleStudentReschedule(
    id: string,
    facultyId: string,
    collegeId: string | null,
    dto: HandleStudentRescheduleDto,
  ): Promise<MeetingEntity> {
    const meeting = await this.meetingRepo.findById(id, collegeId);
    if (!meeting) {
      throw new NotFoundException(
        errorBody(ErrorCode.RESOURCE_NOT_FOUND, `Meeting with id "${id}" not found`),
      );
    }

    if (meeting.faculty_id !== facultyId) {
      throw new ForbiddenException(
        errorBody(ErrorCode.NOT_RESOURCE_OWNER, 'Only the assigned faculty member can handle this reschedule request'),
      );
    }

    if (meeting.status !== MeetingStatus.RESCHEDULE_REQUESTED) {
      throw new BadRequestException(
        errorBody(
          ErrorCode.BUSINESS_RULE_VIOLATION,
          `Cannot handle reschedule for meeting in ${meeting.status} status; must be RESCHEDULE_REQUESTED`,
        ),
      );
    }

    if (dto.action === 'ACCEPT') {
      if (!meeting.proposed_date || !meeting.proposed_start_time || !meeting.proposed_end_time) {
        throw new BadRequestException(
          errorBody(ErrorCode.BUSINESS_RULE_VIOLATION, 'Proposed date or time is missing on meeting record'),
        );
      }

      const overlaps = await this.meetingRepo.findOverlappingScheduled(
        facultyId,
        meeting.proposed_date,
        meeting.proposed_start_time,
        meeting.proposed_end_time,
        collegeId,
        id,
      );
      if (overlaps.length > 0) {
        throw new ConflictException(
          errorBody(
            ErrorCode.CONSTRAINT_VIOLATION,
            `You already have another meeting scheduled on ${meeting.proposed_date} overlapping ${meeting.proposed_start_time}`,
          ),
        );
      }

      const history = this.appendHistory(
        meeting.meeting_history,
        'FACULTY_ACCEPTED_STUDENT_RESCHEDULE',
        facultyId,
        `Faculty approved student reschedule: ${meeting.proposed_date} ${meeting.proposed_start_time}-${meeting.proposed_end_time}`,
      );

      const updated = await this.meetingRepo.update(
        id,
        {
          status: MeetingStatus.SCHEDULED,
          scheduled_date: meeting.proposed_date,
          scheduled_start_time: meeting.proposed_start_time,
          scheduled_end_time: meeting.proposed_end_time,
          reschedule_requested_by: undefined,
          proposed_date: undefined,
          proposed_start_time: undefined,
          proposed_end_time: undefined,
          meeting_history: history,
        },
        collegeId,
      );

      this.notificationService.notify(
        meeting.student_id,
        `Faculty approved your reschedule request for ${updated.scheduled_date} at ${updated.scheduled_start_time}`,
      );

      return updated;
    }

    if (dto.action === 'DENY') {
      const history = this.appendHistory(
        meeting.meeting_history,
        'FACULTY_DENIED_STUDENT_RESCHEDULE',
        facultyId,
        `Faculty denied reschedule request. Original schedule maintained. Reason: ${dto.reason || 'None provided'}`,
      );

      const updated = await this.meetingRepo.update(
        id,
        {
          status: MeetingStatus.SCHEDULED,
          reschedule_requested_by: undefined,
          proposed_date: undefined,
          proposed_start_time: undefined,
          proposed_end_time: undefined,
          meeting_history: history,
        },
        collegeId,
      );

      this.notificationService.notify(
        meeting.student_id,
        `Faculty denied your reschedule request. Original schedule stands: ${meeting.scheduled_date} at ${meeting.scheduled_start_time}`,
      );

      return updated;
    }

    if (dto.action === 'PROPOSE') {
      if (!dto.proposedDate || !dto.proposedStartTime || !dto.proposedEndTime) {
        throw new BadRequestException(
          errorBody(
            ErrorCode.VALIDATION_FAILED,
            'Counter-proposal requires proposedDate, proposedStartTime, and proposedEndTime',
          ),
        );
      }

      this.validateTimeRange(dto.proposedStartTime, dto.proposedEndTime);
      this.validateNotPast(dto.proposedDate, dto.proposedStartTime);

      const history = this.appendHistory(
        meeting.meeting_history,
        'FACULTY_COUNTER_PROPOSED',
        facultyId,
        `Faculty counter-proposed new time: ${dto.proposedDate} ${dto.proposedStartTime}-${dto.proposedEndTime}`,
      );

      const updated = await this.meetingRepo.update(
        id,
        {
          status: MeetingStatus.RESCHEDULE_PROPOSED,
          reschedule_requested_by: RescheduleBy.FACULTY,
          proposed_date: dto.proposedDate,
          proposed_start_time: dto.proposedStartTime,
          proposed_end_time: dto.proposedEndTime,
          reschedule_reason: dto.reason || 'Faculty counter-proposed a different time',
          meeting_type: dto.meetingType || meeting.meeting_type,
          meeting_platform: dto.meetingPlatform || meeting.meeting_platform,
          meeting_link: dto.meetingLink || meeting.meeting_link,
          location: dto.location || meeting.location,
          meeting_history: history,
        },
        collegeId,
      );

      this.notificationService.notify(
        meeting.student_id,
        `Faculty counter-proposed a new time for your meeting: ${dto.proposedDate} at ${dto.proposedStartTime}`,
      );

      return updated;
    }

    throw new BadRequestException(
      errorBody(ErrorCode.VALIDATION_FAILED, `Invalid action "${dto.action}"`),
    );
  }

  async facultyReschedule(
    id: string,
    facultyId: string,
    collegeId: string | null,
    dto: FacultyRescheduleDto,
  ): Promise<MeetingEntity> {
    const meeting = await this.meetingRepo.findById(id, collegeId);
    if (!meeting) {
      throw new NotFoundException(
        errorBody(ErrorCode.RESOURCE_NOT_FOUND, `Meeting with id "${id}" not found`),
      );
    }

    if (meeting.faculty_id !== facultyId) {
      throw new ForbiddenException(
        errorBody(ErrorCode.NOT_RESOURCE_OWNER, 'Only the assigned faculty member can reschedule this meeting'),
      );
    }

    if (meeting.status !== MeetingStatus.SCHEDULED) {
      throw new BadRequestException(
        errorBody(
          ErrorCode.BUSINESS_RULE_VIOLATION,
          `Cannot reschedule meeting in ${meeting.status} status; only SCHEDULED meetings can be rescheduled`,
        ),
      );
    }

    this.validateTimeRange(dto.scheduledStartTime, dto.scheduledEndTime);
    this.validateNotPast(dto.scheduledDate, dto.scheduledStartTime);

    const meetingType = dto.meetingType || meeting.meeting_type;
    const meetingLink = dto.meetingLink || meeting.meeting_link;
    this.validateOnlineLink(meetingType, meetingLink);

    // Overlapping check
    const overlaps = await this.meetingRepo.findOverlappingScheduled(
      facultyId,
      dto.scheduledDate,
      dto.scheduledStartTime,
      dto.scheduledEndTime,
      collegeId,
      id,
    );
    if (overlaps.length > 0) {
      throw new ConflictException(
        errorBody(
          ErrorCode.CONSTRAINT_VIOLATION,
          `You already have another meeting scheduled on ${dto.scheduledDate} between ${overlaps[0].scheduled_start_time} and ${overlaps[0].scheduled_end_time}`,
        ),
      );
    }

    const prevDate = meeting.scheduled_date;
    const prevStart = meeting.scheduled_start_time;

    const history = this.appendHistory(
      meeting.meeting_history,
      'FACULTY_DIRECT_RESCHEDULE',
      facultyId,
      `Faculty rescheduled meeting from ${prevDate} ${prevStart} to ${dto.scheduledDate} ${dto.scheduledStartTime}. Reason: ${dto.rescheduleReason || 'Direct faculty reschedule'}`,
    );

    const updated = await this.meetingRepo.update(
      id,
      {
        status: MeetingStatus.SCHEDULED,
        scheduled_date: dto.scheduledDate,
        scheduled_start_time: dto.scheduledStartTime,
        scheduled_end_time: dto.scheduledEndTime,
        reschedule_reason: dto.rescheduleReason || 'Faculty updated the confirmed schedule',
        meeting_type: meetingType,
        meeting_platform: dto.meetingPlatform || meeting.meeting_platform || MeetingPlatform.GOOGLE_MEET,
        meeting_link: meetingLink,
        location: dto.location || meeting.location,
        faculty_remarks: dto.facultyRemarks || meeting.faculty_remarks,
        reschedule_requested_by: undefined,
        proposed_date: undefined,
        proposed_start_time: undefined,
        proposed_end_time: undefined,
        meeting_history: history,
      },
      collegeId,
    );

    this.notificationService.notify(
      meeting.student_id,
      `Faculty updated your meeting schedule to ${dto.scheduledDate} at ${dto.scheduledStartTime}`,
    );

    return updated;
  }

  async completeMeeting(
    id: string,
    facultyId: string,
    collegeId: string | null,
    dto: CompleteMeetingDto,
  ): Promise<MeetingEntity> {
    const meeting = await this.meetingRepo.findById(id, collegeId);
    if (!meeting) {
      throw new NotFoundException(
        errorBody(ErrorCode.RESOURCE_NOT_FOUND, `Meeting with id "${id}" not found`),
      );
    }

    if (meeting.faculty_id !== facultyId) {
      throw new ForbiddenException(
        errorBody(ErrorCode.NOT_RESOURCE_OWNER, 'Only the assigned faculty member can complete this meeting'),
      );
    }

    if (meeting.status !== MeetingStatus.SCHEDULED) {
      throw new BadRequestException(
        errorBody(
          ErrorCode.BUSINESS_RULE_VIOLATION,
          `Cannot complete meeting in ${meeting.status} status; only SCHEDULED meetings can be marked completed`,
        ),
      );
    }

    const now = new Date().toISOString();
    const history = this.appendHistory(
      meeting.meeting_history,
      'MEETING_COMPLETED',
      facultyId,
      `Meeting completed with outcome: ${dto.outcome || 'Progress reviewed'}`,
    );

    const updated = await this.meetingRepo.update(
      id,
      {
        status: MeetingStatus.COMPLETED,
        discussion_notes: dto.discussionNotes,
        outcome: dto.outcome,
        action_items: dto.actionItems,
        faculty_remarks: dto.facultyRemarks,
        completion_timestamp: now,
        meeting_history: history,
      },
      collegeId,
    );

    this.notificationService.notify(
      meeting.student_id,
      `Your meeting outcomes have been recorded by faculty`,
    );

    return updated;
  }

  async cancelMeeting(
    id: string,
    userId: string,
    userRole: string,
    collegeId: string | null,
    reason?: string,
  ): Promise<MeetingEntity> {
    const meeting = await this.meetingRepo.findById(id, collegeId);
    if (!meeting) {
      throw new NotFoundException(
        errorBody(ErrorCode.RESOURCE_NOT_FOUND, `Meeting with id "${id}" not found`),
      );
    }

    const isPrivileged = ['admin', 'head', 'superadmin'].includes(userRole);
    if (!isPrivileged && meeting.student_id !== userId && meeting.faculty_id !== userId) {
      throw new ForbiddenException(
        errorBody(ErrorCode.NOT_RESOURCE_OWNER, 'You do not have permission to cancel this meeting'),
      );
    }

    if (meeting.status === MeetingStatus.COMPLETED) {
      throw new BadRequestException(
        errorBody(ErrorCode.BUSINESS_RULE_VIOLATION, 'Cannot cancel an already completed meeting'),
      );
    }

    if (meeting.status === MeetingStatus.CANCELLED) {
      throw new BadRequestException(
        errorBody(ErrorCode.BUSINESS_RULE_VIOLATION, 'Meeting is already cancelled'),
      );
    }

    const history = this.appendHistory(
      meeting.meeting_history,
      'MEETING_CANCELLED',
      userId,
      `Cancelled by ${userRole} (${userId}). Reason: ${reason || 'Not specified'}`,
    );

    const updated = await this.meetingRepo.update(
      id,
      {
        status: MeetingStatus.CANCELLED,
        meeting_history: history,
      },
      collegeId,
    );

    const recipient = meeting.student_id === userId ? meeting.faculty_id : meeting.student_id;
    this.notificationService.notify(recipient, `A meeting scheduled for ${meeting.scheduled_date || meeting.requested_date} was cancelled`);

    return updated;
  }
}
