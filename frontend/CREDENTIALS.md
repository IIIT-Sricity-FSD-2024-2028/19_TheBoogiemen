# 🔐 BarelyPassing - Login Credentials
# 🔐 BarelyPassing - Login Credentials

## **🔒 Strong Password Policy**

All passwords now meet strong security requirements:
- ✅ Minimum 8 characters
- ✅ At least 1 uppercase letter (A-Z)
- ✅ At least 1 number (0-9)
- ✅ At least 1 special character (@$!%*?&)

---

## **📋 Test Accounts by Role**

### **🎓 Student Portal**

| Email | Password | Name | Branch |
|-------|----------|------|--------|
| `student@iiits.in` | `Student@123` | Faham | Computer Science |
| `pranjal.student@iiits.in` | `Student@123` | Pranjal | Computer Science |

**Features Accessible:**
- Dashboard with CGPA & attendance
- Syllabus completion tracker
- Course-wise performance
- Attendance heatmap
- Leave applications (Medical/Personal/Event)
- Discussion forum
- BTP/Honors research milestones
- Weekly timetable

---

### **👨‍🏫 Faculty Portal**

| Email | Password | Name | Department |
|-------|----------|------|------------|
| `faculty@iiits.in` | `Faculty@123` | Dr. Shams | Computer Science |
| `professor@iiits.in` | `Faculty@123` | Dr. Bablani | Computer Science |

**Features Accessible:**
- At-risk student alerts
- Mark attendance for classes
- CO/PO outcome mapping for assessments
- Student directory with performance metrics
- Discussion forum moderation
- Research project supervision
- CO/PO outcome mapping for assessments
- Student directory with performance metrics
- Discussion forum moderation
- Research project supervision
- Schedule intervention meetings

---

### **🏛️ Academic Head Portal**

| Email | Password | Name | Role |
|-------|----------|------|------|
| `head@iiits.in` | `Head@1234` | Dr. Kavitha | Academic Head |

**Features Accessible:**
- Institutional performance dashboard
- Department comparison charts
- Generate institutional reports
- Schedule events
- Manage resources (labs, classrooms)
- Track fee defaulters
- Override attendance records
- Manage users

---

### **⚙️ Super User Portal (IT Operations)**

| Email | Password | Name | Role |
|-------|----------|------|------|
| `superuser@iiits.in` | `Super@12345` | Pranjal Sharma | IT Operations |
| `admin@iiits.in` | `Admin@12345` | System Admin | Administrator |

**Features Accessible:**
- System overview with metrics
- User provisioning (CRUD operations)
- View system logs
- Manage bug reports queue
- Configure global settings
- Security policy management
- Purge audit logs

---

## **🚀 How to Access Each Portal**

### **Step 1: Navigate to Login**
Open `frontend/login.html` in your browser

### **Step 2: Select Role**
Click on the role card (Student, Faculty, Academic Head, or Super Admin)

### **Step 3: Enter Credentials**
Use any credentials from the table above

### **Step 4: Sign In**
Click "Sign In" to access the portal

---

## **📊 Demo Data Overview**

### **Student Profile (Faham)**
- **CGPA:** 9.16
- **Attendance:** 82%
- **Branch:** Computer Science & Engineering
- **Batch:** 2024-2028
- **Current Courses:** 5 enrolled

### **Faculty Profile (Dr. Shams)**
- **Department:** Computer Science
- **Courses Teaching:** 4 courses
- **Total Students:** 6
- **At-Risk Students:** 3 flagged

### **Institutional Stats**
- **Total Students:** 908
- **Faculty Members:** 64
- **Active Courses:** 47
- **Departments:** 5 (CSE, ECE, ME, CE, EE)

---

## **🎯 Role-Specific Testing Scenarios**

### **Student Testing**
1. ✅ Login with `student@iiits.in`
2. ✅ View dashboard and attendance
3. ✅ Apply for leave (Medical/Personal)
4. ✅ Post a question in forum
5. ✅ Declare a research milestone
6. ✅ View timetable

### **Faculty Testing**
1. ✅ Login with `faculty@iiits.in`
2. ✅ View at-risk student alerts
3. ✅ Mark attendance for a class
4. ✅ Map CO/PO outcomes to assessment
5. ✅ Schedule intervention meeting
6. ✅ View student directory

### **Academic Head Testing**
1. ✅ Login with `head@iiits.in`
2. ✅ View institutional dashboard
3. ✅ Schedule a new event
4. ✅ Add a resource
5. ✅ View fee defaulters
6. ✅ Generate reports

### **Super User Testing**
1. ✅ Login with `superuser@iiits.in`
2. ✅ Provision a new user
3. ✅ Edit an existing user
4. ✅ Delete a user
5. ✅ View system logs
6. ✅ Manage bug reports
7. ✅ Update global settings

---

## **⚠️ Important Notes**

### **Session Management**
- Sessions are stored in `sessionStorage`
- Sessions expire after 30 days
- Logout clears all session data

### **Data Persistence**
- All CRUD operations persist to `localStorage`
- Data survives page refresh
- To reset data: Clear browser localStorage

### **Password Security**
✅ **Strong Passwords Enforced:** All accounts now use strong passwords meeting security requirements:
- Minimum 8 characters
- At least 1 uppercase letter (A-Z)
- At least 1 number (0-9)
- At least 1 special character (@$!%*?&)

**Pattern:** `[RoleName]@[Numbers]` (e.g., `Student@123`, `Faculty@123`)

⚠️ **For Demo Only:** Passwords stored in plain text. In production, implement:
- bcrypt/argon2 password hashing
- Password strength meter during creation
- Password reset functionality
- Account lockout after failed attempts

### **Role Restrictions**
- Each portal checks authentication on load
- Unauthorized users are redirected to login
- Admin role can access Super User portal

---

## **🔧 Troubleshooting**

### **Login Not Working?**
1. Check browser console for errors
2. Ensure JavaScript is enabled
3. Clear localStorage and retry
4. Verify credentials match exactly

### **Data Not Persisting?**
1. Check if localStorage is enabled
2. Try in a different browser
3. Clear cache and reload

### **Validator Error?**
1. Ensure all script tags are loaded
2. Check script loading order in HTML
3. Clear browser cache

---

## **📧 Contact**

For technical support or questions about credentials:
- **Email:** barely.passing@iiits.in
- **Team:** The Boogiemen
- **Institution:** IIIT Sri City

---

## **📝 Quick Reference Card**

| Role | Email | Password |
|------|-------|----------|
| 🎓 Student | `student@iiits.in` | `Student@123` |
| 👨‍🏫 Faculty | `faculty@iiits.in` | `Faculty@123` |
| 🏛️ Head | `head@iiits.in` | `Head@1234` |
| ⚙️ Super User | `superuser@iiits.in` | `Super@12345` |
| 🔧 Admin | `admin@iiits.in` | `Admin@12345` |

**Password Pattern:** `[Role]@[numbers]` (e.g., Student@123, Faculty@123)

---

**Last Updated:** April 2, 2026  
**Version:** 1.0.0  
**Project:** BarelyPassing - Academic Progress & Outcome Tracking
