# Faculty Actor — Study Guide 0: Overview & Architecture

> Part of a 5-file deep-dive into the faculty actor's React migration. Read this file first — it
> gives you the map; the other four files fill in every room on it.
>
> | File | Covers |
> |---|---|
> | **00-overview.md** (this file) | Architecture, routing, composition, file index |
> | [01-shared-infrastructure.md](./faculty-01-shared-infrastructure.md) | Every context, hook, and shared component faculty depends on — function by function |
> | [02-pages-deep-dive.md](./faculty-02-pages-deep-dive.md) | The 6 faculty-specific page files — component by component, hook by hook |
> | [03-backend-mapping.md](./faculty-03-backend-mapping.md) | Every backend route the faculty frontend calls — controller, guard, service logic, data shape |
> | [04-legacy-origin-mapping.md](./faculty-04-legacy-origin-mapping.md) | Legacy `fixes.js`/`script.js`/`state.js` function → React component mapping, with line numbers |
> | [05-request-pipeline-reference.md](./faculty-05-request-pipeline-reference.md) | The exact, verified request lifecycle every `apiFetch` call passes through — middleware, guard order, pipes, response handling |
> | [06](./faculty-06-line-by-line-facultydashboard.md)–[11](./faculty-11-line-by-line-eventscheduler.md)-line-by-line-*.md | Line-by-line walkthrough of every one of the 6 faculty page files, with a backend-hop box at every network call |
> | [12-line-by-line-backend.md](./faculty-12-line-by-line-backend.md) | Line-by-line walkthrough of `faculty.module.ts` + `faculty.controller.ts` + `faculty.service.ts` |
> | [13-design-principles.md](./faculty-13-design-principles.md) | The migration's governing design principles, each cited back to exact lines in files 06–12 |

---

## 1. What "the faculty actor" means in this codebase

Faculty is one of six roles the platform recognizes: `student`, `faculty`, `admin`, `head`, `spoc`,
`superadmin`. Each role gets its own dashboard route and its own nav structure, but several share
the exact same underlying React components (`Timetable`, `LeavePanel`, `ResearchPanel`,
`DiscussionForum`, `Settings`, `Modal`) parameterized by a `role` prop or by which props they're
given — this is why the faculty study guide necessarily pulls in files that are *not* faculty-only.

The legacy (pre-migration) version of this actor lived entirely in one static HTML file:
`front-end/faculty.html` (706 lines), with its behavior split across three shared, un-scoped
JavaScript files loaded by every dashboard page in the old app:

- `front-end/state.js` (229 lines) — `window.Auth`, the API fetch wrapper, session handling
- `front-end/script.js` (206 lines) — login page logic, the `switchView()` router, module gating
- `front-end/fixes.js` (3265 lines) — essentially the entire application: every `render*()`
  function, every `submit*()` handler, every modal's open/close logic, for every actor, all in one
  file, attached to `window` as global functions and called from inline `onclick="..."` attributes
  in the HTML.

The React migration's job for this actor was to take everything `faculty.html` statically rendered
plus everything `fixes.js` dynamically injected into it at runtime, and re-express it as composable
React components reading from a real API client and React context instead of global functions and
DOM queries.

## 2. Where faculty sits in the route tree

`front-end-react/src/App.jsx` wires the top-level routes. The faculty branch:

```
/faculty/*  →  <ProtectedRoute roles={['faculty']}>  →  <FacultyDashboard />
```

`ProtectedRoute` (`src/components/shared/ProtectedRoute.jsx`) is a **UX guard only** — it reads
`user.role` from `AuthContext` (itself backed by `localStorage`, which a user can edit) and
redirects to `/login` if the role doesn't match. It is explicitly documented in its own file as not
a security boundary: the real authorization is the `@Roles('faculty')` decorator enforced
server-side on every API call that dashboard makes (see file 03). If someone edited their
localStorage role to `faculty`, the dashboard would *render*, but every `apiFetch` call would come
back 403 because their session cookie still carries their real role.

## 3. The composition tree

```
FacultyDashboard                          (src/pages/faculty/FacultyDashboard.jsx)
└── DashboardShell                        (src/components/layout/DashboardShell.jsx)
    ├── Sidebar                           (src/components/layout/Sidebar.jsx)
    ├── Topbar                            (src/components/layout/Topbar.jsx)
    │   └── NotificationBell              (src/components/layout/NotificationBell.jsx)
    └── <one of 10 views, swapped by activeView state>
        ├── Dashboard                     (src/pages/faculty/Dashboard.jsx)
        │   ├── Metrics
        │   ├── Intervention
        │   │   ├── SendAlertModal        (src/components/shared/SendAlertModal.jsx)
        │   │   └── MeetingModal          (src/components/shared/MeetingModal.jsx)
        │   ├── ActionRequired
        │   └── SyllabusManager
        ├── Timetable  (role="faculty")   (src/components/shared/Timetable.jsx)
        ├── LeavePanel (role="faculty")   (src/components/shared/LeavePanel.jsx)
        │   └── PersonalLeavePanel → LeaveApplyModal
        ├── AssessmentMapping             (src/pages/faculty/AssessmentMapping.jsx)
        │   ├── CreateAssessmentModal
        │   ├── MarksEntryModal
        │   └── AssessmentCard (× N)
        ├── MarkAttendance                (src/pages/faculty/MarkAttendance.jsx)
        │   ├── AttendanceForm
        │   └── AttendanceRequests
        ├── StudentOverview               (src/pages/faculty/StudentOverview.jsx)
        │   ├── AssignBTPModal
        │   ├── StudentCard (× N)
        │   ├── SendAlertModal
        │   └── MeetingModal
        ├── EventScheduler                (src/pages/faculty/EventScheduler.jsx)
        ├── DiscussionForum               (src/components/shared/DiscussionForum.jsx)
        │   ├── NewThreadModal
        │   └── ThreadDetailModal
        ├── ResearchPanel (role="faculty")(src/components/shared/ResearchPanel.jsx)
        │   ├── FacultyProjectCard (× N)
        │   └── FacultyBTPProgressModal
        └── Settings                      (src/components/shared/Settings.jsx)
    └── ResourceBookingModal              (src/components/shared/ResourceBookingModal.jsx)  — mounted
                                            at the FacultyDashboard level, not inside any view, because
                                            it's opened by a nav *action*, not a nav *view* (see §5).
```

Everything under `DashboardShell` is `children` — `FacultyDashboard` picks which view to render by
indexing into a `VIEWS` object with `activeView` state, and hands the chosen element to
`DashboardShell` as `children`.

## 4. State ownership — who owns `activeView`

`FacultyDashboard` itself, via `useState('dashboard')`. This single piece of state is the entire
"router" for the dashboard's internal navigation — no React Router routes exist below `/faculty/*`;
switching views is just swapping which element `VIEWS[activeView]` resolves to. This directly
replaces legacy `script.js`'s `switchView(viewId, navEl)`, which hid/showed `<div class="view-section">`
elements by toggling `style.display` and calling a big dispatch table of `render*()` functions (see
file 04, §1) every time a view became visible, because the legacy app never unmounted anything — it
just re-ran the render function to refresh stale data. React's version gets this "refresh on
reveal" behavior for free: each view component is only mounted while it's the active one, so its own
`useEffect(() => { load() }, [])` reruns its fetch every time you navigate back to it.

## 5. Nav items vs. nav actions

`FacultyDashboard`'s `NAV_ITEMS` array has two kinds of entries:

- Normal items (`dashboard`, `timetable`, `leave`, `assessment-mapping`, `mark-attendance`,
  `student-overview`, `event-scheduler`, `discussion`, `research`) — clicking them calls
  `onSelect(item.id)`, which is `setActiveView`.
- One action item (`request-resources`) — it carries an `onAction` callback instead of relying on
  `activeView`. `Sidebar.jsx`'s render loop checks `item.onAction ? item.onAction() : onSelect(item.id)`.
  This mirrors the legacy sidebar link `onclick="openResourceBookingModal(); return false;"` —
  that link never had a `<div id="...-view">` behind it in `faculty.html`; it just popped a modal.
  The React version preserves that exactly: `ResourceBookingModal` is mounted once at
  `FacultyDashboard`'s own level (not inside the `VIEWS` map) with its `open` state
  (`resourceModalOpen`) toggled by the nav action.

## 6. Two nav items that don't exist in the legacy sidebar at all

`FacultyDashboard.jsx`'s own header comment calls this out directly: **Leave Management** and
**Event Scheduler** have working view-sections, working render functions
(`renderFacultyLeaveList`, `renderFacultyEventsTable`), and in Leave's case a fully working apply
modal in the legacy `fixes.js` and `faculty.html` — but no `<a>` in the legacy sidebar ever called
`switchView()` for either of them. They were **unreachable features**, not missing ones. The React
migration chose to wire them into the nav rather than silently drop working, API-backed
functionality just because the legacy UI never exposed an entry point to it. (Admin/Head's Phase 3
had an identical case with an orphaned course-enroll modal, handled the same way.)

## 7. Module gating — Discussion Forum and Research Projects are licensable

Two of the nav items carry a `module` key: `discussion` → `module: 'forum'`, `research` →
`module: 'research'`. `Sidebar.jsx` filters `navItems` down to `visibleItems`, hiding any item whose
`module` isn't present in the signed-in college's `licensedModules` array (fetched by
`DashboardShell` from `GET /billing/colleges/me/modules`). This is **UI-only** — hiding the nav link
doesn't stop the API; the actual enforcement is `RequiresModuleGuard` + `@RequiresModule('forum')`
/ `@RequiresModule('research')` decorators server-side (not present on any faculty route in this
guide's scope — the discussions/research controllers live in `admin/common.controller.ts`, covered
in file 03). `licensedModules === null` (not loaded yet, or the fetch failed) means "show
everything" — a deliberate fail-open matching the legacy `applyModuleGating()` behavior, so a
transient network hiccup doesn't silently hide a module a college actually paid for.

## 8. File index — every file this guide covers

### Faculty-specific pages (`front-end-react/src/pages/faculty/`)
| File | Lines | Covered in |
|---|---|---|
| `FacultyDashboard.jsx` | 178 | 02 §1 |
| `Dashboard.jsx` | 239 | 02 §2 |
| `MarkAttendance.jsx` | 320 | 02 §3 |
| `AssessmentMapping.jsx` | 406 | 02 §4 |
| `StudentOverview.jsx` | 268 | 02 §5 |
| `EventScheduler.jsx` | 57 | 02 §6 |

### Shared infrastructure faculty actually imports
| File | Lines | Covered in |
|---|---|---|
| `context/AuthContext.jsx` | 69 | 01 §1 |
| `context/NotificationsContext.jsx` | 151 | 01 §2 |
| `api/client.js` | 90 | 01 §3 |
| `api/uploads.js` | 63 | 01 §4 |
| `hooks/useBodyClass.js` | 12 | 01 §5 |
| `components/layout/DashboardShell.jsx` | 68 | 01 §6 |
| `components/layout/Sidebar.jsx` | 85 | 01 §6 |
| `components/layout/Topbar.jsx` | 25 | 01 §6 |
| `components/layout/NotificationBell.jsx` | 238 | 01 §7 |
| `components/shared/Modal.jsx` | 25 | 01 §8 |
| `components/shared/Toast.jsx` | 38 | 01 §8 |
| `components/shared/ProtectedRoute.jsx` | 25 | 01 §9 |
| `components/shared/LeavePanel.jsx` | 354 | 01 §10 |
| `components/shared/MeetingModal.jsx` | 142 | 01 §11 |
| `components/shared/ResearchPanel.jsx` | 424 | 01 §12 |
| `components/shared/DiscussionForum.jsx` | 209 | 01 §13 |
| `components/shared/ResourceBookingModal.jsx` | 78 | 01 §14 |
| `components/shared/SendAlertModal.jsx` | 75 | 01 §15 |
| `components/shared/Settings.jsx` | 97 | 01 §16 |

### Backend (`back-end/src/`)
| File | Covered in |
|---|---|
| `faculty/faculty.controller.ts` | 03 §1 |
| `faculty/faculty.service.ts` | 03 §1 |
| `faculty/faculty.module.ts` | 03 §1 |
| `admin/common.controller.ts` (faculty-reachable routes only) | 03 §2 |
| `auth/auth.controller.ts` (`change-password`) | 03 §3 |
| `common/course-sections.ts` | 03 §4 |
| `common/academic-rules.ts` (referenced) | 03 §4 |
| `common/tenancy/scope-to-college.ts` (referenced) | 03 §4 |

### Legacy source (`front-end/`)
| File | Lines | Covered in |
|---|---|---|
| `faculty.html` | 706 | 04 §1 |
| `script.js` | 206 | 04 §1 |
| `fixes.js` | 3265 (faculty-relevant subset) | 04 §2 |
| `state.js` | 229 | 04 §1 |

Continue to **[01-shared-infrastructure.md](./faculty-01-shared-infrastructure.md)**.
