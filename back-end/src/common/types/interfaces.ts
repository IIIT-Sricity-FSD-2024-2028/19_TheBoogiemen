export interface USER {
  user_id: string;
  username?: string;
  password_hash?: string;
  email?: string;
  phone?: string;
  role: 'student' | 'faculty' | 'admin' | 'academic_head';
  created_at?: string;
}

export interface STUDENT {
  student_id: string;
  user_id: string; // FK to USER
  first_name?: string;
  last_name?: string;
  dob?: string;
  gender?: string;
  street?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  branch?: string;
  academic_level?: string;
  parent_contact?: string;
  join_date?: string;
  batch?: string;
}

export interface FACULTY {
  faculty_id: string;
  user_id: string; // FK to USER
  first_name?: string;
  last_name?: string;
  designation?: string;
  department_id?: string;
  mentor_to?: string;
}

export interface ACADEMIC_HEAD {
  admin_id: string;
  user_id: string; // FK to USER
  first_name?: string;
  last_name?: string;
  department_id?: string;
}

export interface SECTION_INFO {
  section_id: string;
  course_id: string; // FK
  faculty_id: string; // FK
  capacity?: number;
  term?: string;
  year?: string;
}

export interface ENROLLMENT {
  enrollment_id: string;
  student_id: string; // FK
  section_id: string; // FK
  enrollment_date?: string;
  status?: string;
}

export interface MARKS_ENTRY {
  entry_id: string;
  assessment_id: string; // FK
  student_id: string; // FK
  marks: number;
  status: 'PENDING' | 'GRADED';
}

export interface FEE_STRUCTURE {
  fee_id: string;
  year_id: string;
  branch?: string;
  amount: number;
  due_date?: string;
  category?: string;
}

export interface FEE_PAYMENT {
  payment_id: string;
  student_id: string; // FK
  fee_id: string; // FK
  transaction_id?: string;
  amount_paid?: number;
  payment_date?: string;
  status: 'PENDING' | 'PAID';
}

export interface ATTENDANCE_LOG {
  log_id: string;
  enrollment_id: string; // FK to ENROLLMENT
  date: string;
  timeslot?: string;
  status: 'PRESENT' | 'ABSENT' | 'EXCUSED';
}

export interface RESOURCE {
  resource_id: string;
  name: string;
  capacity?: number;
  type?: string;
  location?: string;
}

export interface EVENT {
  id: string;
  resource_id: string; // FK
  start_time: string;
  end_time: string;
  event_type: 'lecture' | 'assessment' | 'seminar';
  venue_id?: string;
}

export interface ASSESSMENT_VENUE {
  venue_id: string;
  event_id: string; // FK
  room_number?: string;
}

export interface RESEARCH_PROJECT {
  project_id: string;
  student_id: string; // FK
  faculty_id: string; // FK
  title?: string;
  domain?: string;
  type?: string;
  start_date?: string;
  end_date?: string;
}

export interface RESEARCH_MILESTONE {
  milestone_id: string;
  project_id: string; // FK
  title?: string;
  submission_date?: string;
  file_type?: 'PDF' | 'DOCX';
  description?: string;
  comments?: string;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'REVISION_NEEDED';
}

export interface FORUM_POST {
  id: string;
  topic_id: string; // FK
  author_id: string; // FK
  content: string;
  created_at: string;
  replies_count: number;
}

export interface FORUM_REPLY {
  id: string;
  post_id: string; // FK
  author_id: string; // FK
  content: string;
  created_at: string;
}

export interface TOPIC {
  topic_id: string;
  course_id: string; // FK
  topic_name: string;
  domain_id?: string;
}

export interface RESEARCH_DOMAINS {
  faculty_id: string;
  domain_id: string;
}

export interface LEAVE_REQUEST {
  leave_id: string;
  student_id: string; // FK
  start_date: string;
  end_date: string;
  reason: string;
  doc_ref?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface COURSE {
  course_id: string;
  course_name: string;
  course_code?: string;
  credits?: number;
  completed_topics: number;
  total_topics: number;
  syllabus: string[];
}

export interface ASSESSMENT {
  assessment_id: string;
  course_id: string; // FK
  title: string;
  type: 'QUIZ' | 'ASSIGNMENT' | 'EXAM';
  max_marks: number;
  due_date: string;
}

export interface LEARNING_OUTCOME {
  outcome_id: string;
  course_id: string; // FK
  description?: string;
  title: string;
}

export interface ASSESSMENT_OUTCOME {
  id: string;
  assessment_id: string; // FK
  outcome_id: string; // FK
  weightage: number;
}

export interface STUDENT_OUTCOME {
  id: string;
  student_id: string; // FK
  outcome_id: string; // FK
  outcome_title: string;
  achievement_level: 'EXCELLENT' | 'GOOD' | 'SATISFACTORY' | 'NEEDS_IMPROVEMENT' | 'NOT_GRADED';
  raw_percentage: number;
}
