# 🎓 BarelyPassing – Enterprise Multi-Tenant EdTech ERP & SaaS Platform

> **A scalable, multi-tenant university ERP, LMS, and academic intelligence system** featuring multi-tenant college onboarding, modular billing enforcement, automated attendance tracking, granular student assessment grading, financial compliance, and responsive multi-role portals.

---

## 🌟 Table of Contents
- [Architecture & Multi-Tenancy](#-architecture--multi-tenancy)
- [Portals & User Roles](#-portals--user-roles)
- [Quick Start Guide](#-quick-start-guide)
- [Demo Credentials](#-demo-credentials)
- [Key Features & Modules](#-key-features--modules)
- [API Documentation](#-api-documentation)
- [Lab 2: React Conversion](#-lab-2-react-frontend-conversion)
- [Automated Testing & Quality Assurance](#-automated-testing--quality-assurance)

---

## 🏗 Architecture & Multi-Tenancy

```
                     ┌─────────────────────────────────────────────────────────┐
                     │          BarelyPassing SaaS Vendor Platform             │
                     │  (Multi-Tenant College Onboarding, Modules & Billing)   │
                     └────────────────────────────┬────────────────────────────┘
                                                  │
                ┌─────────────────────────────────┴─────────────────────────────────┐
                ▼                                                                   ▼
┌───────────────────────────────┐                                   ┌───────────────────────────────┐
│     Tenant 1: IIIT Sri City   │                                   │     Tenant 2: NIT Warangal    │
│  (Tenant Code: IIITS)         │                                   │  (Tenant Code: NITW)          │
├───────────────────────────────┤                                   ├───────────────────────────────┤
│ • Director (Super Admin)      │                                   │ • Director (Super Admin)      │
│ • HOD (Academic Head)         │                                   │ • HOD (Academic Head)         │
│ • Faculty (Grading & Roster)  │                                   │ • Faculty (Grading & Roster)  │
│ • Students (LMS, Attendance)  │                                   │ • Students (LMS, Attendance)  │
│ • Finance Admin (Fee Dues)    │                                   │ • Finance Admin (Fee Dues)    │
│ • SPOC (Subscription Lead)    │                                   │ • SPOC (Subscription Lead)    │
└───────────────────────────────┘                                   └───────────────────────────────┘
```

- **Tenancy Scoping**: Strict tenant isolation across all database models (`college_id` / `tenant_code`), ensuring institutional data privacy.
- **Module Licensing**: Dynamic feature gating (`billing`, `fees`, `analytics`, `lms`) enforced at both the API guard level and frontend UI.
- **Micro-Services & Extensibility**: In-memory persistent database layer with NestJS controller architecture and JWT claim verification.

---

## 👥 Portals & User Roles

| Portal | Entry File | Description |
|---|---|---|
| **Campus Gateway** | `front-end/index.html` | Public landing portal with quick navigation to Campus Login, Institutional Onboarding, and Support. |
| **Institutional Onboarding** | `front-end/onboarding.html` | 4-step automated onboarding wizard for new colleges, ERP domain provisioning, and tier selection. |
| **SaaS Platform Vendor** | `front-end/saas.html` / `super-admin.html` | Global vendor control plane for college lifecycle management, module licensing, and ticket routing. |
| **Student Portal** | `front-end/student.html` | Course schedule, syllabus milestones, marks overview, attendance tracker, leave requests, and forum. |
| **Faculty Portal** | `front-end/faculty.html` | Classroom rosters with real student names, individual marks entry modal, attendance logs, and intervention alerts. |
| **Department Head (HOD)** | `front-end/hod.html` / `super-user.html` | Course allocations, department analytics, timetable scheduler, and faculty performance monitoring. |
| **Institute Director** | `front-end/director.html` | Institute-wide KPIs, retention rates, department benchmarking, and compliance auditing. |
| **Finance Officer** | `front-end/finance.html` | Student fee records, payment receipts, overdue reminders, and fee structure configuration. |
| **SPOC / Support Portal** | `front-end/spoc.html` / `support.html` | Dedicated BarelyPassing support desk and subscription management for institution leads. |

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v18+ (tested on Node v20/v22)
- **npm**: v9+

### 1. Start the Backend API Server
```bash
cd back-end
npm install
npm run start:dev
```
*The backend API will run at `http://localhost:4000` (Swagger UI at `http://localhost:4000/api/docs`).*

### 2. Start the Frontend Web Server
In a second terminal:
```bash
cd front-end
npx serve -l 3000
```
*Open `http://localhost:3000` in your web browser.*

---

## 🔑 Demo Credentials

All accounts can be tested with **Tenant Code**: `IIITS` (or `NITW`).

| Role | Email | Password | Access / Portal |
|---|---|---|---|
| **Student** | `student@iiits.in` *(or `student@example.com`)* | `Student@123` | `student.html` (John Doe - S20220010001) |
| **Student 2** | `student2@iiits.in` *(or `student2@example.com`)* | `Student@123` | `student.html` (Alice Vance - S20220010002) |
| **Faculty** | `faculty@iiits.in` *(or `faculty@example.com`)* | `Faculty@123` | `faculty.html` (Dr. Jane Smith) |
| **HOD / Head** | `head@iiits.in` *(or `head@example.com`)* | `Head@123` | `hod.html` (Academic Head CSE) |
| **Institute Director** | `director@iiits.in` *(or `super@example.com`)* | `Director@123` | `director.html` (Director / Super Admin) |
| **Finance Officer** | `finance@iiits.in` | `Finance@123` | `finance.html` (Finance Officer) |
| **College SPOC** | `spoc@example.com` | `Spoc@123` | `spoc.html` (College Partner Lead) |
| **SaaS Platform Admin** | `saasadmin@platform.com` | `Platform@123` | `saas.html` (BarelyPassing Vendor HQ) |

---

## ✨ Key Features & Modules

### 1. Faculty Marks & Assessment Management
- **Individual Marks Entry**: Faculty can enter and update marks for specific students individually without overwriting or duplicating scores for others.
- **Roster with Real Student Names**: Real student names (`John Doe`, `Alice Vance`), roll numbers, and sections are displayed throughout the grading modals and student overview cards.
- **Online vs. Offline Mode**: Supports submission file checking for online assessments with automated badge validation.

### 2. Attendance & Intervention System
- **Real-Time Attendance Percentage**: Course-wise attendance calculation with low-attendance warnings (<75%).
- **Attendance Override Flow**: Faculty and students can submit override requests with reason logging, reviewed by Academic Heads.
- **At-Risk Student Alerts**: Automated detection of students with low CGPA (<7.0) or low attendance with direct alert dispatch.

### 3. Modular Billing & Tenancy
- **Dynamic Feature Gating**: Routes are protected by `@RequiresModule()` and verified against active institution subscriptions.
- **Support Inbox & Ticketing**: In-app two-way support thread communication between Institution SPOCs and SaaS Platform engineers.

---

## 📚 API Documentation

Once the backend is running, open the interactive Swagger OpenAPI documentation:
👉 **`http://localhost:4000/api/docs`**

Key Endpoint Groups:
- `POST /auth/login` - Multi-tenant JWT authentication
- `GET /students/me` - Authenticated student profile & courses
- `GET /faculty/me/students` - Enrolled student roster
- `POST /marks` - Dynamic per-student assessment marks entry
- `GET /marks?assessment_id={id}` - Assessment grade queries
- `GET /billing/colleges` - SaaS institution management
- `POST /billing/support/threads` - Support ticket ticketing

---


## 🧪 Automated Testing & Quality Assurance

To execute backend unit and integration test suites:
```bash
cd back-end
npm test
```

To run end-to-end multi-role verification:
```bash
bash test-all.sh
```

**Test Coverage Results:**
- 7/7 Test Suites Passed (100%)
- 98/98 Unit & Integration Tests Passed (100%)
- TypeScript compilation: 0 errors
- Frontend syntax: 0 errors

---

© 2026 BarelyPassing EdTech Platform. Built with NestJS, React, and modern web standards.
