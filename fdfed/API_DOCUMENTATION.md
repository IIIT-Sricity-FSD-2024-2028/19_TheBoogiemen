# API Documentation & Endpoint Catalog

**Interactive Swagger Documentation:** [http://localhost:5001/api/docs](http://localhost:5001/api/docs)  
**API Base URL:** `http://localhost:5001/api`  
**Authentication Header:** `role` (`student` | `faculty` | `head` | `admin` | `superadmin` | `FINANCE_ADMIN` | `PLATFORM_SUPER_ADMIN`), `user-id` (e.g. `u1`), `x-tenant-id` (e.g. `t1` or `IIITS`).

---

## 1. Authentication Endpoints

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| `POST` | `/auth/login` | B2B multi-tenant login (returns JWT & user payload) | Public |
| `POST` | `/auth/logout` | Session invalidation | Authenticated |
| `POST` | `/auth/reset-password` | Password recovery with OTP simulation | Public |

---

## 2. File Uploads & Progress Reports (Issue #50)

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| `POST` | `/uploads/progress-report` | Ingest student academic progress report PDF | `faculty`, `admin` |
| `POST` | `/uploads/file` | Generic file upload with MIME & size validation | Authenticated |
| `GET` | `/uploads/progress-reports/student/:studentId` | Get all ingested progress reports for a student | `student`, `faculty`, `admin` |
| `GET` | `/uploads/download/:fileId` | Stream and download uploaded PDF or document | Authenticated |
| `GET` | `/uploads` | List all uploaded documents with metadata | Authenticated |
| `DELETE` | `/uploads/:fileId` | Delete uploaded document record and disk file | `admin`, `superadmin` |

---

## 3. Timetable Generation (Issue #49)

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| `POST` | `/timetable/generate` | Generate conflict-free weekly timetable for section | `head`, `admin`, `superadmin` |
| `GET` | `/timetable/clashes` | Check room and faculty scheduling clashes | Authenticated |
| `GET` | `/timetable` | Get timetable schedule | Authenticated |

---

## 4. Student Academic Endpoints

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| `GET` | `/students/me/profile` | Current student profile & CGPA | `student` |
| `GET` | `/students/me/courses` | Enrolled courses and faculty mappings | `student` |
| `GET` | `/students/me/attendance` | Attendance records and aggregate percentage | `student` |
| `GET` | `/students/me/timetable` | Student weekly timetable | `student` |
| `GET` | `/students/me/syllabus` | Syllabus completion percentage across courses | `student` |
| `GET` | `/students/me/meetings` | Upcoming faculty mentor meetings | `student` |
| `GET` | `/students/me/submissions` | Online assignment submissions tracker | `student` |

---

## 5. Faculty & Grading Endpoints

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| `GET` | `/faculty/me/courses` | Assigned teaching courses | `faculty` |
| `GET` | `/faculty/courses/:courseId/students` | Students enrolled in course | `faculty`, `head` |
| `POST` | `/attendance` | Mark lecture attendance | `faculty` |
| `POST` | `/marks` | Enter student assessment grades | `faculty` |
| `GET` | `/marks/:courseId` | Course grade sheet | `faculty`, `head` |
| `PUT` | `/syllabus/progress` | Update syllabus completion percentage | `faculty` |

---

## 6. Finance & Compliance Endpoints

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| `GET` | `/fees` | Get all fee records and compliance summary | `FINANCE_ADMIN`, `admin`, `head` |
| `POST` | `/fees` | Create new student fee record | `FINANCE_ADMIN`, `admin` |
| `PUT` | `/fees/:id` | Update existing fee record | `FINANCE_ADMIN`, `admin` |
| `PATCH` | `/fees/:id/pay` | Mark student fee as paid | `FINANCE_ADMIN`, `admin` |

---

## 7. SaaS Platform & System Logs Endpoints

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| `GET` | `/platform/tenants` | List all institutional tenants | `PLATFORM_*` |
| `POST` | `/platform/tenants/onboard` | Onboard new educational institution | `PLATFORM_*`, Public |
| `GET` | `/platform/tokens/meter` | Token consumption meter for tenant | `PLATFORM_*`, `admin` |
| `GET` | `/platform/logs` | Fetch system disk logs (`access`, `app`, `error`, `audit`) | `PLATFORM_*`, `admin` |
| `GET` | `/platform/audit-logs` | Audit logs stream | `PLATFORM_*`, `admin` |
