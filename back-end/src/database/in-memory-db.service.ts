import { Injectable } from '@nestjs/common';

@Injectable()
export class InMemoryDbService {
  public departments = [
    { department_id: 'dept1', department_name: 'Computer Science', department_code: 'CS' },
    { department_id: 'dept2', department_name: 'Electronics', department_code: 'ECE' },
  ];

  public users = [
    { user_id: 'u1', username: 'student', password: 'Student@123', email: 'student@example.com', role: 'student' },
    { user_id: 'u2', username: 'faculty', password: 'Faculty@123', email: 'faculty@example.com', role: 'faculty' },
    { user_id: 'u3', username: 'admin', password: 'password', email: 'admin@example.com', role: 'admin' },
    { user_id: 'u4', username: 'head', password: 'Head@123', email: 'head@example.com', role: 'head' },
    { user_id: 'u5', username: 'superadmin', password: 'Super@123', email: 'super@example.com', role: 'superadmin' },
    { user_id: 'u6', username: 'student2', password: 'Student@123', email: 'student2@example.com', role: 'student' },
    { user_id: 'u7', username: 'faculty2', password: 'Faculty@123', email: 'faculty2@example.com', role: 'faculty' },
  ];

  public students = [
    { user_id: 'u1', first_name: 'John', last_name: 'Doe', branch: 'CS', batch: '2022-2026', cgpa: 8.5, section: 'A', dob: '2004-05-15', phone: '9876543210', join_date: '2022-08-01', email: 'student@example.com' },
    { user_id: 'u6', first_name: 'Alice', last_name: 'Vance', branch: 'CS', batch: '2022-2026', cgpa: 5.8, section: 'B', dob: '2004-06-20', phone: '9876543211', join_date: '2022-08-01', email: 'student2@example.com' },
  ];

  public faculty = [
    { user_id: 'u2', first_name: 'Jane', last_name: 'Smith', designation: 'Assistant Professor', department_id: 'dept1', email: 'faculty@example.com', phone: '9000000001' },
    { user_id: 'u7', first_name: 'Robert', last_name: 'Wilson', designation: 'Associate Professor', department_id: 'dept1', email: 'faculty2@example.com', phone: '9000000002' },
  ];

  public courses = [
    { course_id: 'c1', course_name: 'Data Structures', course_code: 'CS201', credits: 4, semester: 3, faculty_id: 'u2', faculty_name: 'Jane Smith' },
    { course_id: 'c2', course_name: 'Database Systems', course_code: 'CS202', credits: 4, semester: 3, faculty_id: 'u2', faculty_name: 'Jane Smith' },
    { course_id: 'c3', course_name: 'Algorithms (DSA)', course_code: 'CS301', credits: 4, semester: 4, faculty_id: 'u7', faculty_name: 'Robert Wilson' },
    { course_id: 'c4', course_name: 'Theory of Computation (TOC)', course_code: 'CS302', credits: 3, semester: 4, faculty_id: 'u7', faculty_name: 'Robert Wilson' },
    { course_id: 'c5', course_name: 'Computer Networks (CCN)', course_code: 'CS401', credits: 4, semester: 5, faculty_id: 'u2', faculty_name: 'Jane Smith' },
    { course_id: 'c6', course_name: 'Operating Systems (OS)', course_code: 'CS402', credits: 4, semester: 5, faculty_id: 'u7', faculty_name: 'Robert Wilson' },
    { course_id: 'c7', course_name: 'Advanced DSA (ADSA)', course_code: 'CS403', credits: 4, semester: 5, faculty_id: 'u2', faculty_name: 'Jane Smith' },
    { course_id: 'c8', course_name: 'Artificial Intelligence (AI)', course_code: 'CS404', credits: 4, semester: 6, faculty_id: 'u7', faculty_name: 'Robert Wilson' },
  ];

  // Student u1 (Section A) enrolled in: CS201, CS202, CS401, CS403 (taught by u2 Jane)
  // Student u6 (Section B) enrolled in: CS201 (by u2), CS301 (by u7)
  public enrollment = [
    { enrollment_id: 'e1', student_id: 'u1', course_id: 'c1', year_id: '2024', status: 'active', section: 'A' },
    { enrollment_id: 'e2', student_id: 'u1', course_id: 'c2', year_id: '2024', status: 'active', section: 'A' },
    { enrollment_id: 'e5', student_id: 'u1', course_id: 'c5', year_id: '2024', status: 'active', section: 'A' },
    { enrollment_id: 'e6', student_id: 'u1', course_id: 'c7', year_id: '2024', status: 'active', section: 'A' },
    { enrollment_id: 'e3', student_id: 'u6', course_id: 'c1', year_id: '2024', status: 'active', section: 'B' },
    { enrollment_id: 'e4', student_id: 'u6', course_id: 'c3', year_id: '2025', status: 'active', section: 'B' },
  ];

  public attendance_log = [
    { log_id: 'al1', student_id: 'u1', course_id: 'c1', date: '2026-04-10', status: 'present' },
    { log_id: 'al2', student_id: 'u1', course_id: 'c1', date: '2026-04-12', status: 'present' },
    { log_id: 'al3', student_id: 'u1', course_id: 'c1', date: '2026-04-14', status: 'absent' },
    { log_id: 'al4', student_id: 'u6', course_id: 'c1', date: '2026-04-10', status: 'absent' },
    { log_id: 'al5', student_id: 'u6', course_id: 'c1', date: '2026-04-12', status: 'absent' },
  ];

  public assessments = [
    { assessment_id: 'a1', course_id: 'c1', name: 'Internal 1', type: 'theory', max_marks: 50, weightage: 20, faculty_id: 'u2', date: '2026-03-15' },
    { assessment_id: 'a2', course_id: 'c1', name: 'Quiz 1', type: 'quiz', max_marks: 20, weightage: 10, faculty_id: 'u2', date: '2026-03-20' },
  ];

  public marks_entry = [
    { entry_id: 'm1', student_id: 'u1', assessment_id: 'a1', course_code: 'CS201', marks_obtained: 42, max_marks: 50, grade: 'S', feedback_text: 'Excellent' },
    { entry_id: 'm2', student_id: 'u6', assessment_id: 'a1', course_code: 'CS201', marks_obtained: 22, max_marks: 50, grade: 'C', feedback_text: 'Needs improvement' },
    { entry_id: 'm3', student_id: 'u1', assessment_id: 'a2', course_code: 'CS201', marks_obtained: 18, max_marks: 20, grade: 'A', feedback_text: 'Good work' },
    { entry_id: 'm4', student_id: 'u6', assessment_id: 'a2', course_code: 'CS201', marks_obtained: 10, max_marks: 20, grade: 'C', feedback_text: 'Needs effort' },
  ];

  public leave_applications = [
    { leave_id: 'l1', student_id: 'u1', student_name: 'John Doe', leave_type: 'Medical', start_date: '2026-05-01', end_date: '2026-05-03', reason: 'Fever', status: 'approved', applied_on: '2026-04-15' },
    { leave_id: 'l2', student_id: 'u6', student_name: 'Alice Vance', leave_type: 'Family Event', start_date: '2026-05-10', end_date: '2026-05-12', reason: 'Sister wedding', status: 'pending', applied_on: '2026-04-17' },
    { leave_id: 'l3', student_id: 'u1', student_name: 'John Doe', leave_type: 'Personal', start_date: '2026-06-01', end_date: '2026-06-02', reason: 'Family function', status: 'pending', applied_on: '2026-05-20' },
  ];

  public research_projects = [
    {
      project_id: 'rp1',
      title: 'Blockchain for Academic Records',
      supervisor_id: 'u2',
      supervisor_name: 'Jane Smith',
      student_id: 'u1',
      student_name: 'John Doe',
      status: 'active',
      abstract: 'Implementing a decentralized ledger for securing university diplomas.',
      progress: 45,
      students: [{ user_id: 'u1', first_name: 'John', last_name: 'Doe' }],
      uploads: [],
      milestones: [
        { title: 'Inception', date: '2026-01-01', status: 'completed' },
        { title: 'Smart Contract Dev', date: '2026-04-15', status: 'in-progress' },
      ]
    },
    { project_id: 'rp2', title: 'AI-Based Attendance System', supervisor_id: 'u2', supervisor_name: 'Jane Smith', student_id: 'u6', student_name: 'Alice Vance', status: 'pending', abstract: 'Using facial recognition and machine learning to automate student attendance tracking.', progress: 20, students: [{ user_id: 'u6', first_name: 'Alice', last_name: 'Vance' }], uploads: [], milestones: [] },
  ];

  public discussion_posts = [
    { post_id: 'p1', author_id: 'u1', author_name: 'John Doe', author_role: 'student', course_id: 'CS201', title: 'Clarification on Heap Sort', content: 'Can someone explain the complexity of build-heap?', tag: 'help', reply_count: 1, created_at: '2026-04-16T10:00:00Z' },
    { post_id: 'p2', author_id: 'u2', author_name: 'Jane Smith', author_role: 'faculty', course_id: 'CS202', title: 'Exam Guidelines', content: 'Please review the SQL standard document attached.', tag: 'general', reply_count: 0, created_at: '2026-04-17T09:00:00Z' },
    { post_id: 'p3', author_id: 'u2', author_name: 'Jane Smith', author_role: 'faculty', course_id: 'CS201', title: 'Project Deadline Extended', content: 'The mini-project submission deadline has been extended to May 30th.', tag: 'announcement', reply_count: 0, created_at: '2026-04-20T08:00:00Z' },
  ];

  public discussion_replies = [
    { reply_id: 'r1', post_id: 'p1', author_id: 'u2', author_name: 'Jane Smith', author_role: 'faculty', content: 'It is O(n) because of the summation of the geometric series.', created_at: '2026-04-16T14:00:00Z' },
  ];

  public events = [
    { event_id: 'ev1', event_name: 'Placement Drive: Google', date: '2026-06-15', venue: 'Block C Auditorium', description: 'Mandatory for final year students.' },
    { event_id: 'ev2', event_name: 'Cricket Finals', date: '2026-05-20', venue: 'University Ground', description: 'CS vs ECE.' },
    { event_id: 'ev3', event_name: 'Hackathon 2026', date: '2026-05-25', venue: 'Block A Lab', description: '24-hour coding competition with prizes.' },
    { event_id: 'ev4', event_name: 'Faculty Development Workshop', date: '2026-04-25', venue: 'Conference Room A', description: 'Advanced teaching methodologies training.' },
    { event_id: 'ev5', event_name: 'Student Orientation', date: '2026-05-10', venue: 'Main Hall', description: 'Welcome session for new students.' },
  ];

  public resources = [
    { resource_id: 'res1', name: 'Computing Lab 1', type: 'Lab', capacity: 50, location: 'Block A, 1st Floor', status: 'available' },
    { resource_id: 'res2', name: 'Computing Lab 2', type: 'Lab', capacity: 50, location: 'Block A, 1st Floor', status: 'booked' },
    { resource_id: 'res3', name: 'Conference Room A', type: 'Hall', capacity: 20, location: 'Admin Block', status: 'available' },
    { resource_id: 'res4', name: 'Seminar Hall', type: 'Hall', capacity: 100, location: 'Block B Ground Floor', status: 'available' },
    { resource_id: 'res5', name: 'Projector Set 1', type: 'Equipment', capacity: 1, location: 'Admin Store', status: 'available' },
    { resource_id: 'res6', name: 'Whiteboard A', type: 'Equipment', capacity: 1, location: 'Block A', status: 'maintenance' },
  ];

  public fees = [
    { fee_id: 'f1', student_id: 'u1', first_name: 'John', last_name: 'Doe', type: 'Semester Fee', amount: 150000, due_date: '2026-06-01', status: 'pending' },
    { fee_id: 'f2', student_id: 'u6', first_name: 'Alice', last_name: 'Vance', type: 'Semester Fee', amount: 150000, due_date: '2026-06-01', status: 'overdue' },
    { fee_id: 'f3', student_id: 'u1', first_name: 'John', last_name: 'Doe', type: 'Library Fee', amount: 5000, due_date: '2026-05-15', status: 'paid' },
    { fee_id: 'f4', student_id: 'u6', first_name: 'Alice', last_name: 'Vance', type: 'Lab Fee', amount: 8000, due_date: '2026-05-20', status: 'pending' },
  ];

  // Student submissions for online assessments
  public submissions: any[] = [];

  // Timetable: each subject has 4 classes per week. Not all subjects taught by same faculty.
  // Section A courses: CS201(u2), CS202(u2), CS401(u2), CS403(u2), CS301(u7), CS302(u7), CS402(u7), CS404(u7)
  public timetable = [
    // Section A — CS201 (4 classes/week)
    { slot_id: 't1',  day: 'MON', time: '09:00', course_id: 'c1', course_code: 'CS201', course_name: 'Data Structures', room: '101', type: 'lecture', section: 'A' },
    { slot_id: 't2',  day: 'TUE', time: '09:00', course_id: 'c1', course_code: 'CS201', course_name: 'Data Structures', room: '101', type: 'lecture', section: 'A' },
    { slot_id: 't3',  day: 'THU', time: '09:00', course_id: 'c1', course_code: 'CS201', course_name: 'Data Structures', room: '101', type: 'lecture', section: 'A' },
    { slot_id: 't4',  day: 'FRI', time: '09:00', course_id: 'c1', course_code: 'CS201', course_name: 'Data Structures', room: 'Lab 1', type: 'lab', section: 'A' },
    // Section A — CS202 (4 classes/week)
    { slot_id: 't5',  day: 'MON', time: '10:00', course_id: 'c2', course_code: 'CS202', course_name: 'Database Systems', room: '102', type: 'lecture', section: 'A' },
    { slot_id: 't6',  day: 'WED', time: '09:00', course_id: 'c2', course_code: 'CS202', course_name: 'Database Systems', room: '102', type: 'lecture', section: 'A' },
    { slot_id: 't7',  day: 'THU', time: '10:00', course_id: 'c2', course_code: 'CS202', course_name: 'Database Systems', room: '102', type: 'lecture', section: 'A' },
    { slot_id: 't8',  day: 'FRI', time: '10:00', course_id: 'c2', course_code: 'CS202', course_name: 'Database Systems', room: 'Lab 1', type: 'lab', section: 'A' },
    // Section A — CS401 (4 classes/week)
    { slot_id: 't9',  day: 'MON', time: '11:00', course_id: 'c5', course_code: 'CS401', course_name: 'Computer Networks', room: '103', type: 'lecture', section: 'A' },
    { slot_id: 't10', day: 'TUE', time: '11:00', course_id: 'c5', course_code: 'CS401', course_name: 'Computer Networks', room: '103', type: 'lecture', section: 'A' },
    { slot_id: 't11', day: 'WED', time: '11:00', course_id: 'c5', course_code: 'CS401', course_name: 'Computer Networks', room: '103', type: 'lecture', section: 'A' },
    { slot_id: 't12', day: 'FRI', time: '11:00', course_id: 'c5', course_code: 'CS401', course_name: 'Computer Networks', room: 'Lab 2', type: 'lab', section: 'A' },
    // Section A — CS403 (4 classes/week)
    { slot_id: 't13', day: 'TUE', time: '10:00', course_id: 'c7', course_code: 'CS403', course_name: 'Advanced DSA', room: '104', type: 'lecture', section: 'A' },
    { slot_id: 't14', day: 'WED', time: '10:00', course_id: 'c7', course_code: 'CS403', course_name: 'Advanced DSA', room: '104', type: 'lecture', section: 'A' },
    { slot_id: 't15', day: 'THU', time: '11:00', course_id: 'c7', course_code: 'CS403', course_name: 'Advanced DSA', room: '104', type: 'lecture', section: 'A' },
    { slot_id: 't16', day: 'FRI', time: '14:00', course_id: 'c7', course_code: 'CS403', course_name: 'Advanced DSA', room: 'Lab 2', type: 'lab', section: 'A' },
    // Section B — CS201 (4 classes/week)
    { slot_id: 't17', day: 'MON', time: '11:00', course_id: 'c1', course_code: 'CS201', course_name: 'Data Structures', room: '201', type: 'lecture', section: 'B' },
    { slot_id: 't18', day: 'TUE', time: '11:00', course_id: 'c1', course_code: 'CS201', course_name: 'Data Structures', room: '201', type: 'lecture', section: 'B' },
    { slot_id: 't19', day: 'WED', time: '14:00', course_id: 'c1', course_code: 'CS201', course_name: 'Data Structures', room: '201', type: 'lecture', section: 'B' },
    { slot_id: 't20', day: 'FRI', time: '14:00', course_id: 'c1', course_code: 'CS201', course_name: 'Data Structures', room: 'Lab 1', type: 'lab', section: 'B' },
    // Section B — CS301 (4 classes/week, taught by u7)
    { slot_id: 't21', day: 'MON', time: '14:00', course_id: 'c3', course_code: 'CS301', course_name: 'Algorithms', room: '202', type: 'lecture', section: 'B' },
    { slot_id: 't22', day: 'TUE', time: '14:00', course_id: 'c3', course_code: 'CS301', course_name: 'Algorithms', room: '202', type: 'lecture', section: 'B' },
    { slot_id: 't23', day: 'THU', time: '14:00', course_id: 'c3', course_code: 'CS301', course_name: 'Algorithms', room: '202', type: 'lecture', section: 'B' },
    { slot_id: 't24', day: 'FRI', time: '15:00', course_id: 'c3', course_code: 'CS301', course_name: 'Algorithms', room: 'Lab 2', type: 'lab', section: 'B' },
  ];

  // Syllabus completion per course+section — now with module breakdown
  public syllabus_progress = [
    { course_id: 'c1', section: 'A', progress: 72, updated_by: 'u2', updated_at: '2026-04-25', modules: [
      { name: 'Module 1 – Arrays & Linked Lists', progress: 100 },
      { name: 'Module 2 – Stacks & Queues', progress: 90 },
      { name: 'Module 3 – Trees & BST', progress: 75 },
      { name: 'Module 4 – Graphs', progress: 50 },
      { name: 'Module 5 – Hashing', progress: 45 },
    ]},
    { course_id: 'c1', section: 'B', progress: 65, updated_by: 'u2', updated_at: '2026-04-25', modules: [
      { name: 'Module 1 – Arrays & Linked Lists', progress: 100 },
      { name: 'Module 2 – Stacks & Queues', progress: 85 },
      { name: 'Module 3 – Trees & BST', progress: 60 },
      { name: 'Module 4 – Graphs', progress: 40 },
      { name: 'Module 5 – Hashing', progress: 30 },
    ]},
    { course_id: 'c2', section: 'A', progress: 80, updated_by: 'u2', updated_at: '2026-04-20', modules: [
      { name: 'Module 1 – ER Modeling', progress: 100 },
      { name: 'Module 2 – SQL Queries', progress: 95 },
      { name: 'Module 3 – Normalization', progress: 80 },
      { name: 'Module 4 – Transactions', progress: 55 },
      { name: 'Module 5 – NoSQL', progress: 50 },
    ]},
    { course_id: 'c5', section: 'A', progress: 55, updated_by: 'u2', updated_at: '2026-04-22', modules: [
      { name: 'Module 1 – OSI Model', progress: 100 },
      { name: 'Module 2 – TCP/IP', progress: 70 },
      { name: 'Module 3 – Routing', progress: 45 },
      { name: 'Module 4 – Security', progress: 20 },
    ]},
    { course_id: 'c7', section: 'A', progress: 40, updated_by: 'u2', updated_at: '2026-04-18', modules: [
      { name: 'Module 1 – Divide & Conquer', progress: 100 },
      { name: 'Module 2 – DP', progress: 50 },
      { name: 'Module 3 – Greedy', progress: 20 },
      { name: 'Module 4 – Backtracking', progress: 0 },
    ]},
  ];

  // Student attendance requests (student→admin→faculty workflow)
  public attendance_requests: any[] = [];

  // Resource booking requests (faculty→admin workflow)
  public resource_bookings: any[] = [];
}
