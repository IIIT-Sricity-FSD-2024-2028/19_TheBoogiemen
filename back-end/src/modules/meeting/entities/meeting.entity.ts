import { MeetingStatus } from '../enums/meeting-status.enum';
import { MeetingType } from '../enums/meeting-type.enum';
import { MeetingPlatform } from '../enums/meeting-platform.enum';
import { RescheduleBy } from '../enums/reschedule-by.enum';

export interface MeetingHistoryItem {
  timestamp: string;
  action: string;
  actor: string;
  details?: string | Record<string, any>;
}

export interface MeetingEntity {
  meeting_id: string;

  student_id: string;
  faculty_id: string;
  college_id: string;

  purpose: string;
  description?: string;

  // Requested by student (immutable once requested)
  requested_date: string;
  requested_start_time: string;
  requested_end_time: string;

  // Scheduled / confirmed time
  scheduled_date?: string;
  scheduled_start_time?: string;
  scheduled_end_time?: string;

  status: MeetingStatus;

  reschedule_requested_by?: RescheduleBy;

  // Proposed time during reschedule flow
  proposed_date?: string;
  proposed_start_time?: string;
  proposed_end_time?: string;
  reschedule_reason?: string;

  meeting_type: MeetingType;
  meeting_platform?: MeetingPlatform;
  meeting_link?: string;
  location?: string;

  // Post-meeting details (COMPLETED)
  discussion_notes?: string;
  outcome?: string;
  action_items?: string;
  faculty_remarks?: string;
  completion_timestamp?: string;

  denial_reason?: string;

  meeting_history?: MeetingHistoryItem[];

  created_at: string;
  updated_at: string;

  // Populated display fields
  student_name?: string;
  faculty_name?: string;
}
