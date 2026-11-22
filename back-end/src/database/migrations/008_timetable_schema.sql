-- 008_timetable_schema.sql: Timetable Sessions, Hour Requirements, and Conflict Constraints
CREATE TABLE IF NOT EXISTS timetable_slots (
  slot_id VARCHAR(64) PRIMARY KEY,
  college_id VARCHAR(64) NOT NULL DEFAULT 'c-default',
  section VARCHAR(32) NOT NULL,
  day VARCHAR(10) NOT NULL,
  time VARCHAR(10) NOT NULL,
  course_id VARCHAR(64) NOT NULL,
  course_code VARCHAR(32),
  course_name VARCHAR(128),
  room VARCHAR(64) NOT NULL DEFAULT 'TBA',
  type VARCHAR(16) NOT NULL DEFAULT 'lecture',
  faculty_id VARCHAR(64),
  faculty_name VARCHAR(128),
  status VARCHAR(16) NOT NULL DEFAULT 'draft',
  semester INT DEFAULT 1,
  academic_year VARCHAR(32) DEFAULT '2024-2025',
  branch VARCHAR(32) DEFAULT 'CS',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_timetable_section_slot UNIQUE(college_id, section, day, time),
  CONSTRAINT uq_timetable_room_slot UNIQUE(college_id, room, day, time)
);

CREATE INDEX IF NOT EXISTS idx_timetable_college_section ON timetable_slots(college_id, section);
CREATE INDEX IF NOT EXISTS idx_timetable_faculty ON timetable_slots(college_id, faculty_id);
CREATE INDEX IF NOT EXISTS idx_timetable_status ON timetable_slots(status);
