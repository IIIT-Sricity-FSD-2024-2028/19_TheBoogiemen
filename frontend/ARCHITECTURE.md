# BarelyPassing - Technical Architecture Documentation

## Project Overview

**BarelyPassing** is a strategic academic monitoring system that provides real-time visibility into student progress, attendance, and outcome attainment. It's a frontend-only prototype with localStorage-based data persistence.

---

## Table of Contents

1. [Project Structure](#project-structure)
2. [Architecture Overview](#architecture-overview)
3. [Data Layer](#data-layer)
4. [Authentication System](#authentication-system)
5. [Portal Modules](#portal-modules)
6. [CRUD Operations](#crud-operations)
7. [Component Breakdown](#component-breakdown)
8. [Event System](#event-system)
9. [Storage Mechanism](#storage-mechanism)
10. [Security Considerations](#security-considerations)

---

## Project Structure

```
frontend/
├── index.html              # Landing page
├── login.html              # Authentication page
├── student.html            # Student portal
├── faculty.html            # Faculty portal
├── head.html               # Academic Head portal
├── superuser.html          # Super Admin portal
├── CREDENTIALS.md          # Login credentials reference
├── css/
│   ├── shared.css          # Common styles (CSS variables, reset)
│   ├── index.css           # Landing page styles
│   ├── login.css           # Login page styles
│   ├── student.css         # Student portal styles
│   ├── faculty.css         # Faculty portal styles
│   ├── head.css            # Academic Head portal styles
│   └── superuser.css       # Super Admin portal styles
└── js/
    ├── mockdata.js         # Database schema + CRUD helpers + Auth
    ├── index.js            # Landing page animations
    ├── login.js            # Authentication logic
    ├── student.js          # Student portal logic
    ├── faculty.js          # Faculty portal logic
    ├── head.js             # Academic Head portal logic
    └── superuser.js        # Super Admin portal logic
```

---

## Architecture Overview

### Design Pattern: Model-View-Controller (MVC) Variant

```
┌─────────────────────────────────────────────────────────────┐
│                        VIEW LAYER                           │
│  (HTML Files + CSS - User Interface & Interaction)          │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                    CONTROLLER LAYER                         │
│  (*.js files - Event handlers, UI logic, Validation)        │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                      MODEL LAYER                            │
│  (mockdata.js - Data structure, CRUD operations, Auth)      │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                    STORAGE LAYER                            │
│  (localStorage - Persistent client-side storage)            │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Action → Event Listener → Controller Function → getDB()
                                                        ↓
UI Update ← saveDB() ← Data Modification ← localStorage
```

---

## Data Layer

### mockdata.js - Core Database Module

#### 1. User Credentials System

```javascript
const userCredentials = [
  { email: 'student@iiits.in', password: 'password', role: 'student', name: 'Faham' },
  { email: 'faculty@iiits.in', password: 'password', role: 'faculty', name: 'Dr. Shams' },
  { email: 'head@iiits.in', password: 'password', role: 'head', name: 'Dr. Kavitha' },
  { email: 'admin@iiits.in', password: 'password', role: 'admin', name: 'System Admin' },
  { email: 'superuser@iiits.in', password: 'password', role: 'superuser', name: 'Pranjal Sharma' }
];
```

**Purpose:** Centralized authentication credentials for all user roles.

#### 2. Database Schema (Four Portal Databases)

##### A. Student Database (`studentMockDatabase`)

```javascript
{
  analytics: {
    student: { name, semester, predictedGrade, overallCompletion },
    modules: [{ id, name, completedTopics, totalTopics, percentage }],
    courseOutcomes: [{ label, score }],
    assessments: [{ qId, co, marks, max, alert }]
  },
  profile: {
    academic: {
      studentId, academicYear, department, school, section,
      batch, cgpa, attendance, year, branch, semester, term,
      currentCourses: [{ id, course, instructor, grade, attendance, progress, status }]
    },
    personal: { fullName, email, phone, dob, gender, nationality, bloodGroup },
    emergencyContact: { number, contactPerson, relationship, email }
  },
  timetable: {
    stats: { totalClasses, lectures, labs, freePeriods },
    schedule: [{ time, days: { monday, tuesday, ... } }]
  },
  courses: {
    summary: { enrolledCount, pendingAssignments, averageGrade },
    list: [{ id, code, title, instructor, grade, credits, attendance, assignmentsPending }]
  },
  attendanceTracker: {
    activeSubject: { id, name, instructor, percentage, ratio, weeks: [...] },
    allSubjects: [{ id, code, name, instructor, percent, ratio }]
  },
  leaveManagement: {
    stats: { total, approved, pending, rejected },
    applications: [{ id, type, reason, startDate, endDate, status, duration }]
  },
  forum: {
    threads: [{ id, lectureTag, title, author, replies, timestamp }]
  },
  research: {
    project: { title, type, guide, stats },
    milestones: [{ id, title, status, date, description }]
  },
  settings: {
    account: { email, userId, role },
    notifications: { channels, types }
  }
}
```

##### B. Faculty Database (`facultyMockDatabase`)

```javascript
{
  dashboard: {
    stats: { totalStudents, lowAttendanceCount, atRiskCount, classesThisWeek },
    atRiskStudents: [{ id, name, attendance, avgScore, riskLevel }],
    interventionLog: [{ id, studentName, date, time, agenda, status }]
  },
  timetable: {
    stats: { totalClasses, lectures, labs, subjects },
    schedule: [{ time, days: { monday, tuesday, ... } }],
    courseSummaries: [{ code, title, years, totalStudents, hours }]
  },
  assessmentMapping: {
    metadata: { title, course, totalMarks },
    availableOutcomes: {
      cos: [{ id, text }],
      pos: [{ id, text }]
    },
    questions: [{ id, name, marks, text, mappedCOs, mappedPOs }]
  },
  attendanceMarking: {
    classes: [{ id, code, name, year, section, studentCount }],
    students: [{ id, name, isPresent, overallAttendance, alert }],
    session: { date, presentCount },
    history: [{ classId, date, records, presentCount, totalStudents }]
  },
  studentOverview: {
    students: [{ id, name, attendance, avgScore, status, progress, activities }],
    filters: [...]
  },
  forum: {
    summary: { totalDiscussions, resolvedCount, needsResponseCount },
    threads: [{ id, lecture, status, title, author, replyCount, comments }]
  },
  researchSupervision: {
    summary: { totalProjects, inProgress, underReview, avgProgress },
    projects: [{ id, title, studentName, status, progress, submissions }]
  },
  profile: {
    account: { name, email, role, dept, employeeId }
  }
}
```

##### C. Academic Head Database (`academicHeadMockDatabase`)

```javascript
{
  dashboard: {
    institutionalStats: { totalStudents, facultyMembers, activeCourses, avgAttainment },
    departments: [{ id, name, students, passRate, activeCourses }],
    attendanceTrends: [{ month, rate }],
    outcomeAttainment: [{ po, score }],
    resourceUsage: [{ name, utilization, color }]
  },
  reports: {
    activeCategory: string,
    categories: {
      "Academic Performance": [{ id, title, description, period, fileSize }],
      "Attendance": [...],
      "Outcomes Assessment": [...],
      "Resource Allocation": [...]
    }
  },
  eventScheduler: {
    events: [{ id, title, type, dateTime, venue, description }],
    options: { eventTypes, venues }
  },
  resources: {
    facilities: [{ id, name, type, capacity, status, nextScheduled }]
  },
  feeCompliance: {
    summary: { totalDefaulters, totalOutstanding, remindersSent },
    defaulters: [{ id, rollNumber, name, department, dueAmount, daysOverdue }]
  },
  userManagement: {
    users: [{ id, name, email, role, status }]
  },
  attendanceOverride: {
    records: [{ id, name, roll, date, status, reason }]
  },
  settings: {
    account: { email, userId, role },
    notifications: { channels, types }
  }
}
```

##### D. Superuser Database (`superuserMockDatabase`)

```javascript
{
  metrics: {
    totalUsers, activeSessions, openBugs, serverUptime
  },
  users: [
    { id, name, email, role, status }
  ],
  systemLogs: [
    { level, title, meta, time }
  ],
  bugReports: [
    { id, title, description, category, severity, submittedBy, status, assignedTo }
  ],
  globalSettings: {
    platformName, institutionName, activeSemester, academicYear
  }
}
```

#### 3. Database Initialization

```javascript
const DB_VERSION = 2;
let inMemoryDB = null;

function initDatabase() {
    const existing = localStorage.getItem('ffsd');
    const versionKey = 'ffsd_v';
    const storedVersion = parseInt(localStorage.getItem(versionKey) || '0', 10);

    // Initialize in-memory DB from mockdata constants
    inMemoryDB = {
        student: studentMockDatabase,
        faculty: facultyMockDatabase,
        admin: academicHeadMockDatabase,
        superuser: superuserMockDatabase
    };

    // Seed localStorage only if empty or version mismatch
    if (!existing || storedVersion !== DB_VERSION) {
        localStorage.setItem('ffsd', JSON.stringify(inMemoryDB));
        localStorage.setItem(versionKey, String(DB_VERSION));
    }
}

initDatabase(); // Auto-execute on load
```

**Key Points:**
- Version control ensures schema updates trigger re-seeding
- In-memory copy for fast reads
- localStorage for persistence across sessions

#### 4. CRUD Helper Functions

```javascript
// READ - Get entire database
function getDB() {
    const data = localStorage.getItem('ffsd');
    if (!data) {
        initDatabase();
        return JSON.parse(localStorage.getItem('ffsd'));
    }
    return JSON.parse(data);
}

// WRITE - Save database after changes
function saveDB(data) {
    localStorage.setItem('ffsd', JSON.stringify(data));
    inMemoryDB = data; // Sync in-memory copy
}

// DEBUG - Reset to mockdata defaults
function resetDatabase() {
    localStorage.removeItem('ffsd');
    localStorage.removeItem('ffsd_v');
    inMemoryDB = {
        student: studentMockDatabase,
        faculty: facultyMockDatabase,
        admin: academicHeadMockDatabase,
        superuser: superuserMockDatabase
    };
    localStorage.setItem('ffsd', JSON.stringify(inMemoryDB));
    localStorage.setItem('ffsd_v', String(DB_VERSION));
    return inMemoryDB;
}
```

---

## Authentication System

### Authentication Flow

```
┌──────────────┐
│ Login Page   │
│ (login.html) │
└──────┬───────┘
       │ User enters credentials
       ↓
┌─────────────────────────────┐
│ login.js                    │
│ handleLogin(event)          │
│ 1. Validate form inputs     │
│ 2. Call authenticateUser()  │
└──────┬──────────────────────┘
       │
       ↓
┌─────────────────────────────┐
│ mockdata.js                 │
│ authenticateUser(email, pw) │
│ - Find matching credential  │
│ - Return user object        │
└──────┬──────────────────────┘
       │
       ↓
┌─────────────────────────────┐
│ login.js                    │
│ 1. Verify role match        │
│ 2. setCurrentUser(user)     │
│ 3. getRedirectForRole()     │
│ 4. window.location.href     │
└──────┬──────────────────────┘
       │
       ↓
┌──────────────────┐
│ Target Portal    │
│ (e.g., student)  │
└──────────────────┘
```

### Authentication Functions

#### 1. Login Validation

```javascript
function authenticateUser(email, password) {
    const user = userCredentials.find(u => 
        u.email.toLowerCase() === email.toLowerCase() && 
        u.password === password
    );
    
    if (user) {
        return {
            email: user.email,
            name: user.name,
            role: user.role
        };
    }
    return null; // Invalid credentials
}
```

#### 2. Session Management

```javascript
// Store user session
function setCurrentUser(user) {
    sessionStorage.setItem('currentUser', JSON.stringify(user));
}

// Retrieve current user
function getCurrentUser() {
    const userStr = sessionStorage.getItem('currentUser');
    return userStr ? JSON.parse(userStr) : null;
}

// Clear session (logout)
function clearCurrentUser() {
    sessionStorage.removeItem('currentUser');
}

// Logout handler
function handleLogout() {
    clearCurrentUser();
    window.location.href = 'login.html';
}
```

#### 3. Role-Based Routing

```javascript
function getRedirectForRole(role) {
    const redirects = {
        'student': 'student.html',
        'faculty': 'faculty.html',
        'head': 'head.html',
        'admin': 'superuser.html',    // Admin → Superuser portal
        'superuser': 'superuser.html'
    };
    return redirects[role] || 'student.html';
}
```

#### 4. Portal Authentication Guards

Each portal checks authentication on load:

```javascript
// student.js
(function checkAuth() {
  const currentUser = getCurrentUser();
  if (!currentUser || currentUser.role !== 'student') {
    window.location.href = 'login.html';
    return;
  }
})();

// faculty.js
(function checkAuth() {
  const currentUser = getCurrentUser();
  if (!currentUser || (currentUser.role !== 'faculty' && currentUser.role !== 'superuser')) {
    window.location.href = 'login.html';
    return;
  }
})();

// head.js
(function checkAuth() {
  const currentUser = getCurrentUser();
  if (!currentUser || (currentUser.role !== 'head' && currentUser.role !== 'admin' && currentUser.role !== 'superuser')) {
    window.location.href = 'login.html';
    return;
  }
})();

// superuser.js
(function checkAuth() {
  const currentUser = getCurrentUser();
  if (!currentUser || (currentUser.role !== 'superuser' && currentUser.role !== 'admin')) {
    window.location.href = 'login.html';
    return;
  }
})();
```

**Access Matrix:**

| Portal | Allowed Roles |
|--------|--------------|
| Student | `student` |
| Faculty | `faculty`, `superuser` |
| Head | `head`, `admin`, `superuser` |
| Superuser | `superuser`, `admin` |

---

## Portal Modules

### 1. Landing Page (`index.js`)

**Purpose:** Marketing page with animations and feature showcase.

**Key Features:**
- Scroll-triggered reveal animations
- 3D tilt effects on cards
- Interactive hero background glow
- Magnetic button hover effects
- Number count-up animations
- Dynamic navbar with blur effect

**Code Structure:**
```javascript
document.addEventListener("DOMContentLoaded", () => {
  // 1. Intersection Observer for scroll reveals
  const observer = new IntersectionObserver((entries) => {...});
  
  // 2. 3D Tilt on hover
  tiltElements.forEach(el => {
    el.addEventListener('mousemove', (e) => {...});
  });
  
  // 3. Hero glow follows cursor
  hero.addEventListener('mousemove', (e) => {...});
  
  // 4. Magnetic buttons
  magneticBtns.forEach(btn => {...});
  
  // 5. Number count-up animation
  const numObserver = new IntersectionObserver((entries) => {...});
  
  // 6. Navbar scroll effect
  window.addEventListener('scroll', () => {...});
});
```

### 2. Login Page (`login.js`)

**Purpose:** Role-based authentication.

**Key Features:**
- Dynamic form based on selected role
- Real-time validation
- Credential verification
- Session creation
- Role-based routing

**Code Structure:**
```javascript
document.addEventListener('DOMContentLoaded', function() {
  const roleData = { student: {...}, faculty: {...}, ... };
  
  function switchForm(role) {
    // Update form UI based on role
  }
  
  function validateForm(cfg) {
    // Field validation
  }
  
  function handleLogin(event) {
    event.preventDefault();
    const user = authenticateUser(email, password);
    if (!user) { /* show error */ return; }
    if (user.role !== selectedRole) { /* show error */ return; }
    setCurrentUser(user);
    window.location.href = getRedirectForRole(user.role);
  }
});
```

### 3. Student Portal (`student.js`)

**Purpose:** Student academic dashboard.

**Key Features:**
- Dashboard with CGPA & attendance stats
- Syllabus completion tracker
- Course-wise performance view
- Attendance heatmap
- Leave application system
- Discussion forum
- Research milestone tracking

**CRUD Operations:**
```javascript
// CREATE: Leave Application
function handleLeave() {
  const db = getDB();
  db.student.leaveManagement.applications.unshift({
    id: db.student.leaveManagement.applications.length + 1,
    type: document.getElementById('l-type').value,
    reason: document.getElementById('l-reason').value,
    startDate: document.getElementById('l-start').value,
    endDate: document.getElementById('l-end').value,
    status: 'Pending',
    appliedOn: new Date().toLocaleDateString()
  });
  saveDB(db);
  _refresh();
}

// CREATE: Forum Thread
function handleThread() {
  const db = getDB();
  db.student.forum.threads.unshift({
    id: db.student.forum.threads.length + 1,
    lectureTag: document.getElementById('t-tag').value,
    title: document.getElementById('t-title').value,
    author: db.student.profile.personal.fullName,
    replies: 0,
    timestamp: 'Just now'
  });
  saveDB(db);
  _refresh();
}

// CREATE: Research Milestone
function handleMilestone() {
  const db = getDB();
  db.student.research.milestones.push({
    id: db.student.research.milestones.length + 1,
    title: document.getElementById('m-title').value,
    date: document.getElementById('m-date').value,
    description: document.getElementById('m-desc').value,
    status: 'upcoming'
  });
  saveDB(db);
  _refresh();
}

// CREATE: Bug Report
function handleBug() {
  const db = getDB();
  db.superuser.bugReports.unshift({
    id: 'BUG-S' + (db.superuser.bugReports.length + 1),
    title: document.getElementById('bugTitle').value,
    description: document.getElementById('bugDesc').value,
    severity: document.getElementById('bugSev').value,
    submittedBy: 'Student Portal',
    submitter: db.student.profile.personal.fullName,
    status: 'open'
  });
  saveDB(db);
}
```

### 4. Faculty Portal (`faculty.js`)

**Purpose:** Faculty course management.

**Key Features:**
- At-risk student alerts
- Attendance marking
- CO/PO outcome mapping
- Student directory
- Discussion forum moderation
- Research supervision

**CRUD Operations:**
```javascript
// CREATE: Schedule Meeting
function handleSchedule() {
  const db = getDB();
  const meeting = {
    id: Date.now(),
    studentName: document.getElementById('meet-stu').value,
    date: document.getElementById('meet-date').value,
    time: document.getElementById('meet-time').value,
    agenda: document.getElementById('meet-agenda').value,
    status: 'scheduled'
  };
  db.faculty.dashboard.interventionLog.push(meeting);
  saveDB(db);
}

// CREATE: Attendance Record
function handleSaveAttendance() {
  const records = [];
  document.querySelectorAll('.att-student-row').forEach(row => {
    records.push({
      id: row.dataset.id,
      isPresent: row.querySelector('.present').classList.contains('active')
    });
  });
  
  const db = getDB();
  const attendanceRecord = {
    classId: document.getElementById('classSelect').value,
    date: new Date().toLocaleDateString(),
    timestamp: new Date().toISOString(),
    records: records,
    presentCount: records.filter(r => r.isPresent).length,
    totalStudents: records.length
  };
  
  if (!db.faculty.attendanceMarking.history) {
    db.faculty.attendanceMarking.history = [];
  }
  db.faculty.attendanceMarking.history.unshift(attendanceRecord);
  saveDB(db);
}

// CREATE: Bug Report
function handleBugSubmit() {
  const db = getDB();
  const bug = {
    id: 'BUG-' + (db.superuser.bugReports.length + 1),
    title: document.getElementById('bugTitle').value,
    description: document.getElementById('bugDesc').value,
    severity: document.getElementById('bugSev').value,
    submittedBy: 'Faculty Portal',
    submitter: db.faculty.profile.account.name,
    status: 'open'
  };
  db.superuser.bugReports.unshift(bug);
  saveDB(db);
}
```

### 5. Academic Head Portal (`head.js`)

**Purpose:** Institutional oversight.

**Key Features:**
- Department performance comparison
- Report generation
- Event scheduling
- Resource management
- Fee compliance tracking
- Attendance override

**CRUD Operations:**
```javascript
// CREATE: Event
function handleAddEvent() {
  const db = getDB();
  const newEv = {
    id: _nextId(db.admin.eventScheduler.events),
    title: document.getElementById('ev-title').value,
    type: document.getElementById('ev-type').value,
    dateTime: `${document.getElementById('ev-date').value} at ${document.getElementById('ev-time').value}`,
    venue: document.getElementById('ev-venue').value,
    description: document.getElementById('ev-desc').value
  };
  db.admin.eventScheduler.events.push(newEv);
  saveDB(db);
}

// CREATE: Resource
function handleAddResource() {
  const db = getDB();
  const res = {
    id: 'RES-' + Math.floor(Math.random()*1000),
    name: document.getElementById('res-name').value,
    type: document.getElementById('res-type').value,
    capacity: document.getElementById('res-cap').value,
    status: 'available'
  };
  db.admin.resources.facilities.push(res);
  saveDB(db);
}

// CREATE: User
function handleAddUser() {
  const db = getDB();
  const user = {
    id: 'U-' + Math.floor(Math.random()*1000),
    name: document.getElementById('u-name').value,
    email: document.getElementById('u-email').value,
    role: document.getElementById('u-role').value,
    status: 'active'
  };
  db.admin.userManagement.users.push(user);
  saveDB(db);
}

// DELETE: Event/User/Resource/Override
function handleDeleteEvent(id) {
  const db = getDB();
  db.admin.eventScheduler.events = db.admin.eventScheduler.events.filter(e => e.id !== id);
  saveDB(db);
}
```

### 6. Superuser Portal (`superuser.js`)

**Purpose:** System administration.

**Key Features:**
- User provisioning (CRUD)
- System log monitoring
- Bug report management
- Global settings configuration

**CRUD Operations:**
```javascript
// CREATE: User
function handleAddUser() {
  const db = getDB();
  const nextId = 'USR-' + String(db.superuser.users.length + 1000);
  const user = {
    id: nextId,
    name: document.getElementById('u-name').value,
    email: document.getElementById('u-email').value,
    role: document.getElementById('u-role').value,
    status: document.getElementById('u-status').value
  };
  db.superuser.users.unshift(user);
  db.superuser.metrics.totalUsers = db.superuser.users.length;
  
  // Log the action
  db.superuser.systemLogs.unshift({
    level: 'info',
    title: `Provisioned ${user.role}: ${user.name}`,
    time: new Date().toLocaleTimeString('en-GB')
  });
  
  saveDB(db);
}

// UPDATE: User
function handleUpdateUser() {
  const id = document.getElementById('edit-id').value;
  const db = getDB();
  const idx = db.superuser.users.findIndex(u => u.id === id);
  
  db.superuser.users[idx] = {
    ...db.superuser.users[idx],
    name: document.getElementById('edit-name').value,
    email: document.getElementById('edit-email').value,
    role: document.getElementById('edit-role').value,
    status: document.getElementById('edit-status').value
  };
  saveDB(db);
}

// DELETE: User
function performDelete() {
  const db = getDB();
  db.superuser.users = db.superuser.users.filter(u => u.id !== _deletingId);
  db.superuser.metrics.totalUsers = db.superuser.users.length;
  saveDB(db);
}

// UPDATE: Bug Status
function setBugStatus(id, status) {
  updateBugReport(id, { status });
  _suRefresh('logs');
}

// UPDATE: Bug Assignment
function assignBug(id) {
  updateBugReport(id, { 
    assignedTo: 'Platform Dev Team', 
    status: 'in-progress' 
  });
}
```

---

## CRUD Operations

### Create Operations

| Portal | Entity | Function | Storage Path |
|--------|--------|----------|--------------|
| Student | Leave Application | `handleLeave()` | `db.student.leaveManagement.applications` |
| Student | Forum Thread | `handleThread()` | `db.student.forum.threads` |
| Student | Milestone | `handleMilestone()` | `db.student.research.milestones` |
| Student | Bug Report | `handleBug()` | `db.superuser.bugReports` |
| Faculty | Meeting | `handleSchedule()` | `db.faculty.dashboard.interventionLog` |
| Faculty | Attendance | `handleSaveAttendance()` | `db.faculty.attendanceMarking.history` |
| Faculty | Bug Report | `handleBugSubmit()` | `db.superuser.bugReports` |
| Head | Event | `handleAddEvent()` | `db.admin.eventScheduler.events` |
| Head | Resource | `handleAddResource()` | `db.admin.resources.facilities` |
| Head | User | `handleAddUser()` | `db.admin.userManagement.users` |
| Head | Override | `handleAddOverride()` | `db.admin.attendanceOverride.records` |
| Superuser | User | `handleAddUser()` | `db.superuser.users` |

### Read Operations

All portals use `getDB()` to retrieve data:

```javascript
const db = getDB();
const studentData = db.student;
const facultyData = db.faculty;
const adminData = db.admin;
const superuserData = db.superuser;
```

### Update Operations

| Portal | Entity | Function | Method |
|--------|--------|----------|--------|
| Superuser | User | `handleUpdateUser()` | Array index assignment |
| Superuser | Bug | `setBugStatus()` | `updateBugReport()` helper |
| Superuser | Bug | `assignBug()` | `updateBugReport()` helper |
| Head | Settings | `handleSaveConfig()` | Object assignment |

### Delete Operations

| Portal | Entity | Function | Method |
|--------|--------|----------|--------|
| Head | Event | `handleDeleteEvent()` | Array `.filter()` |
| Head | Resource | `handleDeleteResource()` | Array `.filter()` |
| Head | User | `handleDeleteUser()` | Array `.filter()` |
| Head | Override | `handleDeleteOverride()` | Array `.filter()` |
| Superuser | User | `performDelete()` | Array `.filter()` |

---

## Component Breakdown

### UI Controllers

#### Panel Switching
```javascript
function switchPanel(name, el) {
  // Remove active class from all panels
  document.querySelectorAll('.panel').forEach(p => 
    p.classList.remove('active')
  );
  
  // Add active class to target panel
  document.getElementById('panel-' + name).classList.add('active');
  
  // Update topbar title
  const titles = { 
    dashboard: 'Dashboard', 
    profile: 'Profile', 
    ...
  };
  document.getElementById('topbarTitle').textContent = titles[name];
}
```

#### Modal Management
```javascript
function showModal(id) { 
  document.getElementById(id).classList.add('show'); 
}

function closeModal(id) { 
  document.getElementById(id).classList.remove('show'); 
  clearErrors(id); 
}

function closeModalBg(e, id) { 
  if (e.target.id === id) closeModal(id); 
}
```

#### Toast Notifications
```javascript
let toastTimer;
function toast(msg) {
  const el = document.getElementById('toastEl');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}
```

#### Form Validation
```javascript
function validateForm(modalId, fields) {
  clearErrors(modalId);
  let isValid = true;
  
  fields.forEach(f => {
    const input = document.getElementById(f.id);
    const val = input.value.trim();
    let error = '';
    
    if (f.required && !val) error = 'This field is required.';
    else if (f.min && val.length < f.min) error = `Min ${f.min} chars`;
    else if (f.type === 'email' && !/^\S+@\S+\.\S+$/.test(val)) error = 'Invalid email';
    
    if (error) {
      isValid = false;
      const parent = input.closest('.form-field');
      parent.classList.add('has-error');
      const errEl = document.createElement('span');
      errEl.className = 'field-error';
      errEl.textContent = error;
      parent.appendChild(errEl);
    }
  });
  
  return isValid;
}
```

---

## Event System

### Custom Events for Reactivity

```javascript
// Student portal
function _refresh() {
  document.dispatchEvent(new CustomEvent('student:changed'));
}

// Faculty portal
function _refresh() {
  document.dispatchEvent(new CustomEvent('faculty:changed'));
}

// Head portal
function _headRefresh(section) {
  document.dispatchEvent(new CustomEvent('head:changed', { 
    detail: { section } 
  }));
}

// Superuser portal
function _suRefresh(section) {
  document.dispatchEvent(new CustomEvent('superuser:changed', { 
    detail: { section } 
  }));
}
```

### Event Listeners

```javascript
// Student
document.addEventListener('student:changed', initPage);

// Faculty
document.addEventListener('faculty:changed', initPage);

// Head
document.addEventListener('head:changed', (e) => {
  const s = e.detail.section;
  if (s === 'events') renderEvents();
  else if (s === 'resources') renderResources();
  else initPage();
});

// Superuser
document.addEventListener('superuser:changed', initPage);
```

---

## Storage Mechanism

### localStorage Structure

**Key:** `ffsd` (Frontend Full Stack Database)  
**Version Key:** `ffsd_v`

**Data Format:**
```json
{
  "student": { ... },
  "faculty": { ... },
  "admin": { ... },
  "superuser": { ... }
}
```

### sessionStorage Structure

**Key:** `currentUser`

**Data Format:**
```json
{
  "email": "student@iiits.in",
  "name": "Faham",
  "role": "student"
}
```

### Storage Operations

```javascript
// Write
localStorage.setItem('ffsd', JSON.stringify(data));
sessionStorage.setItem('currentUser', JSON.stringify(user));

// Read
const db = JSON.parse(localStorage.getItem('ffsd'));
const user = JSON.parse(sessionStorage.getItem('currentUser'));

// Delete
localStorage.removeItem('ffsd');
sessionStorage.removeItem('currentUser');
```

---

## Security Considerations

### Current Implementation (Demo/Prototype)

⚠️ **WARNING:** This is a frontend-only prototype with significant security limitations:

1. **Plain Text Passwords:**
   - Passwords stored in plain text in `mockdata.js`
   - No hashing or encryption

2. **Client-Side Auth:**
   - Authentication happens entirely in browser
   - No server-side validation
   - Session stored in sessionStorage (vulnerable to XSS)

3. **No Input Sanitization:**
   - User inputs not sanitized
   - Vulnerable to XSS attacks

4. **localStorage Exposure:**
   - All data visible in browser DevTools
   - No encryption at rest

5. **No Rate Limiting:**
   - No brute force protection
   - No account lockout

### Production Recommendations

For a production system, implement:

1. **Backend API:**
   - Node.js/Express or Python/Django
   - RESTful or GraphQL endpoints

2. **Database:**
   - PostgreSQL/MongoDB
   - Proper indexing and relations

3. **Authentication:**
   - JWT tokens with refresh rotation
   - bcrypt/argon2 password hashing
   - OAuth2/SAML for SSO

4. **Security:**
   - HTTPS/TLS encryption
   - CSRF protection
   - Input validation & sanitization
   - Rate limiting
   - CORS policies

5. **Authorization:**
   - RBAC middleware
   - Permission-based access
   - Audit logging

---

## Testing & Debugging

### Console Commands

```javascript
// Reset database to mockdata defaults
resetDatabase()

// View current database
getDB()

// View current user
getCurrentUser()

// View specific portal data
const db = getDB();
db.student
db.faculty
db.admin
db.superuser

// View bug reports
getBugReports()

// Submit test bug
submitBugReport({
  title: 'Test Bug',
  description: 'This is a test',
  category: 'Bug',
  severity: 'Low',
  portalName: 'Test',
  submitterName: 'Tester'
})
```

### Debug Logging

All portals include console logging on init:

```javascript
console.log('=== Student Portal Init ===');
console.log('Current User:', currentUser);
console.log('Student DB:', db);
console.log('Leave Applications:', db.leaveManagement.applications.length);
```

---

## Browser Compatibility

**Tested On:**
- Chrome/Edge (Chromium)
- Firefox
- Safari

**Required Features:**
- ES6+ (arrow functions, template literals, destructuring)
- localStorage & sessionStorage
- Custom Events
- Intersection Observer API
- CSS Grid & Flexbox

---

## Performance Considerations

### Optimizations Implemented

1. **In-Memory Cache:**
   - `inMemoryDB` reduces localStorage reads

2. **Event Delegation:**
   - Single event listeners for dynamic content

3. **Lazy Initialization:**
   - Database only seeded when needed

4. **Debounced Scroll:**
   - `requestAnimationFrame` for scroll handlers

### Potential Bottlenecks

1. **Large Datasets:**
   - localStorage has ~5-10MB limit
   - JSON.parse/stringify overhead

2. **DOM Manipulation:**
   - `.innerHTML` on large lists
   - Consider virtual scrolling for 1000+ rows

3. **No Caching:**
   - Templates regenerated on every render
   - Consider template cloning

---

## Future Enhancements

1. **Backend Integration:**
   - Replace localStorage with API calls
   - Real-time sync with WebSocket

2. **Advanced Features:**
   - Email notifications
   - PDF report generation
   - Data export (CSV/Excel)

3. **UI Improvements:**
   - Dark mode
   - Mobile responsive enhancements
   - Accessibility (WCAG 2.1)

4. **Analytics:**
   - Dashboard charts (Chart.js/D3)
   - Predictive analytics
   - Trend visualization

---

## Credits

**Project:** BarelyPassing  
**Institution:** IIIT Sri City  
**Semester:** Spring 2026  
**Team:** The Boogiemen

**Domain:** EdTech - Academic Progress Tracking  
**Purpose:** Early intervention system for at-risk students

---

## Appendix: Login Credentials

| Email | Password | Role | Portal |
|-------|----------|------|--------|
| `student@iiits.in` | `password` | student | Student |
| `faculty@iiits.in` | `password` | faculty | Faculty |
| `head@iiits.in` | `password` | head | Academic Head |
| `admin@iiits.in` | `password` | admin | Superuser |
| `superuser@iiits.in` | `password` | superuser | Superuser |

---

*Documentation generated: April 2026*
