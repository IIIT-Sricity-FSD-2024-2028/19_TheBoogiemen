/**
 * mockData.js
 * COMPLETE CONSOLIDATED DATABASE
 * Preserves all original data points for Student, Faculty, and Academic Head portals.
 */

// ==========================================
// USER CREDENTIALS FOR ALL PORTALS
// ==========================================
const userCredentials = [
  { email: 'student@iiits.in', password: 'password', role: 'student', name: 'Faham' },
  { email: 'pranjal.student@iiits.in', password: 'password', role: 'student', name: 'Pranjal' },
  { email: 'faculty@iiits.in', password: 'password', role: 'faculty', name: 'Dr. Shams' },
  { email: 'professor@iiits.in', password: 'password', role: 'faculty', name: 'Dr. Bablani' },
  { email: 'head@iiits.in', password: 'password', role: 'head', name: 'Dr. Kavitha' },
  { email: 'admin@iiits.in', password: 'password', role: 'admin', name: 'System Admin' },
  { email: 'superuser@iiits.in', password: 'password', role: 'superuser', name: 'Pranjal Sharma' }
];

// ==========================================
// 1. STUDENT PORTAL DATA
// ==========================================
const studentMockDatabase = {
  analytics: {
    student: {
      name: "Faham",
      semester: "Spring 2026",
      predictedGrade: "A+",
      overallCompletion: 63
    },
    modules: [
      { id: 1, name: "Module 1", completedTopics: 8, totalTopics: 8, percentage: 100 },
      { id: 2, name: "Module 2", completedTopics: 6, totalTopics: 6, percentage: 100 },
      { id: 3, name: "Module 3", completedTopics: 6, totalTopics: 8, percentage: 75 },
      { id: 4, name: "Module 4", completedTopics: 4, totalTopics: 10, percentage: 40 },
      { id: 5, name: "Module 5", completedTopics: 0, totalTopics: 7, percentage: 0 }
    ],
    courseOutcomes: [
      { label: "CO1", score: 85 },
      { label: "CO2", score: 40 },
      { label: "CO3", score: 90 },
      { label: "CO4", score: 35 },
      { label: "CO5", score: 70 }
    ],
    assessments: [
      { qId: "Q1", co: "CO1", marks: 9, max: 10 },
      { qId: "Q4", co: "CO2", marks: 3, max: 10, alert: true },
      { qId: "Q7", co: "CO4", marks: 2, max: 10, alert: true }
    ]
  },
  profile: {
    academic: {
      studentId: "S20240010146",
      academicYear: "UG-2",
      department: "Computer Science & Engineering",
      school: "School of Engineering & Technology",
      section: "Section 2",
      batch: "2024-2028",
      cgpa: "9.16",
      attendance: 82,
      year: "UG-2",
      branch: "Computer Science",
      semester: "4th Semester",
      term: "Spring 2026",
      currentCourses: [
        { id: "CS301", course: "Database Management Systems", instructor: "Dr. Anushree Bablani", grade: "A-", attendance: 83, progress: 75, status: "On Track" },
        { id: "CS302", course: "Machine Learning", instructor: "Dr. James Wilson", grade: "B+", attendance: 83, progress: 60, status: "On Track" },
        { id: "CS303", course: "Software Engineering", instructor: "Prof. Emily Chen", grade: "A", attendance: 95, progress: 85, status: "On Track" },
        { id: "CS304", course: "Operating Systems", instructor: "Dr. Harshini", grade: "A-", attendance: 88, progress: 70, status: "On Track" },
        { id: "CS305", course: "Computer Networks", instructor: "Dr. Omkar", grade: "B+", attendance: 78, progress: 65, status: "On Track" }
      ]
    },
    personal: {
      fullName: "Faham",
      email: "faham@university.edu",
      phone: "12345 67890",
      dob: "02-02-2006",
      gender: "Male",
      nationality: "Indian",
      bloodGroup: "A-",
      permanentAddress: "Enter your full address..."
    },
    emergencyContact: {
      number: "12345 67890",
      contactPerson: "Pranjal",
      relationship: "Father",
      email: "pranjal@email.com"
    },
    options: {
      academicYears: ["UG-1", "UG-2", "UG-3", "UG-4"],
      relationships: ["Father", "Mother", "Guardian", "Other"]
    }
  },
  timetable: {
    stats: { totalClasses: 35, lectures: 18, labs: 12, freePeriods: 5 },
    schedule: [
      {
        time: "08:00 - 09:00",
        days: {
          monday: { code: "CS301", type: "Lab", name: "Database Management Systems", location: "Lab 201" },
          tuesday: { code: "CS304", type: "Lecture", name: "Operating Systems", location: "Room 201" },
          wednesday: { code: "CS302", type: "Lab", name: "Machine Learning", location: "Lab 301" },
          thursday: { code: "CS301", type: "Lecture", name: "Database Management Systems", location: "Room 305" },
          friday: { code: "CS302", type: "Lecture", name: "Machine Learning", location: "Room 305" }
        }
      },
      {
        time: "09:00 - 10:00",
        days: {
          monday: { code: "CS302", type: "Lecture", name: "Machine Learning", location: "Room 305" },
          tuesday: { code: "CS304", type: "Lecture", name: "Operating Systems", location: "Room 201" },
          wednesday: { code: "CS302", type: "Lab", name: "Machine Learning", location: "Lab 301" },
          thursday: { code: "CS301", type: "Lecture", name: "Database Management Systems", location: "Room 305" },
          friday: { code: "CS303", type: "Lab", name: "Software Engineering", location: "Lab 402" }
        }
      },
      {
        time: "10:00 - 11:00",
        days: {
          monday: { code: "CS302", type: "Lecture", name: "Machine Learning", location: "Room 305" },
          tuesday: { code: "CS301", type: "Lecture", name: "Database Management Systems", location: "Room 305" },
          wednesday: { code: "CS303", type: "Tutorial", name: "Software Engineering", location: "Room 402" },
          thursday: { code: "CS305", type: "Lecture", name: "Computer Networks", location: "Room 501" },
          friday: { code: "CS303", type: "Lab", name: "Software Engineering", location: "Lab 402" }
        }
      },
      {
        time: "11:00 - 12:00",
        days: {
          monday: { type: "Free", name: "Free Period", location: "-" },
          tuesday: { type: "Free", name: "Free Period", location: "-" },
          wednesday: { type: "Free", name: "Free Period", location: "-" },
          thursday: { type: "Free", name: "Free Period", location: "-" },
          friday: { type: "Free", name: "Free Period", location: "-" }
        }
      },
      { time: "12:00 - 01:00", isBreak: true, label: "Lunch Break" },
      {
        time: "01:00 - 02:00",
        days: {
          monday: { code: "CS303", type: "Lecture", name: "Software Engineering", location: "Room 402" },
          tuesday: { code: "CS305", type: "Lab", name: "Computer Networks", location: "Lab 105" },
          wednesday: { code: "CS304", type: "Lab", name: "Operating Systems", location: "Lab 205" },
          thursday: { type: "Free", name: "Free Period", location: "-" },
          friday: { code: "CS305", type: "Lecture", name: "Computer Networks", location: "Room 501" }
        }
      },
      {
        time: "02:00 - 03:00",
        days: {
          monday: { code: "CS303", type: "Lecture", name: "Software Engineering", location: "Room 402" },
          tuesday: { code: "CS305", type: "Lab", name: "Computer Networks", location: "Lab 105" },
          wednesday: { code: "CS304", type: "Lab", name: "Operating Systems", location: "Lab 205" },
          thursday: { type: "Free", name: "Free Period", location: "-" },
          friday: { type: "Free", name: "Free Period", location: "-" }
        }
      }
    ],
    instructors: [
      { name: "Dr. Shams", course: "CS301", email: "shams@university.edu", office: "Room 305" },
      { name: "Dr. Faham", course: "CS302", email: "faham@university.edu", office: "Room 402" },
      { name: "Prof. Pranjal", course: "CS303", email: "pranjal@university.edu", office: "Room 501" },
      { name: "Dr. Harshini", course: "CS304", email: "harshini@university.edu", office: "Room 205" },
      { name: "Dr. Omkar", course: "CS305", email: "Omkar@university.edu", office: "Room 301" }
    ]
  },
  courses: {
    summary: { enrolledCount: 3, pendingAssignments: 6, averageGrade: "A-" },
    list: [
      {
        id: "cs301",
        code: "CS301",
        title: "Database Management Systems",
        instructor: "Dr. Anushree Bablani",
        grade: "A-",
        credits: 4,
        attendance: { attended: 33, total: 40, percent: 83 },
        nextClass: "Today, 10:00 AM",
        assignmentsPending: 2,
        progress: 75,
        currentModule: "Module 3: Query Optimization",
        description: "Fundamental concepts and advanced topics in DBMS.",
        materials: [
          { name: "Lecture 1: Introduction.pdf", size: "2.4 MB", date: "1/15/2026" },
          { name: "Week 2 - Linear Regression.pptx", size: "5.1 MB", date: "1/22/2026" },
          { name: "Lab Assignment 1.zip", size: "1.2 MB", date: "1/29/2026" }
        ],
        assessments: [
          { title: "Assignment 1: SQL Implementation", due: "3/15/2026", status: "pending", max: 20, scored: null },
          { title: "Mid-term Project: DB Schema", due: "3/20/2026", status: "submitted", max: 30, scored: 28 },
          { title: "Quiz 2: Normalization", due: "3/10/2026", status: "graded", max: 10, scored: 9 }
        ],
        syllabus: [
          { week: 1, title: "Intro to DBMS", topics: ["Data Models", "Architecture"] },
          { week: 2, title: "Relational Algebra", topics: ["Joins", "Selections"] }
        ]
      },
      {
        id: "cs302",
        code: "CS302",
        title: "Machine Learning",
        instructor: "Dr. James Wilson",
        grade: "B+",
        credits: 4,
        attendance: { attended: 30, total: 36, percent: 83 },
        nextClass: "Tomorrow, 2:00 PM",
        assignmentsPending: 3,
        progress: 60,
        currentModule: "Module 2: Neural Networks",
        description: "Theoretical foundations and practical applications of ML algorithms."
      },
      {
        id: "cs303",
        code: "CS303",
        title: "Software Engineering",
        instructor: "Prof. Emily Chen",
        grade: "A",
        credits: 4,
        attendance: { attended: 36, total: 38, percent: 95 },
        nextClass: "Mar 7, 11:00 AM",
        assignmentsPending: 1,
        progress: 85,
        currentModule: "Module 4: Testing & Debugging",
        description: "Software development lifecycle, agile methodologies, and quality assurance."
      }
    ]
  },
  attendanceTracker: {
    activeSubject: {
      id: "cs301",
      name: "Database Management Systems",
      instructor: "Dr. Anushree Bablani",
      percentage: 83,
      ratio: "33/40",
      weeks: [
        { week: 1, mon: true, tue: true, wed: true, thu: true, fri: false },
        { week: 2, mon: true, tue: true, wed: false, thu: true, fri: false },
        { week: 3, mon: true, tue: true, wed: true, thu: true, fri: true },
        { week: 4, mon: false, tue: true, wed: true, thu: true, fri: false },
        { week: 5, mon: true, tue: true, wed: true, thu: false, fri: false },
        { week: 6, mon: true, tue: false, wed: true, thu: true, fri: false }
      ]
    },
    allSubjects: [
      { id: "cs301", code: "CS301", name: "Database Management Systems", instructor: "Dr. Anushree Bablani", percent: 83, ratio: "33/40", isSelected: true },
      { id: "cs302", code: "CS302", name: "Machine Learning", instructor: "Dr. Piyush Joshi", percent: 83, ratio: "30/36", isSelected: false },
      { id: "cs303", code: "CS303", name: "Software Engineering", instructor: "Dr. Mallikarjun", percent: 95, ratio: "36/38", isSelected: false }
    ],
    correctionRequests: [
      { id: "CR001", studentName: "Faham", studentId: "S20240010146", course: "Database Management Systems", courseCode: "CS301", date: "2026-03-10", reason: "Was attending a university event — have proof", status: "pending", submittedOn: "2026-03-11" },
      { id: "CR002", studentName: "Faham", studentId: "S20240010146", course: "Machine Learning", courseCode: "CS302", date: "2026-03-05", reason: "Medical appointment — doctor's note attached", status: "approved", submittedOn: "2026-03-06" }
    ]
  },
  leaveManagement: {
    stats: { total: 4, approved: 2, pending: 1, rejected: 1 },
    applications: [
      { id: 1, type: "Medical Leave", status: "Approved", reason: "Fever and medical consultation", startDate: "Mar 10", endDate: "Mar 12", duration: "3 days", appliedOn: "Mar 5", attachment: "medical_certificate.pdf", rejectionReason: null },
      { id: 2, type: "Event Participation", status: "Pending", reason: "Participating in Inter-College Hackathon at IIT Delhi", startDate: "Mar 15", endDate: "Mar 17", duration: "3 days", appliedOn: "Mar 4", attachment: "event_invitation.pdf", rejectionReason: null },
      { id: 3, type: "Personal Leave", status: "Approved", reason: "Family function", startDate: "Feb 20", endDate: "Feb 21", duration: "2 days", appliedOn: "Feb 15", attachment: null, rejectionReason: null },
      { id: 4, type: "Medical Leave", status: "Rejected", reason: "Minor surgery", startDate: "Jan 28", endDate: "Jan 29", duration: "2 days", appliedOn: "Jan 25", attachment: "medical_report.pdf", rejectionReason: "Insufficient medical documentation" }
    ],
    leaveTypes: ["Medical Leave", "Personal Leave", "Event Participation", "Other"]
  },
  forum: {
    threads: [
      { id: 1, lectureTag: "Lecture 15: Machine Learning Algorithms", title: "Clarification on gradient descent optimization", author: "Shams", replies: 12, timestamp: "2 hours ago", tagClass: "badge" },
      { id: 2, lectureTag: "Lecture 14: Neural Networks", title: "Backpropagation implementation doubt", author: "Pranjal", replies: 8, timestamp: "5 hours ago", tagClass: "badge2" },
      { id: 3, lectureTag: "Lecture 13: Data Preprocessing", title: "Best practices for handling missing values", author: "Faham", replies: 15, timestamp: "1 day ago", tagClass: "badge3" }
    ],
    lectureOptions: ["Lecture 13: Data Preprocessing", "Lecture 14: Neural Networks", "Lecture 15: Machine Learning Algorithms", "Lecture 16: Model Evaluation"],
    fullThreads: [
      { id: 1, lectureTag: "Lecture 15: Machine Learning Algorithms", title: "Clarification on gradient descent optimization", author: "Faham", authorId: "S20240010146", replies: 12, timestamp: "2 hours ago", tagClass: "badge", body: "I'm struggling to understand the mathematical intuition behind the learning rate parameter in gradient descent. How does adjusting it affect convergence?", comments: [
        { id: 1, author: "Dr. Shams", role: "faculty", initial: "D", text: "The learning rate controls step size during gradient descent. Too large → overshooting; Too small → slow convergence. Typical range: 0.001–0.1.", time: "1 hour ago" },
        { id: 2, author: "Pranjal", role: "student", initial: "P", text: "I recommend reading Chapter 4 of Deep Learning by Goodfellow — it explains adaptive learning rates really well.", time: "45 mins ago" }
      ]},
      { id: 2, lectureTag: "Lecture 14: Neural Networks", title: "Backpropagation implementation doubt", author: "Pranjal", authorId: "S20240010147", replies: 8, timestamp: "5 hours ago", tagClass: "badge2", body: "When implementing backpropagation manually, I'm getting different gradients than the expected output. Should we use ReLU activation for all layers or only hidden layers?", comments: [] },
      { id: 3, lectureTag: "Lecture 13: Data Preprocessing", title: "Best practices for handling missing values", author: "Faham", authorId: "S20240010146", replies: 15, timestamp: "1 day ago", tagClass: "badge3", body: "In the dataset given for Assignment 2, about 15% values are missing. Should I use mean/median imputation or try a model-based approach like KNN imputer?", comments: [
        { id: 1, author: "Dr. Shams", role: "faculty", initial: "D", text: "For numerical features, median is safer than mean (robust to outliers). KNN imputation is excellent but computationally heavy for large datasets.", time: "23 hours ago" }
      ]}
    ]
  },
  research: {
    project: {
      title: "Machine Learning for Predictive Healthcare",
      type: "Bachelor's Thesis Project",
      guide: "Dr. Shams",
      stats: { documentsCount: 12, tasksCompleted: 24, totalTasks: 45, daysRemaining: 56 }
    },
    milestones: [
      { id: 1, title: "Literature Review", status: "completed", date: "January 15, 2026", description: "Completed comprehensive literature review", statusClass: "badge" },
      { id: 2, title: "Proposal Submission", status: "completed", date: "February 1, 2026", description: "Project proposal approved by committee", statusClass: "badge2" },
      { id: 3, title: "Mid-term Presentation", status: "in-progress", date: "March 10, 2026", description: "Prepare and deliver mid-term progress presentation", statusClass: "badge3" },
      { id: 4, title: "Implementation Phase", status: "upcoming", date: "March 20, 2026", description: "Begin core implementation of research methodology", statusClass: "badge4" },
      { id: 5, title: "Final Submission", status: "upcoming", date: "April 30, 2026", description: "Submit final thesis and documentation", statusClass: "badge5" }
    ],
    meetingRequests: [
      { id: "MR001", proposedDate: "2026-04-10", proposedTime: "14:00", agenda: "Discuss mid-term presentation progress and get feedback on methodology section", status: "approved", requestedOn: "2026-04-01", facultyNote: "Confirmed. Meet at my office Room 305." },
      { id: "MR002", proposedDate: "2026-04-20", proposedTime: "11:00", agenda: "Review implementation plan and dataset collection strategy", status: "pending", requestedOn: "2026-04-02", facultyNote: "" }
    ]
  },
  settings: {
    account: { email: "faham@university.edu", userId: "S20240010146", role: "Student", createdAt: "January 15, 2023" },
    notifications: {
      channels: { email: true, push: true },
      types: { attendanceAlerts: true, gradeUpdates: true, forumReplies: false, systemAnnouncements: true }
    },
    security: { lastChanged: "2024-02-10", requirement: "At least 8 characters long" }
  }
};

// ==========================================
// 2. FACULTY PORTAL DATA
// ==========================================
const facultyMockDatabase = {
  dashboard: {
    stats: { 
      totalStudents: 6, 
      lowAttendanceCount: 3, 
      atRiskCount: 3,
      classesThisWeek: 22
    },
    atRiskStudents: [
      { id: "CS002", name: "Harshini Reddy", attendance: 68, avgScore: 65, fullId: "S20240010085", riskLevel: "High" },
      { id: "CS004", name: "Omkar", attendance: 72, avgScore: 70, fullId: "S20240010112", riskLevel: "Medium" },
      { id: "CS006", name: "Pranjal", attendance: 62, avgScore: 58, fullId: "S20240010145", riskLevel: "High" }
    ],
    options: {
      meetingTypes: ["Academic Performance", "Attendance Concern", "Project Review", "General Mentoring"],
      assessmentTypes: ["Quiz", "Mid-term Exam", "Assignment", "Lab Task"],
      courses: ["CS301 - Database Systems", "CS302 - Machine Learning"]
    },
    interventionLog: []
  },
  profile: {
    account: {
      name: "Dr. Shams",
      email: "shams@iiits.in",
      role: "Faculty",
      dept: "Computer Science",
      employeeId: "FAC2024001"
    }
  },
  timetable: {
    stats: { totalClasses: 22, lectures: 11, labs: 10, subjects: 4 },
    schedule: [
      {
        time: "08:00 - 09:00",
        days: {
          monday: { code: "CS301", type: "Lab", name: "Database Systems", target: "Year 3 • Sec A", location: "Lab 201", count: 30 },
          tuesday: { code: "CS201", type: "Lecture", name: "Data Structures", target: "Year 2 • Sec A", location: "Room 201", count: 40 },
          wednesday: { code: "CS401", type: "Lab", name: "Machine Learning", target: "Year 4 • Sec B", location: "Lab 301", count: 32 },
          thursday: { code: "CS301", type: "Lecture", name: "Database Systems", target: "Year 3 • Sec A", location: "Room 305", count: 30 },
          friday: { code: "CS401", type: "Lecture", name: "Machine Learning", target: "Year 4 • Sec A", location: "Room 305", count: 35 }
        }
      },
      {
        time: "09:00 - 10:00",
        days: {
          monday: { code: "CS301", type: "Lab", name: "Database Systems", target: "Year 3 • Sec A", location: "Lab 201", count: 30 },
          tuesday: { code: "CS201", type: "Lecture", name: "Data Structures", target: "Year 2 • Sec A", location: "Room 201", count: 40 },
          wednesday: { code: "CS401", type: "Lab", name: "Machine Learning", target: "Year 4 • Sec B", location: "Lab 301", count: 32 },
          thursday: { code: "CS301", type: "Lecture", name: "Database Systems", target: "Year 3 • Sec B", location: "Room 305", count: 28 },
          friday: { code: "CS201", type: "Lab", name: "Data Structures", target: "Year 2 • Sec A", location: "Lab 402", count: 40 }
        }
      },
      {
        time: "10:00 - 11:00",
        days: {
          monday: { code: "CS201", type: "Lecture", name: "Data Structures", target: "Year 2 • Sec B", location: "Room 305", count: 45 },
          tuesday: { code: "CS301", type: "Lecture", name: "Database Systems", target: "Year 3 • Sec B", location: "Room 305", count: 28 },
          wednesday: { code: "CS301", type: "Tutorial", name: "Database Systems", target: "Year 3 • Sec A", location: "Room 402", count: 30 },
          thursday: { code: "CS101", type: "Lecture", name: "Programming Fundamentals", target: "Year 1 • Sec C", location: "Room 501", count: 50 },
          friday: { code: "CS201", type: "Lab", name: "Data Structures", target: "Year 2 • Sec A", location: "Lab 402", count: 40 }
        }
      },
      { time: "11:00 - 12:00", isFree: true, label: "Free Period" },
      { time: "12:00 - 01:00", isBreak: true, label: "Lunch Break" },
      {
        time: "01:00 - 02:00",
        days: {
          monday: { code: "CS401", type: "Lecture", name: "Machine Learning", target: "Year 4 • Sec A", location: "Room 402", count: 35 },
          tuesday: { code: "CS101", type: "Lab", name: "Programming Fundamentals", target: "Year 1 • Sec C", location: "Lab 105", count: 50 },
          wednesday: { code: "CS201", type: "Lab", name: "Data Structures", target: "Year 2 • Sec B", location: "Lab 205", count: 45 },
          thursday: { type: "Meeting", label: "Department Meeting", location: "Conference Room" },
          friday: { code: "CS101", type: "Lecture", name: "Programming Fundamentals", target: "Year 1 • Sec C", location: "Room 501", count: 50 }
        }
      },
      {
        time: "02:00 - 03:00",
        days: {
          monday: { code: "CS401", type: "Lecture", name: "Machine Learning", target: "Year 4 • Sec A", location: "Room 402", count: 35 },
          tuesday: { code: "CS101", type: "Lab", name: "Programming Fundamentals", target: "Year 1 • Sec C", location: "Lab 105", count: 50 },
          wednesday: { code: "CS201", type: "Lab", name: "Data Structures", target: "Year 2 • Sec B", location: "Lab 205", count: 45 },
          thursday: { isFree: true, label: "Free Period" },
          friday: { type: "OfficeHours", label: "Office Hours", location: "Office 302" }
        }
      }
    ],
    courseSummaries: [
      { code: "CS301", title: "Database Systems", years: "Year 3, Sections A & B", totalStudents: 58, breakdown: "Sec A: 30, Sec B: 28", hours: "10 hours/week (6 Lectures, 3 Labs, 1 Tutorial)" },
      { code: "CS201", title: "Data Structures", years: "Year 2, Sections A & B", totalStudents: 85, breakdown: "Sec A: 40, Sec B: 45", hours: "8 hours/week (4 Lectures, 4 Labs)" },
      { code: "CS401", title: "Machine Learning", years: "Year 4, Sections A & B", totalStudents: 67, breakdown: "Sec A: 35, Sec B: 32", hours: "6 hours/week (3 Lectures, 3 Labs)" },
      { code: "CS101", title: "Programming Fundamentals", years: "Year 1, Section C", totalStudents: 50, breakdown: "Total Students: 50", hours: "5 hours/week (2 Lectures, 3 Labs)" }
    ]
  },
  assessmentMapping: {
    metadata: { title: "Mid-Term Examination - CS301", course: "Database Systems", totalMarks: 60 },
    availableOutcomes: {
      cos: [
        { id: "CO1", text: "Understand fundamental programming concepts" },
        { id: "CO2", text: "Apply OOP principles in software design" },
        { id: "CO3", text: "Implement data structures and algorithms" },
        { id: "CO4", text: "Design and query databases" },
        { id: "CO5", text: "Analyze algorithm efficiency" }
      ],
      pos: [
        { id: "PO1", text: "Engineering Knowledge" },
        { id: "PO2", text: "Problem Analysis" },
        { id: "PO3", text: "Design/Development of Solutions" },
        { id: "PO4", text: "Modern Tool Usage" },
        { id: "PO5", text: "Communication" }
      ]
    },
    questions: [
      { id: 1, name: "Question 1", marks: 10, text: "Define the principles of Object-Oriented Programming", mappedCOs: ["CO1", "CO2"], mappedPOs: ["PO1", "PO3"] },
      { id: 2, name: "Question 2", marks: 10, text: "Explain inheritance with examples", mappedCOs: ["CO1", "CO2"], mappedPOs: ["PO1", "PO3"] },
      { id: 3, name: "Question 3", marks: 15, text: "Implement a sorting algorithm", mappedCOs: ["CO1", "CO3", "CO5"], mappedPOs: ["PO1", "PO2", "PO3"] },
      { id: 4, name: "Question 4", marks: 15, text: "Design a database schema for e-commerce", mappedCOs: ["CO4"], mappedPOs: ["PO2", "PO3", "PO4"] },
      { id: 5, name: "Question 5", marks: 10, text: "Analyze time complexity of algorithms", mappedCOs: ["CO1", "CO5"], mappedPOs: ["PO1", "PO2"] }
    ]
  },
  attendanceMarking: {
    classes: [
      { id: "cs301-a", code: "CS301", name: "Database Systems", year: 3, section: "A", studentCount: 30, fullLabel: "CS301 - Database Systems • Year 3 Sec A (30 students)" },
      { id: "cs201-a", code: "CS201", name: "Data Structures", year: 2, section: "A", studentCount: 40, fullLabel: "CS201 - Data Structures • Year 2 Sec A (40 students)" }
    ],
    students: [
      { id: "CS001", name: "Faham", isPresent: false, overallAttendance: 85, alert: false },
      { id: "CS002", name: "Pranjal", isPresent: false, overallAttendance: 68, alert: true },
      { id: "CS003", name: "Omkar", isPresent: false, overallAttendance: 82, alert: false },
      { id: "CS004", name: "Harshini", isPresent: false, overallAttendance: 72, alert: true },
      { id: "CS005", name: "Shams", isPresent: false, overallAttendance: 90, alert: false },
      { id: "CS006", name: "Hamiz", isPresent: false, overallAttendance: 62, alert: true }
    ],
    session: { date: "Thursday, March 6, 2026", presentCount: 0 }
  },
  studentOverview: {
    students: [
      { id: "CS001", fullId: "S20240010080", name: "Faham", attendance: 82, avgScore: 78, status: "On Track", statusClass: "badge", progress: 75, activities: ["Submitted Assignment 3 - 2 days ago", "Attended last 3 classes"] },
      { id: "CS002", fullId: "S20240010090", name: "Pranjal", attendance: 68, avgScore: 65, status: "At Risk", statusClass: "badge2", progress: 55, activities: ["Missed Quiz 2 - 1 week ago", "Late submission for Project 1"] },
      { id: "CS003", fullId: "S20240010110", name: "Omkar", attendance: 95, avgScore: 92, status: "On Track", statusClass: "badge", progress: 90, activities: ["Perfect attendance this month", "Highest score in Mid-term"] },
      { id: "CS004", fullId: "S20240010125", name: "Harshini", attendance: 72, avgScore: 70, status: "At Risk", statusClass: "badge2", progress: 60, activities: ["Submitted Assignment 3 - 1 day ago", "Missed lab session on Mar 4"] },
      { id: "CS005", fullId: "S20240010140", name: "Shams", attendance: 88, avgScore: 85, status: "On Track", statusClass: "badge", progress: 80, activities: ["Active participation in Forum", "Submitted Project 1 early"] },
      { id: "CS006", fullId: "S20240010155", name: "Hamiz", attendance: 62, avgScore: 58, status: "At Risk", statusClass: "badge2", progress: 45, activities: ["Missed last 2 lectures", "Failed to submit Assignment 2"] }
    ],
    filters: ["All Students", "On Track", "At Risk", "Year 1", "Year 2", "Year 3", "Year 4"]
  },
  forum: {
    summary: { totalDiscussions: 4, resolvedCount: 1, needsResponseCount: 3 },
    threads: [
      { id: "T001", lecture: "Lecture 15: Machine Learning Algorithms", status: "active", statusClass: "badge2", title: "Clarification on gradient descent optimization", author: "Shams", studentId: "CS001", replyCount: 12, timeAgo: "2 hours ago", originalPost: "Explain the mathematical intuition behind the learning rate parameter.", comments: [{ author: "Pranjal", initial: "M", text: "The learning rate controls how big of a step you take.", time: "1 hour ago" }] },
      { id: "T002", lecture: "Lecture 14: Neural Networks", status: "active", statusClass: "badge2", title: "Backpropagation implementation doubt", author: "Faham", studentId: "CS002", replyCount: 8, timeAgo: "5 hours ago", originalPost: "Can we use ReLU activation for all layers?", comments: [] },
      { id: "T003", lecture: "Lecture 13: Data Preprocessing", status: "resolved", statusClass: "badge6", title: "Best practices for handling missing values", author: "Pranjal", studentId: "CS003", replyCount: 15, timeAgo: "1 day ago", originalPost: "Should I use median or mean for imputation?", comments: [] },
      { id: "T004", lecture: "Lecture 12: Feature Engineering", status: "active", statusClass: "badge2", title: "How to select optimal features for model?", author: "Harshini", studentId: "CS004", replyCount: 6, timeAgo: "2 days ago", originalPost: "What is the difference between filter and wrapper methods?", comments: [] }
    ],
    lectures: ["All Topics", "Lecture-15", "Lecture-16", "Lecture-17"]
  },
  researchSupervision: {
    summary: { totalProjects: 4, inProgress: 3, underReview: 1, avgProgress: 70 },
    projects: [
      { id: "PROJ-001", title: "Machine Learning for Predictive Healthcare", studentName: "Shams", studentId: "CS001", status: "in-progress", grade: "A-", progress: 65, lastUpdate: "Mar 3", submissionCount: 8, commentCount: 24, nextMeeting: "March 10, 2026", submissions: [{ title: "Literature Review - Final Draft", date: "Mar 3, 2026", status: "reviewed" }, { title: "Methodology Section", date: "Feb 28, 2026", status: "reviewed" }, { title: "Data Collection Results", date: "Feb 25, 2026", status: "pending" }], meetingRequests: [{ id: "MR001", studentName: "Shams", proposedDate: "2026-04-10", proposedTime: "14:00", agenda: "Discuss mid-term results", status: "pending", requestedOn: "2026-04-01" }] },
      { id: "PROJ-002", title: "Blockchain-based Supply Chain Management", studentName: "Omkar", studentId: "CS002", status: "in-progress", grade: "A", progress: 72, lastUpdate: "Mar 4", submissionCount: 10, commentCount: 18, nextMeeting: "March 8, 2026", submissions: [], meetingRequests: [] },
      { id: "PROJ-003", title: "IoT Security Framework for Smart Homes", studentName: "Harshini", studentId: "CS003", status: "review", grade: "A", progress: 85, lastUpdate: "Mar 5", submissionCount: 12, commentCount: 32, nextMeeting: "None Scheduled", submissions: [], meetingRequests: [{ id: "MR002", studentName: "Harshini", proposedDate: "2026-04-15", proposedTime: "10:00", agenda: "Final thesis review session", status: "approved", requestedOn: "2026-04-02", facultyNote: "Confirmed. Room 305." }] },
      { id: "PROJ-004", title: "Natural Language Processing for Sentiment Analysis", studentName: "Pranjal", studentId: "CS004", status: "in-progress", grade: "B+", progress: 58, lastUpdate: "Mar 2", submissionCount: 6, commentCount: 15, nextMeeting: "March 12, 2026", submissions: [], meetingRequests: [] }
    ]
  },
  settings: {
    account: { email: "professor@university.edu", userId: "FAC_2023_01", role: "Faculty", accountCreated: "January 15, 2023" },
    notifications: { channels: { email: true, push: true }, types: { attendanceAlerts: true, gradeUpdates: true, forumReplies: false, systemAnnouncements: true } },
    security: { requirement: "Password must be at least 8 characters long", isCurrentPasswordValid: true }
  }
};

// ==========================================
// 3. ACADEMIC HEAD PORTAL DATA
// ==========================================
const academicHeadMockDatabase = {
  dashboard: {
    institutionalStats: { totalStudents: 908, facultyMembers: 64, activeCourses: 47, avgAttainment: "81.2%" },
    departments: [
      { id: "CSE", name: "Computer Science", students: 245, passRate: 88, activeCourses: 15 },
      { id: "ECE", name: "Electronics", students: 198, passRate: 82, activeCourses: 12 },
      { id: "ME", name: "Mechanical", students: 167, passRate: 75, activeCourses: 8 },
      { id: "CE", name: "Civil", students: 142, passRate: 70, activeCourses: 6 },
      { id: "EE", name: "Electrical", students: 156, passRate: 79, activeCourses: 6 }
    ],
    attendanceTrends: [{ month: "Sep", rate: 85 }, { month: "Oct", rate: 82 }, { month: "Nov", rate: 88 }, { month: "Dec", rate: 78 }, { month: "Jan", rate: 92 }, { month: "Feb", rate: 84 }, { month: "Mar", rate: 86 }],
    outcomeAttainment: [{ po: "PO1", score: 85 }, { po: "PO2", score: 78 }, { po: "PO3", score: 92 }, { po: "PO4", score: 70 }, { po: "PO5", score: 88 }, { po: "PO6", score: 74 }],
    resourceUsage: [{ name: "Labs", utilization: 78, color: "#4f46e5" }, { name: "Classrooms", utilization: 92, color: "#10b981" }, { name: "Library", utilization: 65, color: "#f59e0b" }, { name: "Auditorium", utilization: 45, color: "#ef4444" }]
  },
  reports: {
    activeCategory: "Academic Performance",
    categories: {
      "Academic Performance": [
        { id: "RP-001", title: "Semester-wise Performance Analysis", description: "Detailed breakdown of student performance across all semesters", period: "Spring 2026", badgeClass: "badge", fileSize: "4.2 MB" },
        { id: "RP-002", title: "Department Comparative Report", description: "Cross-departmental performance comparison and trends", period: "Academic Year 2025-26", badgeClass: "badge2", fileSize: "2.8 MB" },
        { id: "RP-003", title: "Course-wise Success Rate", description: "Pass/fail rates and grade distribution by course", period: "Spring 2026", badgeClass: "badge3", fileSize: "1.5 MB" },
        { id: "RP-004", title: "Student Progress Tracker", description: "Individual student academic progression reports", period: "Last 4 Semesters", badgeClass: "badge4", fileSize: "8.1 MB" }
      ],
      "Attendance": [
        { id: "ATT-001", title: "Monthly Attendance Summary", description: "Institution-wide attendance statistics by month", period: "March 2026", badgeClass: "badge", fileSize: "1.2 MB" },
        { id: "ATT-002", title: "Low Attendance Alert Report", description: "Students with attendance below 75% threshold", period: "Current Semester", badgeClass: "badge2", fileSize: "0.8 MB" },
        { id: "ATT-003", title: "Department-wise Attendance", description: "Comparative attendance analysis across departments", period: "Spring 2026", badgeClass: "badge3", fileSize: "2.5 MB" }
      ],
      "Outcomes Assessment": [
        { id: "OUT-001", title: "Course Outcomes Attainment", description: "CO-wise attainment levels across all courses", period: "Spring 2026", badgeClass: "badge", fileSize: "3.5 MB" },
        { id: "OUT-002", title: "Program Outcomes Assessment", description: "Comprehensive PO attainment and gap analysis", period: "Academic Year 2025-26", badgeClass: "badge2", fileSize: "5.2 MB" },
        { id: "OUT-003", title: "Accreditation Readiness Report", description: "NBA/NAAC compliance and outcomes documentation", period: "Last 3 Years", badgeClass: "badge3", fileSize: "12.4 MB" }
      ],
      "Resource Allocation": [
        { id: "RES-001", title: "Facility Utilization Report", description: "Usage statistics for labs, classrooms, and facilities", period: "Current Month", badgeClass: "badge", fileSize: "1.9 MB" },
        { id: "RES-002", title: "Faculty Workload Distribution", description: "Teaching load and course allocation analysis", period: "Spring 2026", badgeClass: "badge2", fileSize: "2.4 MB" },
        { id: "RES-003", title: "Equipment Maintenance Audit", description: "Inventory and health status of laboratory equipment", period: "Q1 2026", badgeClass: "badge3", fileSize: "3.1 MB" }
      ]
    }
  },
  eventScheduler: {
    events: [
      { id: 1, title: "Faculty Development Program", type: "training", badgeClass: "badge", dateTime: "March 15, 2026 • 09:00 AM", venue: "Seminar Hall A", description: "Pedagogical innovations workshop." },
      { id: 2, title: "Department Head Meeting", type: "meeting", badgeClass: "badge2", dateTime: "March 18, 2026 • 02:00 PM", venue: "Conference Room", description: "Curriculum review." },
      { id: 3, title: "Mid-Semester Review", type: "review", badgeClass: "badge3", dateTime: "March 22, 2026 • 10:00 AM", venue: "Main Auditorium", description: "Performance analysis." },
      { id: 4, title: "Research Symposium", type: "event", badgeClass: "badge4", dateTime: "March 28, 2026 • 09:00 AM", venue: "Convention Center", description: "BTP Showcase." }
    ],
    options: { eventTypes: ["Training", "Meeting", "Review", "Event"], venues: ["Seminar Hall A", "Conference Room", "Main Auditorium", "Convention Center"] }
  },
  resources: {
    facilities: [
      { id: "RES-001", name: "Computer Lab 1", type: "Lab", typeClass: "badge", capacity: "60 seats", status: "available", statusClass: "badge2", equipment: ["PCs", "Projector", "WiFi"], nextScheduled: "Mar 8, 10:00 AM" },
      { id: "RES-002", name: "Seminar Hall A", type: "Hall", typeClass: "badge3", capacity: "120 seats", status: "occupied", statusClass: "badge4", equipment: ["Sound", "Lighting"], nextScheduled: "Currently in use" },
      { id: "RES-005", name: "Auditorium", type: "Hall", typeClass: "badge9", capacity: "500 seats", status: "maintenance", statusClass: "badge10", equipment: ["Stage", "Digital Display"], nextScheduled: "Under Maintenance" }
    ]
  },
  feeCompliance: {
    summary: { totalDefaulters: 6, totalOutstanding: "₹235,000", remindersSent: 24, monthPaidCount: 12 },
    defaulters: [
      { id: "CS001", rollNumber: "CSE2101", name: "Rahul Sharma", department: "CSE", semester: "VI", email: "rahul.sharma@college.edu", dueAmount: 45000, daysOverdue: 45, lastReminder: "Feb 15", deptBadgeClass: "badge", overdueBadgeClass: "badge2", history: [{ installment: "1st", status: "Paid" }, { installment: "2nd", status: "Pending" }] },
      { id: "CS002", rollNumber: "ECE2105", name: "Priya Patel", department: "ECE", semester: "IV", email: "priya.patel@college.edu", dueAmount: 32000, daysOverdue: 30, lastReminder: "Feb 20", deptBadgeClass: "badge3", overdueBadgeClass: "badge4", history: [{ installment: "1st", status: "Paid" }] }
    ]
  },
  userManagement: {
    users: [
      { id: "U001", name: "Pranjal", email: "pranjal@example.com", role: "Admin", roleClass: "badge", status: "active", statusClass: "badge2" },
      { id: "U002", name: "Faham", email: "jane.smith@example.com", role: "Faculty", roleClass: "badge3", status: "active", statusClass: "badge2" },
      { id: "U003", name: "Harshini", email: "alice.johnson@example.com", role: "Student", roleClass: "badge5", status: "active", statusClass: "badge2" }
    ]
  },
  attendanceOverride: {
    records: [
      { id: "O1", name: "Shams",   roll: "12345", date: "March 15, 2026", status: "present", reason: "Medical" },
      { id: "O2", name: "Omkar",   roll: "12346", date: "March 15, 2026", status: "absent",  reason: "Unexcused" },
      { id: "O3", name: "Pranjal", roll: "12347", date: "March 15, 2026", status: "present", reason: "Event" }
    ],
    correctionRequests: [
      { id: "CR001", studentName: "Faham", studentId: "S20240010146", course: "Database Management Systems", courseCode: "CS301", date: "2026-03-10", reason: "Was attending a university event — have proof", status: "pending", submittedOn: "2026-03-11" },
      { id: "CR002", studentName: "Pranjal", studentId: "S20240010147", course: "Machine Learning", courseCode: "CS302", date: "2026-03-05", reason: "Medical appointment — doctor's note attached", status: "pending", submittedOn: "2026-03-06" },
      { id: "CR003", studentName: "Harshini", studentId: "S20240010085", course: "Operating Systems", courseCode: "CS304", date: "2026-03-08", reason: "Internet connectivity issues during online class", status: "approved", submittedOn: "2026-03-09", decidedOn: "2026-03-10" }
    ]
  },
  settings: {
    account: { email: "head.academic@university.edu", userId: "ADMIN_H2023", role: "Academic Head", accountCreated: "January 15, 2023" },
    notifications: { channels: { email: true, push: true }, types: { attendanceAlerts: true, gradeUpdates: false, forumReplies: false, systemAnnouncements: true } },
    security: { requirement: "At least 8 characters long" }
  }
};

// ==========================================
// 4. SUPER USER PORTAL DATA
// ==========================================
const superuserMockDatabase = {
  metrics: {
    totalUsers: 8,
    activeSessions: 5,
    openBugs: 4,
    serverUptime: "99.98%"
  },
  users: [
    { id: "USR-0001", name: "Pranjal Sharma",       email: "pranjal@university.edu",          role: "superuser", status: "active" },
    { id: "USR-0002", name: "Dr. Kavitha Nair",      email: "kavitha.nair@university.edu",     role: "head",      status: "active" },
    { id: "USR-0003", name: "Dr. Mallikarjun Reddy", email: "m.reddy@university.edu",          role: "faculty",   status: "active" },
    { id: "USR-1042", name: "Rahul Sharma",          email: "rahul.cse2101@university.edu",    role: "student",   status: "active" },
    { id: "USR-1043", name: "Amit Kumar",            email: "amit.me2108@university.edu",      role: "student",   status: "suspended" },
    { id: "USR-0089", name: "Dr. Anitha Rajan",      email: "a.rajan@university.edu",          role: "faculty",   status: "inactive" },
    { id: "USR-0010", name: "Suresh Babu",           email: "suresh.admin@university.edu",     role: "admin",     status: "active" },
    { id: "USR-1204", name: "Sneha Mehta",           email: "sneha.ece2112@university.edu",    role: "student",   status: "pending" }
  ],
  systemLogs: [
    { level: "error", title: "Database connection timeout — pool exhausted (postgres:5432)", meta: "src/db/pool.js:147 · PID 8821 · 2026-03-30", time: "01:32:04" },
    { level: "error", title: "Email delivery failed — SMTP auth rejected",                   meta: "src/services/mailer.js:62 · PID 8804 · 2026-03-30",   time: "01:18:51" },
    { level: "warn",  title: "JWT token expiry approaching for 14 sessions",                 meta: "src/auth/middleware.js:89 · 2026-03-30",               time: "01:05:22" },
    { level: "error", title: "File upload rejected — MIME type mismatch (.exe blocked)",     meta: "src/api/uploads.js:34 · User USR-1043 · 2026-03-30",   time: "00:47:13" },
    { level: "info",  title: "Nightly backup completed — 4.2 GB written to S3",             meta: "src/jobs/backup.js · 2026-03-30",                      time: "00:00:03" },
    { level: "ok",    title: "SSL certificate auto-renewed — valid until 2027-03-30",        meta: "certbot · 2026-03-29",                                 time: "23:58:00" }
  ],
  bugReports: [
    { id: "BUG-001", title: "Attendance not updating after manual override", description: "When a faculty member marks attendance, the student portal doesn't reflect the change until hard refresh.", category: "Bug", severity: "High", submittedBy: "Faculty Portal", submitter: "Dr. Mallikarjun Reddy", submittedAt: "2026-03-29 14:22", status: "open", assignedTo: null },
    { id: "BUG-002", title: "Leave application modal closes unexpectedly", description: "Clicking outside the leave application form dismisses it without warning, causing data loss.", category: "UX Issue", severity: "Medium", submittedBy: "Student Portal", submitter: "Faham", submittedAt: "2026-03-28 09:15", status: "in-progress", assignedTo: "Dev Team" },
    { id: "BUG-003", title: "Sidebar navigation gets stuck on mobile", description: "The sidebar overlay does not close properly on iOS Safari. Tapping the overlay sometimes requires multiple taps.", category: "Bug", severity: "Low", submittedBy: "Academic Head Portal", submitter: "Pranjal", submittedAt: "2026-03-27 16:45", status: "resolved", assignedTo: "Dev Team" }
  ],
  globalSettings: {
    platformName: "BarelyPassing LMS",
    institutionName: "Example University",
    activeSemester: "Spring 2026",
    academicYear: "2025-26"
  }
};

// ==========================================
// LOCAL STORAGE INITIALIZATION
// ==========================================

// Increment this when the data schema changes to force a re-seed.
const DB_VERSION = 3;

// In-memory database (source of truth from mockdata.js)
let inMemoryDB = null;

function initDatabase() {
    const existing = localStorage.getItem('ffsd');
    const versionKey = 'ffsd_v';
    const storedVersion = parseInt(localStorage.getItem(versionKey) || '0', 10);

    // Always initialize in-memory DB from mockdata
    inMemoryDB = {
        student:    studentMockDatabase,
        faculty:    facultyMockDatabase,
        admin:      academicHeadMockDatabase,
        superuser:  superuserMockDatabase
    };

    // Only seed localStorage if no data exists OR if the schema version changed.
    if (!existing || storedVersion !== DB_VERSION) {
        localStorage.setItem('ffsd', JSON.stringify(inMemoryDB));
        localStorage.setItem(versionKey, String(DB_VERSION));
        console.log("Database seeded from mockdata.js (version " + DB_VERSION + ").");
    } else {
        console.log("Database already seeded (version " + DB_VERSION + "). Using existing data.");
    }
}

// Run the initialization immediately
initDatabase();

// ==========================================
// DEBUG / RESET FUNCTIONS
// ==========================================

/**
 * Reset database to default mock data from mockdata.js
 * Call resetDatabase() in browser console to force reset
 */
function resetDatabase() {
    localStorage.removeItem('ffsd');
    localStorage.removeItem('ffsd_v');
    
    // Re-initialize from mockdata
    inMemoryDB = {
        student:    studentMockDatabase,
        faculty:    facultyMockDatabase,
        admin:      academicHeadMockDatabase,
        superuser:  superuserMockDatabase
    };
    
    localStorage.setItem('ffsd', JSON.stringify(inMemoryDB));
    localStorage.setItem('ffsd_v', String(DB_VERSION));
    
    console.log('Database reset to mockdata.js defaults');
    console.log('Current DB:', inMemoryDB);
    return inMemoryDB;
}

// ==========================================
// CRUD HELPER FUNCTIONS (For the whole team to use)
// ==========================================

// Get the entire current state of the database (from localStorage)
function getDB() {
    const data = localStorage.getItem('ffsd');
    if (!data) {
        console.warn('Database empty! Re-initializing from mockdata.js...');
        initDatabase();
        return JSON.parse(localStorage.getItem('ffsd'));
    }
    return JSON.parse(data);
}

// Save the database after making a change (to localStorage)
function saveDB(data) {
    localStorage.setItem('ffsd', JSON.stringify(data));
    // Also update in-memory copy
    inMemoryDB = data;
}

// Get the original mockdata (read-only reference)
function getMockData() {
    return {
        student:    studentMockDatabase,
        faculty:    facultyMockDatabase,
        admin:      academicHeadMockDatabase,
        superuser:  superuserMockDatabase
    };
}

// ==========================================
// BUG REPORT HELPERS
// ==========================================

/**
 * Submit a bug report from any portal.
 * @param {string} title       - Short title of the bug
 * @param {string} description - Detailed description
 * @param {string} category    - 'Bug' | 'Feature Request' | 'UX Issue' | 'Performance'
 * @param {string} severity    - 'Low' | 'Medium' | 'High' | 'Critical'
 * @param {string} portalName  - e.g. 'Student Portal'
 * @param {string} submitterName - Name of the logged-in user
 * @returns {object} The newly created bug report object
 */
function submitBugReport({ title, description, category, severity, portalName, submitterName }) {
    const db = getDB();
    const reports = db.superuser.bugReports || [];
    const newId = 'BUG-' + String(reports.length + 1).padStart(3, '0');
    const now = new Date();
    const timestamp = now.getFullYear() + '-'
        + String(now.getMonth()+1).padStart(2,'0') + '-'
        + String(now.getDate()).padStart(2,'0') + ' '
        + String(now.getHours()).padStart(2,'0') + ':'
        + String(now.getMinutes()).padStart(2,'0');
    const report = {
        id: newId,
        title,
        description,
        category,
        severity,
        submittedBy: portalName,
        submitter: submitterName,
        submittedAt: timestamp,
        status: 'open',
        assignedTo: null
    };
    db.superuser.bugReports = [report, ...reports]; // newest first
    saveDB(db);
    return report;
}

/**
 * Get all bug reports (for the superuser panel).
 * @returns {Array} Array of bug report objects
 */
function getBugReports() {
    return (getDB().superuser.bugReports) || [];
}

/**
 * Update the status / assignee of a bug report.
 * @param {string} id     - Bug report ID (e.g. 'BUG-001')
 * @param {object} patch  - Fields to update: { status, assignedTo }
 */
function updateBugReport(id, patch) {
    const db = getDB();
    const idx = (db.superuser.bugReports || []).findIndex(r => r.id === id);
    if (idx !== -1) {
        db.superuser.bugReports[idx] = { ...db.superuser.bugReports[idx], ...patch };
        saveDB(db);
    }
}

// ==========================================
// AUTHENTICATION HELPERS
// ==========================================

/**
 * Validate user credentials and return user info
 * @param {string} email 
 * @param {string} password 
 * @returns {object|null} User info if valid, null otherwise
 */
function authenticateUser(email, password) {
    const user = userCredentials.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (user) {
        return {
            email: user.email,
            name: user.name,
            role: user.role
        };
    }
    return null;
}

/**
 * Get the currently logged in user from session storage
 * @returns {object|null}
 */
function getCurrentUser() {
    const userStr = sessionStorage.getItem('currentUser');
    return userStr ? JSON.parse(userStr) : null;
}

/**
 * Set the current user in session storage
 * @param {object} user 
 */
function setCurrentUser(user) {
    sessionStorage.setItem('currentUser', JSON.stringify(user));
}

/**
 * Clear the current user from session storage
 */
function clearCurrentUser() {
    sessionStorage.removeItem('currentUser');
}

/**
 * Get the redirect URL for a given role
 * @param {string} role 
 * @returns {string}
 */
function getRedirectForRole(role) {
    const redirects = {
        'student': 'student.html',
        'faculty': 'faculty.html',
        'head': 'head.html',
        'admin': 'superuser.html',  // Admin goes to superuser portal
        'superuser': 'superuser.html'
    };
    return redirects[role] || 'student.html';
}

/**
 * Handle logout - clear session and redirect to login
 */
function handleLogout() {
    clearCurrentUser();
    window.location.href = 'login.html';
}