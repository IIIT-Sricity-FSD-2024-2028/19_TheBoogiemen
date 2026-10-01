# BarelyPassing

A multi-college (B2B) academic management platform. Each institute signs up, configures its own
ID formats, academic structure, grading and attendance rules, then runs attendance, leave, marks,
fees, events and support for students, faculty, HODs, the director and the finance office.

- **Frontend:** React 18 + Vite, Redux Toolkit, React Router, Recharts, lucide-react (`front-end/`)
- **Backend:** NestJS, JWT in an http-only cookie, role and college scoping, JSON file store (`back-end/`)
- One origin: the backend serves the built React app and the API at <http://localhost:5001>

See [SETUP.md](SETUP.md) for installation and scripts.

## Quick start

```bash
cd back-end && npm install && cp .env.example .env
```

Set `JWT_SECRET` in `back-end/.env` (the server refuses to start without one), then:

```bash
cd front-end && npm install && npm run build
```

```bash
cd back-end && npm run start:dev
```

Open <http://localhost:5001>.

## Demo accounts

On the sign-in page, choose the portal card that matches the account. Signing in through the wrong
portal is refused with `ROLE_MISMATCH`.

**Demo Institute of Technology (DIT):** Growth plan, all modules (fees, research, forum, analytics),
roll numbers like `2024CSE001`, 75% attendance minimum, 10-point grading.

| Portal | Email | Password |
|---|---|---|
| Student | `student@dit.edu` | `Student@2026` |
| Faculty | `faculty@dit.edu` | `Faculty@2026` |
| HOD (CSE) | `hod.cse@dit.edu` | `Hod@2026!` |
| HOD (ECE) | `hod.ece@dit.edu` | `Hod@2026!` |
| Director | `director@dit.edu` | `Director@2026` |
| Finance | `finance@dit.edu` | `Finance@2026` |
| Institute SPOC | `spoc@dit.edu` | `Spoc@2026!` |

**Riverside College (RVC):** Starter plan with no add-on modules, IDs like `RVC/24/0001`, 80% attendance
minimum, 4-point grading. It shows that each college's data and rules are separate. The accounts are the
same as DIT's with `@rvc.edu` and the same passwords; the HOD is `hod@rvc.edu`.

**Platform support** (portal "Platform support"; password `Support@2026` for all):

| Level | Email | Handles |
|---|---|---|
| L4 Platform admin | `admin@platform.bp` | Everything, subscriptions, staff |
| L3 Support manager | `manager@platform.bp` | All tickets, assignment, priority, closing, analytics |
| L2 Technical | `tech@platform.bp`, `tech2@platform.bp` | Escalated technical tickets, internal notes |
| L1 Agent | `agent@platform.bp`, `agent2@platform.bp` | Triage, first response, resolve or escalate to L2 |
| Sales | `sales@platform.bp` | Billing tickets, onboarding pipeline |

Only the student and faculty accounts listed above are shown on this page. The seed has more
students and faculty; their emails are in `back-end/data/mock-db.json`, and they use the same
passwords as their role. To restore the original demo data, run `cd back-end && npm run seed:demo`.

## End-to-end flows

| Flow | Path |
|---|---|
| Leave | Student or faculty applies → department HOD approves or rejects (HOD leave → director) → an approved student leave turns absences in those dates into *excused* |
| Attendance correction | Student disputes an absence → the course faculty accepts (the record becomes *present*) or rejects it with a reason |
| Academics | Faculty creates an assessment → enters marks (the grade is computed from the college scale) → publishes it → the student sees the result → HOD and director reports and at-risk lists update |
| Fees | Finance defines fee structures and generates fees for a batch, or bills one student → records offline payments (numbered receipts) → the student pays online through the test-mode gateway → receipt PDF |
| Onboarding | Institute picks a plan → test-mode payment → the SPOC account is created → the setup wizard covers profile, departments and structure, ID formats, grading, custom fields and people (CSV import) → new users must change their temporary password on first sign-in |
| Support | A college user raises a ticket → L1 triages and escalates one level at a time → L2/L3 resolve it with public replies and internal notes → the college can reopen it within 7 days. SLA targets are set by priority |

These flows are covered by `back-end/test/flows.e2e-spec.ts`.

## React, Redux and middleware

- **React:** one SPA with a lazily loaded portal per role (`front-end/src/features/<portal>`) and a shared
  `PortalLayout`, data table, modals, charts, and loading, empty and error views.
- **Redux store** (`front-end/src/app/store.js`):
  - `auth` holds the session from `GET /api/auth/me`.
  - `ui` holds toasts and recent activity.
  - `notifications` holds notification state.
  - Each portal has one slice, built with `createResourceSlice`.
- **Redux middleware**, applied in this order:
  1. `tokenAuthMiddleware`: any 401 ends the session.
  2. `apiErrorMiddleware`: every failed write shows an error toast.
  3. `sessionTimerMiddleware`: signs out at token expiry and syncs sign-out across tabs.
  4. `activityLoggerMiddleware`: records recent successful actions.
- **Backend middleware and guards:**
  - Request identity comes from the verified JWT and is used for logging, audit and tenant context.
  - `JwtAuthGuard` and `RolesGuard` protect routes.
  - `RequiresModuleGuard` blocks features the college has not licensed.
  - Every query is scoped to the caller's college. HODs are limited to their own department.

## Tests

```bash
cd back-end && npm test
```

```bash
cd back-end && npm run test:e2e
```

The first command runs the unit tests. The second runs the cross-role flow tests against a temporary
copy of the seed.
