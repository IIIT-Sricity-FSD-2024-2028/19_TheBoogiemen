# 🎓 BarelyPassing – Enterprise Multi-Tenant EdTech Platform
### *Modern React SPA & NestJS Multi-Tenant Architecture*

> **BarelyPassing** is an enterprise-grade university ERP, LMS, and academic intelligence platform engineered with a **React SPA frontend** (`front-end-react/`) and a **NestJS backend** (`back-end/`). It features strict multi-tenant institutional isolation, modular SaaS billing enforcement, granular assessment grading, attendance auditing, and a battle-tested **layered middleware and guard pipeline**.

---

## ⚡ Quick Start & Run Instructions

Get the entire application up and running locally in under 3 minutes.

### 📋 Prerequisites
- **Node.js**: `v18.x` or higher ([Download Node.js](https://nodejs.org/))
- **npm**: `v9.x` or higher (comes with Node.js)

---

### Step 1: Start the Backend Server (NestJS)

Open a terminal in the project root:

```bash
# 1. Navigate to the backend directory
cd back-end

# 2. Install dependencies
npm install

# 3. Configure the environment (required)
# Linux/macOS:
cp .env.example .env
# Windows (PowerShell/CMD):
copy .env.example .env

# 4. Initialize seed passwords (converts mock data to bcrypt hashes)
npm run migrate:passwords

# 5. Launch the NestJS backend
npm run start:dev
```

* Backend API runs at: **`http://localhost:5001`**
* Interactive Swagger API Docs: **`http://localhost:5001/api/docs`**

---

### Step 2: Start the Modern React Frontend (Vite + React SPA)

Open a **second terminal** in the project root:

```bash
# 1. Navigate to the React frontend directory
cd front-end-react

# 2. Install dependencies
npm install

# 3. Launch the Vite development server
npm run dev
```

* Modern React Application runs at: **`http://localhost:5173`**
* The Vite dev server automatically proxies all `/api/*` calls to the backend running on port `5001`.

---

### Step 3: Login with Demo Accounts

Use any of the seeded demo accounts below to sign in:

| Role | Email | Password | Primary Portal Route (React) | Notes & Persona |
|---|---|---|---|---|
| 🎓 **Student** | `student@example.com` | `Student@123` | `/student` | John Doe (Enrolled in CSE courses) |
| 👨‍🏫 **Faculty** | `faculty@example.com` | `Faculty@123` | `/faculty` | Dr. Jane Smith (Data Structures faculty) |
| 🛡️ **Administrator** | `admin@example.com` | `password` | `/admin` | Campus System Administrator |
| 🏛️ **Department Head** | `head@example.com` | `Head@123` | `/admin` | Academic Head of Department (HOD) |
| 👑 **Super Admin** | `super@example.com` | `Super@123` | `/superadmin` | Institutional Director / Multi-Tenant Admin |
| 🤝 **SPOC** | `spoc@example.com` | `Spoc@123` | `/spoc` | Partner Success / Single Point of Contact |

> **Note on Legacy Frontend:** The legacy vanilla HTML/JS files remain preserved under `front-end/` for reference and can be viewed via the backend's static file server on `http://localhost:5001/` or run independently via `cd front-end && npx serve -l 3000`.

---

## 📑 Table of Contents
1. [⚡ Quick Start & Run Instructions](#-quick-start--run-instructions)
2. [🏛 System Architecture & Multi-Tenancy](#-system-architecture--multi-tenancy)
3. [🔄 Complete Request Lifecycle Pipeline](#-complete-request-lifecycle-pipeline)
4. [🛡 Deep-Dive: Middleware Architecture](#-deep-dive-middleware-architecture)
   - [3.1 Request Audit Middleware (`RequestAuditMiddleware`)](#31-request-audit-middleware-requestauditmiddleware)
   - [3.2 Authentication Rate Limiter (`AuthRateLimitMiddleware`)](#32-authentication-rate-limiter-authratelimitmiddleware)
   - [3.3 Institutional Onboarding Limiter (`OnboardingRateLimitMiddleware`)](#33-institutional-onboarding-limiter-onboardingratelimitmiddleware)
   - [3.4 In-Memory Fixed Window Engine (`FixedWindowLimiter`)](#34-in-memory-fixed-window-engine-fixedwindowlimiter)
   - [3.5 Global Express Middleware & Security Headers](#35-global-express-middleware--security-headers)
5. [🚪 Guards & Access Control Pipeline](#-guards--access-control-pipeline)
   - [4.1 JWT Authentication Guard (`JwtAuthGuard`)](#41-jwt-authentication-guard-jwtauthguard)
   - [4.2 Role-Based Access Control (`RolesGuard`)](#42-role-based-access-control-rolesguard)
   - [4.3 Modular SaaS Feature Gating (`RequiresModuleGuard`)](#43-modular-saas-feature-gating-requiresmoduleguard)
   - [4.4 Ephemeral Onboarding Session Guard (`OnboardingSessionGuard`)](#44-ephemeral-onboarding-session-guard-onboardingsessionguard)
6. [🧩 Modern React Architecture & Portals](#-modern-react-architecture--portals)
7. [🧪 Automated Test Suite & Verification](#-automated-test-suite--verification)

---

## 🏛 System Architecture & Multi-Tenancy

BarelyPassing operates as a multi-tenant software-as-a-service (SaaS) platform where individual colleges and universities exist in logically separated tenancy realms.

```
                          ┌─────────────────────────────────────────────────────────┐
                          │               BarelyPassing SaaS Platform               │
                          │          (Global Subscriptions, Onboarding & SPOC)      │
                          └────────────────────────────┬────────────────────────────┘
                                                       │
                     ┌─────────────────────────────────┴─────────────────────────────────┐
                     ▼                                                                   ▼
     ┌───────────────────────────────┐                                   ┌───────────────────────────────┐
     │    Tenant A: IIIT Sri City    │                                   │    Tenant B: NIT Warangal     │
     │      (Tenant Code: IIITS)     │                                   │      (Tenant Code: NITW)      │
     ├───────────────────────────────┤                                   ├───────────────────────────────┤
     │ • Tenancy ID: `c-default`     │                                   │ • Tenancy ID: `c-nitw`        │
     │ • Director / Super Admin      │                                   │ • Director / Super Admin      │
     │ • Department HODs             │                                   │ • Department HODs             │
     │ • Faculty & Class Rosters     │                                   │ • Faculty & Class Rosters     │
     │ • Enrolled Students           │                                   │ • Enrolled Students           │
     │ • Finance Officers            │                                   │ • Finance Officers            │
     └───────────────────────────────┘                                   └───────────────────────────────┘
```

### Tenancy Principles
- **Data Scoping**: Every database entity (`students`, `faculty`, `marks_entry`, `attendance_log`, `courses`, `fees`) includes a mandatory `college_id`.
- **Automatic Scoping Functions**:
  - `scopeToCollege(records, actorCollegeId)`: Filters reads to the caller's tenancy.
  - `writeCollegeId(actorCollegeId)`: Resolves default vs specific tenancy identifier on write.
- **Tenant Context Injection**: The `@CurrentUserCollegeId()` parameter decorator extracts the authenticated tenant context directly from verified JWT claims.

---

## 🔄 Complete Request Lifecycle Pipeline

Every incoming HTTP request traverses a strictly ordered 9-stage pipeline from TCP ingress to response dispatch:

```
 Incoming HTTP Request
        │
 1. ───▼─── Express Security Middleware (Helmet Security Headers: HSTS, CORP, Frameguard, nosniff)
        │
 2. ───▼─── Express Cookie Parser (`cookieParser()` extracts HTTP-only `bp_session` cookies)
        │
 3. ───▼─── Express Static File Server (`express.static` for front-end assets)
        │
 4. ───▼─── NestJS Route Middleware Layer
        │     ├─► `RequestAuditMiddleware` (Records mutation start time process.hrtime.bigint)
        │     ├─► `AuthRateLimitMiddleware` (Checks brute-force failure threshold on /auth/*)
        │     └─► `OnboardingRateLimitMiddleware` (Rate limits public quote/onboarding writes)
        │
 5. ───▼─── NestJS Global Guards (Execution Order is Critical)
        │     ├─► [1] `JwtAuthGuard` (Extracts Bearer/Cookie token, verifies signature, sets req.user)
        │     ├─► [2] `RolesGuard` (Validates @Roles() against caller's role hierarchy)
        │     └─► [3] `RequiresModuleGuard` (Validates @RequiresModule() against tenant subscription plan)
        │
 6. ───▼─── NestJS Global Pipes (`ValidationPipe` with forbidNonWhitelisted & whitelist DTO stripping)
        │
 7. ───▼─── Controller & Service Execution (Business Logic + `scopeToCollege` Tenancy Filtering)
        │
 8. ───▼─── Response Finalization (`res.on('finish')` hook)
        │     ├─► Audit Log Dispatch: Emits actor, role, status, and duration to `audit-YYYY-MM-DD.log`
        │     └─► Rate Limit Accrual: Increments failure counter if status == 401 UNAUTHORIZED
        │
 9. ───▼─── Global Exception Filter (`AllExceptionsFilter` traps HttpExceptions and formats standard envelopes)
        │
 Client Receives HTTP Response
```

---

## 🛡 Deep-Dive: Middleware Architecture

Middleware in BarelyPassing sits at the network boundary and intercepts incoming requests before guards, interceptors, pipes, or controllers execute.

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 MIDDLEWARE STACK OVERVIEW                                   │
├──────────────────────────────┬──────────────────────────────┬───────────────────────────────┤
│ Middleware Class             │ Scope / Binding              │ Key Policy & Purpose          │
├──────────────────────────────┼──────────────────────────────┼───────────────────────────────┤
│ `RequestAuditMiddleware`     │ Global (`AppModule`)         │ Immutable state-change trail  │
│ `AuthRateLimitMiddleware`    │ Scoped (`AuthController`)   │ Failure-only brute force block│
│ `OnboardingRateLimitMiddleware` Scoped (`OnboardingController`) Bound public draft creation │
│ `cookieParser`               │ Global (`main.ts`)           │ Session cookie extraction     │
│ `helmet`                     │ Global (`main.ts`)           │ HTTP hardening headers        │
└──────────────────────────────┴──────────────────────────────┴───────────────────────────────┘
```

---

### 3.1 Request Audit Middleware (`RequestAuditMiddleware`)
**File**: `back-end/src/common/middleware/request-audit.middleware.ts`

The `RequestAuditMiddleware` provides an immutable, tamper-evident audit trail ("who changed what and when") without polluting standard application debug logs.

#### Architectural Highlights:
1. **Zero Hot-Path Overhead**:
   ```typescript
   const READ_ONLY_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
   if (READ_ONLY_METHODS.has(req.method)) return next();
   ```
   Safe HTTP read methods return immediately on line 1 before any memory allocation or timers.
2. **Delayed Attribution via `res.on('finish')`**:
   Middleware executes at Stage 4 (before `JwtAuthGuard` at Stage 5). Therefore, `req.user` is not yet populated at request start. By hooking the response `finish` event, the middleware captures the authenticated caller identity (`user.sub`, `user.role`) alongside the final HTTP status code.
3. **Dedicated Log File Separation**:
   Emits structured JSON logs to `logs/audit-YYYY-MM-DD.log` using a separate Pino file stream (`base: null` drops unnecessary machine pid/hostname).
4. **Express 5 Wildcard Compatibility in `AppModule`**:
   ```typescript
   consumer
     .apply(RequestAuditMiddleware)
     .exclude(...AUDIT_EXCLUDED_ROUTES)
     .forRoutes({ path: '*path', method: RequestMethod.ALL });
   ```
5. **Excluded Routes**:
   - `POST /api/uploads`: Already audited with byte size, MIME, and checksums in `UploadsService`.
   - `POST /api/auth/logout`: Clears session cookie without altering stored business state.

---

### 3.2 Authentication Rate Limiter (`AuthRateLimitMiddleware`)
**File**: `back-end/src/common/middleware/rate-limit.middleware.ts`

Protects authentication endpoints (`/api/auth/*`) from password brute-force and credential stuffing attacks.

#### Architectural Highlights:
1. **Route-Scoped Binding**:
   Bound in `AuthModule.configure()` using `consumer.apply(AuthRateLimitMiddleware).forRoutes(AuthController)`. It is completely absent from the execution stack for the other 170+ application routes.
2. **Failure-Only Accrual Policy**:
   ```typescript
   res.on('finish', () => {
     if (res.statusCode !== HttpStatus.UNAUTHORIZED) return;
     limiter.record(key);
   });
   ```
   **Why this matters**: Universities often NAT hundreds of lab computers behind a single public campus IP. If all requests were counted, normal student logins would lock out the entire lab. By only counting `401 Unauthorized` responses, legitimate users are never penalized.
3. **Early Rejection**:
   Rejected requests throw an `HttpException` with `ErrorCode.RATE_LIMITED` and set standard `Retry-After: <seconds>` headers before bcrypt computation or database queries run.

---

### 3.3 Institutional Onboarding Limiter (`OnboardingRateLimitMiddleware`)
**File**: `back-end/src/billing/onboarding/onboarding-rate-limit.middleware.ts`

Protects the public self-service college onboarding pipeline (`/api/billing/onboarding/*`).

- **All-Request Accrual Policy**: Every request is counted towards the limit (default: 30 requests / 15 minutes per IP) to prevent spamming the draft database.
- **Scoped in `BillingModule`**: Bound exclusively to `OnboardingController`.

---

### 3.4 In-Memory Fixed Window Engine (`FixedWindowLimiter`)
**File**: `back-end/src/common/rate-limit/fixed-window-limiter.ts`

A lightweight, dependency-free sliding window rate limiter implemented in pure TypeScript.
- **Storage**: In-memory `Map<string, { count: number; resetAt: number }>`
- **No Redis Dependency**: Zero external infrastructure overhead for single-instance deployments.
- **Lazy Eviction**: Expired buckets are cleared on lookup; periodic sweep prevents memory leaks.

---

### 3.5 Global Express Middleware & Security Headers
**File**: `back-end/src/main.ts`

- **`cookieParser()`**: Parses signed and unsigned cookies from request headers, making session tokens available to `JwtAuthGuard`.
- **`helmet()`**: Configures HTTP security headers (`Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Cross-Origin-Resource-Policy`).
- **CORS Protection**: Restricted to explicit origin lists configured via `CORS_ORIGIN`.

---

## 🚪 Guards & Access Control Pipeline

NestJS Guards execute after middleware and determine whether a request has permission to reach the controller handler.

```
Request Entry
     │
     ▼
[Stage 1: JwtAuthGuard] ────────► 401 UNAUTHORIZED (Missing/Invalid Token)
     │ Valid Token + Tenancy Claims
     ▼
[Stage 2: RolesGuard] ──────────► 403 ACCESS_DENIED (Insufficient Role Permissions)
     │ Role Matches @Roles(...)
     ▼
[Stage 3: RequiresModuleGuard] ─► 403 MODULE_NOT_LICENSED (Tenant Plan Excludes Module)
     │ Module Enabled for College
     ▼
Controller Handler
```

### 4.1 JWT Authentication Guard (`JwtAuthGuard`)
**File**: `back-end/src/auth/jwt-auth.guard.ts`
- **Dual-Token Extraction**: Reads JWT from `Authorization: Bearer <token>` header OR HTTP-only `bp_session` cookie.
- **Signature & Tenancy Verification**: Validates signature using `JWT_SECRET`, decodes claims (`sub`, `role`, `college_id`, `name`), and attaches the validated principal to `request.user`.
- **Public Route Bypass**: Bypasses authentication for routes decorated with `@Public()` (`login`, `signup`, `health`, `onboarding`).

### 4.2 Role-Based Access Control (`RolesGuard`)
**File**: `back-end/src/auth/roles.guard.ts`
- Matches the caller's role against `@Roles(...)` metadata.
- Supports role inheritance and multiple authorized roles.

### 4.3 Modular SaaS Feature Gating (`RequiresModuleGuard`)
**File**: `back-end/src/billing/requires-module.guard.ts`
- Checks `@RequiresModule(BillingModule.FORUM)` against the college's active license.
- Blocks unauthorized modules with a descriptive `403 MODULE_NOT_LICENSED`.

---

## 🧩 Modern React Architecture & Portals

The frontend is built as a single, cohesive **React Single Page Application** in `front-end-react/`:

| Portal / Role | React Route | Entry Component | Key Capabilities |
|---|---|---|---|
| **Public Gateway** | `/` | `Landing.jsx` | Platform introduction, SaaS features, live demo links |
| **Authentication** | `/login` | `Login.jsx` | Multi-role credential authentication, redirect routing |
| **Institutional Onboarding** | `/onboarding` | `Onboarding.jsx` | Multi-step college registration and module licensing wizard |
| 🎓 **Student Portal** | `/student/*` | `StudentDashboard.jsx` | Timetable grid, syllabus tracker, course self-enrollment, attendance heatmap, leave requests with document upload, and BTP milestone submissions |
| 👨‍🏫 **Faculty Portal** | `/faculty/*` | `FacultyDashboard.jsx` | Class rosters, student grade entry, attendance logging, meeting scheduling, research supervision |
| 🛡️ **Admin & Head Portal** | `/admin/*` | `AdminHeadDashboard.jsx` | User lifecycle management, course allocations, institutional compliance reports, leave approvals, fee records |
| 🤝 **SPOC Portal** | `/spoc/*` | `SpocDashboard.jsx` | Institution subscription management, billing tiers, team contacts |
| 👑 **Super Admin** | `/superadmin/*` | `SuperadminDashboard.jsx` | Global institutional governance, tenant onboarding reviews |

---

## 🧪 Automated Test Suite & Verification

The backend test suite validates middleware behavior, rate limiters, guards, error envelopes, and business services:

```bash
cd back-end
npm test
```

### Test Suite Summary:
- **`rate-limit.middleware.ts`**: Verifies failure-only accrual, window reset, client IP resolution, and 429 response structure.
- **`request-audit.middleware.ts`**: Verifies read-only method bypass, response finish hook timing, and audit record shape.
- **`jwt-auth.guard.ts`**: Verifies token signature decoding, cookie/header extraction, and tenancy context attachment.
- **`roles.guard.ts` & `requires-module.guard.ts`**: Verifies role matrix enforcement and module licensing gating.
- **Total Test Results**:
  - `7 / 7` Test Suites Passed (100%)
  - `98 / 98` Unit & Integration Tests Passed (100%)
  - TypeScript build: 0 errors
  - Frontend syntax validation: 0 errors

---

© 2026 BarelyPassing Platform. Built with NestJS, TypeScript, and React 18.
