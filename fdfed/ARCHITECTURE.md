# BarelyPassing System Architecture Documentation

**Course:** FDFED M2026 — Full Stack Web Development  
**Project:** BarelyPassing Multi-Tenant Academic Platform  
**Team:** The Boogiemen (Team 19)  

---

## 1. System Overview

BarelyPassing is an enterprise-grade academic monitoring and outcome tracking web application designed as a **B2B Multi-Tenant Software-as-a-Service (SaaS)** platform. It enables institutions to manage attendance, outcome milestones, course allocations, fee compliance, and academic progress through a unified backend and role-specialized frontend portals.

---

## 2. Multi-Tier Role Hierarchy

The platform implements a strict 5-tier role hierarchy with downward delegation and upward reporting:

```
Level 0: SaaS Platform Control (Global)
  ├── PLATFORM_SUPER_ADMIN    (saasadmin@platform.com)  — Full platform owner control
  ├── PLATFORM_SALES_SUPPORT  (sales@platform.com)      — Subscriptions, onboarding leads & billing
  └── PLATFORM_TECH_SUPPORT   (techsupport@platform.com)— Interlinked support ticket resolution & live audit

Level 1: Institute Super Admin (Director)
  └── INSTITUTE_SUPER_ADMIN   (director@iiits.in)       — Strategic overview, departments & institutional reports

Level 2: Department Admin (HOD)
  └── DEPARTMENT_ADMIN_HOD    (head@iiits.in)           — Course allocations, faculty mapping & leave approval

Level 3: Finance Officer (Accounts Team)
  └── FINANCE_ADMIN           (finance@iiits.in)        — Fee structures, dues collection & payment compliance

Level 4: Faculty Mentor
  └── faculty                 (faculty@iiits.in)        — Attendance marking, grade entry, meetings & progress reports

Level 5: Student
  └── student                 (student@iiits.in)        — Course progress, timetable, leave applications & report downloads
```

---

## 3. High-Level Architecture Diagram

```
                     ┌────────────────────────────────────────────────────────────┐
                     │                       CLIENT TIER                          │
                     │  (HTML5, Vanilla JS, CSS3, Redux State Store / state.js)  │
                     └─────────────────────────────┬──────────────────────────────┘
                                                   │ HTTP / REST / Cookies / JWT
                                                   ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                          NESTJS BACKEND TIER                                           │
│                                                                                                        │
│  ┌──────────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                                       GLOBAL MIDDLEWARE PIPELINE                                 │  │
│  │  1. SecurityMiddleware (OWASP Headers, CSP, CORS)                                                │  │
│  │  2. LoggingMiddleware (Latency timing, Access logs)                                              │  │
│  │  3. RateLimiterMiddleware (IP-based token bucket)                                                │  │
│  └───────────────────────────────────────────────┬──────────────────────────────────────────────────┘  │
│                                                  │                                                     │
│  ┌───────────────────────────────────────────────▼──────────────────────────────────────────────────┐  │
│  │                                      ROUTER-LEVEL MIDDLEWARE                                     │  │
│  │  4. TenantContextMiddleware (x-tenant-id injection & tenant boundary checks)                     │  │
│  │  5. AuditLoggerMiddleware (Mutation auditing for POST/PUT/PATCH/DELETE)                          │  │
│  └───────────────────────────────────────────────┬──────────────────────────────────────────────────┘  │
│                                                  │                                                     │
│  ┌───────────────────────────────────────────────▼──────────────────────────────────────────────────┐  │
│  │                                        CONTROLLERS & SERVICES                                    │  │
│  │  • AuthController         • StudentsController        • FacultyController                       │  │
│  │  • AdminController        • PlatformController        • UploadsController (Multer)              │  │
│  │  • TimetableController    • FeeController             • AttendanceController                    │  │
│  └───────────────────────────────────────────────┬──────────────────────────────────────────────────┘  │
│                                                  │                                                     │
│  ┌───────────────────────────────────────────────▼──────────────────────────────────────────────────┐  │
│  │                                    DATA & LOG PERSISTENCE LAYER                                  │  │
│  │  • InMemoryDbService (Seeded multi-tenant models, users, courses, attendance, fees)              │  │
│  │  • FileLoggerService (Periodic 2s disk sync to logs/access.log, error.log, audit.log)            │  │
│  │  • Uploads Storage (Disk storage in ./uploads/ for progress reports & documents)                │  │
│  └──────────────────────────────────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Multi-Tenant Data Isolation

- Every institutional tenant (e.g. `t1` IIIT Sricity, `t2` IIT Madras, `t3` VIT Vellore) possesses isolated user domains, course mappings, and token quotas.
- `TenantContextMiddleware` ensures that users cannot accidentally view or mutate data belonging to other tenant instances.
