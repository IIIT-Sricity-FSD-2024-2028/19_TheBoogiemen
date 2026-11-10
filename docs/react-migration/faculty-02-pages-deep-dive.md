# Faculty Actor — Study Guide 2: Pages Deep Dive

Every component, every hook, every piece of state in the six files under
`front-end-react/src/pages/faculty/`. Assumes file 01 (shared infrastructure) is already read —
this file won't re-explain `apiFetch`, `useAuth`, `useNotifications`, or `Modal`.

---

## 1. `FacultyDashboard.jsx` (178 lines) — the route entry point

Already walked through structurally in file 00 §§3–6. What's left to note at the code level:

- **`const [activeView, setActiveView] = useState('dashboard')`** and **`const
  [resourceModalOpen, setResourceModalOpen] = useState(false)`** — the component's entire state.
  Nothing else here holds state; everything downstream either receives props or manages its own
  local state independently.
- **`NAV_ITEMS`** is a plain array literal, rebuilt on every render (not memoized) — each entry has
  `id`, `label`, an inline SVG `icon`, and either nothing extra (view items) or `module: 'forum'` /
  `module: 'research'` (licensable items) or `onAction: () => setResourceModalOpen(true)` (the one
  action item). Because it's rebuilt every render, `Sidebar` receives a new array reference each
  time — this is harmless here since `Sidebar` doesn't memoize on it, but worth knowing if you ever
  go looking for a missing `React.memo` optimization: there isn't one, by design, since this
  dashboard re-renders rarely (only on `activeView`/`resourceModalOpen` changes) and the nav list is
  small.
- **`TITLES`** — a flat `{ viewId: 'Display Title' }` map, indexed by `activeView` to drive
  `Topbar`'s `title` prop.
- **`VIEWS`** — the actual routing table: `{ viewId: <JSXElement> }`. Every value here is
  constructed eagerly on every render of `FacultyDashboard` (e.g. `<Dashboard
  onNavigate={setActiveView} />` is created even while `activeView === 'timetable'`), but only the
  one selected by `VIEWS[activeView]` is ever rendered/mounted — React's reconciler never mounts the
  others. This is a common, slightly wasteful-looking but harmless pattern: constructing 10 element
  descriptors is cheap; only one actually becomes a live component tree.
- **`<Dashboard onNavigate={setActiveView} />`** — this is the only view that receives a prop at
  all. It needs the ability to jump to a *different* view (e.g. clicking "classes this week" jumps
  to `timetable`) without going through the sidebar — this is the mechanism.
- The returned JSX nests the chosen view **and** `ResourceBookingModal` as siblings inside
  `DashboardShell`'s children — both exist in the tree simultaneously; the modal just renders
  `null` when `resourceModalOpen` is false (per `Modal.jsx`'s own early-return).

---

## 2. `Dashboard.jsx` (239 lines) — the faculty landing page

**Origin:** `renderFacultyDashboard()` + `renderActionRequired()` + `renderFacultySyllabusManager()`
+ `updateSyllabus()`, all from legacy `fixes.js`. The file's header comment notes the latter two
were injected into `dashboard-view` by `fixes.js` at runtime, not present in `faculty.html`'s static
markup — same pattern as several other "hidden" legacy widgets this migration had to discover by
reading the JS rather than the HTML.

`Dashboard({ onNavigate })` itself is a pure composition root — four sibling components, no state
or hooks of its own:

### `Metrics({ onNavigate })`
Two clickable metric cards. Two independent `useState('—')` values
(`totalStudents`, `classesThisWeek`), each populated by its own `useEffect`/`apiFetch` call:
- `totalStudents` ← `GET /admin/users`, filtered client-side to `role === 'student'`, length taken.
  **Worth flagging explicitly:** this is the *entire college's* student count, not "students I
  teach" — the endpoint has no faculty-scoping, and the frontend does no further filtering by
  enrollment. This is a faithful port of the legacy behavior, not a new bug, but it means the number
  shown here can be larger than the roster `StudentOverview.jsx` shows (which *is* properly
  faculty-scoped via `/faculty/me/students`).
- `classesThisWeek` ← `GET /faculty/me/timetable`, then counts total slots by summing
  `Object.keys(day).length` across every day in `tt.grid`.
Both catches silently fall back to `'—'` on failure — no error toast, no retry, just the dash
placeholder staying up. Clicking either card calls `onNavigate('student-overview')` or
`onNavigate('timetable')` respectively.

### `Intervention()`
Fetches `/admin/users` once, filters to `role === 'student' && u.is_at_risk === true` — this *is*
risk-flag-driven (unlike `Metrics`, which doesn't filter by risk), but still not section-scoped —
every at-risk student in the college shows up here regardless of whether this faculty teaches them.
(Contrast with `getAtRiskStudents` in the backend, file 03 §1, which *does* section-scope for the
`faculty` role when called from `faculty.controller.ts`'s own `/faculty/me/at-risk` route — but this
component doesn't call that route; it calls the unscoped `/admin/users` and filters client-side,
so the section-scoping that route offers isn't actually exercised here.) Renders each flagged
student with a name (colored red if CGPA < 6, amber otherwise), CGPA, and two buttons — "Send
Alert" sets `alertTarget`, "Schedule Meeting" sets `meetingTarget`, each rendering the
corresponding shared modal (`SendAlertModal`/`MeetingModal` from file 01 §§11, 15) with that
target's `{ id, name }`.

### `ActionRequired({ onNavigate })`
Fetches two endpoints in parallel via `Promise.all`: `/attendance-requests` and `/research`, each
individually `.catch(() => [])`'d so one failing doesn't blank the whole widget. Derives two counts:
`canGrant` (requests where `admin_status === 'approved' && faculty_status !== 'granted'` — i.e.
admin already approved, faculty hasn't acted yet) and `pendBTP` (research projects that are
`status === 'active'` *and* have at least one upload — meaning a student submitted work faculty
hasn't reviewed). Builds a `list` of `{ icon, text, view }` entries, only including a line item if
its count is nonzero. If `items === undefined` (still loading), the whole component returns `null`
— no loading skeleton, it just doesn't render until data arrives. Each item, when clicked, calls
`onNavigate(i.view)` — `'attendance'` or `'research'`. **Note:** `'attendance'` is not actually a key
in `FacultyDashboard`'s own `VIEWS`/`TITLES` maps (the real key is `'mark-attendance'`) — clicking
the attendance action-required item would call `setActiveView('attendance')`, which doesn't match
any `VIEWS` key, so `VIEWS['attendance']` is `undefined` and nothing renders in the content area
(the sidebar's active-highlight also wouldn't match any nav item). This is a real, narrow
inconsistency worth being aware of if you're auditing this page specifically — distinct from the
previously-documented admin/head `'leave-management'` vs `'leave'` bug, but the same *shape* of bug
(a hardcoded view-id string that doesn't match the actual key).

### `SyllabusManager()`
The most involved piece of `Dashboard.jsx`. Uses `useAuth()` for `user.user_id` and
`useNotifications()` for `showToast`. State: `courses` (`undefined` while loading, then an array or
`[]`), `values` (a flat map keyed by `` `${courseId}_${section}` `` → the current slider value for
that course+section pair).

- **`load()`** — fetches `/courses` (**not** `/faculty/me/courses`) and `/syllabus-progress` in
  parallel. The code comment explains the endpoint choice deliberately: `/courses` carries every
  section's own `faculty_id`, while `/faculty/me/courses` "only ever attaches one section per
  course" — meaning if this faculty teaches two sections of the same course, the `/faculty/me/courses`
  shape can't represent both, so this component needs the richer, unfiltered `/courses` response and
  does its own section-level filtering: `c.sections.filter(s => s.faculty_id === myUserId)`. Builds
  an `initial` values map by matching each `(course_id, section)` pair against the fetched progress
  records, defaulting to `0` if no record exists yet.
- Each course renders a block with one labeled range slider per section this faculty actually
  teaches, bound to `values[key]`, with its own **`save(courseId, section)`** button that `PATCH`es
  `/syllabus-progress` with `{ course_id, section, progress: Number(val) }` and toasts success or
  failure independently per section (there's no bulk-save — every slider commits on its own).

---

## 3. `MarkAttendance.jsx` (320 lines)

**Origin:** `renderMarkAttendanceTable()` + `markAllAttendance()` + `submitAttendance()` +
`renderFacultyAttendanceRequests()` + `grantAttReq()`, all from legacy `fixes.js`. Same
"injected-at-runtime, not static HTML" pattern as `Dashboard.jsx`'s syllabus/action-required
widgets — the attendance-requests section below the form isn't in `faculty.html`'s static markup
either.

The file's own header comment flags **one legacy quirk deliberately preserved, not fixed**: the
date `<input>` is validated against "must equal today," but the actual `POST` body always sends
`today` regardless of what the picker shows — meaning the date field is, and always was, "required
but functionally ignored," a UX inconsistency inherited faithfully rather than silently patched
during the port. (You can see this directly in `AttendanceForm`'s `submit()`: it validates `date`
against `today` in three separate branches, but the request body sends `date: today`, not the local
`date` state variable at all.)

`MarkAttendance()` itself: two sibling components, `AttendanceForm` and `AttendanceRequests`, no
shared state between them (they independently fetch and manage their own data).

### `AttendanceForm()`
State: `courses` (`null` while loading), `courseId`, `section`, `date`, `students` (`null` = nothing
loaded yet, `[]` = loaded-but-empty — a three-state pattern distinct from simple loading booleans,
used throughout this codebase to distinguish "haven't tried" from "tried and got nothing"),
`statuses` (map of `user_id` → `'present'|'absent'`), `submitting`.

- Mount effect: `apiFetch('/faculty/me/courses')` → `setCourses`.
- **`selectedCourse`** / **`mySections`** are plain derived values (not memoized — recomputed every
  render), handling both shapes a course object might have: a `sections` array (multi-section
  faculty) or a bare `section` string (single-section, older/simpler data shape) falling back to
  `[selectedCourse.section]`.
- A `useEffect` keyed on `[courseId, selectedCourse]` auto-selects a section: clears it if no course
  chosen, auto-picks the only section if there's exactly one, or picks the first if there are
  multiple and the current `section` isn't among them.
- A second `useEffect` keyed on `[courseId, section]` fetches the actual roster: `GET
  /faculty/attendance/today/${courseId}?section=...` (section query omitted if blank — meaning "all
  my assigned sections of this course," per the backend logic in file 03 §1). On response, seeds
  `statuses` from each student's `today_status` — defaulting every status that isn't exactly
  `'absent'` to `'present'` (so a never-marked student starts as present, matching the backend's own
  "default to present" behavior documented in `faculty.service.ts`).
- **`markAll(status)`** — guards against an empty roster with a warning toast, otherwise sets every
  loaded student's status to the given value and confirms with a success toast. This is the "All
  Present"/"All Absent" quick-action pair.
- **`presentCount`** — a plain derived count of how many are currently `'present'`, used only for
  the small `N of M` badge next to the quick-action buttons.
- **`submit()`** — the validation chain, in exact order: course selected → date selected → date not
  in the future → date not in the past (**only exactly today is accepted** — this is the "faculty
  cannot mark attendance for past dates" rule the error message states explicitly) → at least one
  record exists. Builds `records` from `Object.entries(statuses)`, POSTs to `/faculty/attendance`
  with `{ course_id, section (if set), date: today, records }` — reiterating the quirk above: `date`
  state is validated but never actually sent; `today` (recomputed fresh via `new
  Date().toISOString().split('T')[0]` at component-render time, a `const` not in any dependency
  array) is what's sent.

### `AttendanceRequests()`
Independent of `AttendanceForm` — its own `requests` state (`undefined` while loading),
`load()`/mount-effect pair fetching `/attendance-requests` (not faculty-scoped by query param — the
backend scopes it by role/section server-side, see file 03 §2).

- **`grant(id, studentId)`** — `PATCH /attendance-request/${id}/mark`, then `send(...)` to notify
  the student directly (not a broadcast — this is a personal notification), toasts success, and
  calls `load()` again to refresh the list (no optimistic update — a full refetch after every grant).
- Render logic branches each request into exactly one of four states, computed inline per request
  (not stored as component state): `granted` (green badge, `faculty_status === 'granted'`),
  `rejected` (red badge, `admin_status === 'rejected'`), `canGrant` (a green "Grant Attendance"
  button, `admin_status === 'approved' && faculty_status !== 'granted'`), or the implicit fourth
  state — "Awaiting Admin" (yellow badge) — whenever none of the first three match, i.e. the request
  is still pending admin review. If the request carries a `file_id`, a "View document" button calls
  `downloadDocument(r.file_id)` (file 01 §4).

---

## 4. `AssessmentMapping.jsx` (406 lines) — the largest faculty page

**Origin:** `renderAssessmentList()` + `populateAssessSectionOptions()` + `submitCreateAssessment()`
(the create-assessment modal) and `openMarksModal()` + `submitMarksEntry()` (the marks-entry
modal), all from legacy `fixes.js`. The file's header comment flags something notable about the
marks modal specifically: in the legacy code, the "already-locked marks show read-only" behavior
existed as a **second `window.openMarksModal` definition that monkey-patched the first** (see file
04 §2 for the exact line numbers) — i.e. the legacy app shipped two competing implementations of the
same function, the second silently overwriting the first at script-load time, with no indication in
the HTML of which one actually ran. The React port folds both into **one** function
(`MarksEntryModal`) rather than reproducing that duplication.

### `CreateAssessmentModal({ open, onClose, onCreated })`
State: `name`, `type`, `date`, `marks`, `mode` (defaults `'offline'`), `courses` (`null` while
loading), `courseId`, `section`, `submitting`.

- On open, resets every field and fetches `/courses`.
- **`mySections`** — derived (not memoized): finds the selected course in `courses`, filters its
  `sections` to ones where `faculty_id === user.user_id`. A `useEffect` keyed on `[courseId]`
  auto-selects the section if there's exactly one match.
- **The past-date guard** is called out explicitly in an inline comment as a **parity fix, not a
  straight port**: the legacy `assessmentModal` had *no* past-date check at all, unlike every other
  date-entry flow in the app (events, meetings, leave). This component adds one, deliberately
  matching the pattern `EventScheduler.jsx`'s own (non-existent, since that page is read-only —
  see §6) `ScheduleEventModal` would have used, applied two ways: the browser-level `min={today}`
  attribute on the date `<input>` (handles the common case of picking from the calendar widget), plus
  a submit-time `if (date < today)` check (catches manual keyboard entry, browser autofill, or
  timezone edge cases the `min` attribute alone can't prevent).
- **`submit(e)`** validation chain: name ≥3 chars → type selected → date present → date not in the
  past (the fix above) → course selected → section selected → marks present and ≥1 → marks ≤1000.
  POSTs `{ name, type, date, max_marks, course_id, section, exam_mode }` to `/assessments`.

### `MarksEntryModal({ assessment, onClose, onSaved })`
State: `students` (`null` while loading), `submissions`, `existingMarks`, `values` (map of
`student_id` → entered marks string), `errors` (map of `student_id` → boolean, for inline red
borders), `submitting`. `isOnline = assessment?.exam_mode === 'online'`.

- On `assessment` change (opening with a new target), fetches three things in parallel:
  `/faculty/me/students` (always), `/submissions` (only if `isOnline`, else resolves to `[]`
  immediately without a network call — an online-mode-only fetch), and
  `/marks?assessment_id=${assessment.assessment_id}` (always, catching failure to `[]`). Seeds
  `values` from `existingMarks` — any student who already has a mark recorded shows that value
  pre-filled and **disabled** (the "locked" state — see below).
- **The locking rule** is the component's central piece of business logic, straight from the file's
  own header comment: a mark, once saved, cannot be re-entered through this UI. `existingMarks.find(m
  => m.student_id === s.user_id)` determines `locked` per-student; the number input is
  `disabled={!!locked || (isOnline && !submitted)}` — so a student is uneditable either because
  their mark is already locked, *or* (for online exams specifically) because they never submitted
  work in the first place, meaning there's nothing to grade yet.
- **`submit()`** iterates `Object.entries(values)`, **skipping** (via `continue`, not an error) any
  student already in `existingMarks` — locked rows are silently excluded from the save attempt
  rather than flagged as an error, since the UI already disabled their input. For the remaining
  entries, validates each is a number between `0` and `maxMarks` inclusive, collecting failures into
  `nextErrors` rather than stopping at the first bad one — the user sees every invalid field
  highlighted at once, not one at a time. If `hasError`, shows one toast and returns without saving
  anything (not even the valid ones) — this is an **all-or-nothing** submit, unlike
  `MarkAttendance`'s per-request grant actions. If no `records` survive at all (e.g. everything was
  already locked), shows a different warning and returns. Otherwise, POSTs each record individually
  in a sequential `for` loop (not `Promise.all` — one request after another), tracking `saved` vs.
  `locked` counts; a per-record failure whose message *contains the substring* `'locked'` is treated
  as "someone else locked this mark between load and submit" (a race-condition recovery path,
  incrementing `locked` rather than aborting the whole loop) — any *other* error message is
  re-thrown and aborts the remaining iterations. On each successful save, immediately calls `send(...)`
  to notify that specific student with their new mark ("These marks are now locked and final"),
  meaning students are notified one at a time as their row saves, not in one batch at the end.

### `AssessmentCard({ assessment, onEnterMarks })`
Pure presentational — a stateless card showing name/type/date, an exam-mode badge
(online/offline), a course+section badge, max marks, and an "Enter Marks" button that calls the
`onEnterMarks` callback passed down from the parent.

### `AssessmentMapping()` (the default export, the page root)
State: `assessments` (`undefined` while loading), `createOpen`, `marksTarget` (the assessment
currently open in `MarksEntryModal`, or `null`). **`load()`** fetches
`` `/assessments?faculty_id=${user.user_id}` `` — note this *is* a server-side-filtered query
(unlike `Metrics`/`Intervention`'s client-side filtering in `Dashboard.jsx`) — and the fetch runs
once on mount. Renders the "+ Create Assessment" button, the list of `AssessmentCard`s (or an empty
state), and both modals — `CreateAssessmentModal`'s `onCreated` and `MarksEntryModal`'s `onSaved`
both just call `load` again, so neither modal does any optimistic local-state update; every mutation
is followed by a full refetch of the assessment list.

---

## 5. `StudentOverview.jsx` (268 lines)

**Origin:** `renderFacultyStudents()` + `renderStudentCards()` + `filterStudentOverview()` +
`sendFacultyBroadcast()` + `openAssignBTPModal()` + `submitAssignBTP()`, all from legacy `fixes.js`.

### `AssignBTPModal({ open, onClose, onAssigned })`
State: `students` (`null` while loading), `studentId`, `title`, `abstract`, `submitting`. On open,
fetches **two** endpoints in parallel: `/admin/users` (every user, unfiltered) and
`/faculty/me/students` (this faculty's own roster, with profile enrichment — CGPA, attendance, etc.
— but potentially missing some students who exist as users but haven't been fully enrolled/profiled
yet). It builds a `profileMap` from the second call and layers it onto the first: `(allUsers ||
[]).filter(u => u.role === 'student').map(s => { const p = profileMap[s.user_id] || {}; return { id:
s.user_id, name: ... } })`. This two-source merge means the dropdown shows **every student in the
college**, not just this faculty's own roster — a BTP project can be assigned to a student this
faculty doesn't otherwise teach or supervise, which is a deliberate (if perhaps surprising)
behavior carried over from the legacy `openAssignBTPModal()`, not a React-introduced bug.

- **`submit(e)`** validates a student is selected and the title is ≥3 characters (abstract is
  optional, no minimum). POSTs `{ student_id, title, abstract, status: 'active', progress: 0 }` to
  `/research` — this is the creation endpoint `ResearchPanel.jsx`'s faculty branch later manages via
  `PATCH .../progress`. Immediately `send(...)`s the assigned student a notification.

### `StudentCard({ student, onAlert, onMeeting })`
Pure presentational, no hooks. Computes everything inline from the `student` prop: initials from
first/last name, a risk color/background/label 3-way branch (`is_at_risk` → red "AT RISK"; else CGPA
< 7 → amber "LOW CGPA"; else → green "GOOD"), a separate CGPA text color (red if <6, amber if <7,
green otherwise — note this is a *different* threshold ladder than the badge's, so a student with
CGPA 6.5 gets the amber "LOW CGPA" badge but the CGPA number itself also renders amber, while a
student with CGPA 5.5 gets the same amber badge but a *red* CGPA number — intentional layered
severity, not a bug), and an attendance color (gray if unknown, red if <75%, green otherwise).
Renders the "Send Alert" / "Meeting" buttons that invoke the parent's callbacks.

### `StudentOverview()` (the default export)
State: `students` (`undefined` while loading), `search`, `broadcastMsg`, `meetingOpen` (the
unselected-student "Schedule Meeting" quick action button), `assignOpen`, `alertTarget`,
`meetingTarget` (a *specific* student's meeting, separate from the general `meetingOpen` flag —
notice the `MeetingModal`'s `open` prop is `meetingOpen || !!meetingTarget`, so either path opens
the same modal instance, with `preselected` only set when `meetingTarget` is the trigger).

- **`load()`** — the same two-source merge pattern as `AssignBTPModal` (`/admin/users` +
  `/faculty/me/students`), but here building a *display* list rather than a dropdown list: every
  student gets `first_name`/`last_name` (profile value preferred, falling back to the bare user
  record, then `'Student'`), `cgpa`, `branch` (from either `branch` or `department` field — another
  defensive dual-field read), `attendance_pct`, and `is_at_risk`.
- **`filtered`** — `useMemo`, depends on `[students, search]`. Case-insensitive substring match
  against first name, last name, or user id. This is the **one `useMemo` in the entire faculty
  actor** — every other derived value across all six pages is a plain recomputed-every-render
  expression; this is the sole place the migration explicitly memoized, presumably because it runs
  against a potentially large, unfiltered college-wide student list on every keystroke in the
  search box.
- **`sendBroadcast()`** — validates the message is ≥5 characters, then calls `broadcast('student',
  fromName, ...)` — **not** `broadcastAll` — meaning this reaches every student in the system with
  that role, not scoped to this faculty's own roster (the backend has no concept of a
  faculty-scoped broadcast; `NotificationsContext`'s `broadcast` function only filters by role, see
  file 01 §2).

---

## 6. `EventScheduler.jsx` (57 lines) — the simplest faculty page

**Origin:** `renderFacultyEventsTable()` from legacy `fixes.js`. **Deliberately read-only**, and the
file's header comment is unusually direct about why: `faculty.html`'s "+ Add Event" button calls
`onclick="openModal('facultyEventModal')"`, but **no `facultyEventModal` markup exists anywhere** in
either `faculty.html` or `fixes.js` — it was a dead button in the shipped legacy app, clicking it
would try to open a modal element that doesn't exist and silently do nothing. The React port does
not invent a working create-event flow to "fix" this, on the stated principle that admin/head
already has its own real, working event-creation flow (a different modal, from Phase 3, outside
this guide's scope) — faculty was never supposed to create events in the first place, just view
them, and the legacy button was leftover/vestigial rather than a genuine missing feature.

The entire component: one `useState(undefined)` for `events`, one `useState(null)` for `error`, one
mount-effect fetching `GET /events` into one or the other. Renders a four-column table
(type/details/date-venue/empty) with three possible body states (error, loading, empty) before the
actual row-mapping, each a separate ternary branch rather than nested conditionals. No modals, no
mutations, no `useNotifications` import at all — the only faculty page with zero write capability.

---

Continue to **[03-backend-mapping.md](./faculty-03-backend-mapping.md)** for exactly what happens on
the server side of every endpoint this file's six pages call.
