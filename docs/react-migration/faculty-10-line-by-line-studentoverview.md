# Faculty Actor — Study Guide 10: Line-by-Line — `StudentOverview.jsx`

**File:** `front-end-react/src/pages/faculty/StudentOverview.jsx` (268 lines)

Three pieces: `AssignBTPModal`, `StudentCard` (pure presentational), and the `StudentOverview` page
root. Backend hops cite [file 05](./faculty-05-request-pipeline-reference.md).

---

### Lines 1–6 — file header
```jsx
/**
 * StudentOverview — ported from legacy fixes.js renderFacultyStudents() +
 * renderStudentCards() + filterStudentOverview() + sendFacultyBroadcast() +
 * openAssignBTPModal() + submitAssignBTP() (faculty.html's
 * student-overview-view).
 */
```
Five legacy functions (exact lines in file 04 §2).

### Lines 8–14 — imports
```jsx
import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationsContext';
import Modal from '../../components/shared/Modal';
import SendAlertModal from '../../components/shared/SendAlertModal';
import MeetingModal from '../../components/shared/MeetingModal';
```
**Line 8** imports `useMemo` — the only file in the entire faculty actor to do so (file 02 §5's
flagged observation), used exactly once, at line 183 below.

---

## `AssignBTPModal` (lines 16–98)

### Lines 16–23 — signature and state
```jsx
function AssignBTPModal({ open, onClose, onAssigned }) {
  const { user } = useAuth();
  const { showToast, send } = useNotifications();
  const [students, setStudents] = useState(null);
  const [studentId, setStudentId] = useState('');
  const [title, setTitle] = useState('');
  const [abstract, setAbstract] = useState('');
  const [submitting, setSubmitting] = useState(false);
```
Takes a plain `open` boolean (unlike `MarksEntryModal`'s object-presence pattern in file 09) — this
modal has no single "target" object it's editing, just a dropdown of students to assign *to*.

### Lines 25–45 — the open-reset-and-fetch effect
```jsx
  useEffect(() => {
    if (!open) return;
    setStudentId('');
    setTitle('');
    setAbstract('');
    Promise.all([apiFetch('/admin/users'), apiFetch('/faculty/me/students').catch(() => [])])
      .then(([allUsers, profiles]) => {
        const profileMap = {};
        (profiles || []).forEach((p) => {
          profileMap[p.user_id] = p;
        });
        const list = (allUsers || [])
          .filter((u) => u.role === 'student')
          .map((s) => {
            const p = profileMap[s.user_id] || {};
            return { id: s.user_id, name: `${p.first_name || s.first_name || s.username || ''} ${p.last_name || s.last_name || ''}`.trim() };
          });
        setStudents(list);
      })
      .catch(() => setStudents([]));
  }, [open]);
```
Resets three fields on open, then fetches **two sources in parallel**:
- **`GET /admin/users`** — **Hop**: `@Roles(..., 'faculty', ...)` (file 03 §2) — every user in the
  college, unfiltered.
- **`GET /faculty/me/students`** — **Hop**: `@Roles('faculty')` (file 03 §1) — this faculty's own
  section-scoped roster, each entry enriched with profile data (CGPA, attendance, etc.). Wrapped in
  its own inline `.catch(() => [])`, so a failure of *this specific* call degrades gracefully to "no
  profile enrichment available" rather than failing the whole modal.
- **Lines 32–41**: builds a `profileMap` keyed by `user_id` from the second call, then maps **every**
  student from the first call (not just ones present in the profile map) to `{ id, name }`, with the
  name assembled via a three-level fallback chain per field (`p.first_name || s.first_name ||
  s.username || ''`) — this is what makes the dropdown show **every student in the college**, not
  just this faculty's own roster, exactly as documented in file 02 §5: the `/admin/users` list is
  the base set; `/faculty/me/students` only *enriches* names for students it happens to also know
  about, it never narrows the set.

### Lines 47–65 — `submit(e)`
```jsx
  const submit = async (e) => {
    e.preventDefault();
    if (!studentId) return showToast('Please select a student to assign this BTP project', 'warning');
    if (!title.trim() || title.trim().length < 3) return showToast('Project title must be at least 3 characters', 'warning');

    setSubmitting(true);
    try {
      await apiFetch('/research', { method: 'POST', body: JSON.stringify({ student_id: studentId, title: title.trim(), abstract: abstract.trim(), status: 'active', progress: 0 }) });
      const from = user?.first_name || 'Faculty';
      send(studentId, from, `📚 BTP Project Assigned: "${title.trim()}". Open your Research Projects section to view details and submit your work.`, 'info');
      showToast('BTP Project assigned to student! Student has been notified. ✅', 'success');
      onClose();
      onAssigned();
    } catch (e2) {
      showToast('Failed to assign BTP: ' + e2.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };
```
Two validations: student selected, title ≥3 trimmed characters. **Abstract has no minimum length
check at all** — it can be submitted empty. **Hop — `POST /research`**: `@Roles('faculty', 'admin',
'head', 'superadmin')` + `@RequiresModule('research')` (file 03 §2, `createResearch`). The service
requires `student_id` and `title`, stamps the creating user as `supervisor_id` implicitly (not shown
in the snippet examined in file 03, but consistent with how `GET /research`'s `faculty` branch
later filters by `supervisor_id === userId` to find this project again) — **there is no check here
that the assigned student is one this faculty actually teaches** — any student in the college,
regardless of enrollment, can have a BTP project assigned to them by any faculty member, a looser
rule than the assessment-creation path's strict section-ownership check (file 09). Body sent:
`{ student_id, title, abstract, status: 'active', progress: 0 }` — the project always starts at
`0%` with `'active'` status, hardcoded, not user-selectable at creation time. On success, `send(...)`
notifies the assigned student directly, then both `onClose()` and `onAssigned()` fire — the latter
is `StudentOverview`'s own `load` (line 181), a full roster refetch, not related to the research
project itself at all (re-fetching student data after assigning a research project — the two
resources aren't actually connected by this refetch, it's just the one list this page happens to
maintain).

### Lines 67–98 — the render
A `<form>` inside `<Modal>`: Select Student (required dropdown, option text `{name} ({id})`),
Project Title (required text input), Abstract (optional textarea, no `required` attribute — matching
the lack of a length check in `submit`).

---

## `StudentCard` (lines 100–143) — pure presentational

```jsx
function StudentCard({ student, onAlert, onMeeting }) {
  const fullName = `${student.first_name || ''} ${student.last_name || ''}`.trim();
  const initials = ((student.first_name?.[0] || '?') + (student.last_name?.[0] || '')).toUpperCase();
  const riskColor = student.is_at_risk ? '#ef4444' : student.cgpa && student.cgpa < 7 ? '#d97706' : '#16a34a';
  const riskBg = student.is_at_risk ? '#fef2f2' : student.cgpa && student.cgpa < 7 ? '#fef9c3' : '#dcfce7';
  const riskLabel = student.is_at_risk ? 'AT RISK' : student.cgpa && student.cgpa < 7 ? 'LOW CGPA' : 'GOOD';
  const cgpaColor = student.cgpa && student.cgpa < 6 ? '#dc2626' : student.cgpa && student.cgpa < 7 ? '#d97706' : '#16a34a';
  const hasAtt = student.attendance_pct !== null && student.attendance_pct !== undefined;
  const attText = hasAtt ? `${student.attendance_pct}%` : 'N/A';
  const attColor = !hasAtt ? '#94a3b8' : student.attendance_pct < 75 ? '#ef4444' : '#16a34a';
```
No hooks, no network calls — every value is derived synchronously from the `student` prop on every
render. **Line 102**: `initials` — if `first_name` is missing entirely, falls back to the literal
character `'?'`; if `last_name` is missing, contributes an empty string, so a student with no last
name on file shows single-character initials, not a padded two-character glyph. **Three parallel
three-way ladders** (lines 103–106) all branch on the **same two underlying fields**
(`is_at_risk`, `cgpa`) but **compute independently of each other**, and notably **use different
thresholds**: the risk badge's ladder treats `cgpa < 7` as the second tier (after `is_at_risk`
itself), while the separate `cgpaColor` ladder (line 106) treats `cgpa < 6` as its *first* tier and
`cgpa < 7` as its second — meaning a student with CGPA 6.5 gets the amber "LOW CGPA" risk badge
**and** an amber CGPA number (both ladders agree at this value), but a student with CGPA 5.5 gets
the **same** amber "LOW CGPA" badge (since the risk-badge ladder only distinguishes `is_at_risk` vs.
`cgpa < 7` vs. neither — it has no separate `< 6` tier at all) while the CGPA number itself renders
**red** (since the color ladder *does* have that distinction). This is a real, visible layered-severity
quirk: two numbers on the same card, driven by the same underlying value, computed by two
independently-written ternary chains that happen to agree at some thresholds and diverge at others.
**Lines 107–109**: attendance text/color — `hasAtt` distinguishes "no attendance data at all" (gray
`N/A`) from "has data, below 75%" (red) from "has data, 75% or above" (green) — a genuine three-state
rather than binary distinction, mirroring the `null`-vs-`0`-vs-populated handling seen throughout
this codebase's backend services too (file 03's `attendance_pct: attendance.total > 0 ?
attendance.percentage : null` pattern).

The render (lines 111–142) is a card with avatar initials, name, id+branch subline, a risk badge,
a two-column CGPA/Attendance stat grid, and two action buttons (`onAlert`/`onMeeting`) that simply
invoke the callbacks passed down from the parent — no state, no network calls originate here.

---

## `StudentOverview` (lines 145–268) — the page root

### Lines 145–154 — signature and state
```jsx
export default function StudentOverview() {
  const { user } = useAuth();
  const { showToast, broadcast } = useNotifications();
  const [students, setStudents] = useState(undefined);
  const [search, setSearch] = useState('');
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [alertTarget, setAlertTarget] = useState(null);
  const [meetingTarget, setMeetingTarget] = useState(null);
```
Eight pieces of state — the most of any single component in this guide. Two **separate** meeting-
related states (`meetingOpen` and `meetingTarget`) exist side by side specifically because this page
offers two distinct entry points into the same `MeetingModal`: a general "Schedule Meeting" button
(opens with no preselection) and a per-card "Meeting" button (opens with that specific student
preselected) — see line 264's combined `open` expression.

### Lines 156–181 — `load()`
```jsx
  const load = () => {
    Promise.all([apiFetch('/admin/users').catch(() => []), apiFetch('/faculty/me/students').catch(() => [])])
      .then(([allUsers, profileStudents]) => {
        const profileMap = {};
        (profileStudents || []).forEach((s) => {
          profileMap[s.user_id] = s;
        });
        const list = (allUsers || [])
          .filter((u) => u.role === 'student')
          .map((u) => {
            const p = profileMap[u.user_id] || {};
            return {
              user_id: u.user_id,
              first_name: p.first_name || u.first_name || u.username || 'Student',
              last_name: p.last_name || u.last_name || '',
              cgpa: p.cgpa || null,
              branch: p.branch || p.department || '',
              attendance_pct: p.attendance_pct === null || p.attendance_pct === undefined ? null : p.attendance_pct,
              is_at_risk: !!p.is_at_risk,
            };
          });
        setStudents(list);
      })
      .catch(() => setStudents([]));
  };
  useEffect(load, []);
```
The **same two-source merge pattern** as `AssignBTPModal` (lines 25–45 above) — `/admin/users` as
the base roster, `/faculty/me/students` layered on top for enrichment — but building a richer,
seven-field *display* shape here rather than the modal's minimal `{ id, name }`. **Line 172**: the
attendance field explicitly checks for both `null` and `undefined` before deciding whether to pass
the value through or coerce to `null` — a defensive normalization ensuring `hasAtt` in `StudentCard`
(line 107 above) can rely on a clean `null`-or-number distinction regardless of which falsy-ish
value the backend actually returned. **Line 174**: `!!p.is_at_risk` — coerces to a strict boolean,
since `p.is_at_risk` might be `undefined` (student has no profile entry at all) rather than
literally `false`. **Line 181**: `useEffect(load, [])` — passes `load` **directly** as the effect
callback (not wrapped in an arrow function `() => load()`), a slightly more concise but
functionally identical form to every other mount-effect in this guide.

### Lines 183–189 — the `filtered` memo
```jsx
  const filtered = useMemo(() => {
    if (!students) return [];
    const term = search.toLowerCase();
    return students.filter(
      (s) => (s.first_name || '').toLowerCase().includes(term) || (s.last_name || '').toLowerCase().includes(term) || (s.user_id || '').toLowerCase().includes(term),
    );
  }, [students, search]);
```
The one `useMemo` in the entire faculty actor. Depends on `[students, search]` — recomputes only
when either the underlying roster or the search term changes, **not** on every render of this
fairly large component tree (which re-renders on every keystroke in the search box regardless,
since `search` itself is the controlled input's state — the memoization here specifically avoids
re-running the `.filter()` + three `.toLowerCase()` calls per student on renders that *aren't*
caused by a `students`/`search` change, e.g. a re-render triggered by `alertTarget` changing when a
card's "Send Alert" button is clicked). Case-insensitive substring match against first name, last
name, **or** user id — any one match is sufficient (an `||` chain, not requiring all three).

### Lines 191–197 — `sendBroadcast()`
```jsx
  const sendBroadcast = () => {
    if (!broadcastMsg.trim() || broadcastMsg.trim().length < 5) return showToast('Please enter a message (min 5 characters)', 'warning');
    const from = user?.first_name || user?.username || 'Faculty';
    broadcast('student', from, `📢 ${broadcastMsg.trim()}`, 'info');
    showToast('Message broadcast to all your students!', 'success');
    setBroadcastMsg('');
  };
```
**No network call at all** — `broadcast(...)` is `NotificationsContext`'s own function (file 01
§2), purely a `localStorage` write plus the cross-tab `storage`-event mechanism; there is no backend
route for "send a broadcast." **Line 193**: targets the literal role string `'student'`, reaching
**every** student in the system with that role — despite the toast's own text claiming "to all
*your* students," the actual mechanism has no concept of "yours" at all; it is a platform-wide,
role-targeted broadcast, not a section- or roster-scoped one. The success toast is shown
unconditionally on the very next line after calling `broadcast`, with no way for this synchronous,
client-side-only operation to actually fail — the toast is not reporting a real outcome, just
confirming the action was taken.

### Lines 199–268 — the render
A gradient-background "Broadcast Message to All Students" card (text input bound to `broadcastMsg`,
"Send to All" button calling `sendBroadcast`), a row of two quick-action buttons ("📅 Schedule
Meeting" → `setMeetingOpen(true)`; "📚 Assign BTP Project" → `setAssignOpen(true)`), then the main
"Student Overview" card: a search input bound to `search`, and a responsive CSS grid
(`repeat(auto-fill, minmax(280px, 1fr))`) of `StudentCard`s mapped from `filtered` (not `students`
directly — the search always filters, even when `search` is an empty string, since an empty
`term` matches every string's `.includes('')` trivially true). Each card's `onAlert`/`onMeeting`
set `alertTarget`/`meetingTarget` to `{ id: s.user_id, name: ... }` — **note the two callbacks build
the name slightly differently**: `onAlert` uses the full `` `${s.first_name} ${s.last_name ||
''}`.trim() `` (first + last), while `onMeeting` uses **only** `s.first_name` (line 255) — a minor,
easy-to-miss inconsistency where the meeting-target name passed to `MeetingModal` drops the
student's last name entirely, unlike every other "build a display name" call site in this file and
the ones examined in files 07–09. At the bottom, three components mounted unconditionally:
`SendAlertModal`, `MeetingModal` (with `open={meetingOpen || !!meetingTarget}` — either entry point
opens the same instance), and `AssignBTPModal` (whose `onAssigned` is `load`, the same full-roster
refetch used everywhere else in this file).

---

Continue to **[11-line-by-line-eventscheduler.md](./faculty-11-line-by-line-eventscheduler.md)**.
