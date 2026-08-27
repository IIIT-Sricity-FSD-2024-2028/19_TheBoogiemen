# FDFED First Evaluation — Complete Project & Middleware Guide
**Project:** BarelyPassing — Academic Progress & Outcome Tracking System  
**Team:** The Boogiemen (Team 19)  
**Evaluation Date:** On or after 27th August 2026  

---

## 📌 Executive Summary & Evaluation Checklist

This project is a multi-tenant B2B educational SaaS platform built with a NestJS TypeScript backend and a multi-portal frontend. All requirements for the **FDFED First Evaluation** have been implemented:

| Mandatory Criterion | Status | Implementation Details & File References |
|---|---|---|
| **1. Complete Web Application** | ✅ **COMPLETE** | Functional multi-portal system (Student, Faculty, HOD, Director, Finance, SaaS Platform, Public Onboarding). |
| **2. Logging Middleware** | ✅ **COMPLETE** | `LoggingMiddleware` intercepts all HTTP traffic, measures latency, formats console output, and logs to `logs/access.log` & `logs/app.log`. |
| **3. Error Handling Middleware** | ✅ **COMPLETE** | `AllExceptionsFilter` catches all HTTP and runtime exceptions, standardizes response JSON, and writes full stack traces to `logs/error.log`. |
| **4. File Upload Middleware** | ✅ **COMPLETE** | Multer-based `UploadsModule` with MIME type & size validation (Issue #50). Supports Progress Report ingestion & PDF downloads. |
| **5. Security Middleware** | ✅ **COMPLETE** | `SecurityMiddleware` (OWASP headers, CSP, CORS, Frame options), `RateLimiterMiddleware`, `RolesGuard`, and `ValidationPipe`. |
| **6. Router-Level Middleware** | ✅ **COMPLETE** | `TenantContextMiddleware` (tenant isolation on `/api/admin/*`, `/api/faculty/*`, etc.) and `AuditLoggerMiddleware` (state mutation tracking to `logs/audit.log`). |
| **7. Log & Error Management** | ✅ **COMPLETE** | `FileLoggerService` flushes logs to disk files (`logs/`) at regular 2-second intervals with automated log rotation & querying APIs. |
| **8. Team Issues (#50, #49, #48, #47, #45, #44)** | ✅ **COMPLETE** | Progress report ingestion/download (#50), Clash-free Timetable generator (#49), Onboarding (#47), Frontend refactor (#45), Docs (#44). |

---

## 🚀 Quick Start & Running the Application

### 1. Start the Backend Server
```bash
cd back-end
npm run start:dev
```
*The server will start listening on port 5001 and initialize all 5 middleware types and disk loggers.*

### 2. Access the Application Portals

| Portal | URL | Demo Credentials |
|---|---|---|
| 🏠 **Campus Login** | [http://localhost:5001/login.html](http://localhost:5001/login.html) | Select any role card |
| 🎓 **Student Portal** | [http://localhost:5001/student.html](http://localhost:5001/student.html) | `student@iiits.in` / `Pass@123` |
| 👨‍🏫 **Faculty Portal** | [http://localhost:5001/faculty.html](http://localhost:5001/faculty.html) | `faculty@iiits.in` / `Pass@123` |
| 🏫 **HOD Portal** | [http://localhost:5001/hod.html](http://localhost:5001/hod.html) | `head@iiits.in` / `Pass@123` |
| 🏛 **Director Portal** | [http://localhost:5001/director.html](http://localhost:5001/director.html) | `director@iiits.in` / `Pass@123` |
| 💰 **Finance Officer Portal** | [http://localhost:5001/finance.html](http://localhost:5001/finance.html) | `finance@iiits.in` / `Pass@123` |
| 🔐 **SaaS Platform Login** | [http://localhost:5001/saas-login.html](http://localhost:5001/saas-login.html) | `saasadmin@platform.com` / `Pass@123` |
| 📋 **Public Onboarding** | [http://localhost:5001/onboarding.html](http://localhost:5001/onboarding.html) | Public Access |
| 📖 **Swagger API Docs** | [http://localhost:5001/api/docs](http://localhost:5001/api/docs) | Interactive OpenAPI 3.0 |

---

## 🔍 How to Test Each Evaluation Criterion

### Test 1: Logging Middleware & Log Files
1. Open any page (e.g. `student.html`) or perform an API call:
   ```bash
   curl -X GET "http://localhost:5001/api/courses" -H "role: student" -H "user-id: u1"
   ```
2. Verify console output shows formatted HTTP method, path, status, and duration in ms.
3. Check `back-end/logs/access.log` and `back-end/logs/app.log`:
   ```bash
   tail -n 10 back-end/logs/access.log
   ```

### Test 2: Error Handling Middleware
1. Trigger an invalid route or missing parameter:
   ```bash
   curl -X POST "http://localhost:5001/api/courses" -H "Content-Type: application/json" -d "{}"
   ```
2. Observe structured error envelope:
   ```json
   {
     "statusCode": 400,
     "timestamp": "2026-08-26T...",
     "path": "/api/courses",
     "method": "POST",
     "error": "BadRequestException",
     "message": "course_name and course_code are required",
     "requestId": "err_..."
   }
   ```
3. Verify the error trace is persisted in `back-end/logs/error.log`:
   ```bash
   tail -n 10 back-end/logs/error.log
   ```

### Test 3: File Upload & Progress Report Ingestion (Issue #50)
1. Login as Student (`student@iiits.in`) → navigate to **Progress Reports** or click **Download Official PDF** on the dashboard.
2. The browser downloads `Official_Progress_Report_Spring2026.pdf`.
3. Ingest a new progress report via API:
   ```bash
   curl -X POST "http://localhost:5001/api/uploads/progress-report" \
     -F "file=@back-end/uploads/sample-progress-report-u1.pdf" \
     -F "student_id=u1" \
     -F "semester=Spring 2026" \
     -H "role: faculty" -H "user-id: u2"
   ```

### Test 4: Security & Rate Limiting Middleware
1. Inspect security headers on any response:
   ```bash
   curl -I http://localhost:5001/api/courses
   ```
   Headers present: `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `X-XSS-Protection: 1; mode=block`, `Strict-Transport-Security`, `X-RateLimit-Limit: 200`.

### Test 5: Router-Level Middleware (Tenant Context & Audit Logging)
1. Perform an administrative mutation (e.g. approve leave or update mark):
   ```bash
   curl -X PATCH "http://localhost:5001/api/fees/f1/pay" -H "role: FINANCE_ADMIN" -H "user-id: u9_finance"
   ```
2. Verify tenant context header `X-Tenant-ID: t1` is set in response.
3. Check `back-end/logs/audit.log` to see the recorded mutation with actor and payload summary.

### Test 6: Timetable Generation System (Issue #49)
1. Run automated timetable generator:
   ```bash
   curl -X POST "http://localhost:5001/api/timetable/generate" \
     -H "Content-Type: application/json" \
     -H "role: head" \
     -d '{"section":"A","reset":true}'
   ```
2. Verify clash detector:
   ```bash
   curl -X GET "http://localhost:5001/api/timetable/clashes"
   ```
