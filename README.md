# BarelyPassing - EdTech Academic Progress Tracking System

## 🚀 Quick Start

### Prerequisites
- Node.js v20+ 
- npm

### Running the Application

**Terminal 1: Start the static file server**
```bash
cd /Users/gayathridevi/Documents/FFSD/back-end
node -e "
const express = require('express');
const app = express();
app.use(express.static('../front-end'));
app.listen(3000);
console.log('Frontend server running on http://localhost:3000');
"
```

**Terminal 2: Start the API server**
```bash
cd /Users/gayathridevi/Documents/FFSD/back-end
npm run start
```

Then open: **http://localhost:3000**

---

## 👤 Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Student | `student@example.com` | `password` |
| Faculty | `faculty@example.com` | `password` |
| Academic Head | `head@example.com` | `password` |
| Admin | `admin@example.com` | `password` |
| Super Admin | `super@example.com` | `password` |

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

