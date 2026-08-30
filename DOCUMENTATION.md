# BarelyPassing - Comprehensive A-to-Z Technical Documentation

This document provides a detailed, end-to-end breakdown of the **BarelyPassing** platform, covering the frontend dashboard system, NestJS modular backend API, security layers, database migration strategy, and setup instructions.

---

## 1. System Architecture & Folder Layout

The project separates the static, client-side user interface from the API backend.

```
19_TheBoogiemen/
├── data/
│   └── mock-db.json                  # Local JSON database storage
├── front-end/                        # Static Frontend (Vanilla Web)
│   ├── index.html                    # Public Landing Page
│   ├── login.html                    # Contextual Login Interface
│   ├── signup.html                   # Student Self-Registration Page
│   ├── student.html                  # Student Portal Dashboard
│   ├── faculty.html                  # Faculty Portal Dashboard
│   ├── super-user.html               # Academic Head / Admin Portal
│   ├── super-admin.html              # Super Admin Management Dashboard
│   ├── style.css                     # Design Tokens & Layout Rules
│   ├── state.js                      # Session manager & same-origin fetch client
│   └── fixes.js                      # Core frontend view-routing & render script
└── back-end/                         # NestJS Backend Application
    ├── scripts/                      # DB seeding and parsing scripts
    ├── src/
    │   ├── main.ts                   # Bootstrapper (CORS, Swagger, middlewares)
    │   ├── app.module.ts             # Root module (combines guards and modules)
    │   ├── auth/                     # Authenticator (JWT, cookies, Guards)
    │   ├── database/                 # In-Memory & Postgres database services
    │   ├── modules/                  # Workflow-based API modules (Domain features)
    │   └── common/                   # Global filters, error codes, process handlers
    └── test/                         # E2E integration test suites
```

---

## 2. Frontend Architecture Walkthrough

The frontend is built using **Vanilla HTML5, CSS3, and modern JavaScript (ES6+)** with zero external framework dependencies to ensure fast load times and absolute control.

### Core Architecture Files

1. **[`front-end/state.js`](file:///19_TheBoogiemen/front-end/state.js)**:
   - **Session Control**: Manages user authentication state. Because sessions travel inside secure `httpOnly` cookies, JavaScript cannot read the token itself. Instead, it reads a cached timestamp `bp_expires_at` and profile payload `bp_user` from `localStorage` for visual states.
   - **Fetch Wrapper (`apiFetch`)**: Standardizes API calls with `credentials: 'same-origin'` to ensure the browser attaches cookies. It intercepts **401 Unauthorized** responses to trigger a local client logout, and throws **403 Forbidden** errors safely without destroying the session.

2. **[`front-end/fixes.js`](file:///19_TheBoogiemen/front-end/fixes.js)**:
   - **View Routing**: Replaces full-page reloads with a client-side view-switcher `switchView(viewId, clickedEl)`.
   - **Dynamic Render Engine**: Inspects the current user's role from the session and triggers specific render functions. It compiles data dynamically (profile details, attendance tables, research uploads, forum threads) and populates widgets using vanilla DOM manipulation.

### Design System & Aesthetics
- **Design Tokens**: Configured in [`front-end/style.css`](file:///19_TheBoogiemen/front-end/style.css) using CSS Variables. Harmonies of deep slates (`#0f172a`), indigos (`#6366f1`), and emeralds (`#10b981`) avoid raw/generic color schemes.
- **Glassmorphism**: Leverages subtle gradients, translucent card backgrounds (`rgba(255, 255, 255, 0.85)`), and backdrop filters (`blur(12px)`) for a premium layout.
- **Typography**: Uses modern `Outfit` and `Inter` sans-serif font fallbacks.

---

## 3. Backend Architecture Walkthrough

The backend is built on **NestJS (TypeScript)**, utilizing Express as the underlying platform.

### Startup Configuration
The entrypoint is **[`back-end/src/main.ts`](file:///19_TheBoogiemen/back-end/src/main.ts)**, which implements the following boot sequence:
1. **Dotenv Pre-Loading**: Loads `.env` environment variables explicitly before importing Nest modules to prevent decorators from seeing undefined variables.
2. **Nest-Pino Routing**: Hooks NestJS's internal lifecycle logging into the Pino logger.
3. **CORS Security**: Cross-origin requests are blocked by default unless allowed via `CORS_ORIGIN`. Credentials transmission (`httpOnly` cookies) is enabled.
4. **Cookie Parser**: Registers `cookie-parser` globally to parse session cookies.
5. **Global Validation**: Applies a global `ValidationPipe` with `forbidNonWhitelisted: true` to reject payloads containing unknown/unauthorized fields.
6. **Static File Server**: Serves files in the `front-end` directory from the root path.
7. **Swagger Documentation**: Configures interactive OpenAPI docs at `/api/docs`.

### Global Request Handling
- **Exceptions Filtering ([`http-exception.filter.ts`](file:///19_TheBoogiemen/back-end/src/common/filters/http-exception.filter.ts))**: Normalizes all unhandled exceptions into the system's structured contract: `ErrorCode` + description. It also intercepts database constraint conflicts (e.g., unique violations) and surfaces them as friendly `409` HTTP responses rather than opaque `500` server errors.
- **Process Protection ([`process-handlers.ts`](file:///19_TheBoogiemen/back-end/src/common/errors/process-handlers.ts))**: Attaches process-level event listeners to intercept `uncaughtException` and `unhandledRejection` triggers, logging details before executing a clean process shutdown.

### Logging Architecture
Structured JSON logging is built on **Pino** and is controlled by `LOG_LEVEL` (`debug` in dev, `info` in prod).
- **Development**: Output is colour-pretty printed.
- **Production**: Outputs pure JSON strings optimized for log aggregators (e.g., Elasticsearch, Datadog).
- **Security**: Logs redact sensitive keys such as `Authorization`, cookies, `password`, and `new_password`.
- **Request Tracing**: Maps a unique `reqId` to each incoming request, matching the response's `X-Request-Id` header so errors can be traced.

---

## 4. Authentication, Security & Session Management

Security operates under a strict **deny-by-default** policy. Only `/api/auth/login` and `/api/auth/signup` are public endpoints.

```mermaid
sequenceDiagram
    participant Client as Browser (Frontend)
    participant Server as NestJS Backend
    participant DB as Datastore (mock-db / Postgres)

    Client->>Server: POST /api/auth/login (email, password)
    Server->>DB: Query User & check bcrypt hash
    DB-->>Server: User authenticated (role, id)
    Server-->>Client: HTTP 200 + Set httpOnly Cookie (JWT) & profile JSON
    
    Note over Client, Server: Subsequent requests
    Client->>Server: GET /api/students/profile (attaches Cookie automatically)
    Server->>Server: JwtAuthGuard verifies JWT signature
    Server->>Server: RolesGuard checks user role permissions
    Server->>DB: Fetch profile
    DB-->>Server: Profile data
    Server-->>Client: HTTP 200 + Profile data
```

### Key Security Components

1. **JWT Session Token**: 
   - Signed cryptographically using a strong `JWT_SECRET`.
   - Stored in a secure `httpOnly` cookie. This prevents client-side JavaScript (and potential XSS vectors) from reading or hijacking the session.
   - Swagger / Test Fallback: Standard `Authorization: Bearer <token>` headers are parsed if the cookie is not present.

2. **Route Authorization Guards**:
   - **[`JwtAuthGuard`](file:///19_TheBoogiemen/back-end/src/auth/jwt-auth.guard.ts)**: Verifies the JWT signature, decodes claims (`sub` as user ID, and `role`), and populates `request.user`.
   - **[`RolesGuard`](file:///19_TheBoogiemen/back-end/src/auth/roles.guard.ts)**: Validates `request.user.role` against metadata decorators on the controller (e.g., `@Roles('admin', 'head')`). It returns a `403 Forbidden` if permissions are insufficient.

3. **Password Policy**:
   - Both client and server validate passwords using a regex pattern. Password changes must satisfy:
     - Minimum 8 characters.
     - At least 1 uppercase letter (A-Z).
     - At least 1 lowercase letter (a-z).
     - At least 1 number (0-9).
     - At least 1 special character (e.g., `@$!%*?&`).
   - Stored passwords are salted and hashed using **bcrypt** (default 12 rounds).

---

## 5. Database & Persistence Strategies

The project supports dual persistence modes controlled by the `DATA_STORE` environment variable.

### Datastores

#### 1. JSON Storage Mode (`DATA_STORE=memory`)
Uses `data/mock-db.json` as the persistence layer. Reads and writes are managed by **[`InMemoryDbService`](file:///19_TheBoogiemen/back-end/src/database/in-memory-db.service.ts)**. It wraps in-memory collections inside JavaScript `Proxy` arrays. Operations like `.push()`, `.splice()`, or updating a key trigger an automatic filesystem write (`persist()`).

#### 2. PostgreSQL Storage Mode (`DATA_STORE=postgres`)
Backed by a relational database schema managed by **[`PostgresService`](file:///19_TheBoogiemen/back-end/src/database/postgres/postgres.service.ts)**.
- **Connection Limits**: The connection pool configures a small budget (`DB_POOL_MAX` default `5`, capped at `20`) to stay within Aiven Postgres free tier limitations.
- **SSL Validation**: Remote database connections require a path to Aiven's Root CA certificate `ca.pem` mapped under `PGSSLROOTCERT`. It enforces verification (`rejectUnauthorized: true`) to prevent man-in-the-middle exploits.
- **Schema Mapping**: The relational schema ([`001_initial_schema.sql`](file:///19_TheBoogiemen/back-end/src/database/migrations/001_initial_schema.sql)) mirrors the JSON format keys to prevent code refactoring during the database migration. Nested arrays are modeled as `jsonb` fields (such as milestones in research projects), and primary keys accept string-based application-generated IDs.

### Migration Status & Roadblocks

The database integration is **partially migrated**. The PostgreSQL schema is fully provisioned and correct, but the application business logic does not query it yet.

- **Data-Access Status**: **176 data-access call sites still read/write through `InMemoryDbService`**, and **0 use `PostgresService`**. Even with `DATA_STORE=postgres` active, a write request (e.g. `POST /api/leave`) still lands in `data/mock-db.json` rather than the database.
- **Verification Example**:
  ```bash
  # Check count in Postgres
  docker exec bp-pg-test psql -U bpuser -d barelypassing_dev -t -A -c "SELECT count(*) FROM leave_applications;"
  # Check count in JSON File
  node -e "console.log(require('./data/mock-db.json').leave_applications.length)"
  ```

### Database Security Audit Enforcement

Several vulnerabilities discovered during the security audit are structurally prevented by database-level constraints:

| Audit Finding | Enforced by Database Constraint | Description |
| :--- | :--- | :--- |
| **H-07 Duplicate Attendance IDs** | `attendance_log_pkey` | Prevents duplicate primary key insertion. |
| **M-01 Duplicate Attendance per Student** | `UNIQUE (student_id, course_id, date)` | Ensures a student cannot have multiple attendance logs for the same course on the same day. |
| **H-03 Marks-Lock Bypass** | `UNIQUE (student_id, assessment_id)` | Restricts mark overrides after entries are finalized. |
| **M-02 Invalid Attendance Status** | `CHECK (status IN ('present','absent','excused'))` | Enforces valid status values. |
| **C-04 Invalid User Role** | `CHECK (role IN ('student','faculty','admin','head','superadmin'))` | Strict role restriction constraint. |
| **Orphaned Rows** | 26 Foreign Key constraints | Triggers `ON DELETE CASCADE` or `ON DELETE SET NULL` on related items. |

### Technical Gotchas ("Things That Bit Us")

1. **Type Mappings Mismatch**:
   - The PostgreSQL driver (`pg`) returns database type `NUMERIC` as a string and `DATE` as a JavaScript `Date` object.
   - This breaks logic comparing types (e.g. `isAtRisk()` expects a number for CGPA, and string date comparisons like `record.date === today` fail against Date objects).
   - Solution: Global type parsers in [`pg-types.ts`](file:///19_TheBoogiemen/back-end/src/database/postgres/pg-types.ts) parse `numeric` back to numbers and `date` to ISO/SQL string representation. These must be registered *before* the pool is created.
2. **Missing SQL Assets in Builds**:
   - By default, `nest build` ignores non-TypeScript files (like `.sql` migration files). This caused the production container's migration runner to silently find an empty directory and skip schema setup.
   - Solution: Configured the `assets` compiler options in `nest-cli.json` to copy SQL files to the output `/dist` folder.
3. **Environment Loader Mismatch**:
   - Nest's `ConfigModule` initializes during module instantiation, which occurs *after* module decorators are evaluated at import time. This caused database configuration scripts to read `undefined` env variables and fall back to in-memory mode.
   - Solution: Prefixed [`main.ts`](file:///19_TheBoogiemen/back-end/src/main.ts) with an explicit `dotenv.config()` call before any class imports.

### Roadmap to Finalize Migration

1. **Repository Interfaces**: Define clean interfaces over the in-memory data structures.
2. **Abstract Call Sites**: Refactor the 176 data-access call sites behind the new repository layer.
3. **SQL Implementations**: Write PostgreSQL repository implementations selected dynamically via `DATA_STORE`.
4. **Validation & Compare**: Run both stores concurrently to verify parity, then deprecate `InMemoryDbService`.


---

## 6. Deployment & Setup Instructions

### Environment Variables Config (`back-end/.env`)
Create a `.env` file in the `back-end` directory and configure:

```properties
PORT=5001
JWT_SECRET=your_long_random_jwt_secret_key_here
BCRYPT_ROUNDS=12
DATA_STORE=memory # Set to 'postgres' to use PostgreSQL

# Postgres settings (only required when DATA_STORE=postgres)
DATABASE_URL=postgres://user:password@host:port/database_name?sslmode=verify-full
PGSSLROOTCERT=./certs/ca.pem
DB_POOL_MAX=5
```

### Step-by-Step Installation

1. **Install Dependencies**:
   ```bash
   cd back-end
   npm install
   ```

2. **Generate JWT Secret**:
   Create the `.env` file from the example:
   ```bash
   cp .env.example .env
   ```
   Generate a cryptographic secret key and write it to `JWT_SECRET` in `.env`:
   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
   ```

3. **Migrate Seed Passwords (First Run Only)**:
   Convert cleartext passwords inside the mock database file into secure hashes:
   ```bash
   npm run migrate:passwords
   ```

4. **Spin up Local Postgres (Optional)**:
   You can run a local PostgreSQL instance via Docker:
   ```bash
   docker run -d --name barelypassing-db \
     -e POSTGRES_PASSWORD=devpass \
     -e POSTGRES_USER=bpuser \
     -e POSTGRES_DB=barelypassing_dev \
     -p 55432:5432 postgres:16-alpine
   ```
   Set `DATABASE_URL` in `back-end/.env`:
   ```properties
   DATA_STORE=postgres
   DATABASE_URL=postgres://bpuser:devpass@localhost:55432/barelypassing_dev
   ```

5. **Start Dev Server**:
   ```bash
   npm run start:dev
   ```
   The application will be served at **`http://localhost:5001`**, and API Swagger docs will be accessible at **`http://localhost:5001/api/docs`**.

### CLI Command Reference

| Command | Action |
| :--- | :--- |
| `npm run start:dev` | Starts the NestJS application with live reload. |
| `npm run build` | Compiles the TypeScript code into JavaScript in `/dist`. |
| `npm run migrate:passwords` | Hashes plaintext passwords inside the in-memory JSON file. |
| `npm run db:migrate` | Runs database migrations (schema setup) on PostgreSQL. |
| `npm run db:seed` | Performs schema migration and loads `data/mock-db.json` into Postgres. |
| `npm run db:reset` | Resets the Postgres database schemas (truncates all tables) and re-seeds. |
| `npm run lint` / `npm run format` | Validates styles and formats source code. |
| `npm run test` | Executes Jest unit test suites (68+ tests). |
| `npm run test:e2e` | Executes end-to-end integration test suites (11+ tests). |

---

## 7. Meeting Scheduling & Management Module (A-to-Z)

The **Meeting Scheduling and Management Module** is a high-availability, role-governed subsystem designed to facilitate structured 1-on-1 academic mentorship, thesis/project reviews, doubts clarification, and performance consultations between **Students** and **Faculty Members**.

### 7.1 Architecture & Role Boundaries
- **Exclusivity**: Creation, scheduling, rescheduling, and outcome completion are strictly restricted to the `student` and `faculty` roles. Admin/Head accounts have no operational role in direct 1-on-1 meeting scheduling.
- **Data Isolation**: A student can only view/manage their own meeting requests. A faculty member can only view/manage meetings where they are the designated mentor.
- **Conflict Engine**: Prevents double-booking by detecting slot overlaps across both student and faculty calendars for all active confirmed meetings.

### 7.2 Meeting Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> PENDING: Student submits Request
    [*] --> SCHEDULED: Faculty direct schedules

    PENDING --> SCHEDULED: Faculty accepts request
    PENDING --> DENIED: Faculty denies request
    PENDING --> RESCHEDULE_REQUESTED: Faculty asks to reschedule
    PENDING --> CANCELLED: Student or Faculty cancels

    RESCHEDULE_REQUESTED --> SCHEDULED: Student accepts faculty proposal / Faculty accepts student proposal
    RESCHEDULE_REQUESTED --> PENDING: Student declines faculty proposal
    RESCHEDULE_REQUESTED --> CANCELLED: Cancelled

    SCHEDULED --> RESCHEDULE_REQUESTED: Student requests reschedule
    SCHEDULED --> SCHEDULED: Faculty direct updates slot
    SCHEDULED --> COMPLETED: Faculty records minutes & marks complete
    SCHEDULED --> CANCELLED: Cancelled

    COMPLETED --> [*]
    DENIED --> [*]
    CANCELLED --> [*]
```

### 7.3 Date & Time Scheduling Rules
1. **Current Date & Time Onwards Only**:
   - Meetings can **only** be scheduled on today's date from current time onwards, or on future dates.
   - Any selection where `meetingDate < today` or (`meetingDate === today` and `startTime < currentTime`) is rejected at both frontend validation and backend service layers with a `400 Bad Request` (`BUSINESS_RULE_VIOLATION`).
2. **Lexicographical Time Boundaries**:
   - `startTime` must be strictly prior to `endTime` (`startTime < endTime`).
3. **Grace Window**:
   - Backend enforces a 60-second transmission grace buffer when evaluating timestamps for network latency.

### 7.4 Recorded Minutes of Discussion & Outcomes
When faculty completes a meeting session:
- **Discussion Notes**: Complete minutes and topics discussed.
- **Outcomes & Decisions**: Actionable conclusions reached during the meeting.
- **Action Items for Student**: Agreed tasks, deliverables, or follow-ups.
- **Faculty Remarks**: Qualitative feedback and mentoring guidance.
- Once marked **`COMPLETED`**, the record is permanently archived under the **`✓ Completed`** tab on both dashboards with formatted minutes boxes.

### 7.5 Real-Time Notifications & Dashboard Alerts
- **Faculty Dashboard Overview**:
  - Prominent alert banner on the top of `#dashboard-view` highlighting pending requests (`⏳ Action Required`) and student reschedule requests (`🔄 Awaiting Response`) with 1-click review shortcuts.
  - Live notification badge on the sidebar **Meetings** link showing total pending action items.
  - In-app notification bell dispatches instant alerts upon every request or schedule change.
- **Student Dashboard**:
  - Instant notification upon meeting confirmation, reschedule proposal, or completion with feedback.

### 7.6 API Reference Table

| Method | Endpoint | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/meetings` | `student` | Creates a new meeting request with specified faculty |
| `POST` | `/api/meetings/faculty-schedule` | `faculty` | Directly creates a confirmed scheduled meeting with student |
| `GET` | `/api/meetings/my` | `student`, `faculty` | Retrieves all meetings associated with authenticated user |
| `GET` | `/api/meetings/faculty/requests` | `faculty` | Retrieves pending meeting requests for faculty |
| `GET` | `/api/meetings/faculty-list` | `student` | Directory of faculty available for meetings |
| `GET` | `/api/meetings/student-list` | `faculty` | Directory of students available for scheduling |
| `PATCH` | `/api/meetings/:id/accept` | `faculty` | Confirms student request and establishes schedule & link |
| `PATCH` | `/api/meetings/:id/ask-reschedule` | `faculty` | Proposes alternative date/time for student review |
| `PATCH` | `/api/meetings/:id/deny` | `faculty` | Rejects meeting request with denial reason |
| `PATCH` | `/api/meetings/:id/request-reschedule` | `student` | Requests alternative slot for confirmed meeting |
| `PATCH` | `/api/meetings/:id/handle-student-reschedule` | `faculty` | Accepts student reschedule or proposes counter-slot |
| `PATCH` | `/api/meetings/:id/accept-reschedule` | `student` | Accepts faculty proposed reschedule |
| `PATCH` | `/api/meetings/:id/decline-reschedule` | `student` | Declines faculty proposed reschedule |
| `PATCH` | `/api/meetings/:id/faculty-reschedule` | `faculty` | Directly updates date, time, or venue of confirmed meeting |
| `PATCH` | `/api/meetings/:id/complete` | `faculty` | Records minutes, outcomes, action items, and marks completed |
| `PATCH` | `/api/meetings/:id/cancel` | `student`, `faculty` | Cancels meeting session |

