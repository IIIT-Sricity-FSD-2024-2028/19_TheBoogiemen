# Faculty Actor — Study Guide 8: Line-by-Line — `MarkAttendance.jsx`

**File:** `front-end-react/src/pages/faculty/MarkAttendance.jsx` (320 lines)

Two sibling components: `AttendanceForm` (the mark-attendance UI itself) and `AttendanceRequests`
(the student-correction-request review list below it). Every backend hop cites
[file 05](./faculty-05-request-pipeline-reference.md); the deepest service-level logic in this
entire guide lives behind this file's two POST/PATCH calls — both re-derive section ownership
server-side on every write, a pattern worth watching for as it recurs.

---

### Lines 1–12 — file header
```jsx
/**
 * MarkAttendance — ported from legacy fixes.js renderMarkAttendanceTable() +
 * markAllAttendance() + submitAttendance() + renderFacultyAttendanceRequests()
 * + grantAttReq(). The attendance-requests section is injected into
 * mark-attendance-view at runtime by fixes.js, not in faculty.html's static
 * markup (same pattern as the dashboard widgets — see Dashboard.jsx's notes).
 *
 * One legacy quirk carried over faithfully, not fixed: the date field is
 * validated against "must equal today" and the actual POST body always
 * sends today's date regardless of what's selected — the picker is
 * effectively just required-but-ignored friction in the original too.
 */
```
Names five legacy functions (exact lines in file 04 §2), and — critically — **documents its own
quirk in advance**: the `date` input is validated but never actually used in the request body. Hold
this in mind through lines 97–124 below, where the quirk is implemented exactly as described.

### Lines 14–18 — imports
```jsx
import { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';
import { downloadDocument } from '../../api/uploads';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationsContext';
```
`downloadDocument` (file 01 §4) is only used by `AttendanceRequests` (line 294), for a request's
attached supporting document. `useAuth` is only used by `AttendanceRequests` too (for the
notification "from" name) — `AttendanceForm` needs neither `useAuth` nor the document-download
helper.

### Lines 20–32 — `MarkAttendance()`, the composition root
```jsx
export default function MarkAttendance() {
  return (
    <div className="stats-card">
      <div className="stats-card-header"><h3>Mark Attendance</h3></div>
      <div className="stats-card-body" style={{ padding: 24 }}>
        <AttendanceForm />
      </div>
      <div style={{ padding: '0 24px 24px' }}>
        <AttendanceRequests />
      </div>
    </div>
  );
}
```
Pure composition, no state or hooks here. One `stats-card` wrapper for the form (`stats-card-body`
with explicit `padding: 24`), and a separate plain `<div>` with its own padding for the requests
list below it — **not** inside the same `stats-card-body`, meaning the requests section visually
sits outside the card's own body styling (its own child components, lines 275 onward, build their
own `stats-card`-style box from scratch rather than nesting inside this one).

---

## `AttendanceForm` (lines 34–249)

### Lines 34–43 — signature and state
```jsx
function AttendanceForm() {
  const { showToast } = useNotifications();
  const [courses, setCourses] = useState(null);
  const [courseId, setCourseId] = useState('');
  const [section, setSection] = useState('');
  const [date, setDate] = useState('');
  const [students, setStudents] = useState(null); // null = nothing loaded, [] = loaded empty
  const [statuses, setStatuses] = useState({}); // user_id -> 'present' | 'absent'
  const [submitting, setSubmitting] = useState(false);
  const today = new Date().toISOString().split('T')[0];
```
Seven pieces of state plus one derived constant. Note `courses` and `students` both use `null` as
their "not loaded" sentinel (not `undefined`, unlike most other files in this guide) — the inline
comment on line 40 makes the three-state meaning explicit for `students` specifically: `null` =
nothing attempted yet, `[]` = attempted and genuinely empty. **Line 43**: `today` is computed fresh
on **every render** of this component (it's a plain `const`, not memoized, not inside a `useEffect`)
— `new Date().toISOString().split('T')[0]` turns the current instant into a `YYYY-MM-DD` string in
UTC. Because this recomputes every render, it is always accurate to "now" without any explicit
refresh logic, at the (negligible) cost of a few extra `Date` object allocations per render.

### Lines 45–49 — the course-list mount effect
```jsx
  useEffect(() => {
    apiFetch('/faculty/me/courses')
      .then(setCourses)
      .catch(() => setCourses([]));
  }, []);
```
**Hop**: `GET /faculty/me/courses`, `@Roles('faculty')` (file 03 §1, `faculty.controller.ts`'s own
`getMyCourses`). **Service**: `sectionsTaughtBy(db, userId)` → unique course ids → each course
enriched with `section` (first match) and `sections` (full array) — the shape this component's
dropdown and section-derivation logic below both depend on. `.then(setCourses)` — passes the
resolved array **directly** as the state setter, with no intermediate transformation (the simplest
possible `.then` callback — equivalent to `.then((data) => setCourses(data))` but written as a bare
function reference).

### Lines 51–52 — derived course/section lookups
```jsx
  const selectedCourse = courses?.find((c) => c.course_id === courseId);
  const mySections = selectedCourse?.sections || (selectedCourse?.section ? [selectedCourse.section] : []);
```
Both plain derived expressions, recomputed every render (no `useMemo`). **Line 52** handles two
possible shapes defensively: prefer the full `sections` array if present; otherwise, fall back to
wrapping the single legacy-shaped `section` field in a one-element array; otherwise, an empty array.
This dual-shape tolerance mirrors the same defensive pattern seen in `faculty.service.ts`'s own
`getMyCourses` return shape (file 03 §1) — the frontend is written to handle either representation
gracefully.

### Lines 54–64 — auto-select section effect
```jsx
  useEffect(() => {
    if (!courseId) {
      setSection('');
      return;
    }
    if (mySections.length === 1) {
      setSection(mySections[0]);
    } else if (mySections.length > 1 && !mySections.includes(section)) {
      setSection(mySections[0]);
    }
  }, [courseId, selectedCourse]);
```
Dependency array is `[courseId, selectedCourse]` — **not** `[courseId, mySections]**, even though
`mySections` is what the body actually reads. Because `selectedCourse` changing is what causes
`mySections` to be recomputed on the next render anyway, this still behaves correctly in practice,
but it's worth noting the effect's own stated dependencies don't literally list every value its
body closes over (the ESLint `react-hooks/exhaustive-deps` rule would normally flag this, though no
suppression comment appears here, unlike several other files in this guide that explicitly disable
it). Logic: no course selected → clear section; exactly one section available → auto-pick it;
multiple sections available and the *currently selected* section isn't among them (e.g. the
faculty just switched to a different course entirely) → default to the first one.

### Lines 66–83 — the roster-fetch effect
```jsx
  useEffect(() => {
    if (!courseId) {
      setStudents(null);
      return;
    }
    setStudents(null);
    const query = section ? `?section=${encodeURIComponent(section)}` : '';
    apiFetch(`/faculty/attendance/today/${courseId}${query}`)
      .then((data) => {
        setStudents(data.students || []);
        const init = {};
        (data.students || []).forEach((s) => {
          init[s.user_id] = s.today_status !== 'absent' ? 'present' : 'absent';
        });
        setStatuses(init);
      })
      .catch(() => setStudents([]));
  }, [courseId, section]);
```
Depends on both `courseId` and `section` — refires whenever either changes, including when the
auto-select effect above (lines 54–64) itself changes `section` in response to a course switch.
**Line 71**: explicitly resets `students` back to `null` (the loading sentinel) before the new fetch
even starts, so the table briefly shows "Loading students..." (line 203 below) rather than
continuing to display the *previous* course's roster while the new one is in flight. **Line 72**:
builds the optional query string, `encodeURIComponent`-escaping the section value — defensive
against a section name that happens to contain a character that would otherwise break the URL
(none of the seed data does, but the escaping is unconditional regardless).

- **Hop — `GET /faculty/attendance/today/:courseId?section=...`**: `@Roles('faculty')` (file 03
  §1, `getTodayAttendance`). **Service**: college-ownership check on the client-supplied `courseId`
  first (404 if it belongs to another college); then re-derives `mySections` for *this specific
  course* via `sectionsTaughtBy`, 403ing (`PRIVILEGE_CEILING`) if this faculty teaches none of it at
  all, or if a specific `section` was requested that isn't among their own; resolves
  `targetSections` to either the one requested section or every section they teach of this course;
  builds the roster from `db.enrollment` matching those sections, and for each student attaches
  `today_status`, defaulting to `'present'` if no attendance_log entry exists yet for today.
- **Line 75**: `data.students || []` — defensive against a malformed/missing field in the response.
- **Lines 76–80**: seeds `statuses` from each student's `today_status` — **note the exact
  condition**: `s.today_status !== 'absent' ? 'present' : 'absent'` — this treats *anything other
  than* the literal string `'absent'` as present, including a backend value the frontend doesn't
  recognize at all, rather than checking `=== 'present'` and defaulting unknown values to absent.
  This mirrors the backend's own default-to-present behavior (file 03 §1) at the frontend layer too
  — the two are independently written to agree, not sharing a single source of truth for the
  default.

### Lines 85–93 — `markAll(status)`
```jsx
  const markAll = (status) => {
    if (!students || students.length === 0) return showToast('Load students first by selecting a course', 'warning');
    const next = {};
    students.forEach((s) => {
      next[s.user_id] = status;
    });
    setStatuses(next);
    showToast(`All students marked as ${status}`, 'success');
  };
```
Guards against being called with no roster loaded at all (`null`) or a genuinely empty one (`[]`)
— both produce the same warning toast, since from this function's perspective there's nothing
useful to do either way. Otherwise, **replaces the entire `statuses` map wholesale** — this is a
bulk overwrite, not a merge; any per-student toggling a user had done before clicking "All
Present"/"All Absent" is discarded entirely, not preserved for students the bulk action didn't
explicitly address (there's nothing *to* preserve, since every loaded student gets the same new
status).

### Line 95 — the present-count derivation
```jsx
  const presentCount = students ? students.filter((s) => statuses[s.user_id] === 'present').length : 0;
```
Recomputed every render, used only by the small "N of M" badge (line 181). `students ? ... : 0` —
if the roster hasn't loaded, short-circuits to `0` rather than calling `.filter` on `null`.

### Lines 97–124 — `submit()`, where the documented quirk lives
```jsx
  const submit = async () => {
    if (!courseId) return showToast('Select a course first', 'warning');
    if (!date) return showToast('Please select a date for attendance', 'warning');
    if (date > today) return showToast('Cannot mark attendance for future dates', 'warning');
    if (date < today) return showToast("Faculty cannot mark attendance for past dates. Use today's date only.", 'error');

    const records = Object.entries(statuses).map(([student_id, status]) => ({ student_id, status }));
    if (!records.length) return showToast('Please mark attendance for at least one student', 'warning');

    setSubmitting(true);
    try {
      await apiFetch('/faculty/attendance', {
        method: 'POST',
        body: JSON.stringify({
          course_id: courseId,
          ...(section ? { section } : {}),
          date: today,
          records,
        }),
      });
      const secLabel = section ? ` (Section ${section})` : '';
      showToast(`Attendance saved for ${records.length} students!${secLabel} (Date: ${today})`, 'success');
    } catch (e) {
      showToast('Failed: ' + e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };
```
- **Line 98**: course must be selected.
- **Line 99**: `date` state (the picker's own value) must be non-empty.
- **Line 100**: `date > today` → "cannot mark for future dates."
- **Line 101**: `date < today` → "cannot mark for past dates, use today's date only" — **between
  lines 100 and 101, the only value of `date` that survives both checks is exactly `today`**, so
  this validation chain, despite looking like a normal date-range check, actually only ever accepts
  one specific value.
- **Line 103**: builds `records` from the entire `statuses` map — every student currently loaded,
  regardless of whether their status was explicitly touched by the user or just inherited from the
  initial seed (lines 76–80) — there's no concept of "only send the ones that changed."
- **Line 104**: guards against an empty roster producing an empty `records` array (reachable if
  `courseId` is set but `students` somehow resolved to `[]`).
- **Line 112 — the quirk itself**: `date: today` — **not** `date: date`. Every validation branch
  above referenced the `date` state variable; the actual network payload uses the separately-
  computed `today` constant instead. Functionally, because lines 100–101 already force `date` to
  equal `today` before this point is ever reached, the two happen to hold the same value at submit
  time regardless — but the state variable itself plays no role in what's actually sent; it exists
  purely to be validated against, never to be transmitted. This is precisely the behavior the file
  header (lines 8–11) warns about.
- **Line 111**: `...(section ? { section } : {})` — a conditional spread: if no specific section is
  selected (the "All Assigned Sections" option, file 02 §3), the `section` key is omitted from the
  body entirely rather than sent as an empty string — this is what tells the backend to target
  *every* section this faculty teaches of the course (file 03 §1's `recordAttendance`:
  `targetSections = section ? [section] : mySections.map(...)`).
- **Hop — `POST /faculty/attendance`**: `@Roles('faculty')` (file 03 §1). Controller requires
  `course_id`, `date`, `records` present (400 otherwise — note the controller's own check, not this
  frontend validation, is the actual authority; the frontend's chain above is advisory only).
  **Service** (`recordAttendance`): repeats the exact same college-ownership + section-ownership
  re-derivation as the `GET` roster endpoint above — independently, not shared code between the
  read and write paths beyond both calling `sectionsTaughtBy`. Filters `myStudentIds` to students
  actually enrolled in the target section(s); any record whose `student_id` isn't in that set is
  silently dropped (`continue`, no error) — meaning a tampered request body with extra student ids
  smuggled in simply has those entries ignored, not rejected outright. For each surviving record:
  normalizes the status, and — the leave-precedence rule — an existing `EXCUSED` status is never
  downgraded to `ABSENT` by a resubmission; otherwise updates the existing row or creates a new one
  with a fresh UUID. Returns `{ saved, created, updated, records }`.
- **Line 118**: `secLabel` — built from the *state* `section` variable (not `today`), used only in
  the success toast text, independent of what's in the request body.
- **Lines 119–123**: success/failure toast handling, `finally` resets `submitting` regardless of
  outcome — standard pattern, same shape as every other submit handler in this guide.

### Lines 126–186 — the controls row render
```jsx
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 1.2fr) minmax(130px, 0.8fr) minmax(140px, 1fr) auto auto', gap: 16, marginBottom: 24, alignItems: 'end' }}>
        {/* Course select, Section select, Date input, Quick-action buttons, N-of-M badge */}
      </div>
```
A five-column CSS grid (`minmax(...)` column tracks sized for course/section/date, then two `auto`
columns for the quick-action buttons and the badge), `alignItems: 'end'` so differently-tall
controls (labels + inputs vs. just a badge) all align to their bottoms. The **Course `<select>`**
(lines 131–138) is a plain controlled select bound to `courseId`, firing `setCourseId` on change —
this is what kicks off the entire cascade (auto-select-section effect, roster-fetch effect) via
React's own dependency tracking, with no explicit "and now also do X" chaining written by hand. The
**Section `<select>`** (lines 141–162) is `disabled={!courseId || mySections.length <= 1}` —
disabled whenever there's nothing meaningful to choose (no course yet, or only one/zero sections) —
its options branch into four cases (no course / zero sections / exactly one section / multiple
sections, the last case adding an extra "All Assigned Sections" option with an empty-string value,
which is exactly the value that makes line 111's conditional spread omit `section` from the submit
body). The **Date `<input type="date">`** (line 166) is a plain controlled input with **no `min` or
`max` attribute at all** — unlike nearly every other date input in this entire codebase (see
`CreateAssessmentModal`, `MeetingModal`, `LeaveApplyModal`, all of which set `min={today}` at the
browser level) — meaning the browser's native date picker will happily let a user pick any past or
future date, and the only thing catching that mistake is the submit-time check at lines 100–101,
not any front-line browser-level guard. The **quick-action buttons** (lines 171–177) call `markAll('present')`/
`markAll('absent')` directly. The **N-of-M badge** (lines 179–184) only renders at all when
`students && students.length > 0` — absent entirely while loading or when the roster is empty.

### Lines 188–243 — the student table render
A `<table className="crud-table">` with a four-way conditional body (no course selected / still
loading / loaded-empty / populated — lines 200–240), then one row per student (lines 207–239) with
a two-button present/absent toggle pair per row, each `onClick` directly calling `setStatuses((st)
=> ({ ...st, [s.user_id]: 'present' | 'absent' }))` — an immutable spread-and-override update,
touching only that one student's entry in the map.

### Lines 244–246 — the save button
```jsx
      <button className="submit-btn" style={{ marginTop: 20, width: '100%' }} onClick={submit} disabled={submitting}>
        {submitting ? 'Saving…' : '✓ Save Attendance'}
      </button>
    </>
  );
}
```
Disabled while `submitting` is true (prevents a double-submit from a second click before the first
request resolves), label text swaps to reflect the in-flight state.

---

## `AttendanceRequests` (lines 251–320)

### Lines 251–259 — signature, state, and `load`
```jsx
function AttendanceRequests() {
  const { user } = useAuth();
  const { showToast, send } = useNotifications();
  const [requests, setRequests] = useState(undefined);

  const load = () => apiFetch('/attendance-requests').then(setRequests).catch(() => setRequests([]));
  useEffect(() => {
    load();
  }, []);
```
**Hop — `GET /attendance-requests`**: `@Roles(..., 'faculty', ...)` (file 03 §2). **Service**: for
`faculty`, filtered to `faculty_id === userId` via `concernedFacultyFor` — properly scoped, as
documented in file 03 §2. `load` is redefined fresh every render (not `useCallback`-wrapped,
same non-issue as `Dashboard.jsx`'s `SyllabusManager.load`, for the same reason: the effect's empty
dependency array means it's irrelevant that `load`'s identity changes).

### Lines 261–270 — `grant(id, studentId)`
```jsx
  const grant = async (id, studentId) => {
    try {
      await apiFetch(`/attendance-request/${id}/mark`, { method: 'PATCH' });
      send(studentId, user?.first_name || 'Faculty', '✅ Your attendance has been granted by faculty!', 'info');
      showToast('Attendance granted! Student notified.', 'success');
      load();
    } catch (e) {
      showToast('Failed: ' + e.message, 'error');
    }
  };
```
**Hop — `PATCH /attendance-request/:id/mark`**: `@Roles('faculty')` (file 03 §2,
`markAttendanceRequest`). **Service**: college-ownership check on the request; re-derives
`concernedFacultyFor(req).faculty_id` and 403s if it doesn't match the caller — the write-side
mirror of the read-side `faculty_id === userId` filter above, independently enforced. Then requires
`admin_status === 'approved'` (400 if admin hasn't approved yet) and `faculty_status !== 'granted'`
(400 if already granted — **this is the backend's own idempotency guard**; note this component's
own UI already only ever shows the "Grant Attendance" button for requests satisfying exactly these
two conditions, per the render logic below, so in normal use this 400 branch should be unreachable
from this UI — it would only fire from a stale render, e.g. two browser tabs open on the same list).
On success, writes or corrects an `attendance_log` row to `PRESENT` for that student/course/date.
**Line 264**: on success, `send(...)` pushes a **personal**, not broadcast, notification directly to
that one student — this is a client-side-only, `NotificationsContext`-backed call (file 01 §2), a
completely separate write path from the `PATCH` that just succeeded; nothing server-side records
that this notification was ever sent. **Line 266**: `load()` — a full refetch of the entire request
list after every single grant, no optimistic local update.

### Lines 272–320 — the render
```jsx
  if (requests === undefined) return null;

  return (
    <div style={{ marginTop: 20, padding: 20, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12 }}>
      <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700 }}>📝 Student Attendance Requests</h3>
      {requests.length === 0 ? (
        <p style={{ color: '#64748b', textAlign: 'center' }}>No attendance requests for your courses.</p>
      ) : (
        requests.map((r) => {
          const canGrant = r.admin_status === 'approved' && r.faculty_status !== 'granted';
          const rejected = r.admin_status === 'rejected';
          const granted = r.faculty_status === 'granted';
          return (
            /* ...row markup... */
          );
        })
      )}
    </div>
  );
}
```
Same "render nothing until loaded" pattern as `ActionRequired` in file 07. Three booleans computed
per-row, **not mutually exclusive by construction** — `canGrant`, `rejected`, and `granted` are each
independently derived from the row's two status fields, and the render branches (lines 302–311,
not fully reproduced here but documented component-wise in file 02 §3) check them in a specific
order (`granted` first, then `rejected`, then `canGrant`, falling through to an implicit fourth
"awaiting admin" state) — meaning if a row somehow had both `granted` and `rejected` true at once
(not possible given the backend's own state machine, but not structurally prevented by this
rendering logic either), the `granted` branch would win purely by being checked first in the
ternary chain. If the row carries a `file_id`, a "View document" button calls
`downloadDocument(r.file_id)` (file 01 §4) — the one place in this file that reaches the uploads
subsystem.

---

Continue to **[09-line-by-line-assessmentmapping.md](./faculty-09-line-by-line-assessmentmapping.md)**.
