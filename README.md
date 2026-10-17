# 🎓 BarelyPassing — `front-end-react/`

### The React SPA migration of the legacy vanilla frontend

> A **presentation-layer-only rewrite** of the entire `front-end/` app — five
> actor dashboards, login, onboarding, and landing — rebuilt as a single
> React 18 SPA on Vite, talking to the **same, unmodified** NestJS API in
> `back-end/`. No endpoint changes. No behavior changes by default. Parity
> is the spec.

---

## Table of Contents

1. [What this is (and isn't)](#1-what-this-is-and-isnt)
2. [Stack & hard constraints](#2-stack--hard-constraints)
3. [Quick start](#3-quick-start)
4. [Architecture overview](#4-architecture-overview)
5. [Directory structure](#5-directory-structure)
6. [Foundation layer (Phase 0 deliverables)](#6-foundation-layer-phase-0-deliverables)
7. [Legacy → React primitive map](#7-legacy--react-primitive-map)
8. [Shared components & role branching](#8-shared-components--role-branching)
9. [Actor portals](#9-actor-portals)
10. [Cross-cutting features](#10-cross-cutting-features)
11. [Migration phases](#11-migration-phases)
12. [Ground rules](#12-ground-rules)
13. [Parity exceptions log](#13-parity-exceptions-log)
14. [Codebase conventions](#14-codebase-conventions)
15. [Production build & cutover](#15-production-build--cutover)
16. [Verification](#16-verification)
17. [Reference documents](#17-reference-documents)

---

## 1. What this is (and isn't)

The legacy app is **not** five separate apps. It is **one shared rendering
engine (`fixes.js`, 3,265 lines) switched on five different HTML shells**,
selecting which `render*()` to call by reading `Auth.getUser().role` at
runtime (`triggerViewRender()` in `fixes.js:67`).

React replaces that runtime `if (isStudent) ... else if (isFaculty) ...`
branching with what it's actually for: **components that take the active
role as a prop, or read it from context, and render conditionally.**


The migration follows the **strangler fig** pattern: `front-end/` keeps
running unmodified until the final cutover phase; this app lives on its own
dev port until then.

---

## 2. Stack & hard constraints

| Layer | Choice |
|---|---|
| Framework | React `^18.3.1` (plain JavaScript — **no TypeScript**) |
| Bundler / dev server | Vite `^5.4.11` + `@vitejs/plugin-react ^4.3.4` |
| Routing | `react-router-dom ^6.28.0` — **the one allowed dependency beyond React itself** |
| State | `useState` / `useEffect` + the **Context API only** — no state libraries |
| Styling | Ported `style.css` (+ `landing.css`, `onboarding.css`) — no CSS framework |
| Backend | Same NestJS API at `http://localhost:5001`, proxied via Vite (`/api`) |

The brief asks for *basic* React — components, props, `useState`/`useEffect`,
Context API, conditional rendering — and that's what every phase is built
from. If a phase seems to need more than that, the answer is to **simplify
the phase, not add a library.**

---

## 3. Quick start

### Prerequisites
- Backend running per the root `README.md` (`cd back-end && npm run start:dev`, port **5001**)

### Run this app

```bash
cd front-end-react
npm install
npm run dev          # → http://localhost:5173
```

The Vite dev server proxies all `/api/*` calls to the backend on port 5001
(see `vite.config.js` — `server.proxy['/api']` → `http://localhost:5001`,
`changeOrigin: true`).

### Demo accounts

| Role | Email | Password | Route |
|---|---|---|---|
| 🎒 Student | `student@example.com` | `Student@123` | `/student` |
| 👨‍🏫 Faculty | `faculty@example.com` | `Faculty@123` | `/faculty` |
| 🛡️ Admin | `admin@example.com` | `password` | `/admin` |
| 👑 Head | `head@example.com` | `Head@123` | `/admin` |
| 🏢 Superadmin | `super@example.com` | `Super@123` | `/superadmin` |
| 🤝 SPOC | `spoc@example.com` | `Spoc@123` | `/spoc` |

> On `localhost` the login page shows a quick-fill row for these demo
> credentials (preserved from legacy; Option B of the login port).

---

## 4. Architecture overview

```
                        ┌────────────────────────────────────────────┐
                        │                App.jsx                     │
                        │  BrowserRouter ▸ AuthProvider ▸            │
                        │  NotificationsProvider ▸ Routes ▸ <Toast/> │
                        └────────────────────┬───────────────────────┘
                                             │
        ┌────────────────┬───────────────┬───┴────────┬───────────────┬─────────────────┐
        │ Public         │ /student/*    │ /faculty/* │ /admin/*      │ /spoc/*         │ /superadmin/*
        │ Landing        │ StudentDash-  │ Faculty-   │ AdminHead-    │ SpocDash-       │ Superadmin-
        │ Login          │ board         │ Dashboard  │ Dashboard     │ board           │ Dashboard
        │ Onboarding     │ (role:        │ (role:     │ (role:        │ (role: spoc)    │ (role:
        │ NotFound       │  student)     │  faculty)  │  admin|head)  │                 │  superadmin)
        └────────────────┴───────────────┴────────────┴───────────────┴─────────────────┘
                                             │ every page composes
                        ┌────────────────────┴───────────────────────┐
                        │ DashboardShell = Sidebar + Topbar + <main> │
                        │   Sidebar (nav, module-gated, user card)   │
                        │   Topbar (title, badges)                   │
                        │   NotificationBell (unread, panel)         │
                        └────────────────────┬───────────────────────┘
                                             │ views are either
                    ┌────────────────────────┴────────────────────────┐
                    │ pages/<actor>/View.jsx   (actor-specific)       │
                    │ components/shared/*.jsx  (role-branched or not) │
                    └────────────────────────┬────────────────────────┘
                                             │ data through
                        ┌────────────────────┴───────────────────────┐
                        │ api/client.js  → apiFetch() (JWT + proxy)  │
                        │ api/uploads.js → uploadFile/downloadDoc    │
                        └────────────────────┬───────────────────────┘
                                             ▼
                              NestJS backend :5001 (unchanged)
```

### Routing strategy

| Path | Component | Guard |
|---|---|---|
| `/` | `Landing` | public |
| `/login` | `Login` | public (already-authenticated users redirect to their dashboard — legacy `state.js` parity) |
| `/onboarding` | `Onboarding` | public |
| `/student/*` | `StudentDashboard` | `ProtectedRoute` role `student` |
| `/faculty/*` | `FacultyDashboard` | `ProtectedRoute` role `faculty` |
| `/admin/*` | `AdminHeadDashboard` | `ProtectedRoute` roles `admin` \| `head` |
| `/spoc/*` | `SpocDashboard` | `ProtectedRoute` role `spoc` |
| `/superadmin/*` | `SuperadminDashboard` | `ProtectedRoute` role `superadmin` |
| `*` | `NotFound` | — |

`ProtectedRoute` is the port of legacy `Auth.requireAuth(roles)` — a **UX
guard, not a security boundary**; the backend's guards remain the only real
authorization check.

---

## 5. Directory structure

```
front-end-react/
├── index.html                       # Vite entry (Inter font, #root)
├── package.json                     # react, react-dom, react-router-dom only
├── vite.config.js                   # port 5173, /api → :5001 proxy
└── src/
    ├── main.jsx                     # createRoot + StrictMode
    ├── App.jsx                      # providers + all routes + <Toast/>
    ├── api/
    │   ├── client.js                # apiFetch, session get/clear
    │   └── uploads.js               # uploadFile / downloadDocument
    ├── context/
    │   ├── AuthContext.jsx          # user + login/logout  (was window.Auth)
    │   └── NotificationsContext.jsx # toasts + bell data   (was window.Notifications)
    ├── hooks/
    │   └── useBodyClass.js          # per-route <body class> management
    ├── components/
    │   ├── layout/
    │   │   ├── DashboardShell.jsx   # Sidebar + Topbar + content area + logout
    │   │   ├── Sidebar.jsx          # brand, user card, module-gated nav, footer
    │   │   ├── Topbar.jsx           # title + badges
    │   │   └── NotificationBell.jsx # bell + panel (injectBell/renderPanel port)
    │   └── shared/
    │       ├── DiscussionForum.jsx      # role-agnostic
    │       ├── ForgotPasswordModal.jsx  # used by Login
    │       ├── LeavePanel.jsx           # role prop
    │       ├── MeetingModal.jsx         # faculty Dashboard + StudentOverview
    │       ├── Modal.jsx                # the modal chrome every modal repeats
    │       ├── ProtectedRoute.jsx
    │       ├── ResearchPanel.jsx        # role prop
    │       ├── ResourceBookingModal.jsx # faculty nav action + admin reuse
    │       ├── SendAlertModal.jsx
    │       ├── Settings.jsx             # role-agnostic
    │       ├── Timetable.jsx            # role prop (endpoint switch)
    │       └── Toast.jsx
    ├── pages/
    │   ├── Landing.jsx / Login.jsx / Onboarding.jsx / NotFound.jsx
    │   ├── student/     StudentDashboard, Dashboard, Profile, Courses, Attendance
    │   ├── faculty/     FacultyDashboard, Dashboard, MarkAttendance,
    │   │                StudentOverview, AssessmentMapping, EventScheduler
    │   ├── admin/       AdminHeadDashboard, Dashboard, InstitutionalReports,
    │   │                CourseManagement, ResourceManagement, FeeCompliance,
    │   │                UserManagement, AttendanceOverride, EventScheduler
    │   ├── spoc/        SpocDashboard, Subscription, Team, Support
    │   └── superadmin/  SuperadminDashboard, Institutions
    └── styles/
        ├── style.css            # ported verbatim from legacy
        ├── landing.css          # from index.html's inline styles
        └── onboarding.css       # from onboarding.html's inline styles
```

**One file per *view*, not per dashboard** — mirrors the legacy `render*()`
boundary exactly, so each migration step has a 1:1 legacy function to diff
against.

---

## 6. Foundation layer (Phase 0 deliverables)

Everything here is actor-neutral and reused by every phase after it.

### `api/client.js` — `apiFetch()`
Legacy `window.Auth.apiFetch()`, kept a **plain function** (no component
state involved — stays a function, not a hook). Adds the JWT/session header,
prefixes `/api`, throws with the backend's error message on non-success so
call sites can `catch` and `showToast('Failed: ' + e.message)`.

### `api/uploads.js`
`uploadFile()` / `downloadDocument()` — same two functions as legacy
`Auth.uploadFile()` / `Auth.fileUrl()`, **unchanged signatures, moved as-is**.
Shared by every form with an attachment (leave, attendance request, research
uploads, marks documents).

### `context/AuthContext.jsx`
Current user + `login()` / `logout()`, ported from legacy `window.Auth`.
Replaces the global object with React context so dashboard components read
the signed-in user via props-down-the-tree instead of a global lookup.
Also exports `ROLE_HOME` — the post-login redirect table used by `Login.jsx`.
`useAuth()` throws if used outside `AuthProvider`.

### `context/NotificationsContext.jsx`
Toasts, the notification bell's data, and the **localStorage-backed
broadcast/personal notification log** — ported from legacy fixes.js's
`window.Notifications` IIFE and `showToast()`. Still backed by the same
localStorage keys (`bp_notifications`, `bp_broadcasts`) so data a user
already has from the legacy app keeps working — just exposed through context
+ a hook instead of a global. Retention: 30 days.

> **Cross-tab sync (broadcast bug fix):** the legacy app re-read localStorage
> fresh on every page load and every bell render. In the SPA the provider
> mounts **once**, so a broadcast written by another tab (faculty) would
> never reach an already-open tab (student) until a full reload. A `storage`
> event listener now re-syncs state whenever another tab writes to the
> notification keys. The `storage` event only fires in *other* tabs than the
> one that wrote, so local writes still flow through `setState` as before —
> no double-handling.

Exposes: `toast`, `showToast`, `forUser`, `getUnreadBC`, `unread`, `send`,
`broadcast`, `broadcastAll`, `markRead`, `markBCRead`, `clearAll`.

### `components/shared/Toast.jsx`
Ported from legacy `showToast()`. **One toast at a time, replaced (not
stacked) by the next call, auto-dismissed after 3.5s.** Mounted once at the
app root (inside `NotificationsProvider`, after `<Routes/>`) so it's visible
from any page. Types: `success` `#16a34a` · `warning` `#f59e0b` · `error`
`#ef4444` (unknown types fall back to success).

### `components/layout/DashboardShell.jsx`
The layout every actor dashboard composes: `Sidebar` + `Topbar` + a content
area, plus the logout wiring. Presentation is passed **as props**
(`brandSubtitle`, `avatarLetter`, `avatarClassName`, `roleLabel`, `navItems`,
`licensedModules`, `activeView`, `onSelect`, `onLogout`) instead of five
near-copies of the same legacy markup.

### `hooks/useBodyClass.js`
The legacy app was one HTML file per page, each with its own fixed
`<body class="...">` (`login-body`, `dashboard-body`, `onboard-body`) that
`style.css`'s page-level rules key off. In an SPA there's one `<body>` for
every route, so each top-level page sets its own class on mount and removes
it on unmount.

### `components/shared/Modal.jsx`
The `.modal-backdrop` / `.modal-window` / `.modal-header` chrome every legacy
modal repeated by hand (`openModal`/`closeModal` + copy-pasted markup). One
component instead of six near-identical copies. Visibility is local state in
the owning component (`open` prop), not a global registry.

---

## 7. Legacy → React primitive map

| Legacy (`front-end/`) | React equivalent | Where it lives |
|---|---|---|
| `window.Auth.getUser()` / `login()` / `logout()` | `useAuth()` hook reading `AuthContext` | `context/AuthContext.jsx` |
| `window.Auth.apiFetch()` | `apiFetch()` plain function (stays a function, not a hook) | `api/client.js` |
| `Auth.uploadFile()` / `Auth.fileUrl()` | Same two functions, unchanged signatures, moved as-is | `api/uploads.js` |
| `Auth.requireAuth(roles)` | `<ProtectedRoute roles={[...]}>` | `components/shared/ProtectedRoute.jsx` |
| `window.Notifications` (bell, sends, broadcasts) | `NotificationsContext` + `NotificationBell` | `context/NotificationsContext.jsx` |
| `showToast()` | `<Toast>` rendered from `NotificationsContext` state | `components/shared/Toast.jsx` |
| `switchView('x-view', this)` | `useState('activeView')` in the actor dashboard | `pages/<actor>/*Dashboard.jsx` |
| `openModal(id)` / `closeModal(id)` | local `useState` + `<Modal open onClose>` | owning component |
| `render*()` in `fixes.js` | one component per `render*()` | `pages/` + `components/shared/` |
| per-page `<body class>` | `useBodyClass()` | `hooks/useBodyClass.js` |
| `applyModuleGating()` (localStorage) | Sidebar filters `navItems` by `licensedModules` from `GET /billing/me/modules` | `Sidebar.jsx` / dashboards |

Nothing in this table changes *behavior* — it changes *where the logic
lives*. Verifying each row is point-for-point equivalent (not just visually
similar) is the actual acceptance criterion for Phase 0.

---

## 8. Shared components & role branching

Feature views that are **shared across actors today** — dispatched to a
different renderer only by role in legacy (`renderStudentLeave` vs
`renderFacultyLeaveList` vs `renderLeaveManagement`) — each become **one
React component taking `role` (or the specific capability it needs) as a
prop**, not three separate components.

| Component | Role mechanism | Notes |
|---|---|---|
| `Timetable` | `ENDPOINT_BY_ROLE = { student: '/student-timetable', faculty: '/faculty/me/timetable', admin: '/timetable' }` | MON–FRI grid, 09:00–15:00 blocks, modality badges (📖 blue / 🔬 amber / ✏️ green); `ScheduleClassModal` with room & section conflict detection |
| `LeavePanel` | `role` prop | Own leaves (student) vs all-college leaves + decisions (faculty/admin) |
| `ResearchPanel` | `role` prop | student: upload work against a supervisor's project · faculty: review submissions, download files, update progress + feedback |
| `DiscussionForum` | **none** | fully role-agnostic in legacy already (same markup on student/faculty, just a different container id) |
| `Settings` | **none** | shared unchanged across all actors |
| `MeetingModal` | `preselected` student (locks dropdown) or none | used from faculty Dashboard + StudentOverview |
| `ResourceBookingModal` | **none** | faculty "Request Resources" nav action; admin Resource Management reuses it for the creation flow |
| `ForgotPasswordModal` | **none** | used by `Login.jsx` |

> ⚠️ From the risk register: if a shared component turns out to need
> near-total divergence between roles, **split the component** rather than
> force a bad shared abstraction.

---

## 9. Actor portals

### 🎒 Student — `StudentDashboard` (9 views)
`Dashboard`, `Profile`, `Courses`, `Attendance` (+ "Request Attendance"
modal — injected at runtime in legacy, first-class here), plus shared
`Timetable`, `LeavePanel`, `ResearchPanel role="student"`, `DiscussionForum`,
`Settings`.

### 👨‍🏫 Faculty — `FacultyDashboard` (10 views)
`Dashboard` (metrics, intervention, action-required, syllabus manager),
`MarkAttendance` (marking form + attendance-request grant flow),
`StudentOverview` (cards, broadcast, BTP assignment, alert & meeting
triggers), `AssessmentMapping` (two modals, locked-marks handling),
`EventScheduler` (**read-only** — unlike admin's full-CRUD version), plus
shared `Timetable`, `LeavePanel`, `ResearchPanel role="faculty"`,
`DiscussionForum`, `Settings`. **"Request Resources" is a nav action (opens
a modal), not a view** — matching legacy's dead-end link.

### 🛡️ Admin + 👑 Head — `AdminHeadDashboard` (10 views)
One dashboard, one `role` value (`"admin"` or `"head"`) threaded through
wherever the legacy `isAdmin` check actually differs. Legacy `super-user.html`
serves both; nothing in that page's own JS branches on admin vs head, so the
React port doesn't either — role is only used for tenant-isolation guards
already enforced server-side. Sidebar label/avatar are `"Academic Head"`/`"H"`
even for an admin-role user — preserved exactly as legacy hardcodes it.

Views: `Dashboard`, `InstitutionalReports` (client-side CSV exports — no
export endpoint exists on the backend), `EventScheduler` (full CRUD),
`CourseManagement`, `ResourceManagement`, `FeeCompliance`, `UserManagement`
(privilege ceiling enforced: head/admin manage students & faculty only),
`AttendanceOverride` (two genuinely separate features: medical-leave override
+ attendance-request workflow), `LeavePanel role="admin"`, `Settings`.

### 🤝 SPOC — `SpocDashboard` (4 views)
`Subscription`, `Team` (hire-admin flow — `role` is never sent to the server;
backend stamps it), `Support` (polls every 20s **only while mounted**),
`Settings`. No nav item here carries a `module` — legacy `spoc.html` never
calls `applyModuleGating()`.

### 🏢 Superadmin — `SuperadminDashboard` (2 views)
`Institutions` (table + cross-college support inbox with thread detail/reply)
and `Settings`. **No "add college" action on purpose** — a college becomes
valid by purchasing a subscription, not by a superadmin clicking a button.

---

## 10. Cross-cutting features

### Toasts & notifications
- `showToast(msg, type)` — transient, one at a time, 3.5s, root-mounted
- `send(userId, from, msg, type)` — per-student/personal notification → `bp_notifications`
- `broadcast(role, from, msg, type)` — role-channel broadcast → `bp_broadcasts`
- Bell unread counts + panel; 30-day retention; cross-tab `storage` sync

### Module gating
Licensed modules fetched from `GET /billing/me/modules`; `Sidebar` filters
`navItems` whose `module` isn't licensed (`research`, `fees`, `forum`). The
server-side `RequiresModuleGuard` remains the real enforcement (403
`MODULE_NOT_LICENSED`) — hiding a nav link is UX, not security.

### Uploads & downloads
`uploadFile()` for attachments (leave requests, research submissions,
attendance-request documents); `downloadDocument()` for retrieval (research
downloads, marks documents). Signatures unchanged from legacy.

### Loading & error conventions
- `undefined` / `null` state = **loading** (render nothing or a spinner)
- `[]` = **loaded empty** (render the empty state)
- API failures → `showToast('Failed: ' + e.message, 'error')` — the backend's
  `errorBody(ErrorCode, message)` text surfaces verbatim

---

## 11. Migration phases

| Phase | Scope | Status marker |
|---|---|---|
| **0 — Foundation** | Scaffold, `style.css` port, `AuthContext`, `NotificationsContext` + `Toast` + `NotificationBell`, `apiFetch`, uploads, `ProtectedRoute`, `DashboardShell`, Landing/Login/Onboarding | Exit: login redirects correctly for all five roles even though four destinations don't exist yet |
| **1 — Student** (9 views) | Smallest dashboard; builds the shared-component pattern (`Settings`, `LeavePanel`, `Timetable`, `ResearchPanel`, `DiscussionForum`) | Side-by-side against `student.html` |
| **2 — Faculty** (10 views) | First phase that *extends* rather than *builds* shared components (role branches on Timetable/Leave/Research) | Side-by-side against `faculty.html` |
| **3 — Admin + Head** (10 views) | Confirm per-view whether admin and head differ at all before building branches | Side-by-side against `super-user.html` |
| **4 — SPOC** (4 views) | Subscription/team/support; module-gating regression check | Side-by-side against `spoc.html` |
| **5 — Superadmin** (2 views) | Institutions + support inbox | Side-by-side against `super-admin.html` |
| **Cutover** | Point static serving at `dist`, update redirect tables & hardcoded `*.html` links, full regression all five actors on production build, then delete `front-end/` (keep on a branch) | See §15 |

---

## 12. Ground rules

1. **Strangler fig, not big-bang.** `front-end/` keeps running, unmodified,
   for the whole migration. `front-end-react/` is a separate app on a
   separate dev port. Nothing is deleted from `front-end/` until the final
   cutover.
2. **One file per *view*.** Mirrors the legacy `render*()` boundary exactly —
   every migration step has a 1:1 legacy function to diff against.
3. **Parity exceptions are decided explicitly.** When legacy behavior is
   broken, weird, or ambiguous: note it at the bottom of that phase's
   checklist rather than silently fixing or preserving it. Decide
   explicitly, don't default either way.
4. **The API contract is the spec.** Every `render*()` already names the
   endpoint it calls (`api('/students/me')` etc.) — that's the component's
   data-fetching requirement, verbatim. No endpoint changes anywhere.
5. **Verification is manual, by the user, per view** — side-by-side (legacy
   page open in one tab, React page in another). No automated test suite
   exists for the legacy frontend either, so there's no regression baseline
   to encode against.

---

## 13. Parity exceptions log

| # | Item | Decision |
|---|---|---|
| 1 | `MarkAttendance.jsx` — date picker | Accepted but `today` always POSTed (legacy quirk, preserved per ground rule #3) |
| 2 | `ResearchPanel` faculty BTP card | Present in legacy `renderFacultyResearchEnhanced()` but missing from the initial React port — **backfilled** (`FacultyProjectCard`, `FacultyBTPProgressModal`) |
| 3 | `AdminHeadDashboard` sidebar identity | Label/avatar hardcoded `"Academic Head"`/`"H"` even for admin users — preserved as legacy hardcodes it |
| 4 | `ForgotPasswordModal` verification code | Generated client-side and shown on screen rather than emailed — exactly as legacy's own comment states ("in production this would be emailed"). Porting to real email is a product decision, not a migration one |
| 5 | SPOC `Support` polling | Legacy polled every 20s for the lifetime of the whole page; React polls only while the view is mounted — strictly less wasteful for the same effect |
| 6 | `AssessmentMapping` locked marks | Legacy had a second `window.openMarksModal` definition monkey-patching the first in `fixes.js`; folded into one function here |
| 7 | Student "Request Attendance" modal | Not in `student.html`'s static markup — injected at runtime by fixes.js; missed in Phase 1, added as first-class component later |
| 8 | Admin attendance-request widget | Injected into the view at runtime by fixes.js, not in static markup — same pattern, ported explicitly |
| 9 | Login demo credentials | Preserved as a **localhost-only** quick-fill row |
| 10 | Login redirect for authenticated users | Already-authenticated users visiting `/login` redirect to their dashboard (legacy `state.js` did this) |

---

## 14. Codebase conventions

- **File headers tell the port provenance.** Every component starts with a
  JSDoc naming the legacy functions it ports (e.g. `ported from legacy
  fixes.js renderFacultyStudents() + renderStudentCards() + ...`). Preserve
  this when editing.
- **Loading states:** `undefined` = loading, `[]` = loaded empty.
- **Feedback:** every mutation path ends in `showToast(...)` — `success` on
  completion, `warning` on validation, `error` in `catch`.
- **Per-user notifications:** `send(studentId, from, msg, type)` after
  mutations that concern one student; `broadcast(role, ...)` for announcements.
- **Modals:** local `useState` in the owner; `<Modal open onClose title>`;
  submit buttons disabled + relabeled while submitting.
- **No state libraries.** If a phase seems to need one, simplify the phase.
- **Client-side section disambiguation:** where a faculty teaches multiple
  sections of one course, components derive `mySections` client-side from
  `/courses` (filtered by `faculty_id`) rather than letting the server guess.

---

## 15. Production build & cutover

```bash
npm run build      # → dist/
npm run preview    # serve the production build locally
```

The backend serves the built SPA via `express.static` pointed at
`front-end-react/dist` (resolved relative to the backend's location), with
the SPA fallback noted in `main.ts`: react-router owns every non-API path
client-side (`/student`, `/login`, `/spoc/team`, …), none of which exist as
files on disk; static handles real assets and falls through for routes.

**Cutover checklist (final phase):**
- [ ] Point the backend's static-file serving at `front-end-react/dist` instead of `front-end/`
- [ ] Update login's post-auth redirect table and any hardcoded `*.html` links anywhere in the backend (email templates, onboarding confirmation links)
- [ ] One final full regression pass, **all five actors**, against the production build (`vite build` + `vite preview`), not just the dev server
- [ ] Only after that: delete `front-end/` — kept on a branch/tag, not just deleted outright, until the team is confident nothing needs to be diffed against it

---

## 16. Verification

Each phase ends with a checklist of views to click through **side-by-side**
(legacy page in one tab, React page in another), using the same demo account:

1. Log into both with the same credentials
2. Walk every nav item; compare layout, data, and interactions
3. Exercise every write path at least once (file uploads especially — leave
   requests, research uploads, attendance-request documents)
4. Check module-gated nav items appear/hide correctly per subscription
5. Confirm cross-tab notifications (send from one actor's tab, see the bell
   update in another actor's tab without reload)
6. Record any parity exception explicitly — never silently fix, never
   silently preserve

### Known risks (from the migration plan's risk register)

| Risk | Mitigation |
|---|---|
| `fixes.js` hides small, undocumented behaviors that get lost in translation | Per-view checklist per phase; explicit parity-exceptions notes |
| A shared component needs near-total divergence between roles | Caught in Phase 2/3 exit criteria; split rather than force a bad abstraction |
| Module-gating / notification-bell logic (both localStorage-based globals today) regresses subtly behind React context | Dedicated exit-criteria check in Phases 0 and 4 |
| Two parallel frontends cause confusion about which is "live" | `front-end/` stays linked from real login flows until cutover; this app is dev-only until then |

---

## 17. Reference documents

| Document | What it covers |
|---|---|
| `FRONTEND_REACT_MIGRATION_PLAN.md` (repo root) | The full plan: phases, ground rules, primitive map, risk register |
| `Contributions-Pranjal.md` | Faculty portal contribution notes (endpoint matrix per view) |
| `README.md` (repo root) | Whole-platform overview, demo accounts, run instructions |
| `back-end/docs/swagger.json` / `/api/docs` | The API contract — the spec for every component's data fetching |

---

*Ported with parity discipline from `front-end/` — five shells, one engine —
into one React app where the role is a prop, not a runtime branch.*
