# 🎓 BarelyPassing – Enterprise Multi-Tenant EdTech Platform
### *Comprehensive Architecture & Middleware Pipeline Reference*

> **BarelyPassing** is an enterprise-grade university ERP, LMS, and academic intelligence system engineered with NestJS and modern web technologies. It features strict multi-tenant institutional isolation, modular SaaS billing enforcement, granular assessment grading, attendance auditing, and a battle-tested **layered middleware and guard pipeline**.

---

## 📑 Table of Contents
1. [System Architecture & Multi-Tenancy](#-system-architecture--multi-tenancy)
2. [Complete Request Lifecycle Pipeline](#-complete-request-lifecycle-pipeline)
3. [Deep-Dive: Middleware Architecture](#-deep-dive-middleware-architecture)
   - [3.1 Request Audit Middleware (`RequestAuditMiddleware`)](#31-request-audit-middleware-requestauditmiddleware)
   - [3.2 Authentication Rate Limiter (`AuthRateLimitMiddleware`)](#32-authentication-rate-limiter-authratelimitmiddleware)
   - [3.3 Institutional Onboarding Limiter (`OnboardingRateLimitMiddleware`)](#33-institutional-onboarding-limiter-onboardingratelimitmiddleware)
   - [3.4 In-Memory Fixed Window Engine (`FixedWindowLimiter`)](#34-in-memory-fixed-window-engine-fixedwindowlimiter)
   - [3.5 Global Express Middleware & Security Headers](#35-global-express-middleware--security-headers)
4. [Guards & Access Control Pipeline](#-guards--access-control-pipeline)
   - [4.1 JWT Authentication Guard (`JwtAuthGuard`)](#41-jwt-authentication-guard-jwtauthguard)
   - [4.2 Role-Based Access Control (`RolesGuard`)](#42-role-based-access-control-rolesguard)
   - [4.3 Modular SaaS Feature Gating (`RequiresModuleGuard`)](#43-modular-saas-feature-gating-requiresmoduleguard)
   - [4.4 Ephemeral Onboarding Session Guard (`OnboardingSessionGuard`)](#44-ephemeral-onboarding-session-guard-onboardingsessionguard)
5. [Exception Filtering & Error Handling](#-exception-filtering--error-handling)
6. [Multi-Role Portals & Modules](#-multi-role-portals--modules)
7. [Demo Credentials & Tenant Identifiers](#-demo-credentials--tenant-identifiers)
8. [Setup & Quick Start](#-setup--quick-start)
9. [Automated Test Suite & Verification](#-automated-test-suite--verification)

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
   *Note*: Uses named wildcard `*path` rather than `*` to adhere to Express 5 / `path-to-regexp` v8 syntax and allow NestJS to properly apply the `/api` prefix.
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

#### Architectural Highlights:
1. **All-Request Accrual Policy**:
   Unlike login, onboarding routes allow unauthenticated clients to generate quotes, draft college registrations, and calculate seat tiers. Every request is counted towards the limit (default: 30 requests / 15 minutes per IP) to prevent spamming the draft database.
2. **Scoped in `BillingModule`**:
   Bound exclusively to `OnboardingController`.

---

### 3.4 In-Memory Fixed Window Engine (`FixedWindowLimiter`)
**File**: `back-end/src/common/rate-limit/fixed-window-limiter.ts`

A lightweight, dependency-free sliding window rate limiter implemented in pure TypeScript.

- **Storage**: In-memory `Map<string, { count: number; resetAt: number }>`
- **No Redis Dependency**: Zero external infrastructure overhead for single-instance deployments.
- **Lazy Eviction**: Expired buckets are cleared on lookup; periodic sweep prevents memory leaks.

```typescript
export class FixedWindowLimiter {
  constructor(private readonly max: number, private readonly windowMs: number) {}

  retryAfterSeconds(key: string): number | null {
    const entry = this.hits.get(key);
    if (!entry) return null;
    const now = Date.now();
    if (now >= entry.resetAt) { this.hits.delete(key); return null; }
    return entry.count >= this.max ? Math.ceil((entry.resetAt - now) / 1000) : null;
  }
}
```

---

### 3.5 Global Express Middleware & Security Headers
**File**: `back-end/src/main.ts`

- **`cookieParser()`**: Parses signed and unsigned cookies from request headers, making session tokens available to `JwtAuthGuard` before guards run.
- **`helmet()`**: Configures HTTP security headers:
  - `Strict-Transport-Security` (HSTS)
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: SAMEORIGIN`
  - `Cross-Origin-Resource-Policy: same-origin`
  - `Cross-Origin-Opener-Policy: same-origin`
  - `Referrer-Policy: no-referrer`
- **CORS Protection**: Restricted to explicit origin lists configured via `CORS_ORIGIN`, supporting credentials and headers `Content-Type, Accept, Authorization`.

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
- Evaluates controller and handler `@Roles('student', 'faculty', 'head', 'INSTITUTE_SUPER_ADMIN', 'FINANCE_ADMIN', 'spoc', 'PLATFORM_SUPER_ADMIN')` metadata against `request.user.role`.
- Normalizes role aliases (e.g., `superadmin` ↔ `INSTITUTE_SUPER_ADMIN`, `head` ↔ `DEPARTMENT_ADMIN_HOD`).

### 4.3 Modular SaaS Feature Gating (`RequiresModuleGuard`)
**File**: `back-end/src/common/guards/requires-module.guard.ts`
- Enforces subscription tier boundaries (e.g., `@RequiresModule('fees')`, `@RequiresModule('research')`, `@RequiresModule('forum')`).
- Inspects the active institution's licensed module array and denies access if the feature is not active for the tenant.

### 4.4 Ephemeral Onboarding Session Guard (`OnboardingSessionGuard`)
**File**: `back-end/src/billing/onboarding/onboarding-session.guard.ts`
- Protects multi-step onboarding wizard progression using HMAC-signed ephemeral tokens (`x-onboarding-session`), preventing out-of-sequence step submission.

---

## ⚠️ Exception Filtering & Error Handling

### Global All-Exceptions Filter (`AllExceptionsFilter`)
**File**: `back-end/src/common/filters/http-exception.filter.ts`

Standardizes every error response across the entire system into a single consistent JSON schema:

```json
{
  "success": false,
  "statusCode": 403,
  "errorCode": "ACCESS_DENIED",
  "message": "You do not have permission to perform this action.",
  "timestamp": "2026-08-31T15:30:00.000Z",
  "path": "/api/admin/users",
  "requestId": "req-9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "details": {}
}
```

#### Core Error Codes:
- `AUTHENTICATION_REQUIRED` (401): Missing or expired JWT token.
- `ACCESS_DENIED` (403): Role mismatch or missing permissions.
- `MODULE_NOT_LICENSED` (403): Feature not in tenant subscription.
- `RATE_LIMITED` (429): Brute-force or request limit exceeded.
- `VALIDATION_FAILED` (400): Class-validator DTO constraint failed.
- `BUSINESS_RULE_VIOLATION` (400): Academic constraint violation.
- `RESOURCE_NOT_FOUND` (404): Entity does not exist.

---

## 👥 Multi-Role Portals & Modules

| Portal / Role | File Entrypoint | Description & Capabilities |
|---|---|---|
| **Public Gateway** | `front-end/index.html` | Institution landing, tenant code selector, portal routing. |
| **Institutional Onboarding** | `front-end/onboarding.html` | 4-step wizard for self-service university registration and module selection. |
| **SaaS Platform Vendor** | `front-end/saas.html` | Vendor HQ dashboard for college lifecycle, module management, and support tickets. |
| **Student Portal** | `front-end/student.html` | Timetable, syllabus tracking, marks review, attendance percentage, leave requests. |
| **Faculty Portal** | `front-end/faculty.html` | Class roster with real names, individual student marks entry, attendance logging. |
| **Department Head (HOD)** | `front-end/hod.html` | Course allocations, faculty review, timetable management, attendance overrides. |
| **Institute Director** | `front-end/director.html` | Cross-department analytics, retention KPIs, institutional compliance audits. |
| **Finance Officer** | `front-end/finance.html` | Fee record management, student dues tracking, payment receipts, fee structures. |
| **SPOC / Support Desk** | `front-end/spoc.html` | Dedicated customer success channel for college partners. |

---

## 🔑 Demo Credentials & Tenant Identifiers

Use **Tenant Code**: `IIITS` (or `NITW`) during sign-in.

| Role | Email | Password | Assigned Portal | Notes / Personas |
|---|---|---|---|---|
| **Student (CS-A)** | `student@iiits.in` | `Student@123` | `student.html` | John Doe (Roll: S20220010001) |
| **Student (CS-B)** | `student2@iiits.in` | `Student@123` | `student.html` | Alice Vance (Roll: S20220010002) |
| **Faculty** | `faculty@iiits.in` | `Faculty@123` | `faculty.html` | Dr. Jane Smith (Data Structures) |
| **Department Head** | `head@iiits.in` | `Head@123` | `hod.html` | Academic Head CSE |
| **Institute Director** | `director@iiits.in` | `Director@123` | `director.html` | Super Admin / Director |
| **Finance Officer** | `finance@iiits.in` | `Finance@123` | `finance.html` | Finance Officer |
| **College SPOC** | `spoc@example.com` | `Spoc@123` | `spoc.html` | Partner Success Lead |
| **SaaS Platform Admin** | `saasadmin@platform.com` | `Platform@123` | `saas.html` | Global Platform Operator |

---

## 🚀 Setup & Quick Start

### Prerequisites
- **Node.js**: v18.x or higher
- **npm**: v9.x or higher

### 1. Installation
```bash
# Clone the repository
git clone git@github.com:IIIT-Sricity-FSD-2024-2028/19_TheBoogiemen.git
cd 19_TheBoogiemen

# Install backend dependencies
cd back-end
npm install
```

### 2. Environment Configuration
Create `back-end/.env` (defaults are pre-configured in `.env.example`):
```env
PORT=5001
JWT_SECRET=super_secret_jwt_key_for_dev_must_be_long_and_secure_123
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:3000,http://127.0.0.1:3000
AUTH_RATE_LIMIT_MAX=10
AUTH_RATE_LIMIT_WINDOW_MS=900000
ONBOARDING_RATE_LIMIT_MAX=30
ONBOARDING_RATE_LIMIT_WINDOW_MS=900000
LOG_LEVEL=debug
LOG_TO_FILE=true
```

### 3. Launch Backend Server
```bash
cd back-end
npm run start:dev
```
*Backend runs on `http://localhost:5001` (or configured port). Swagger API Documentation is accessible at `http://localhost:5001/api/docs`.*

### 4. Launch Frontend Web Server
In a separate terminal:
```bash
cd front-end
npx serve -l 3000
```
*Open `http://localhost:3000` in your web browser.*

---

## 🧪 Automated Test Suite & Verification

The test suite validates middleware behavior, rate limiters, guards, error envelopes, and business services:

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

© 2026 BarelyPassing Platform. Built with NestJS, TypeScript, and modern web architecture.
