# BarelyPassing - Login Credentials

## Test Accounts

Use these credentials to log into each portal. **Password for all accounts: `password`**

### Student Portal
- **Email:** `student@iiits.in`
- **Password:** `password`
- **Name:** Faham

### Faculty Portal
- **Email:** `faculty@iiits.in`
- **Password:** `password`
- **Name:** Dr. Shams

### Academic Head Portal
- **Email:** `head@iiits.in`
- **Password:** `password`
- **Name:** Dr. Kavitha

### Super User Portal (IT Operations)
- **Email:** `superuser@iiits.in`
- **Password:** `password`
- **Name:** Pranjal Sharma

### Admin Portal
- **Email:** `admin@iiits.in`
- **Password:** `password`
- **Name:** System Admin

---

## Features by Portal

### Student Features
- View dashboard with CGPA and attendance
- Track syllabus completion per module
- View course-wise performance
- Check attendance heatmap
- Apply for leave (Medical/Personal/Event)
- Post questions to discussion forum
- Track BTP/Honors research milestones
- View weekly timetable

### Faculty Features
- View at-risk student alerts
- Mark attendance for classes
- Map CO/PO outcomes to assessments
- View student directory with performance metrics
- Moderate discussion forum
- Supervise research projects
- Schedule intervention meetings

### Academic Head Features
- Institutional performance dashboard
- Department comparison charts
- Generate institutional reports
- Schedule events
- Manage resources (labs, classrooms)
- Track fee defaulters
- Override attendance records
- Manage users

### Super User Features
- System overview with metrics
- User provisioning (CRUD operations)
- View system logs
- Manage bug reports queue
- Configure global settings
- Security policy management

---

## Notes

1. **Session Management:** User sessions are stored in sessionStorage and cleared on logout
2. **Data Persistence:** All CRUD operations persist to localStorage
3. **Role-Based Access:** Each portal checks authentication and redirects unauthorized users
4. **Password:** Currently all passwords are plain text "password" - for demo purposes only
