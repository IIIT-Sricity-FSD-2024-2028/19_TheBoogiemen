# Faculty Actor — Study Guide 7: Line-by-Line — `Dashboard.jsx`

**File:** `front-end-react/src/pages/faculty/Dashboard.jsx` (239 lines)

Four independent sub-components, each with its own state and its own network calls, composed by one
top-level `Dashboard` function. Every network call cites [file 05](./faculty-05-request-pipeline-reference.md)
for the generic pipeline and adds only what's specific to that route.

---

### Lines 1–7 — file header
```jsx
/**
 * Dashboard — ported from legacy fixes.js renderFacultyDashboard() +
 * renderActionRequired() + renderFacultySyllabusManager() + updateSyllabus().
 * The latter two are injected into dashboard-view at runtime by fixes.js,
 * not present in faculty.html's static markup (see the migration notes in
 * student/Attendance.jsx for the same pattern).
 */
```
Names four legacy functions this one file replaces, verified with exact line numbers in [file 04
§2](./faculty-04-legacy-origin-mapping.md#2-function-by-function-mapping). The "injected at runtime"
claim is the Mechanism 2 pattern documented in file 04 §1 — `ActionRequired` and `SyllabusManager`
(lines 118 and 157 below) correspond to DOM elements legacy `fixes.js` only ever created with
`document.createElement`, never declared in `faculty.html`'s static markup.

### Lines 9–14 — imports
```jsx
import { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationsContext';
import SendAlertModal from '../../components/shared/SendAlertModal';
import MeetingModal from '../../components/shared/MeetingModal';
```
- **Line 9**: both of React's two most common hooks — `useEffect` for the four mount-time fetches
  below, `useState` for every piece of local state in this file.
- **Line 10**: `apiFetch` — every network call in this file goes through it (file 01 §3).
- **Line 11**: `useAuth` — only `SyllabusManager` (line 158) actually calls this.
- **Line 12**: `useNotifications` — only `SyllabusManager` (line 159) actually calls this; neither
  `Metrics`, `Intervention`, nor `ActionRequired` show a toast or send a notification anywhere in
  this file (contrast with `Intervention`'s modals, which *do* send notifications, but through
  `SendAlertModal`/`MeetingModal`'s own internal `useNotifications()` calls, not this file's).
- **Lines 13–14**: the two shared modals `Intervention` (line 63) opens — both documented fully in
  file 01 §§11 and 15.

### Lines 16–25 — the composition root
```jsx
export default function Dashboard({ onNavigate }) {
  return (
    <>
      <Metrics onNavigate={onNavigate} />
      <Intervention />
      <ActionRequired onNavigate={onNavigate} />
      <SyllabusManager />
    </>
  );
}
```
- **Line 16**: receives one prop, `onNavigate` — this is `FacultyDashboard.jsx`'s own
  `setActiveView`, threaded down through `VIEWS.dashboard = <Dashboard onNavigate={setActiveView}
  />` (file 06, line 151). This is the *only* mechanism by which anything inside this file can
  change which top-level view is showing.
- **Line 18**: a React Fragment (`<>...</>`) — four siblings with no wrapping DOM element, since
  this component itself holds no state and needs no wrapper to attach anything to.
- **Line 19**: `Metrics` receives `onNavigate` directly — its two clickable cards navigate.
- **Line 20**: `Intervention` receives nothing — it has no navigation of its own, only two modals.
- **Line 21**: `ActionRequired` receives `onNavigate` too — its clickable items navigate (with the
  bug described below).
- **Line 22**: `SyllabusManager` receives nothing — it has no navigation at all, only its own
  internal save actions.
- **This component itself has zero hooks and makes zero network calls** — it is purely a
  composition root, delegating all behavior to its four children.

---

## `Metrics` (lines 27–61)

### Lines 27–30 — signature and state
```jsx
function Metrics({ onNavigate }) {
  const [totalStudents, setTotalStudents] = useState('—');
  const [classesThisWeek, setClassesThisWeek] = useState('—');
```
Both pieces of state initialize to the literal em-dash character `'—'`, not `undefined` or `null` —
this is a deliberate **placeholder-as-initial-value** pattern: the two metric cards (lines 48–59)
render `{totalStudents}`/`{classesThisWeek}` unconditionally, so starting at `'—'` means the card
shows a sensible placeholder glyph from the very first paint, with no separate loading-state
branch needed in the JSX below (contrast with `Intervention`, which *does* need a loading branch
because its initial state is `undefined` and it renders a list, not a single scalar).

### Lines 31–45 — the mount effect, two independent fetches
```jsx
  useEffect(() => {
    apiFetch('/admin/users')
      .then((all) => setTotalStudents(all.filter((u) => u.role === 'student').length))
      .catch(() => setTotalStudents('—'));
    apiFetch('/faculty/me/timetable')
      .then((tt) => {
        if (!tt?.grid) return;
        let slots = 0;
        Object.values(tt.grid).forEach((day) => {
          slots += Object.keys(day).length;
        });
        setClassesThisWeek(slots);
      })
      .catch(() => setClassesThisWeek('—'));
  }, []);
```
- **Line 31**: `useEffect` with an empty dependency array — runs exactly once, on mount (i.e. every
  time the `dashboard` view becomes active, since `Dashboard` only exists in the tree while
  `activeView === 'dashboard'` — see file 06's note on `VIEWS` reconciliation).
- **Lines 32–34 — first fetch, `GET /admin/users`**:
  - **Hop** (file 05 §§3–4): request → `JwtAuthGuard` verifies the session cookie → `RolesGuard`
    checks `@Roles('admin', 'head', 'superadmin', 'faculty')` on `common.controller.ts`'s
    `getAllUsers` handler — `faculty` is explicitly in that list (file 03 §2), so this passes. No
    `@RequiresModule` on this route (file 05 §5 is a no-op here).
  - **Service**: `scopeToCollege(db.users, collegeId).map(sanitizeUser)` — every user in this
    faculty's own college, password hashes and other sensitive fields stripped, **completely
    unfiltered by role or section** at the backend level.
  - **Line 33**: the frontend does its own filtering client-side — `all.filter(u => u.role ===
    'student')`, then takes `.length`. **This is the entire college's student count**, not "students
    I teach" — there is no section-scoping applied anywhere in this call chain, confirmed precisely
    in [file 02 §2](./faculty-02-pages-deep-dive.md#2-dashboardjsx-239-lines--the-faculty-landing-page).
  - **Line 34**: on failure, resets to the placeholder `'—'` — no error surfaced to the user at all,
    not even a console warning (contrast with other components in this guide that at least `console.warn`
    or toast on failure).
- **Lines 35–44 — second fetch, `GET /faculty/me/timetable`**:
  - **Hop**: `@Roles('faculty')` only, on `FacultyController.getTimetable` (file 03 §1). Only a
    faculty-role token can reach this at all — `RolesGuard` 403s anyone else.
  - **Service** (`getFacultyTimetable`, file 03 §1): section-scoped via `sectionsTaughtBy` — this
    *is* properly scoped to just this faculty member's own teaching load, unlike the `/admin/users`
    call above it.
  - **Line 37**: guards against a response with no `grid` key at all (an empty/malformed timetable)
    by returning early — `classesThisWeek` stays at its placeholder in that case, same as the catch
    branch, but via a different code path (an early `return` inside the `.then`, not a thrown
    error).
  - **Lines 38–41**: counts total scheduled slots by summing `Object.keys(day).length` across every
    day in the grid — this is a plain nested-object traversal, not a call to any shared counting
    helper; the exact same counting logic (`Object.values(...).forEach(day => slots +=
    Object.keys(day).length)`) would need to be duplicated by hand anywhere else in the codebase
    that needed the same total.
  - **Line 42**: commits the count to state.
  - **Line 44**: same silent-placeholder-reset failure handling as the first fetch.
- **Both fetches run concurrently** (`apiFetch` isn't `await`ed in sequence — both `.then()` chains
  are set up back-to-back inside the same synchronous effect body, so both requests fire essentially
  simultaneously, not one after the other).

### Lines 47–60 — the render
```jsx
  return (
    <div className="metrics-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
      <div className="metric-card" style={{ cursor: 'pointer' }} onClick={() => onNavigate('student-overview')} title="View students">
        <div className="label">TOTAL STUDENTS</div>
        <div className="value">{totalStudents}</div>
        <div className="sub">click to view all ↗</div>
      </div>
      <div className="metric-card" style={{ cursor: 'pointer' }} onClick={() => onNavigate('timetable')} title="View timetable">
        <div className="label">CLASSES THIS WEEK</div>
        <div className="value">{classesThisWeek}</div>
        <div className="sub">click to view timetable ↗</div>
      </div>
    </div>
  );
```
A two-column CSS grid (`gridTemplateColumns: '1fr 1fr'`, an inline style override on top of the
`metrics-grid` class). **Line 49**: `onNavigate('student-overview')` — this string is an **exact
match** for `FacultyDashboard.jsx`'s `VIEWS['student-overview']` key (file 06, line 156): clicking
this card correctly switches to the Student Overview view. **Line 54**: `onNavigate('timetable')`
— also an exact match for `VIEWS.timetable` (file 06, line 152): correctly switches to the
Timetable view. Both cards are wired correctly; neither has the id-mismatch bug `ActionRequired`
has below.

---

## `Intervention` (lines 63–116)

### Lines 63–66 — signature and state
```jsx
function Intervention() {
  const [students, setStudents] = useState(undefined);
  const [alertTarget, setAlertTarget] = useState(null);
  const [meetingTarget, setMeetingTarget] = useState(null);
```
`students` starts `undefined` (not `'—'` like `Metrics`'s scalars) because this component needs a
real three-state distinction for its render logic below: *loading* (`undefined`), *loaded-empty*
(`[]`), *loaded-with-data* (non-empty array) — a scalar placeholder wouldn't support that. `alertTarget`/
`meetingTarget` are both `null` until a specific student's button is clicked — each becomes `{ id,
name }` for exactly one student at a time.

### Lines 68–72 — the mount effect
```jsx
  useEffect(() => {
    apiFetch('/admin/users')
      .then((all) => setStudents(all.filter((u) => u.role === 'student' && u.is_at_risk)))
      .catch(() => setStudents([]));
  }, []);
```
**Hop**: identical backend route and guard chain as `Metrics`'s first fetch above (`GET
/admin/users`, `@Roles(..., 'faculty')`, `sanitizeUser`-scrubbed, college-scoped-not-section-scoped).
**Line 70**: the filter predicate here adds `&& u.is_at_risk` on top of the role check — this *is*
risk-driven, unlike `Metrics`'s plain count, but it is **still not section-scoped**: every at-risk
student in the whole college appears here, including ones this faculty member doesn't teach at all.
Contrast this directly with `faculty.service.ts`'s `getAtRiskStudents` (file 03 §1), which *does*
properly section-scope for the `faculty` role — that route exists and is correct, but this component
doesn't call it; it calls the unscoped `/admin/users` instead and filters client-side. **Line 71**:
on failure, resets to an empty array (not `undefined`) — this *does* exit the loading state on
error, unlike `Metrics`'s placeholder-reset, meaning a failed fetch here renders the "no students
flagged" success message (line 86) rather than staying stuck on "Loading..." — a misleading but
real distinction in behavior between this component and `Metrics`.

### Lines 74–111 — the render, three-way ternary
```jsx
  return (
    <div className="stats-card">
      <div className="stats-card-header">
        <div>
          <h3>Early Intervention Required</h3>
          <p>Students needing attention based on attendance &amp; performance.</p>
        </div>
      </div>
      <div className="stats-card-body">
        {students === undefined ? (
          <div style={{ textAlign: 'center', color: '#64748b', padding: 20 }}>Loading...</div>
        ) : students.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24, color: '#16a34a', fontWeight: 600 }}>✓ No students currently flagged for intervention</div>
        ) : (
          students.map((s) => (
            /* ...card markup, lines 89–108... */
          ))
        )}
      </div>
```
A nested ternary implementing the three-state pattern noted above: `undefined` → loading message;
`[]` → green success message (**this branch fires both on "genuinely zero at-risk students" and on
"the fetch failed," per line 71's catch — the UI cannot distinguish these two cases from each
other**); non-empty → map over students.

### Lines 89–108 — one student row
```jsx
            <div key={s.user_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <div style={{ fontWeight: 700, color: s.cgpa && s.cgpa < 6 ? '#dc2626' : '#d97706' }}>{s.first_name} {s.last_name || ''}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>ID: {s.user_id} &nbsp;·&nbsp; CGPA: {s.cgpa || 'N/A'}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setAlertTarget({ id: s.user_id, name: `${s.first_name} ${s.last_name || ''}`.trim() })}
                  style={{ padding: '6px 12px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                >
                  Send Alert
                </button>
                <button
                  onClick={() => setMeetingTarget({ id: s.user_id, name: `${s.first_name} ${s.last_name || ''}`.trim() })}
                  style={{ padding: '6px 12px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                >
                  Schedule Meeting
                </button>
              </div>
            </div>
```
`key={s.user_id}` — React's list-reconciliation key, the student's own id, globally unique and
stable across re-fetches. The name's text color is a two-way branch, **not** the same three-way
severity ladder `StudentOverview.jsx`'s `StudentCard` uses (file 02 §5): here it's simply
`s.cgpa < 6 ? red : amber` — every at-risk student (this list is pre-filtered to `is_at_risk` only)
gets either red (CGPA genuinely low) or amber (flagged at-risk for some other reason — e.g.
attendance — even if CGPA itself isn't that low). The two buttons each build an identical `{ id,
name }` shape from the same student object, differing only in which state setter they call —
`setAlertTarget` opens `SendAlertModal` (line 112), `setMeetingTarget` opens `MeetingModal` (line
113). Neither button makes a network call itself; opening either modal is purely local state.

### Lines 112–113 — the two modals, mounted unconditionally
```jsx
      <SendAlertModal student={alertTarget} onClose={() => setAlertTarget(null)} />
      <MeetingModal open={!!meetingTarget} preselected={meetingTarget} onClose={() => setMeetingTarget(null)} />
```
`SendAlertModal` takes `student` directly as its openness signal (its own internal `open={!!student}`,
file 01 §15) — `Intervention` doesn't need its own separate boolean. `MeetingModal` needs an
explicit `open` prop *and* `preselected` separately, because `MeetingModal` also supports being
opened with **no** preselected student at all (used by `StudentOverview.jsx`'s general "Schedule
Meeting" button, file 10) — here, `open={!!meetingTarget}` and `preselected={meetingTarget}` are
tied together, so this call site only ever uses the preselected form.

---

## `ActionRequired` (lines 118–155)

### Lines 118–119 — signature and state
```jsx
function ActionRequired({ onNavigate }) {
  const [items, setItems] = useState(undefined);
```
One piece of state: the derived list of "things needing attention," starting `undefined` (not `[]`)
specifically so line 134's early-return can distinguish "haven't computed this yet" from "computed
and found nothing."

### Lines 121–132 — the mount effect, two parallel fetches with independent catches
```jsx
  useEffect(() => {
    Promise.all([apiFetch('/attendance-requests').catch(() => []), apiFetch('/research').catch(() => [])])
      .then(([attReqs, research]) => {
        const canGrant = attReqs.filter((r) => r.admin_status === 'approved' && r.faculty_status !== 'granted').length;
        const pendBTP = research.filter((p) => p.status === 'active' && (p.uploads || []).length > 0).length;
        const list = [];
        if (canGrant) list.push({ icon: '✅', text: `${canGrant} attendance request(s) to grant`, view: 'attendance' });
        if (pendBTP) list.push({ icon: '📤', text: `${pendBTP} BTP submission(s) to review`, view: 'research' });
        setItems(list);
      })
      .catch(() => setItems([]));
  }, []);
```
- **Line 122 — `GET /attendance-requests`**:
  - **Hop**: `@Roles('student', 'faculty', 'admin', 'head', 'superadmin')` (file 03 §2) — every
    role can read this, but the service response differs by role.
  - **Service** (`getAttendanceRequests`, file 03 §2): for `faculty`, filters to
    `faculty_id === userId` via the shared `concernedFacultyFor` derivation — **this one actually
    is properly scoped to this specific faculty member**, unlike the `/admin/users` calls above.
  - `.catch(() => [])` — a per-call fallback **inside** the array passed to `Promise.all`, so a
    failure of *this specific* fetch resolves to an empty array rather than rejecting the whole
    `Promise.all`.
- **Line 122 (second call) — `GET /research`**:
  - **Hop**: `@Roles(..., 'faculty', ...)` + `@RequiresModule('research')` (file 03 §2, file 05
    §5) — this is the one call in this entire file that passes through the third global guard with
    an actual check to perform, not a no-op. If the signed-in faculty's college hasn't licensed the
    `research` module, this specific `apiFetch` call throws a 403 — but because of the inline
    `.catch(() => [])`, that 403 is swallowed silently and `research` just resolves to `[]`,
    meaning `pendBTP` computes to `0` and that line item simply never appears, with **no
    indication to the user that it was suppressed by a licensing restriction** rather than
    genuinely being zero.
  - **Service** (`getResearch`, file 03 §2): for `faculty`, filtered to
    `supervisor_id === userId` — properly scoped to this faculty's own supervised projects.
- **Line 124**: `canGrant` — counts attendance requests admin already approved but this faculty
  hasn't granted yet (`admin_status === 'approved' && faculty_status !== 'granted'`) — this is a
  client-side re-derivation of a count the backend's response already lets the frontend compute;
  note this is almost, but not quite, the same predicate `MarkAttendance.jsx`'s `AttendanceRequests`
  component uses for its own `canGrant` boolean per-row (file 08) — the same logical condition,
  independently re-expressed in two different files rather than shared.
- **Line 125**: `pendBTP` — research projects that are `active` **and** have at least one entry in
  `uploads` — i.e., the student submitted something, regardless of whether faculty has already
  reviewed/responded to that specific upload. There is no "already seen" tracking — a project stays
  counted here even after faculty has already looked at (but not necessarily acted further on) the
  same upload, for as long as `status === 'active'` and `uploads.length > 0` both hold.
- **Lines 126–128**: builds `list` conditionally — **only pushes an entry if the count is nonzero**,
  so the UI never shows "0 attendance requests to grant" as a line item; it simply omits the whole
  row.
  - **Line 127**: `view: 'attendance'` — **this is the bug**. There is no `'attendance'` key
    anywhere in `FacultyDashboard.jsx`'s `VIEWS` or `TITLES` maps (file 06) — the real key for this
    exact feature is `'mark-attendance'` (file 06, line 155). Clicking this item calls
    `onNavigate('attendance')` → `setActiveView('attendance')` → `VIEWS['attendance']` is
    `undefined` → file 06's analysis of line 174 applies exactly: the content area renders nothing,
    with the sidebar's active-highlight also failing to match any nav item (since no `NAV_ITEMS`
    entry has `id: 'attendance'` either). This is a real, reproducible dead click, distinct in
    *location* but identical in *shape* to the previously-documented admin/head
    `'leave-management'`-vs-`'leave'` bug.
  - **Line 128**: `view: 'research'` — this one **is correct**: `VIEWS.research` exists (file 06,
    line 159) and resolves properly.
- **Line 131**: if *both* parallel fetches somehow fail in a way that escapes their individual inline
  catches (practically unreachable, since both are already caught — this outer `.catch` exists as a
  defensive backstop, not a path that's expected to ever actually execute), resets to `[]`.

### Lines 134–154 — the render
```jsx
  if (items === undefined) return null;

  return (
    <div style={{ marginBottom: 20 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>⚡ Action Required</h3>
      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 16, color: '#16a34a', fontWeight: 600 }}>✓ Nothing requires your attention</div>
      ) : (
        items.map((i, idx) => (
          <div
            key={idx}
            onClick={() => onNavigate(i.view)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 8, marginBottom: 8, cursor: 'pointer' }}
          >
            <span style={{ fontSize: 18 }}>{i.icon}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#92400e' }}>{i.text}</span>
          </div>
        ))
      )}
    </div>
  );
```
**Line 134**: unlike `Intervention`, this component renders **nothing at all** (not even a loading
message) while `items` is still `undefined` — the widget simply doesn't exist in the DOM until the
first fetch resolves. **Line 144**: `key={idx}` — the array index, not a stable id, because `list`
entries (built at lines 127–128) have no natural unique identifier of their own; this is safe here
specifically because the list is rebuilt from scratch on every effect run and never reordered
in-place.

---

## `SyllabusManager` (lines 157–239)

### Lines 157–161 — signature and state
```jsx
function SyllabusManager() {
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const [courses, setCourses] = useState(undefined);
  const [values, setValues] = useState({}); // `${courseId}_${section}` -> slider value
```
The only function in this file to use `useAuth()`/`useNotifications()`. `values` is a flat map
rather than nested per-course state — the inline comment documents its exact key shape
(`` `${courseId}_${section}` ``), which is the same composite-key pattern used throughout this
codebase wherever a (course, section) pair needs to be a single object key (compare
`AssessmentMapping.jsx`'s `MarksEntryModal`, which keys by `student_id` alone since marks don't need
a section dimension in that context).

### Lines 163–186 — `load()`, the course+progress fetch
```jsx
  const load = async () => {
    try {
      // /courses (not /faculty/me/courses) because it carries every
      // section's own faculty_id — /faculty/me/courses only ever attaches
      // one section per course, which breaks if this faculty teaches more
      // than one section of the same course.
      const [allCourses, allProgress] = await Promise.all([apiFetch('/courses'), apiFetch('/syllabus-progress')]);
      const myUserId = user?.user_id;
      const mine = allCourses
        .map((c) => ({ ...c, mySections: (c.sections || []).filter((s) => s.faculty_id === myUserId).map((s) => s.section) }))
        .filter((c) => c.mySections.length > 0);
      const initial = {};
      mine.forEach((c) => {
        c.mySections.forEach((sec) => {
          const sp = allProgress.find((p) => p.course_id === c.course_id && p.section === sec);
          initial[`${c.course_id}_${sec}`] = sp ? sp.progress : 0;
        });
      });
      setValues(initial);
      setCourses(mine);
    } catch {
      setCourses([]);
    }
  };
```
- **Lines 165–168 (comment)**: documents a deliberate endpoint choice — explained fully in file 02
  §2 and file 03 §2's `GET /courses` entry. The short version: `/faculty/me/courses`
  (`faculty.controller.ts`, file 03 §1) collapses each course down to **one** `section` field, which
  can't represent "I teach sections A and C of course X" — only the richer, unscoped `GET /courses`
  response (whose `sections` array carries every section's own `faculty_id`) lets this component do
  its own faculty-specific filtering correctly for a multi-section-per-course faculty member.
- **Line 169 — the two parallel fetches**:
  - `GET /courses` — **Hop**: `@Roles('student', 'faculty', 'admin', 'head', 'superadmin')` (file
    03 §2), no module gate. **Service** (`getCourses`): every course in the college, each enriched
    with `sections: sectionsOfCourse(db, courseId)` — the full per-section faculty assignment list.
  - `GET /syllabus-progress` — **Hop**: same broad role list (file 03 §2), no module gate, no query
    param used here (the optional `?section=` filter exists on this route but this call doesn't pass
    it, fetching every section's progress in the college and filtering client-side instead).
    **Service** (`getSyllabusProgress`): every progress record in the college, each enriched with
    the course's name/code.
- **Lines 170–173**: `myUserId` from the authenticated user context (not from any request — this is
  purely a client-side filter key). `mine` — maps every course to itself plus a derived
  `mySections` array (every section of that course where `s.faculty_id === myUserId`), then filters
  out any course where that derived array is empty — i.e., **courses this faculty has zero sections
  of are dropped entirely** before anything renders.
- **Lines 174–180**: builds the `initial` values map — for every `(course, section)` this faculty
  actually teaches, looks up a matching progress record by `(course_id, section)` and seeds that
  slider's starting value from it, defaulting to `0` if no record exists yet (a course/section that
  has never had its progress set at all).
- **Lines 181–182**: commits both pieces of state together — `values` first, then `courses`. The
  order here doesn't functionally matter (React batches these into one re-render regardless in this
  context), but `values` is set first in the source.
- **Lines 183–185**: **any** failure anywhere in the above — either fetch rejecting, or a thrown
  error in the synchronous processing logic — results in `courses` being set to `[]` (the loading
  state exits into "no sections assigned," line 206's empty-state branch, even though the real
  cause might have been a network failure, not an actual empty roster). `values` is left at
  whatever it was before (likely still `{}` on a first-load failure) — no explicit reset in the
  catch block.

### Lines 187–189 — the mount effect
```jsx
  useEffect(() => {
    load();
  }, []);
```
Calls `load()` once on mount. Note `load` itself is redefined on every render (it's a plain `const`
inside the function body, not wrapped in `useCallback`) — this is harmless here specifically because
the effect's dependency array is empty, so React never re-runs it in response to `load` changing
identity; if this effect ever gained a dependency on `load` itself, it would re-run on every render,
an infinite-loop risk this particular code avoids only because no such dependency exists.

### Lines 191–199 — `save(courseId, section)`
```jsx
  const save = async (courseId, section) => {
    const val = values[`${courseId}_${section}`];
    try {
      await apiFetch('/syllabus-progress', { method: 'PATCH', body: JSON.stringify({ course_id: courseId, section, progress: Number(val) }) });
      showToast(`Syllabus updated: Section ${section} → ${val}%`, 'success');
    } catch (e) {
      showToast('Failed to update syllabus: ' + e.message, 'error');
    }
  };
```
- **Line 192**: reads the current slider value for this exact `(courseId, section)` key out of the
  `values` map at the moment `save` is called — not at the moment the slider last changed, so this
  always reflects whatever's currently showing on screen.
- **Line 194 — `PATCH /syllabus-progress`**:
  - **Hop**: `@Roles('faculty', 'admin', 'head', 'superadmin')` (file 03 §2), no module gate.
  - **Service** (`updateSyllabusProgress`, file 03 §2): requires `course_id`, `section`, and
    `progress` all present (400 otherwise). Checks the course exists in this actor's college (404 if
    not — a client-supplied `courseId` is never trusted blindly). **The critical check**: if the
    caller's role is `faculty`, re-derives via `sectionsTaughtBy` whether they actually teach the
    exact `(course_id, section)` pair being updated, and 403s (`PRIVILEGE_CEILING`) if not — this is
    the exact backend enforcement the service's own comment says the frontend used to lack (file 03
    §2's note: "it offered every section of every course, not just theirs" — a historical gap, not
    a current one, since this component's own `mine`/`mySections` filtering above already restricts
    which sliders ever render in the first place). Clamps `progress` to `[0, 100]` regardless of
    what was sent. Finds-or-creates the `syllabus_progress` record and either updates it in place or
    pushes a new one.
  - **Line 195 / Line 197**: success or failure both surface as a toast — this is a **per-slider,
    independent commit**: there is no batch-save across every course/section at once; each row's
    "Save" button (rendered per-section below) triggers exactly one `PATCH` for exactly that one
    row.

### Lines 201–238 — the render
```jsx
  return (
    <div style={{ marginTop: 20, padding: 20, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12 }}>
      <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700 }}>📊 Update Syllabus Progress</h3>
      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>Update syllabus completion % per course and section</div>
      {courses === undefined ? null : courses.length === 0 ? (
        <p style={{ color: '#64748b', textAlign: 'center' }}>No sections assigned to you yet.</p>
      ) : (
        courses.map((c) => (
          <div key={c.course_id} style={{ padding: 12, border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>{c.course_code} – {c.course_name}</div>
            {c.mySections.map((sec) => {
              const key = `${c.course_id}_${sec}`;
              return (
                <div key={sec} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, width: 70 }}>Sec {sec}:</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={values[key] ?? 0}
                    onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
                    style={{ flex: 1 }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 700, width: 40 }}>{values[key] ?? 0}%</span>
                  <button
                    onClick={() => save(c.course_id, sec)}
                    style={{ padding: '4px 10px', fontSize: 11, background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                  >
                    Save
                  </button>
                </div>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
```
Three-state render (same pattern as `Intervention`): `undefined` → nothing at all (no loading
message, same silent-until-ready behavior as `ActionRequired`); `[]` → "No sections assigned to you
yet"; populated → one block per course, one row per section within it. **Nested `key`s**:
`key={c.course_id}` on the outer map, `key={sec}` on the inner one — both stable, both necessary
since this is a genuinely two-level list. The `<input type="range">` is a fully controlled
component: `value={values[key] ?? 0}` reads from state, `onChange` immediately writes back to state
on every drag tick — meaning every pixel of slider movement triggers a `setValues` call and a
re-render of this whole component tree, but **does not** trigger any network request; only clicking
the per-row "Save" button (which calls `save(c.course_id, sec)`, closing over this exact row's
`courseId`/`sec`) ever reaches the backend.

---

Continue to **[08-line-by-line-markattendance.md](./faculty-08-line-by-line-markattendance.md)**.
