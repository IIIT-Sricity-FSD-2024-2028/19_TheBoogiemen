# Frontend → React migration plan

## 0. Purpose and scope

The entire `front-end/` app (five dashboards, login, onboarding, landing — all
vanilla HTML/CSS/JS, server-rendered nothing, state kept in `localStorage`
and the DOM) is being rebuilt as a single vanilla React SPA. This document
is the plan: what gets built, in what order, by which actor, and how we know
each phase is actually done before starting the next one.

**In scope:** every page in `front-end/` — `index.html` (landing),
`login.html`, `onboarding.html`, `student.html`, `faculty.html`,
`super-user.html` (admin + head), `spoc.html`, `super-admin.html` — rebuilt
as React components, served from one Vite dev server, talking to the
**same, unmodified** NestJS API (`back-end/`).

**Explicitly out of scope:**
- No backend changes. Every endpoint, guard, and response shape stays
  exactly as it is. This is a presentation-layer rewrite only.
- No TypeScript, no Next.js, no state-management library (Redux/Zustand/
  MobX), no CSS framework. The brief asks for *basic* React — components,
  props, `useState`/`useEffect`, the Context API, conditional rendering —
  and that's what every phase below is built from. If a phase seems to need
  more than that, the answer is to simplify the phase, not add a library.
- `react-router-dom` is **the one allowed dependency beyond React itself**,
  and only for top-level navigation (see §3). It replaces the old app's
  five separate HTML files with five real, bookmarkable, back/forward-
  button-correct routes — not because the brief requires a router, but
  because the thing it replaces (separate pages, separate URLs) needs one.
  Everything *inside* a dashboard (the sidebar tab switching) stays plain
  `useState` + conditional rendering, matching how it already behaves today
  (switching a view never changes the URL in the current app either).

## 1. What exists today (inventory)

### 1.1 Shared infrastructure (not actor-specific)

| File | Lines | Role |
|---|---|---|
| `state.js` | 229 | `window.Auth` — login/logout, session cookie handling, `apiFetch()`, client-side route guard, file upload helper |
| `script.js` | 206 | Login form handling, post-login role→page redirect, nav module-gating (hides sidebar links for unlicensed billing modules) |
| `fixes.js` | 3,265 | Every `render*()` function for every view, in every dashboard, plus `switchView()`, `window.Notifications` (localStorage-backed toasts/broadcasts), `showToast()`, modals |
| `style.css` | 689 | The one design system all five dashboards and both public pages share |

This is the real shape of the migration: it is not "five separate apps,"
it's **one shared rendering engine (`fixes.js`) switched on five different
HTML shells**, selecting which `render*()` to call by reading
`Auth.getUser().role` at runtime (`triggerViewRender()` in `fixes.js:67`).
React replaces that runtime `if (isStudent) ... else if (isFaculty) ...`
branching with what it's actually for: components that take the active
role as a **prop**, or read it from **context**, and render conditionally.

### 1.2 Actor inventory

| Actor | Legacy file | Sidebar views | View count |
|---|---|---|---|
| Student | `student.html` | dashboard, my-profile, my-courses, attendance, time-table, leave-management, research-projects, discussion-forum, settings | 9 |
| Faculty | `faculty.html` | dashboard, time-table, leave-management, discussion-forum, research-projects, mark-attendance, student-overview, assessment-mapping, event-scheduler, settings | 10 |
| Admin + Head | `super-user.html` | dashboard, institutional-reports, event-scheduler, course-management, resource-management, fee-compliance, user-management, attendance-override, leave-management, settings | 10 |
| SPOC | `spoc.html` | subscription, team, support, settings | 4 |
| Superadmin | `super-admin.html` | institutions, settings | 2 |

Admin and head already share one legacy page and one set of views — the
backend already treats them as the same dashboard with role-gated panels.
React keeps that: one `AdminHeadDashboard`, one `role` prop/context value
distinguishing the two where they actually differ (if anywhere — to be
confirmed per view in Phase 3, not assumed up front).

`settings-view` and several feature views (`leave-management-view`,
`research-projects-view`, `time-table-view`) are **shared across actors
today**, dispatched to a different renderer only by role
(`renderStudentLeave` vs. `renderFacultyLeaveList` vs.
`renderLeaveManagement`, for example). Each such case becomes one React
component taking `role` (or the specific capability it needs) as a prop,
not three separate components — this is where "props" and "conditional
rendering" earn their keep in this migration, not as an exercise, but
because the legacy code already works this way.

### 1.3 Public / unauthenticated surface

| Page | Legacy file | Notes |
|---|---|---|
| Landing | `index.html` | Marketing page, no auth, no API calls |
| Login | `login.html` + `script.js` | Posts to `/auth/login`, redirects by role |
| Onboarding | `onboarding.html` | Multi-step wizard — new college sign-up, billing/plan selection. Public, no login required until the final step |

## 2. Target structure

```
front-end-react/
  index.html
  vite.config.js
  src/
    main.jsx
    App.jsx                  # <BrowserRouter> + <Routes>
    context/
      AuthContext.jsx         # current user, login(), logout(), requireRole()
      NotificationsContext.jsx# toasts + the bell (replaces window.Notifications)
    api/
      client.js               # fetch wrapper (replaces Auth.apiFetch)
      uploads.js               # uploadFile(), fileUrl()
    components/
      layout/
        DashboardShell.jsx     # sidebar + topbar + <main>, takes navItems as a prop
        Sidebar.jsx
        Topbar.jsx
        NotificationBell.jsx
      shared/
        Settings.jsx           # ONE component, every dashboard route renders it
        LeavePanel.jsx          # role-aware: student/faculty/admin+head views
        ResearchPanel.jsx       # role-aware: student/faculty views
        Timetable.jsx           # role-aware: student/faculty views
        Toast.jsx
        Modal.jsx
        EmptyState.jsx
        ProtectedRoute.jsx      # wraps a route, redirects if role doesn't match
    pages/
      Landing.jsx
      Login.jsx
      Onboarding.jsx
      student/
        StudentDashboard.jsx
        Dashboard.jsx  Profile.jsx  Courses.jsx  Attendance.jsx
        DiscussionForum.jsx
      faculty/
        FacultyDashboard.jsx
        Dashboard.jsx  StudentOverview.jsx  MarkAttendance.jsx
        AssessmentMapping.jsx  EventScheduler.jsx  DiscussionForum.jsx
      admin/
        AdminHeadDashboard.jsx
        Dashboard.jsx  InstitutionalReports.jsx  CourseManagement.jsx
        ResourceManagement.jsx  FeeCompliance.jsx  UserManagement.jsx
        AttendanceOverride.jsx
      spoc/
        SpocDashboard.jsx
        Subscription.jsx  Team.jsx  Support.jsx
      superadmin/
        SuperAdminDashboard.jsx
        Institutions.jsx
    styles/
      (style.css, ported, then split/trimmed per phase as needed)
```

One file per *view*, not per dashboard — mirrors the legacy `render*()`
boundary exactly, so each migration step has a 1:1 legacy function to
diff against.

## 3. Routing strategy

```
/                         Landing            (public)
/login                    Login              (public)
/onboarding               Onboarding         (public)

/student/*                StudentDashboard   (role: student)
/faculty/*                FacultyDashboard   (role: faculty)
/admin/*                  AdminHeadDashboard (role: admin | head)
/spoc/*                   SpocDashboard      (role: spoc)
/superadmin/*             SuperAdminDashboard(role: superadmin)
```

Five top-level routes replace the five legacy HTML files — this is the
`react-router-dom` boundary, and the *only* place routing is used. Login's
post-auth redirect (`state.js` role→URL `if/else`) becomes a `navigate()`
call to one of these five paths, same role table, same destinations.

**Inside** each dashboard, the sidebar's `switchView('leave-management-view', this)`
becomes:

```jsx
const [activeView, setActiveView] = useState('dashboard');
...
{activeView === 'dashboard' && <Dashboard />}
{activeView === 'leave' && <LeavePanel role="student" />}
{activeView === 'settings' && <Settings />}
```

No nested routes, no URL change on tab switch — matching current behavior
exactly. (A nested-route version, e.g. `/student/leave`, is a reasonable
*future* enhancement for deep-linking and is explicitly deferred — it adds
route config complexity the brief's "basics only" scope doesn't ask for.)

`ProtectedRoute` wraps every authenticated route and reads the current
user from `AuthContext`; this replaces `Auth.requireAuth(allowedRoles)`
(`state.js:206`) with the same "UX guard, not a security boundary" caveat
the legacy comment already states — the backend's guards remain the only
real authorization check.

## 4. Legacy primitive → React primitive map

| Legacy (`front-end/`) | React equivalent | Where it lives |
|---|---|---|
| `window.Auth.getUser()` / `login()` / `logout()` | `useAuth()` hook reading `AuthContext` | `context/AuthContext.jsx` |
| `window.Auth.apiFetch()` | `apiFetch()` plain function (no component state involved — stays a function, not a hook) | `api/client.js` |
| `window.Auth.requireAuth(roles)` | `<ProtectedRoute roles={[...]}>` | `components/shared/ProtectedRoute.jsx` |
| `switchView(viewId, el)` + `.view-section` show/hide | `useState(activeView)` + conditional JSX | each `*Dashboard.jsx` |
| `triggerViewRender()`'s `isStudent`/`isFaculty`/`isAdmin` branching | `role` prop passed into the shared component (`<LeavePanel role={role} />`) | shared components in §2 |
| `render*()` → `el.innerHTML = template literal` | component body returning JSX, `useState` for the fetched data, `useEffect` to fetch on mount | one component per legacy `render*()` |
| `window.Notifications` (localStorage toasts/broadcasts) | `NotificationsContext` — same localStorage-backed logic, exposed via `useNotifications()` instead of a global | `context/NotificationsContext.jsx` |
| `showToast()` | `<Toast>` rendered from `NotificationsContext` state | `components/shared/Toast.jsx` |
| Module gating (`applyModuleGating()` hiding nav `<a>` tags) | `Sidebar` filters its `navItems` prop against modules read once via context/hook, same fail-open-on-error behavior | `components/layout/Sidebar.jsx` |
| `Auth.uploadFile()` / `Auth.fileUrl()` | Same two functions, unchanged signatures, moved as-is | `api/uploads.js` |

Nothing in this table changes *behavior* — it changes *where the logic
lives*. Verifying each row is point-for-point equivalent (not just visually
similar) is the actual acceptance criterion for Phase 0.

## 5. Ground rules for every phase

1. **Strangler fig, not big-bang.** `front-end/` keeps running, unmodified,
   for the whole migration. `front-end-react/` is a separate app on a
   separate dev port. Nothing is deleted from `front-end/` until §7 (final
   cutover), so there is always a working app to fall back to or compare
   against mid-migration.
2. **One actor per phase, fully.** Every view for that actor ships before
   the next actor's phase starts — no half-migrated dashboards. This is
   what "actor-by-actor" means concretely: by the end of Phase N, that
   actor's entire legacy page is replaceable.
3. **No behavior changes smuggled in.** If a bug is spotted in the legacy
   `render*()` while porting it (there will be some — `fixes.js` is 3,265
   lines of organic growth), log it in the "parity exceptions" note at the
   bottom of that phase's checklist rather than silently fixing or
   preserving it. Decide explicitly, don't default either way.
4. **The API contract is the spec.** Every `render*()` already names the
   endpoint it calls (`api('/students/me')`, etc.) — that's the component's
   data-fetching requirement, verbatim. No endpoint changes needed anywhere
   in this migration.
5. **Verification is manual, by the user, per view** — consistent with how
   every other feature in this project has been checked throughout this
   project's history. Each phase ends with a checklist of views to click
   through side-by-side (legacy page open in one tab, React page in
   another), not an automated test suite (none exists for the legacy
   frontend either, so there's no regression baseline to encode against).

## 6. Phases

### Phase 0 — Foundation (no actor-visible page yet)

Nothing here is actor-specific; everything here is reused by every phase
after it, so getting it right once matters more than speed.

- [ ] Scaffold `front-end-react/` (Vite + plain JS, no TypeScript), install
      `react`, `react-dom`, `react-router-dom` only.
- [ ] Port `style.css` as-is into `src/styles/` — no rewrite yet. Visual
      refresh (if any) is a separate, later decision; this migration is
      structural, not cosmetic.
- [ ] Build `AuthContext` (§4 row 1) and its `useAuth()` hook.
- [ ] Build `api/client.js` (`apiFetch`) and `api/uploads.js`.
- [ ] Build `ProtectedRoute`.
- [ ] Build `DashboardShell` + `Sidebar` + `Topbar` — generic, taking
      `navItems`, `title`, and `children` as props so every dashboard in
      Phases 1–5 composes the same shell instead of rebuilding chrome.
- [ ] Build `NotificationsContext` + `Toast` + `NotificationBell`.
- [ ] Build the **shared** view components that more than one actor will
      need, so later phases consume them instead of duplicating them:
      `Settings.jsx`, `LeavePanel.jsx`, `Timetable.jsx`,
      `ResearchPanel.jsx`, `DiscussionForum.jsx`. Build each against
      *whichever actor needs it first* (Student, per Phase 1) — the other
      actors extend it with a new `role` branch when their phase reaches
      it, rather than it being speculatively built for five roles at once.
- [ ] Migrate the three public pages: `Landing`, `Login` (wire to
      `AuthContext.login()`, redirect table per §3), `Onboarding` (the
      wizard's step state is itself a clean `useState` + conditional-
      rendering exercise — each step is a component, the wizard holds
      `currentStep` and the accumulated form data, passed down as props).

**Phase 0 exit criteria:** landing/login/onboarding fully usable standalone
in `front-end-react/`; login redirects correctly for all five roles even
though four of the five destinations don't exist yet (confirm the route
exists and 404s cleanly, not that it renders a dashboard).

### Phase 1 — Student (9 views)

Smallest dashboard, no admin-only data shapes, good first real exercise of
the shared-component pattern since `Settings`, `LeavePanel`, `Timetable`,
`ResearchPanel`, and `DiscussionForum` are all first-built against this
actor's needs in Phase 0.

| View | New component | Legacy source |
|---|---|---|
| Dashboard | `student/Dashboard.jsx` | `renderStudentMeetings`, `renderPendingSubmissions` |
| My profile | `student/Profile.jsx` | `renderStudentProfile` |
| My courses | `student/Courses.jsx` | `renderStudentCourses` |
| Attendance | `student/Attendance.jsx` | `renderStudentAttendance` |
| Time table | `Timetable role="student"` | `renderStudentTimetable` |
| Leave management | `LeavePanel role="student"` | `renderStudentLeave` |
| Research projects | `ResearchPanel role="student"` | `renderStudentResearch` |
| Discussion forum | `DiscussionForum` | `renderDiscussions` |
| Settings | `Settings` (shared, already built) | `renderSettings` |

**Exit criteria:** every row above checked side-by-side against
`student.html` by the same student test account; leave-request file
upload (the one write path with a real side effect worth re-checking after
the earlier MIME-validation finding) exercised at least once.

### Phase 2 — Faculty (10 views)

First phase that *extends* rather than *builds* the shared components —
`LeavePanel`, `ResearchPanel`, `Timetable` each gain a `role="faculty"`
branch. This is the phase that actually tests whether the shared-component
design from Phase 0 holds up, or whether a "shared" component has quietly
drifted into needing two unrelated implementations (if so, split it then —
don't force a bad abstraction to stay shared).

| View | New component | Legacy source |
|---|---|---|
| Dashboard | `faculty/Dashboard.jsx` | `renderFacultyDashboard` |
| Time table | `Timetable role="faculty"` | `renderFacultyTimetable` |
| Leave management | `LeavePanel role="faculty"` | `renderFacultyLeaveList` |
| Discussion forum | `DiscussionForum` (shared, unchanged) | `renderDiscussions` |
| Research projects | `ResearchPanel role="faculty"` | `renderFacultyResearch` |
| Mark attendance | `faculty/MarkAttendance.jsx` | `renderMarkAttendanceTable` |
| Student overview | `faculty/StudentOverview.jsx` | `renderFacultyStudents` |
| Assessment mapping | `faculty/AssessmentMapping.jsx` | `renderAssessmentList` (+ section-dropdown logic already added this project) |
| Event scheduler | `faculty/EventScheduler.jsx` | `renderEventsTable` |
| Settings | `Settings` (shared, unchanged) | `renderSettings` |

**Exit criteria:** same side-by-side pass with a faculty account; confirm
`LeavePanel`/`ResearchPanel`/`Timetable` render correctly for *both* roles
now (regression-check Phase 1's student views after extending the shared
components, since this phase edits files Phase 1 already shipped).

### Phase 3 — Admin + Head (10 views)

The highest-surface-area dashboard and the one with the most distinct,
non-reused views (course management, resource management, fee compliance,
user management, attendance override have no student/faculty equivalent).
One dashboard, one `role` value (`"admin"` or `"head"`) threaded through
wherever the legacy `isAdmin` check actually differs — confirm per view
whether admin and head differ at all before building two branches; several
of these views may be role-identical in the legacy code and should stay
one branch in React too.

| View | New component | Legacy source |
|---|---|---|
| Dashboard | `admin/Dashboard.jsx` | `renderReports` |
| Institutional reports | `admin/InstitutionalReports.jsx` | `renderInstitutionalReports` |
| Event scheduler | `faculty/EventScheduler.jsx` reused, or forked if admin's shape differs | `renderEventsTable` |
| Course management | `admin/CourseManagement.jsx` | `renderCourseManagement` |
| Resource management | `admin/ResourceManagement.jsx` | `renderResourceManagement` |
| Fee compliance | `admin/FeeCompliance.jsx` | `renderFeeCompliance` |
| User management | `admin/UserManagement.jsx` | `renderUsersTable` |
| Attendance override | `admin/AttendanceOverride.jsx` | `renderAttendanceOverride` |
| Leave management | `LeavePanel role="admin"` | `renderLeaveManagement` |
| Settings | `Settings` (shared, unchanged) | `renderSettings` |

**Exit criteria:** side-by-side pass with both an admin and a head account
(confirm whether any view actually needs to branch on the two, per the
note above); cross-tenant checks for any view touching cross-college data
(this app already has prior tenant-isolation fixes in this area — re-verify
they still hold through the new components, not just that the UI renders).

### Phase 4 — SPOC (4 views)

Smallest remaining dashboard, entirely billing-domain, no overlap with any
shared component built so far — a clean, low-risk phase to do after the
three largest actors are done.

| View | New component | Legacy source |
|---|---|---|
| Subscription | `spoc/Subscription.jsx` | (billing/plan rendering in `fixes.js`) |
| Team | `spoc/Team.jsx` | (team/seat management rendering) |
| Support | `spoc/Support.jsx` | (support inbox rendering) |
| Settings | `Settings` (shared, unchanged) | `renderSettings` |

**Exit criteria:** side-by-side pass with a SPOC account; module-gating
behavior re-verified (SPOC-specific nav items are exactly what the legacy
gating feature exists to show/hide).

### Phase 5 — Superadmin (2 views)

Smallest dashboard, last because it's the lowest-traffic actor (one
operator role, not a per-college end user) and benefits most from every
shared primitive already being proven across four prior phases.

| View | New component | Legacy source |
|---|---|---|
| Institutions | `superadmin/Institutions.jsx` | `renderInstitutions` + `renderSupportInbox` |
| Settings | `Settings` (shared, unchanged) | `renderSettings` |

**Exit criteria:** side-by-side pass with the superadmin account.

### Phase 6 — Cutover

- [ ] All five actor phases signed off.
- [ ] Point the backend's static-file serving (or dev proxy, whichever
      applies) at `front-end-react/dist` instead of `front-end/`.
- [ ] Update `login`'s post-auth redirect table and any hardcoded
      `*.html` links left anywhere in the backend (e.g. email templates,
      onboarding confirmation links) to the new route paths.
- [ ] One final full regression pass, all five actors, against production
      build (`vite build` + `vite preview`), not just the dev server.
- [ ] Only after that: delete `front-end/` (`fixes.js`, `script.js`,
      `state.js`, all legacy HTML, `style.css` once fully absorbed).
      Keep it on a branch/tag, not just deleted outright, until the team is
      confident nothing needs to be diffed against it.

## 7. Risk register

| Risk | Mitigation |
|---|---|
| `fixes.js` (3,265 lines) hides small, undocumented behaviors that get lost in translation | Per-view checklist in each phase (§6), explicit "parity exceptions" note rather than silent fixes |
| A "shared" component (Leave/Research/Timetable) turns out to need near-total divergence between roles once Faculty/Admin are built | Caught in Phase 2/3 exit criteria; split the component rather than forcing a bad shared abstraction |
| Module-gating / notification-bell logic (both localStorage-based, both global today) regress subtly once behind React context | Explicitly listed as its own §4 row with a dedicated exit-criteria check in Phases 0 and 4 |
| Running two frontends in parallel during migration causes confusion about which one is "live" | `front-end/` stays the one linked from real login flows until §7 cutover; `front-end-react/` is dev-only until then, same pattern already used for the landing-page work |
| Scope creep into a visual redesign while touching every page anyway | Explicitly deferred in §0 and §6 — this plan ports `style.css` unchanged; a redesign is a separate, later decision |
