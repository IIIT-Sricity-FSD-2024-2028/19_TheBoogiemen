import {
  USER, STUDENT, FACULTY, ACADEMIC_HEAD, SECTION_INFO, ENROLLMENT, MARKS_ENTRY,
  FEE_STRUCTURE, FEE_PAYMENT, ATTENDANCE_LOG, RESOURCE, EVENT, ASSESSMENT_VENUE,
  RESEARCH_PROJECT, RESEARCH_MILESTONE, FORUM_POST, FORUM_REPLY, TOPIC, RESEARCH_DOMAINS,
  LEAVE_REQUEST, COURSE, ASSESSMENT, LEARNING_OUTCOME, ASSESSMENT_OUTCOME, STUDENT_OUTCOME
} from './interfaces';
import { SEED } from './seed-constants';
import { v4 as uuidv4 } from 'uuid';

const year_1 = uuidv4();
const enr_1 = uuidv4();
const enr_2 = uuidv4();
const pay_1 = uuidv4();
const pay_2 = uuidv4();
const att_1 = uuidv4();
const att_2 = uuidv4();
const att_3 = uuidv4();
const evt_1 = uuidv4();
const mark_1 = uuidv4();
const mark_2 = uuidv4();
const so_1 = uuidv4();
const leave_1 = uuidv4();
const post_1 = uuidv4();
const reply_1 = uuidv4();
const domain_auth_1 = uuidv4();

export const MOCK_USERS: USER[] = [
  { user_id: SEED.STUDENTS[0], username: 'alice_smith', email: 'student@iiits.in', password_hash: 'Student@123', role: 'student' },
  { user_id: SEED.STUDENTS[1], username: 'bob_jones', email: 'pranjal.student@iiits.in', password_hash: 'Student@123', role: 'student' },
  { user_id: SEED.STUDENTS[2], username: 'charlie_brown', email: 'charlie@university.edu', password_hash: 'Student@123', role: 'student' },
  { user_id: SEED.FACULTY[0], username: 'dr_miller', email: 'faculty@iiits.in', password_hash: 'Faculty@123', role: 'faculty' },
  { user_id: SEED.FACULTY[1], username: 'dr_clark', email: 'professor@iiits.in', password_hash: 'Faculty@123', role: 'faculty' },
  { user_id: SEED.ACADEMIC_HEADS[0], username: 'prof_taylor', email: 'head@iiits.in', password_hash: 'Head@1234', role: 'academic_head' },
  { user_id: SEED.ADMINS[0], username: 'admin_sys', email: 'admin@iiits.in', password_hash: 'Admin@12345', role: 'admin' },
  { user_id: uuidv4(), username: 'super_sys', email: 'superuser@iiits.in', password_hash: 'Super@12345', role: 'admin' }, // Wait, superuser role? The USER role enum is 'student' | 'faculty' | 'admin' | 'academic_head'
];

export const MOCK_STUDENTS: STUDENT[] = [
  { student_id: SEED.STUDENTS[0], user_id: SEED.STUDENTS[0], first_name: 'Alice', last_name: 'Smith', branch: 'Computer Science', academic_level: 'Undergraduate', batch: '2025', blood_group: 'O+', emergency_contact: '+91-9876543210', parent_name: 'Robert Smith', school: 'School of Engineering & Technology', program: 'B.Tech in Computer Science and Engineering' },
  { student_id: SEED.STUDENTS[1], user_id: SEED.STUDENTS[1], first_name: 'Bob', last_name: 'Jones', branch: 'Mechanical Engineering', academic_level: 'Undergraduate', batch: '2026', blood_group: 'A+', emergency_contact: '+91-8765432109', parent_name: 'Michael Jones', school: 'School of Engineering & Technology', program: 'B.Tech in Mechanical Engineering' },
  { student_id: SEED.STUDENTS[2], user_id: SEED.STUDENTS[2], first_name: 'Charlie', last_name: 'Brown', branch: 'Computer Science', academic_level: 'Undergraduate', batch: '2025', blood_group: 'B+', emergency_contact: '+91-7654321098', parent_name: 'William Brown', school: 'School of Engineering & Technology', program: 'B.Tech in Computer Science and Engineering' },
];

export const MOCK_FACULTY: FACULTY[] = [
  { faculty_id: SEED.FACULTY[0], user_id: SEED.FACULTY[0], first_name: 'David', last_name: 'Miller', designation: 'Professor', department_id: 'CS_DEPT' },
  { faculty_id: SEED.FACULTY[1], user_id: SEED.FACULTY[1], first_name: 'Emma', last_name: 'Clark', designation: 'Associate Professor', department_id: 'ME_DEPT' },
];

export const MOCK_COURSES: COURSE[] = [
  { course_id: SEED.COURSES[0], course_name: 'Data Structures', course_code: 'CS201', credits: 4, completed_topics: 5, total_topics: 10, syllabus: ['Arrays', 'Lists', 'Trees', 'Graphs'] },
  { course_id: SEED.COURSES[1], course_name: 'Thermodynamics', course_code: 'ME301', credits: 3, completed_topics: 3, total_topics: 8, syllabus: ['Laws', 'Entropy', 'Cycles'] },
];

export const MOCK_SECTIONS: SECTION_INFO[] = [
  { section_id: SEED.SECTIONS[0], course_id: SEED.COURSES[0], faculty_id: SEED.FACULTY[0], capacity: 60, term: 'Fall', year: '2026' },
];

export const MOCK_ENROLLMENTS: ENROLLMENT[] = [
  { enrollment_id: enr_1, student_id: SEED.STUDENTS[0], section_id: SEED.SECTIONS[0], status: 'ACTIVE' },
  { enrollment_id: enr_2, student_id: SEED.STUDENTS[2], section_id: SEED.SECTIONS[0], status: 'ACTIVE' },
];

export const MOCK_FEE_STRUCTURES: FEE_STRUCTURE[] = [
  { fee_id: SEED.FEE_STRUCTURES[0], year_id: year_1, branch: 'Computer Science', amount: 5000, category: 'Tuition' },
];

export const MOCK_FEE_PAYMENTS: FEE_PAYMENT[] = [
  { payment_id: pay_1, student_id: SEED.STUDENTS[0], fee_id: SEED.FEE_STRUCTURES[0], amount_paid: 5000, status: 'PAID' },
  { payment_id: pay_2, student_id: SEED.STUDENTS[2], fee_id: SEED.FEE_STRUCTURES[0], amount_paid: 2000, status: 'PENDING' },
];

export const MOCK_ATTENDANCE: ATTENDANCE_LOG[] = [
  { log_id: att_1, enrollment_id: enr_1, date: '2026-04-20T10:00:00Z', status: 'PRESENT' },
  { log_id: att_2, enrollment_id: enr_1, date: '2026-04-22T10:00:00Z', status: 'ABSENT' },
  { log_id: att_3, enrollment_id: enr_2, date: '2026-04-20T10:00:00Z', status: 'PRESENT' },
];

export const MOCK_RESOURCES: RESOURCE[] = [
  { resource_id: SEED.RESOURCES[0], name: 'Lecture Hall A', capacity: 100, type: 'Classroom' },
  { resource_id: SEED.RESOURCES[1], name: 'Computer Lab 1', capacity: 40, type: 'Lab' },
];

export const MOCK_EVENTS: EVENT[] = [
  { id: evt_1, resource_id: SEED.RESOURCES[0], start_time: '2026-04-26T10:00:00Z', end_time: '2026-04-26T12:00:00Z', event_type: 'lecture' },
];

export const MOCK_ASSESSMENTS: ASSESSMENT[] = [
  { assessment_id: SEED.ASSESSMENTS[0], course_id: SEED.COURSES[0], title: 'Midterm Exam', type: 'EXAM', max_marks: 100, due_date: '2026-05-15T00:00:00Z' },
  { assessment_id: SEED.ASSESSMENTS[1], course_id: SEED.COURSES[0], title: 'Assignment 1', type: 'ASSIGNMENT', max_marks: 50, due_date: '2026-05-01T00:00:00Z' },
];

export const MOCK_MARKS: MARKS_ENTRY[] = [
  { entry_id: mark_1, assessment_id: SEED.ASSESSMENTS[0], student_id: SEED.STUDENTS[0], marks: 85, status: 'GRADED' },
  { entry_id: mark_2, assessment_id: SEED.ASSESSMENTS[0], student_id: SEED.STUDENTS[2], marks: 92, status: 'GRADED' },
];

export const MOCK_OUTCOMES: LEARNING_OUTCOME[] = [
  { outcome_id: SEED.OUTCOMES[0], course_id: SEED.COURSES[0], title: 'Understand basic data structures', description: 'Can implement arrays and lists.' },
];

export const MOCK_STUDENT_OUTCOMES: STUDENT_OUTCOME[] = [
  { id: so_1, student_id: SEED.STUDENTS[0], outcome_id: SEED.OUTCOMES[0], outcome_title: 'Understand basic data structures', achievement_level: 'EXCELLENT', raw_percentage: 90 },
];

export const MOCK_RESEARCH_PROJECTS: RESEARCH_PROJECT[] = [
  { project_id: SEED.PROJECTS[0], student_id: SEED.STUDENTS[0], faculty_id: SEED.FACULTY[0], title: 'AI in Education', domain: 'Artificial Intelligence' },
];

export const MOCK_LEAVE_REQUESTS: LEAVE_REQUEST[] = [
  { leave_id: leave_1, student_id: SEED.STUDENTS[0], start_date: '2026-04-28T00:00:00Z', end_date: '2026-04-30T00:00:00Z', reason: 'Medical', status: 'PENDING' },
];

export const MOCK_TOPICS: TOPIC[] = [
  { topic_id: SEED.TOPICS[0], course_id: SEED.COURSES[0], topic_name: 'Linked Lists' },
];

export const MOCK_FORUM_POSTS: FORUM_POST[] = [
  { id: post_1, topic_id: SEED.TOPICS[0], author_id: SEED.STUDENTS[0], content: 'Can anyone help with the Linked List assignment?', created_at: '2026-04-24T12:00:00Z', replies_count: 1 },
];

export const MOCK_FORUM_REPLIES: FORUM_REPLY[] = [
  { id: reply_1, post_id: post_1, author_id: SEED.STUDENTS[2], content: 'Sure, I can help! Just traverse the nodes.', created_at: '2026-04-24T13:00:00Z' },
];

export const MOCK_RESEARCH_DOMAINS: RESEARCH_DOMAINS[] = [
  { faculty_id: SEED.FACULTY[0], domain_id: domain_auth_1 }
];