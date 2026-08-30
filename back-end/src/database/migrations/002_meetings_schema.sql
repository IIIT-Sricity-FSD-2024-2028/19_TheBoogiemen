-- 002_meetings_schema.sql
-- Meeting Scheduling and Management Module for APOTS

CREATE TABLE IF NOT EXISTS meetings (
  meeting_id               text PRIMARY KEY,
  student_id               text NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  faculty_id               text NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  purpose                  text NOT NULL,
  description              text,
  requested_date           date NOT NULL,
  requested_start_time     text NOT NULL,
  requested_end_time       text NOT NULL,
  scheduled_date           date,
  scheduled_start_time     text,
  scheduled_end_time       text,
  status                   text NOT NULL CHECK (status IN (
                             'PENDING','SCHEDULED','RESCHEDULE_REQUESTED',
                             'DENIED','CANCELLED','COMPLETED')),
  reschedule_requested_by  text CHECK (reschedule_requested_by IN ('STUDENT','FACULTY')),
  proposed_date            date,
  proposed_start_time      text,
  proposed_end_time        text,
  reschedule_reason        text,
  meeting_type             text NOT NULL CHECK (meeting_type IN ('ONLINE','IN_PERSON')),
  meeting_platform         text CHECK (meeting_platform IN ('GOOGLE_MEET')),
  meeting_link             text,
  location                 text,
  discussion_notes         text,
  outcome                  text,
  action_items             text,
  faculty_remarks          text,
  denial_reason            text,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meetings_student ON meetings (student_id);
CREATE INDEX IF NOT EXISTS idx_meetings_faculty ON meetings (faculty_id);
CREATE INDEX IF NOT EXISTS idx_meetings_status  ON meetings (status);
