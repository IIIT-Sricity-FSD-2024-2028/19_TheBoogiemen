import { Injectable } from '@nestjs/common';

@Injectable()
export class InMemoryDbService {
  // ── B2B Tenants (Subscribed Educational Institutions) ──
  public tenants = [
    {
      tenant_id: 't1',
      name: 'IIIT Sricity',
      code: 'IIITS',
      domain: 'iiits.ac.in',
      logo: '🏫',
      primary_color: '#4f46e5',
      subscription_tier: 'Enterprise University',
      status: 'active',
      seats_allocated: 500,
      seats_used: 120,
      monthly_token_quota: 1000000,
      used_tokens: 18450,
      valid_until: '2027-12-31',
      contact_email: 'admin@iiits.ac.in',
      created_at: '2026-01-01T00:00:00Z',
    },
    {
      tenant_id: 't2',
      name: 'IIT Madras',
      code: 'IITM',
      domain: 'iitm.ac.in',
      logo: '🏛️',
      primary_color: '#0284c7',
      subscription_tier: 'Growth Campus',
      status: 'active',
      seats_allocated: 250,
      seats_used: 85,
      monthly_token_quota: 500000,
      used_tokens: 8900,
      valid_until: '2027-08-31',
      contact_email: 'registrar@iitm.ac.in',
      created_at: '2026-02-15T00:00:00Z',
    },
    {
      tenant_id: 't3',
      name: 'Stanford Edu Online',
      code: 'STANFORD',
      domain: 'stanford.edu',
      logo: '🎓',
      primary_color: '#800000',
      subscription_tier: 'Free Trial',
      status: 'active',
      seats_allocated: 50,
      seats_used: 45,
      monthly_token_quota: 50000,
      used_tokens: 42500,
      valid_until: '2026-09-30',
      contact_email: 'contact@stanford.edu',
      created_at: '2026-05-01T00:00:00Z',
    },
  ];

  // ── SaaS Subscription Packages ──
  public subscription_plans = [
    {
      plan_id: 'sp1',
      name: 'Free Trial',
      tier: 'Free Trial',
      price: '$0 / month',
      seat_limit: 50,
      token_quota: 50000,
      features: ['Basic Progress Tracking', 'Attendance & Grading', 'Up to 50 Student Seats', 'Community Forum'],
    },
    {
      plan_id: 'sp2',
      name: 'Growth Campus',
      tier: 'Growth Campus',
      price: '$299 / month',
      seat_limit: 250,
      token_quota: 500000,
      features: ['All Starter Features', 'Department HOD Hierarchies', 'BTP Milestone Workflow', 'Token Rate Limiting & Quotas', 'Custom Campus Logo & Theme'],
    },
    {
      plan_id: 'sp3',
      name: 'Enterprise University',
      tier: 'Enterprise University',
      price: '$799 / month',
      seat_limit: 5000,
      token_quota: 5000000,
      features: ['Unlimited Academic Seats', 'API Keys & Integration Access', 'Dedicated Account Manager', 'Advanced Risk Detection AI', 'Audit Compliance Logs'],
    },
  ];

  // ── Departments mapped by tenant_id ──
  public departments = [
    { department_id: 'dept1', tenant_id: 't1', department_name: 'Computer Science', department_code: 'CS' },
    { department_id: 'dept2', tenant_id: 't1', department_name: 'Electronics', department_code: 'ECE' },
    { department_id: 'dept3', tenant_id: 't2', department_name: 'Electrical Engineering', department_code: 'EE' },
  ];

  // ── Users with Tenant Context & Dual-Tier Roles ──
  public users = [
    // SaaS Platform Level
    { user_id: 'u0_saas', tenant_id: 'global', username: 'saasadmin', password: 'Pass@123', email: 'saasadmin@platform.com', role: 'PLATFORM_SUPER_ADMIN', name: 'SaaS Global Admin' },
    { user_id: 'u0_sales', tenant_id: 'global', username: 'sales', password: 'Pass@123', email: 'sales@platform.com', role: 'PLATFORM_SALES_SUPPORT', name: 'Platform Sales Lead' },
    { user_id: 'u0_tech', tenant_id: 'global', username: 'techsupport', password: 'Pass@123', email: 'techsupport@platform.com', role: 'PLATFORM_TECH_SUPPORT', name: 'Tech Support Lead' },
    
    // Tenant t1: IIIT Sricity
    { user_id: 'u3_inst', tenant_id: 't1', username: 'director', password: 'Pass@123', email: 'director@iiits.in', role: 'INSTITUTE_SUPER_ADMIN', name: 'Dr. S. R. Naidu' },
    { user_id: 'u9_finance', tenant_id: 't1', username: 'finance', password: 'Pass@123', email: 'finance@iiits.in', role: 'FINANCE_ADMIN', name: 'Ms. P. Lakshmi' },
    { user_id: 'u4_hod', tenant_id: 't1', username: 'hod_cs', password: 'Pass@123', email: 'head@iiits.in', role: 'DEPARTMENT_ADMIN_HOD', name: 'Dr. V. Rao' },
    { user_id: 'u1', tenant_id: 't1', username: 'student', password: 'Pass@123', email: 'student@iiits.in', role: 'student', name: 'John Doe' },
    { user_id: 'u2', tenant_id: 't1', username: 'faculty', password: 'Pass@123', email: 'faculty@iiits.in', role: 'faculty', name: 'Jane Smith' },
    { user_id: 'u3', tenant_id: 't1', username: 'admin', password: 'Pass@123', email: 'admin@iiits.in', role: 'admin', name: 'Admin IIITS' },
    { user_id: 'u4', tenant_id: 't1', username: 'head', password: 'Pass@123', email: 'head@example.com', role: 'head', name: 'Head CS' },
    { user_id: 'u5', tenant_id: 't1', username: 'superadmin', password: 'Pass@123', email: 'superadmin@iiits.in', role: 'superadmin', name: 'Super Admin IIITS' },
    { user_id: 'u6', tenant_id: 't1', username: 'student2', password: 'Pass@123', email: 'student2@iiits.in', role: 'student', name: 'Alice Vance' },
    { user_id: 'u7', tenant_id: 't1', username: 'faculty2', password: 'Pass@123', email: 'faculty2@iiits.in', role: 'faculty', name: 'Robert Wilson' },
    { user_id: 'u8_parent', tenant_id: 't1', username: 'parent_john', password: 'Pass@123', email: 'parent.john@gmail.com', role: 'parent', name: 'Mr. Mark Doe', student_id: 'u1' },

    // Tenant t2: IIT Madras
    { user_id: 'u20_inst', tenant_id: 't2', username: 'iitm_director', password: 'Pass@123', email: 'director@iitm.ac.in', role: 'INSTITUTE_SUPER_ADMIN', name: 'Prof. K. Ram' },
    { user_id: 'u21_student', tenant_id: 't2', username: 'iitm_student', password: 'Pass@123', email: 'student@iitm.ac.in', role: 'student', name: 'Karthik Subramanian' },
  ];

  public students = [
    { user_id: 'u1', tenant_id: 't1', first_name: 'John', last_name: 'Doe', branch: 'CS', batch: '2022-2026', cgpa: 8.5, section: 'A', dob: '2004-05-15', phone: '9876543210', join_date: '2022-08-01', email: 'student@iiits.in' },
    { user_id: 'u6', tenant_id: 't1', first_name: 'Alice', last_name: 'Vance', branch: 'CS', batch: '2022-2026', cgpa: 5.8, section: 'B', dob: '2004-06-20', phone: '9876543211', join_date: '2022-08-01', email: 'student2@iiits.in' },
    { user_id: 'u21_student', tenant_id: 't2', first_name: 'Karthik', last_name: 'Subramanian', branch: 'EE', batch: '2023-2027', cgpa: 9.1, section: 'A', dob: '2005-02-10', phone: '9876543299', join_date: '2023-08-01', email: 'student@iitm.ac.in' },
  ];

  public faculty = [
    { user_id: 'u2', tenant_id: 't1', first_name: 'Jane', last_name: 'Smith', designation: 'Assistant Professor', department_id: 'dept1', email: 'faculty@iiits.in', phone: '9000000001' },
    { user_id: 'u7', tenant_id: 't1', first_name: 'Robert', last_name: 'Wilson', designation: 'Associate Professor', department_id: 'dept1', email: 'faculty2@iiits.in', phone: '9000000002' },
  ];

  public courses = [
    { course_id: 'c1', tenant_id: 't1', course_name: 'Data Structures', course_code: 'CS201', credits: 4, semester: 3, faculty_id: 'u2', faculty_name: 'Jane Smith' },
    { course_id: 'c2', tenant_id: 't1', course_name: 'Database Systems', course_code: 'CS202', credits: 4, semester: 3, faculty_id: 'u2', faculty_name: 'Jane Smith' },
    { course_id: 'c3', tenant_id: 't1', course_name: 'Algorithms (DSA)', course_code: 'CS301', credits: 4, semester: 4, faculty_id: 'u7', faculty_name: 'Robert Wilson' },
    { course_id: 'c4', tenant_id: 't1', course_name: 'Theory of Computation (TOC)', course_code: 'CS302', credits: 3, semester: 4, faculty_id: 'u7', faculty_name: 'Robert Wilson' },
    { course_id: 'c5', tenant_id: 't1', course_name: 'Computer Networks (CCN)', course_code: 'CS401', credits: 4, semester: 5, faculty_id: 'u2', faculty_name: 'Jane Smith' },
    { course_id: 'c6', tenant_id: 't1', course_name: 'Operating Systems (OS)', course_code: 'CS402', credits: 4, semester: 5, faculty_id: 'u7', faculty_name: 'Robert Wilson' },
    { course_id: 'c7', tenant_id: 't1', course_name: 'Advanced DSA (ADSA)', course_code: 'CS403', credits: 4, semester: 5, faculty_id: 'u2', faculty_name: 'Jane Smith' },
    { course_id: 'c8', tenant_id: 't1', course_name: 'Artificial Intelligence (AI)', course_code: 'CS404', credits: 4, semester: 6, faculty_id: 'u7', faculty_name: 'Robert Wilson' },
  ];

  public enrollment = [
    { enrollment_id: 'e1', tenant_id: 't1', student_id: 'u1', course_id: 'c1', year_id: '2024', status: 'active', section: 'A' },
    { enrollment_id: 'e2', tenant_id: 't1', student_id: 'u1', course_id: 'c2', year_id: '2024', status: 'active', section: 'A' },
    { enrollment_id: 'e5', tenant_id: 't1', student_id: 'u1', course_id: 'c5', year_id: '2024', status: 'active', section: 'A' },
    { enrollment_id: 'e6', tenant_id: 't1', student_id: 'u1', course_id: 'c7', year_id: '2024', status: 'active', section: 'A' },
    { enrollment_id: 'e3', tenant_id: 't1', student_id: 'u6', course_id: 'c1', year_id: '2024', status: 'active', section: 'B' },
    { enrollment_id: 'e4', tenant_id: 't1', student_id: 'u6', course_id: 'c3', year_id: '2025', status: 'active', section: 'B' },
  ];  public fee_records = [
    { fee_id: 'f1', tenant_id: 't1', student_id: 'u1', semester: 'Fall 2024', total_amount: 150000, paid_amount: 150000, status: 'Paid', due_date: '2024-08-31' },
    { fee_id: 'f2', tenant_id: 't1', student_id: 'u6', semester: 'Fall 2024', total_amount: 150000, paid_amount: 50000, status: 'Partial', due_date: '2024-08-31' },
  ];


  public attendance_log = [
    // Course c1: CS201 Data Structures
    { log_id: 'al1', tenant_id: 't1', student_id: 'u1', course_id: 'c1', date: '2026-04-10', status: 'present' },
    { log_id: 'al2', tenant_id: 't1', student_id: 'u1', course_id: 'c1', date: '2026-04-12', status: 'present' },
    { log_id: 'al3', tenant_id: 't1', student_id: 'u1', course_id: 'c1', date: '2026-04-14', status: 'absent' },

    // Course c2: CS202 Database Systems
    { log_id: 'al6', tenant_id: 't1', student_id: 'u1', course_id: 'c2', date: '2026-04-11', status: 'present' },
    { log_id: 'al7', tenant_id: 't1', student_id: 'u1', course_id: 'c2', date: '2026-04-13', status: 'present' },
    { log_id: 'al8', tenant_id: 't1', student_id: 'u1', course_id: 'c2', date: '2026-04-15', status: 'present' },
    { log_id: 'al9', tenant_id: 't1', student_id: 'u1', course_id: 'c2', date: '2026-04-18', status: 'absent' },

    // Course c5: CS401 Computer Networks
    { log_id: 'al10', tenant_id: 't1', student_id: 'u1', course_id: 'c5', date: '2026-04-10', status: 'present' },
    { log_id: 'al11', tenant_id: 't1', student_id: 'u1', course_id: 'c5', date: '2026-04-14', status: 'present' },
    { log_id: 'al12', tenant_id: 't1', student_id: 'u1', course_id: 'c5', date: '2026-04-17', status: 'present' },

    // Course c7: CS403 Advanced DSA
    { log_id: 'al13', tenant_id: 't1', student_id: 'u1', course_id: 'c7', date: '2026-04-12', status: 'present' },
    { log_id: 'al14', tenant_id: 't1', student_id: 'u1', course_id: 'c7', date: '2026-04-15', status: 'absent' },
    { log_id: 'al15', tenant_id: 't1', student_id: 'u1', course_id: 'c7', date: '2026-04-19', status: 'present' },

    // Student u6
    { log_id: 'al4', tenant_id: 't1', student_id: 'u6', course_id: 'c1', date: '2026-04-10', status: 'absent' },
    { log_id: 'al5', tenant_id: 't1', student_id: 'u6', course_id: 'c1', date: '2026-04-12', status: 'absent' },
  ];

  public assessments = [
    { assessment_id: 'a1', tenant_id: 't1', course_id: 'c1', name: 'Internal 1', type: 'theory', max_marks: 50, weightage: 20, faculty_id: 'u2', date: '2026-03-15' },
    { assessment_id: 'a2', tenant_id: 't1', course_id: 'c1', name: 'Quiz 1', type: 'quiz', max_marks: 20, weightage: 10, faculty_id: 'u2', date: '2026-03-20' },
  ];

  public marks_entry = [
    { entry_id: 'm1', tenant_id: 't1', student_id: 'u1', assessment_id: 'a1', course_code: 'CS201', marks_obtained: 42, max_marks: 50, grade: 'S', feedback_text: 'Excellent' },
    { entry_id: 'm2', tenant_id: 't1', student_id: 'u6', assessment_id: 'a1', course_code: 'CS201', marks_obtained: 22, max_marks: 50, grade: 'C', feedback_text: 'Needs improvement' },
    { entry_id: 'm3', tenant_id: 't1', student_id: 'u1', assessment_id: 'a2', course_code: 'CS201', marks_obtained: 18, max_marks: 20, grade: 'A', feedback_text: 'Good work' },
    { entry_id: 'm4', tenant_id: 't1', student_id: 'u6', assessment_id: 'a2', course_code: 'CS201', marks_obtained: 10, max_marks: 20, grade: 'C', feedback_text: 'Needs effort' },
  ];

  public leave_applications = [
    { leave_id: 'l1', tenant_id: 't1', student_id: 'u1', student_name: 'John Doe', leave_type: 'Medical', start_date: '2026-05-01', end_date: '2026-05-03', reason: 'Fever', status: 'approved', applied_on: '2026-04-15' },
    { leave_id: 'l2', tenant_id: 't1', student_id: 'u6', student_name: 'Alice Vance', leave_type: 'Family Event', start_date: '2026-05-10', end_date: '2026-05-12', reason: 'Sister wedding', status: 'pending', applied_on: '2026-04-17' },
    { leave_id: 'l3', tenant_id: 't1', student_id: 'u1', student_name: 'John Doe', leave_type: 'Personal', start_date: '2026-06-01', end_date: '2026-06-02', reason: 'Family function', status: 'pending', applied_on: '2026-05-20' },
  ];

  public research_projects = [
    {
      project_id: 'rp1',
      tenant_id: 't1',
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
    { project_id: 'rp2', tenant_id: 't1', title: 'AI-Based Attendance System', supervisor_id: 'u2', supervisor_name: 'Jane Smith', student_id: 'u6', student_name: 'Alice Vance', status: 'pending', abstract: 'Using facial recognition and machine learning to automate student attendance tracking.', progress: 20, students: [{ user_id: 'u6', first_name: 'Alice', last_name: 'Vance' }], uploads: [], milestones: [] },
  ];

  public discussion_posts = [
    { post_id: 'p1', tenant_id: 't1', author_id: 'u1', author_name: 'John Doe', author_role: 'student', course_id: 'CS201', title: 'Clarification on Heap Sort', content: 'Can someone explain the complexity of build-heap?', tag: 'help', reply_count: 1, created_at: '2026-04-16T10:00:00Z' },
    { post_id: 'p2', tenant_id: 't1', author_id: 'u2', author_name: 'Jane Smith', author_role: 'faculty', course_id: 'CS202', title: 'Exam Guidelines', content: 'Please review the SQL standard document attached.', tag: 'general', reply_count: 0, created_at: '2026-04-17T09:00:00Z' },
    { post_id: 'p3', tenant_id: 't1', author_id: 'u2', author_name: 'Jane Smith', author_role: 'faculty', course_id: 'CS201', title: 'Project Deadline Extended', content: 'The mini-project submission deadline has been extended to May 30th.', tag: 'announcement', reply_count: 0, created_at: '2026-04-20T08:00:00Z' },
  ];

  public discussion_replies = [
    { reply_id: 'r1', tenant_id: 't1', post_id: 'p1', author_id: 'u2', author_name: 'Jane Smith', author_role: 'faculty', content: 'It is O(n) because of the summation of the geometric series.', created_at: '2026-04-16T14:00:00Z' },
  ];

  public events = [
    { event_id: 'ev1', tenant_id: 't1', event_name: 'Placement Drive: Google', date: '2026-06-15', venue: 'Block C Auditorium', description: 'Mandatory for final year students.' },
    { event_id: 'ev2', tenant_id: 't1', event_name: 'Cricket Finals', date: '2026-05-20', venue: 'University Ground', description: 'CS vs ECE.' },
    { event_id: 'ev3', tenant_id: 't1', event_name: 'Hackathon 2026', date: '2026-05-25', venue: 'Block A Lab', description: '24-hour coding competition with prizes.' },
  ];

  public resources = [
    { resource_id: 'res1', tenant_id: 't1', name: 'Computing Lab 1', type: 'Lab', capacity: 50, location: 'Block A, 1st Floor', status: 'available' },
    { resource_id: 'res2', tenant_id: 't1', name: 'Computing Lab 2', type: 'Lab', capacity: 50, location: 'Block A, 1st Floor', status: 'booked' },
    { resource_id: 'res3', tenant_id: 't1', name: 'Conference Room A', type: 'Hall', capacity: 20, location: 'Admin Block', status: 'available' },
  ];

  public fees = [
    { fee_id: 'f1', tenant_id: 't1', student_id: 'u1', first_name: 'John', last_name: 'Doe', type: 'Semester Fee', amount: 150000, due_date: '2026-06-01', status: 'pending' },
    { fee_id: 'f2', tenant_id: 't1', student_id: 'u6', first_name: 'Alice', last_name: 'Vance', type: 'Semester Fee', amount: 150000, due_date: '2026-06-01', status: 'overdue' },
  ];

  public submissions: any[] = [];
  public timetable = [
    // ── Monday ──────────────────────────────────────────────────────────
    { slot_id: 'tt_mon_1', tenant_id: 't1', day: 'MON', time: '09:00', course_id: 'c1', course_code: 'CS201', course_name: 'Data Structures', room: '101', type: 'lecture', section: 'A', faculty_id: 'u2' },
    { slot_id: 'tt_mon_2', tenant_id: 't1', day: 'MON', time: '10:00', course_id: 'c2', course_code: 'CS202', course_name: 'Database Systems', room: '102', type: 'lecture', section: 'A', faculty_id: 'u2' },
    { slot_id: 'tt_mon_3', tenant_id: 't1', day: 'MON', time: '11:00', course_id: 'c5', course_code: 'CS401', course_name: 'Computer Networks', room: '103', type: 'lecture', section: 'A', faculty_id: 'u2' },
    { slot_id: 'tt_mon_4', tenant_id: 't1', day: 'MON', time: '14:00', course_id: 'c7', course_code: 'CS403', course_name: 'Advanced DSA', room: 'Lab-1', type: 'lab', section: 'A', faculty_id: 'u2' },

    // ── Tuesday ──────────────────────────────────────────────────────────
    { slot_id: 'tt_tue_1', tenant_id: 't1', day: 'TUE', time: '09:00', course_id: 'c2', course_code: 'CS202', course_name: 'Database Systems', room: '102', type: 'lecture', section: 'A', faculty_id: 'u2' },
    { slot_id: 'tt_tue_2', tenant_id: 't1', day: 'TUE', time: '10:00', course_id: 'c7', course_code: 'CS403', course_name: 'Advanced DSA', room: '104', type: 'lecture', section: 'A', faculty_id: 'u2' },
    { slot_id: 'tt_tue_3', tenant_id: 't1', day: 'TUE', time: '11:00', course_id: 'c1', course_code: 'CS201', course_name: 'Data Structures', room: '101', type: 'tutorial', section: 'A', faculty_id: 'u2' },
    { slot_id: 'tt_tue_4', tenant_id: 't1', day: 'TUE', time: '14:00', course_id: 'c5', course_code: 'CS401', course_name: 'Computer Networks', room: 'Lab-2', type: 'lab', section: 'A', faculty_id: 'u2' },

    // ── Wednesday ────────────────────────────────────────────────────────
    { slot_id: 'tt_wed_1', tenant_id: 't1', day: 'WED', time: '09:00', course_id: 'c5', course_code: 'CS401', course_name: 'Computer Networks', room: '103', type: 'lecture', section: 'A', faculty_id: 'u2' },
    { slot_id: 'tt_wed_2', tenant_id: 't1', day: 'WED', time: '10:00', course_id: 'c1', course_code: 'CS201', course_name: 'Data Structures', room: '101', type: 'lecture', section: 'A', faculty_id: 'u2' },
    { slot_id: 'tt_wed_3', tenant_id: 't1', day: 'WED', time: '14:00', course_id: 'c2', course_code: 'CS202', course_name: 'Database Systems', room: 'Lab-3', type: 'lab', section: 'A', faculty_id: 'u2' },

    // ── Thursday ─────────────────────────────────────────────────────────
    { slot_id: 'tt_thu_1', tenant_id: 't1', day: 'THU', time: '09:00', course_id: 'c7', course_code: 'CS403', course_name: 'Advanced DSA', room: '104', type: 'lecture', section: 'A', faculty_id: 'u2' },
    { slot_id: 'tt_thu_2', tenant_id: 't1', day: 'THU', time: '10:00', course_id: 'c5', course_code: 'CS401', course_name: 'Computer Networks', room: '103', type: 'tutorial', section: 'A', faculty_id: 'u2' },
    { slot_id: 'tt_thu_3', tenant_id: 't1', day: 'THU', time: '11:00', course_id: 'c2', course_code: 'CS202', course_name: 'Database Systems', room: '102', type: 'lecture', section: 'A', faculty_id: 'u2' },

    // ── Friday ───────────────────────────────────────────────────────────
    { slot_id: 'tt_fri_1', tenant_id: 't1', day: 'FRI', time: '09:00', course_id: 'c1', course_code: 'CS201', course_name: 'Data Structures', room: '101', type: 'lecture', section: 'A', faculty_id: 'u2' },
    { slot_id: 'tt_fri_2', tenant_id: 't1', day: 'FRI', time: '10:00', course_id: 'c7', course_code: 'CS403', course_name: 'Advanced DSA', room: '104', type: 'tutorial', section: 'A', faculty_id: 'u2' },
    { slot_id: 'tt_fri_3', tenant_id: 't1', day: 'FRI', time: '11:00', course_id: 'c5', course_code: 'CS401', course_name: 'Computer Networks', room: '103', type: 'lecture', section: 'A', faculty_id: 'u2' },
    { slot_id: 'tt_fri_4', tenant_id: 't1', day: 'FRI', time: '14:00', course_id: 'c2', course_code: 'CS202', course_name: 'Database Systems', room: '102', type: 'tutorial', section: 'A', faculty_id: 'u2' },

    // ── Faculty schedule (u2 teaches section A & B for various courses) ──
    { slot_id: 'tt_fac_mon_1', tenant_id: 't1', day: 'MON', time: '09:00', course_id: 'c1', course_code: 'CS201', course_name: 'Data Structures', room: '101', type: 'lecture', section: 'B', faculty_id: 'u2' },
    { slot_id: 'tt_fac_tue_1', tenant_id: 't1', day: 'TUE', time: '11:00', course_id: 'c2', course_code: 'CS202', course_name: 'Database Systems', room: '102', type: 'lecture', section: 'B', faculty_id: 'u2' },
    { slot_id: 'tt_fac_wed_1', tenant_id: 't1', day: 'WED', time: '11:00', course_id: 'c5', course_code: 'CS401', course_name: 'Computer Networks', room: '103', type: 'lecture', section: 'B', faculty_id: 'u2' },
    { slot_id: 'tt_fac_thu_1', tenant_id: 't1', day: 'THU', time: '13:00', course_id: 'c7', course_code: 'CS403', course_name: 'Advanced DSA', room: '104', type: 'lecture', section: 'B', faculty_id: 'u2' },
  ];

  public syllabus_progress = [
    { course_id: 'c1', tenant_id: 't1', section: 'A', progress: 72, updated_by: 'u2', updated_at: '2026-04-25', modules: [
      { name: 'Module 1 – Arrays & Linked Lists', progress: 100 },
      { name: 'Module 2 – Stacks & Queues', progress: 90 },
      { name: 'Module 3 – Trees & BST', progress: 75 },
      { name: 'Module 4 – Heaps & Graphs', progress: 40 },
    ]},
    { course_id: 'c2', tenant_id: 't1', section: 'A', progress: 60, updated_by: 'u2', updated_at: '2026-04-24', modules: [
      { name: 'Module 1 – ER Modelling', progress: 100 },
      { name: 'Module 2 – SQL Fundamentals', progress: 100 },
      { name: 'Module 3 – Normalization', progress: 60 },
      { name: 'Module 4 – Transactions & Concurrency', progress: 20 },
    ]},
    { course_id: 'c5', tenant_id: 't1', section: 'A', progress: 55, updated_by: 'u2', updated_at: '2026-04-22', modules: [
      { name: 'Module 1 – OSI & TCP/IP Model', progress: 100 },
      { name: 'Module 2 – Data Link Layer', progress: 80 },
      { name: 'Module 3 – Network Layer & IP', progress: 50 },
      { name: 'Module 4 – Transport & Application Layer', progress: 10 },
    ]},
    { course_id: 'c7', tenant_id: 't1', section: 'A', progress: 45, updated_by: 'u2', updated_at: '2026-04-20', modules: [
      { name: 'Module 1 – Advanced Sorting Algorithms', progress: 100 },
      { name: 'Module 2 – Dynamic Programming', progress: 65 },
      { name: 'Module 3 – Graph Algorithms', progress: 20 },
      { name: 'Module 4 – String Algorithms', progress: 0 },
    ]},
  ];

  public attendance_requests: any[] = [];
  public resource_bookings: any[] = [];

  // ── Token Management & Metering Engine Ledger ──
  public api_keys = [
    { key_id: 'k1', tenant_id: 't1', name: 'IIITS Biometric Sync Key', key_token: 'bk_live_iiits_9948110293', created_at: '2026-02-01T00:00:00Z', status: 'active' },
    { key_id: 'k2', tenant_id: 't2', name: 'IITM ERP Sync Key', key_token: 'bk_live_iitm_7741029384', created_at: '2026-03-10T00:00:00Z', status: 'active' },
  ];

  public audit_logs = [
    { log_id: 'al_1', tenant_id: 't1', user_id: 'u3_inst', action: 'CREATE_DEPARTMENT', details: 'Added Department: Electrical Eng', timestamp: '2026-08-01T10:00:00Z' },
    { log_id: 'al_2', tenant_id: 't1', user_id: 'u4_hod', action: 'ASSIGN_FACULTY', details: 'Assigned Jane Smith to CS201', timestamp: '2026-08-02T11:30:00Z' },
  ];

  public active_sessions: Record<string, { refresh_token: string; user_id: string; tenant_id: string; expires_at: Date }> = {};

  public uploads: any[] = [
    {
      file_id: 'doc_sample_report_u1',
      original_name: 'Official_Progress_Report_Spring2026.pdf',
      file_name: 'sample-progress-report-u1.pdf',
      file_path: require('path').resolve(process.cwd(), 'uploads/sample-progress-report-u1.pdf'),
      mime_type: 'application/pdf',
      size_bytes: 109694,
      uploaded_by: 'u2',
      uploader_role: 'faculty',
      category: 'progress_report',
      related_entity_id: 'u1',
      created_at: '2026-08-26T00:00:00.000Z',
    },
  ];
}

