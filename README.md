# BarelyPassing - Academic Management Platform

## Quick Setup (All Operating Systems)

### Prerequisites
- **Node.js** (v18 or higher): Download from https://nodejs.org/
- **npm** (comes with Node.js)

### Step 1: Install Backend Dependencies
Open a terminal/command prompt in the project folder:

```bash
cd back-end
npm install
```

### Step 2: Start the Server
```bash
npm run start
```

If `npm run start` doesn't work, try:
```bash
npx nest start
```

Or directly:
```bash
node node_modules/@nestjs/cli/bin/nest.js start
```

### Step 3: Open the Application
Open your browser and go to: **http://localhost:5001**

---

## Login Credentials

| Role        | Email                  | Password  |
|-------------|------------------------|-----------|
| Student     | student@example.com    | Student@123 |
| Faculty     | faculty@example.com    | Faculty@123 |
| Admin       | admin@example.com      | password  |
| Head        | head@example.com       | Head@123 |
| Super Admin | super@example.com      | Super@123 |

---

## Project Structure
```
├── front-end/          # HTML, CSS, JS (served automatically)
│   ├── index.html      # Login page
│   ├── student.html    # Student dashboard
│   ├── faculty.html    # Faculty dashboard
│   ├── admin.html      # Admin dashboard
│   ├── head.html       # Academic Head dashboard
│   ├── fixes.js        # Core business logic
│   └── style.css       # Styles
│
├── back-end/           # NestJS Backend
│   └── src/
│       ├── auth/       # Authentication
│       ├── students/   # Student APIs
│       ├── faculty/    # Faculty APIs
│       ├── admin/      # Admin/Common APIs
│       ├── database/   # In-memory database
│       ├── modules/    # Pranjal's modular backend
│       │   ├── fee/
│       │   ├── assessment/
│       │   ├── attendance/
│       │   ├── forum/
│       │   ├── leave/
│       │   ├── outcome/
│       │   ├── report/
│       │   ├── research/
│       │   ├── resource/
│       │   └── user/
│       └── common/     # Shared guards, filters, DTOs
│
├── Database/           # ER diagrams & SQL schema
├── Figma Designs/      # UI/UX design files
└── SRS.pdf             # Software Requirements Specification
```

## API Documentation
After starting the server, visit: **http://localhost:5001/api/docs**

## Troubleshooting

### Windows Users
- Use **Command Prompt** or **PowerShell** (not Git Bash for npm commands)
- If you get EACCES errors, run as Administrator

### Mac/Linux Users
- If port 5001 is busy: `kill $(lsof -ti:5001)` then restart

### Common Issues
- **"Module not found"**: Run `npm install` in the `back-end` folder again
- **Port already in use**: Kill the process on port 5001 and retry

---

## ✨ Features Implemented

### Student Dashboard
- ✅ Profile Management
- ✅ Attendance Tracking (with course-wise breakdown)
- ✅ Enrolled Courses Display
- ✅ Course Enrollment
- ✅ Leave Applications
- ✅ Time Table View
- ✅ Discussion Forum
- ✅ Research Projects with File Upload
- ✅ Settings & Password Change

### Faculty Dashboard
- ✅ Faculty Timetable
- ✅ Student Overview
- ✅ Mark Attendance
- ✅ Assessment Mapping
- ✅ Research Project Supervision
- ✅ Discussion Forum
- ✅ Leave Management
- ✅ Event Scheduler
- ✅ Settings & Password Change

### Admin/Head Dashboard
- ✅ Institutional Reports (KPIs, Summary)
- ✅ Event Scheduler
- ✅ Resource Management
- ✅ Fee Compliance Tracking
- ✅ User Management (CRUD)
- ✅ Leave Request Approval
- ✅ Attendance Override
- ✅ Settings & Password Change

---

## 🧪 Running Tests

```bash
bash /Users/gayathridevi/Documents/FFSD/test-all.sh
```

This tests all 5 roles and verifies:
- ✅ Login functionality
- ✅ All API endpoints
- ✅ Data retrieval for each role

---

## 📊 Technology Stack

**Frontend:**
- Vanilla HTML5 + CSS3 + JavaScript (ES6+)
- No external dependencies
- Real-time API communication

**Backend:**
- NestJS (Node.js framework)
- In-memory database (no external DB needed)
- JWT authentication
- CORS enabled
- Swagger documentation

---

## ✅ All Requirements Met

✅ Login functionality working for all roles
✅ No blank pages after login
✅ All features working and accessible
✅ Dashboard renders properly for each role
✅ API endpoints returning real data
✅ Settings page accessible from all dashboards
✅ Cross-role feature compatibility
✅ Ready for evaluation

