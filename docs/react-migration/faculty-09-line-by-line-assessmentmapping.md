# Faculty Actor — Study Guide 9: Line-by-Line — `AssessmentMapping.jsx`

**File:** `front-end-react/src/pages/faculty/AssessmentMapping.jsx` (406 lines) — the largest single
faculty page, and the one with the deepest backend validation logic behind its writes (marks
locking). Four pieces: `CreateAssessmentModal`, `MarksEntryModal`, `AssessmentCard`, and the
`AssessmentMapping` page root. Backend hops cite [file 05](./faculty-05-request-pipeline-reference.md).

---

### Lines 1–8 — file header
```jsx
/**
 * AssessmentMapping — ported from legacy fixes.js renderAssessmentList() +
 * populateAssessSectionOptions() + submitCreateAssessment() (the
 * assessmentModal) and openMarksModal() + submitMarksEntry() (the
 * marksEntryModal, including the "already-locked marks show read-only"
 * follow-up patch — originally a second `window.openMarksModal` definition
 * monkey-patching the first in fixes.js; folded into one function here).
 */
```
Four legacy functions plus the explicit callout of the `openMarksModal` monkey-patch, traced in
exact detail with line numbers in [file 04 §3](./faculty-04-legacy-origin-mapping.md#3-the-openmarksmodal--renderfacultyresearch-monkey-patches--in-detail).

### Lines 9–14 — imports
```jsx
import { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';
import { downloadDocument } from '../../api/uploads';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationsContext';
import Modal from '../../components/shared/Modal';
```
No `useMemo`/`useCallback` anywhere in this file despite its size — every derived value in both
modals below is a plain recomputed-every-render expression, consistent with this codebase's general
pattern (file 02 noted only one `useMemo` exists across the entire faculty actor, and it's in
`StudentOverview.jsx`, not here).

---

## `CreateAssessmentModal` (lines 16–172)

### Lines 16–27 — signature and state
```jsx
function CreateAssessmentModal({ open, onClose, onCreated }) {
    const { user } = useAuth();
    const { showToast } = useNotifications();
    const [name, setName] = useState('');
    const [type, setType] = useState('');
    const [date, setDate] = useState('');
    const [marks, setMarks] = useState('');
    const [mode, setMode] = useState('offline');
    const [courses, setCourses] = useState(null);
    const [courseId, setCourseId] = useState('');
    const [section, setSection] = useState('');
    const [submitting, setSubmitting] = useState(false);
```
Note the indentation in this file uses 4 spaces, not 2 — a cosmetic inconsistency with every other
file in this guide (all 2-space), present in the actual source, not an artifact of this
documentation. `mode` defaults to `'offline'` (not an empty string like every other select-backed
state here) — meaning the Exam Mode dropdown always starts on a real, meaningful value rather than
a placeholder "select one" option.

### Lines 29–36 — the past-date-guard comment
```jsx
    // ── PAST-DATE GUARD (parity fix) ──────────────────────────────────
    // The legacy assessmentModal had no past-date check, unlike every
    // other date-entry flow in the app (events, meetings, leave). Added
    // here matching EventScheduler.jsx's own ScheduleEventModal: the
    // browser's `min` attribute handles the common case, the submit-time
    // comparison catches the rest (timezone shifts, manual keyboard
    // entry, browser autofill).
    const today = new Date().toISOString().split('T')[0];
```
Documents a deliberate deviation from pure parity — this guard is a React-introduced improvement,
not a straight port, explicitly flagged as such rather than silently slipped in. (The comment's
reference to `EventScheduler.jsx`'s "own `ScheduleEventModal`" is slightly aspirational —
`EventScheduler.jsx` as actually shipped, file 11, is read-only and has no such modal at all; the
comment is describing the *pattern* this guard follows, borrowed from modals elsewhere like
`MeetingModal`/`LeaveApplyModal`, not a literal sibling component in the same file.)

### Lines 38–50 — the open-reset-and-fetch effect
```jsx
    useEffect(() => {
        if (!open) return;
        setName('');
        setType('');
        setDate('');
        setMarks('');
        setMode('offline');
        setCourseId('');
        setSection('');
        apiFetch('/courses')
            .then(setCourses)
            .catch(() => setCourses([]));
    }, [open]);
```
Depends on `[open]` — fires every time this modal transitions from closed to open (and, technically,
every time it transitions open-to-closed too, since the dependency is the boolean itself, not a
one-directional edge — but the `if (!open) return` guard at the top means the reset-and-fetch body
only actually runs on the *opening* transition). Resets all seven form fields to their defaults
first, then fetches `/courses`. **Hop**: same `GET /courses` route and guard chain documented in
file 07 for `SyllabusManager` — `@Roles(..., 'faculty', ...)`, no module gate, returns every course
in the college enriched with its full `sections` array.

### Lines 52–56 — `mySections` derivation
```jsx
    // A course can have several sections, each with a different faculty —
    // re-derives which section(s) of the selected course belong to the
    // logged-in faculty every time the course changes, rather than the
    // server guessing (and refusing when there's more than one to guess).
    const mySections = (courses?.find((c) => c.course_id === courseId)?.sections || []).filter((s) => s.faculty_id === user?.user_id);
```
One dense expression: find the selected course object, read its `sections` array (defaulting to
`[]` if the course or the array is missing), filter to rows where `faculty_id` matches the signed-in
user. This is the client-side mirror of exactly what `common.controller.ts`'s `createAssessment`
service method (file 03 §2) does server-side when resolving which section an assessment is "for" —
both the frontend and backend independently re-derive the same `(course, faculty) → sections`
relationship from the same underlying data shape, rather than the frontend trusting a
pre-filtered value from the server.

### Lines 58–61 — auto-select section effect
```jsx
    useEffect(() => {
        setSection(mySections.length === 1 ? mySections[0].section : '');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [courseId]);
```
**This is the first `eslint-disable` line in this entire guide's walkthroughs.** The effect body
reads `mySections` (derived above, itself dependent on `courses` and `user`), but the dependency
array lists only `[courseId]` — the suppression comment exists precisely because the linter would
otherwise flag `mySections` (and transitively `courses`/`user`) as missing dependencies. The
deliberate choice to depend only on `courseId` means: this effect does **not** re-run if `courses`
finishes loading *after* a course has already been selected in some unusual ordering, or if `user`
somehow changes mid-session — in the overwhelmingly common case (courses load once, then the user
picks a course), this is harmless, but it is a narrower dependency set than the effect's own logic
technically touches.

### Lines 63–89 — `submit(e)`
```jsx
    const submit = async (e) => {
        e.preventDefault();
        if (!name || name.trim().length < 3) return showToast('Assessment name must be at least 3 characters', 'warning');
        if (!type) return showToast('Please select assessment type', 'warning');
        if (!date) return showToast('Date is required', 'warning');
        // ── PAST-DATE GUARD (submit-time check) ──────────────────────
        if (date < today) return showToast('Assessment date cannot be in the past', 'warning');
        if (!courseId) return showToast('Please select a course', 'warning');
        if (!section) return showToast('Please select a section', 'warning');
        if (!marks || Number(marks) < 1) return showToast('Enter valid max marks (min 1)', 'warning');
        if (Number(marks) > 1000) return showToast('Max marks cannot exceed 1000', 'warning');

        setSubmitting(true);
        try {
            await apiFetch('/assessments', {
                method: 'POST',
                body: JSON.stringify({ name: name.trim(), type, date, max_marks: Number(marks), course_id: courseId, section, exam_mode: mode }),
            });
            showToast('Assessment created!', 'success');
            onClose();
            onCreated();
        } catch (e2) {
            showToast('Failed: ' + e2.message, 'error');
        } finally {
            setSubmitting(false);
        }
    };
```
- **Line 64**: `e.preventDefault()` — this is a `<form onSubmit={submit}>` (line 93 below), so this
  stops the browser's own default full-page-reload form submission.
  Eight sequential validation guards (lines 65–73), each an early `return` with its own warning
  toast — name ≥3 trimmed characters, type selected, date present, date not in the past (the guard
  from lines 29–36), course selected, section selected, marks present and ≥1, marks ≤1000.
- **Line 78 — `POST /assessments`**: **Hop** — `@Roles('faculty', 'admin', 'head', 'superadmin')`
  (file 03 §2, `createAssessment`). **The richest server-side validation any faculty write triggers
  in this entire guide**: requires `course_id`; if the caller's role is `faculty` (not exempted the
  way admin/head/superadmin are), re-derives `mySectionsForCourse` via `sectionsTaughtBy` — 403s if
  they teach none of the course at all; if the client sent a `section`, 403s unless it's genuinely
  one they teach (never trusts the value this very frontend just computed and sent); if no section
  was sent and they teach exactly one, defaults to it; if no section was sent and they teach more
  than one, **400s and names the exact sections to choose from** rather than guessing. In practice,
  because this component's own `mySections` derivation (lines 52–56) already constrains which
  options the Section dropdown offers, and line 71 above already requires one to be selected before
  the request is even sent, **the backend's "more than one section, ambiguous" 400 branch should be
  unreachable from this specific UI** — it exists to protect the same endpoint against any other
  caller (a different frontend, a direct API call) that doesn't pre-filter the same way.
- **Line 79**: the actual body — `name.trim()`, `type`, `date`, `max_marks: Number(marks)`,
  `course_id: courseId`, `section`, `exam_mode: mode`. Every field the backend's validation chain
  above reads is present.
- **Lines 81–84**: on success, toast, close the modal, call `onCreated()` (which is `AssessmentMapping`'s
  own `load`, line 403 below) — a full list refetch, no optimistic insert of the new assessment into
  any local array.

### Lines 91–171 — the render
A `<form onSubmit={submit}>` inside `<Modal open={open} onClose={onClose} title="Create New
Assessment">` (file 01 §8). Fields, in order: Assessment Name (text input), a `form-row` pairing
Type (select: theory/practical/assignment/project) with Date (`<input type="date" min={today}
value={date} ...>` — **this is the browser-level half of the past-date guard**, grayed-out past
dates in the native picker, working alongside the submit-time check at line 69 rather than
replacing it), a second `form-row` pairing Total Marks (`<input type="number" min={1} max={1000}>`)
with Exam Mode (select: offline/online), a third `form-row` pairing Course (select, populated from
`courses`) with Section (select, populated from `mySections`, branching into three sub-cases:
no course selected yet / exactly one section — rendered directly, no placeholder / more than one
section — a "— Select Section —" placeholder option prepended). The submit button's label swaps
between `'Create Assessment'` and `'Creating…'` based on `submitting`.

---

## `MarksEntryModal` (lines 174–345)

### Lines 174–183 — signature and state
```jsx
function MarksEntryModal({ assessment, onClose, onSaved }) {
    const { user } = useAuth();
    const { showToast, send } = useNotifications();
    const [students, setStudents] = useState(null);
    const [submissions, setSubmissions] = useState([]);
    const [existingMarks, setExistingMarks] = useState([]);
    const [values, setValues] = useState({});
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const isOnline = assessment?.exam_mode === 'online';
```
Takes `assessment` (not a plain `open` boolean) as its openness signal — `Modal`'s own `open` prop
at line 258 is `!!assessment`, the same pattern `SendAlertModal` uses with `student` (file 01 §15).
`isOnline` is derived once per render from the `assessment` prop — note this recomputes on *every*
render of this component, not just when `assessment` changes, but since it's a cheap boolean
comparison this costs nothing measurable.

### Lines 185–205 — the open-fetch effect
```jsx
    useEffect(() => {
        if (!assessment) return;
        setStudents(null);
        setValues({});
        setErrors({});
        Promise.all([
            apiFetch('/faculty/me/students'),
            isOnline ? apiFetch('/submissions').catch(() => []) : Promise.resolve([]),
            apiFetch(`/marks?assessment_id=${assessment.assessment_id}`).catch(() => []),
        ]).then(([s, subs, marks]) => {
            setStudents(s);
            setSubmissions(subs);
            setExistingMarks(marks || []);
            const init = {};
            (marks || []).forEach((m) => {
                init[m.student_id] = m.marks_obtained;
            });
            setValues(init);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [assessment]);
```
A second `eslint-disable` in this file — the body reads `isOnline` (derived from `assessment`, so
not technically a *missing* dependency in effect, since `[assessment]` already covers the only
thing `isOnline` depends on, but the linter can't see through that derivation to know it's safe).
**Three parallel fetches**:
- **`GET /faculty/me/students`** — **Hop**: `@Roles('faculty')` (file 03 §1, `getMyStudents`).
  **Service**: section-scoped — every unique student enrolled in any of this faculty's sections,
  each enriched with `attendance_pct`, `avg_score`, `is_at_risk`, `risk_reasons`. This is always
  fetched regardless of exam mode.
- **`GET /submissions`** — only actually called if `isOnline`; otherwise short-circuits to
  `Promise.resolve([])` with **no network request at all** for an offline assessment. **Hop** (when
  it does fire): `@Roles(..., 'faculty', ...)` (file 03 §2, `getSubmissions`). **Service**: for a
  non-student caller (faculty included), returns **every** submission in the college, completely
  unfiltered by assessment or course — this component does its own filtering down to the specific
  `assessment_id` client-side (line 278 of file 02's component walkthrough, re-examined below).
- **`GET /marks?assessment_id=...`** — always called. **Hop**: `@Roles(..., 'faculty', ...)` (file
  03 §2, `getMarks`). **Service**: `scopeToCollege(db.marks_entry, collegeId)`, filtered to this
  `assessment_id`, each entry enriched with the student's full name.
- **Lines 198–202**: seeds `values` from `existingMarks` — any student with an already-recorded
  mark gets that value pre-populated into the form state, which (combined with the `disabled` logic
  in the render below) is what produces the "locked, read-only" appearance for already-graded
  students.

### Lines 207–254 — `submit()`, the core locking/validation logic
```jsx
    const submit = async () => {
        const maxMarks = assessment.max_marks || 100;
        const records = [];
        const nextErrors = {};
        let hasError = false;

        for (const [student_id, raw] of Object.entries(values)) {
            if (existingMarks.some((m) => m.student_id === student_id)) continue; // locked, read-only
            if (raw === '' || raw === undefined || raw === null) continue;
            const val = Number(raw);
            if (isNaN(val) || val < 0 || val > maxMarks) {
                nextErrors[student_id] = true;
                hasError = true;
                continue;
            }
            records.push({ student_id, assessment_id: assessment.assessment_id, marks_obtained: val, max_marks: maxMarks });
        }

        setErrors(nextErrors);
        if (hasError) return showToast(`Marks must be between 0 and ${maxMarks}`, 'warning');
        if (!records.length) return showToast('Enter at least one student mark', 'warning');

        setSubmitting(true);
        let saved = 0;
        let locked = 0;
        const from = user?.first_name || 'Faculty';
        try {
            for (const r of records) {
                try {
                    await apiFetch('/marks', { method: 'POST', body: JSON.stringify(r) });
                    saved++;
                    send(r.student_id, from, `📊 Your marks for "${assessment.name}" have been posted: ${r.marks_obtained}/${maxMarks}. These marks are now locked and final.`, 'marks');
                } catch (err) {
                    if (err.message?.includes('locked')) locked++;
                    else throw err;
                }
            }
            let msg = `Marks saved for ${saved} student(s)!`;
            if (locked > 0) msg += ` (${locked} already locked — skipped)`;
            showToast(msg + ' Students notified. ✅', 'success');
            onClose();
            onSaved();
        } catch (e) {
            showToast('Failed: ' + e.message, 'error');
        } finally {
            setSubmitting(false);
        }
    };
```
- **Line 208**: `maxMarks` — defaults to `100` if the assessment somehow has no `max_marks` set.
- **Lines 212–221 — the client-side pre-filter loop**: iterates every entry in `values` (every
  student the form currently has a value for, which is every loaded student, since `values` was
  seeded for all of them even if empty-string).
  - **Line 213**: **skips any student already in `existingMarks`** — this is the "locked" logic at
    the data level, not just the disabled-input level: even if a locked student's value somehow
    differed from their actual recorded mark (it can't, through this UI, since their input is
    disabled — but this check exists regardless of UI state), it would never be included in the
    submission.
  - **Line 215**: skips a blank entry — a student nobody entered a value for.
  - **Lines 216–220**: validates the remaining entries are numbers in `[0, maxMarks]`; invalid ones
    are recorded in `nextErrors` (for the per-input red border, file 01/02) and flagged, but **the
    loop continues** rather than stopping at the first bad value — every invalid field gets
    highlighted in one pass.
  - **Line 222**: valid entries become a full record object, ready for `POST`.
- **Line 225**: commits the error map — triggers the red-border re-render for every invalid field
  simultaneously, regardless of how many there are.
- **Line 226**: if **any** error occurred, the whole submit aborts right here — **none** of the
  valid records are sent either, even if only one of twenty students had a bad value. This is an
  explicit all-or-nothing design: either every value is valid and they all get submitted, or nothing
  is submitted until the user fixes every flagged field.
- **Line 227**: if nothing survived the filter at all (e.g. every student was already locked, or
  the form was left entirely blank), a different warning fires.
- **Lines 230–232**: `saved`/`locked` counters, and `from` — the notification sender name, resolved
  once outside the loop.
- **Lines 234–244 — the sequential per-record POST loop**: a plain `for...of`, **not**
  `Promise.all` — each `/marks` POST happens one after another, awaited in turn, not concurrently.
  - **Hop — `POST /marks`** (per record): `@Roles(..., 'faculty', ...)` (file 03 §2,
    `recordMarks`). **Service, in order**: requires `student_id` + `assessment_id`; looks up the
    assessment and checks college ownership (generic not-found, not a specific error, if it belongs
    elsewhere); **if the caller is `faculty`, requires `assessment.faculty_id === userId`** — a
    faculty member can only post marks against an assessment *they themselves created*, enforced by
    returning the same generic not-found error rather than a 403, specifically so a faculty member
    probing this endpoint can't even confirm another faculty's assessment exists; checks the
    student is actually enrolled in that assessment's course+section; and finally — **the lock
    itself, server-side** — looks for an existing `marks_entry` for this exact `(student_id,
    assessment_id)` pair and 400s with a message containing the word "locked" if one already exists.
  - **Line 239**: on success, increments `saved` and immediately `send()`s that one student a
    personal notification — **per-record, not batched**: if ten records are being saved, ten
    separate `send()` calls fire, one right after each individual POST succeeds, not all ten at the
    very end.
  - **Lines 240–243**: on failure, checks whether the error message contains the substring
    `'locked'` — this is the frontend's recovery path for a **race condition**: between this
    component loading existing marks (lines 185–205) and this exact moment, some other actor (a
    concurrent request, a different tab) recorded a mark for this same student/assessment pair
    first. If so, the loop treats it as a recoverable "someone else already locked this" case
    (increments `locked`, continues to the next record) rather than aborting. **Any other** error
    message is re-thrown, which aborts the `for` loop entirely — the remaining records in this batch
    are never attempted once a non-lock-related failure occurs.
- **Lines 246–248**: builds the final toast message, conditionally appending the locked-count
  caveat only if `locked > 0`.
- **Lines 249–250**: closes the modal and calls `onSaved()` (→ `AssessmentMapping`'s `load`) — again,
  a full refetch, no optimistic local update, same as every other mutation in this file.

### Lines 256–345 — the render
`<Modal open={!!assessment} ... title={<>Enter Marks — <span>{assessment?.name}</span></>}
maxWidth={580}>` — note the `title` prop here is **JSX**, not a plain string (file 01 §8 flagged
this exact call site as the one place in the guide where `Modal`'s `title` prop is exercised with
rich content rather than text). Inside: a loading message while `students === null`; otherwise, an
optional online-mode banner (line 272–276, only rendered when `isOnline`), then one row per
student. Each row (lines 277–331) computes, per student: `sub` (their matching submission record, if
online), `submitted` (always `true` for offline mode — line 279's `isOnline ? !!sub : true` —
meaning the "not submitted yet" red state can **only ever occur for online assessments**; an
offline assessment always treats every enrolled student as eligible to grade immediately), `locked`
(whether `existingMarks` already has this student). The number `<input>`'s `disabled` expression —
`!!locked || (isOnline && !submitted)` — is the exact rendering of the locking rule described above:
disabled if already graded, **or** if online and the student hasn't submitted anything yet. Border/
background colors layer three independent signals: red border for a validation error (`errors[s.user_id]`),
green background for `locked`, pink/red background for `!submitted` (online mode only) — these can
combine (e.g. a locked student's input is green regardless of the `submitted`/error flags, since the
inline ternaries check `locked` first in each style expression).

---

## `AssessmentCard` (lines 347–373)

Pure presentational, no hooks — takes `assessment` and an `onEnterMarks` callback. Renders the
name, a `type · date` subline, an exam-mode badge (`ONLINE`/`OFFLINE`, uppercased via
`.toUpperCase()` on the string, colored blue if online, gray if offline), a course+section badge,
the max-marks text, and the "✎ Enter Marks" button that simply invokes `onEnterMarks()` — this
component makes no network calls of its own at all; every data point it displays was already
fetched by its parent.

---

## `AssessmentMapping` (lines 375–407) — the page root

```jsx
export default function AssessmentMapping() {
    const { user } = useAuth();
    const [assessments, setAssessments] = useState(undefined);
    const [createOpen, setCreateOpen] = useState(false);
    const [marksTarget, setMarksTarget] = useState(null);

    const load = () => apiFetch(`/assessments?faculty_id=${user?.user_id}`).then(setAssessments).catch(() => setAssessments([]));

    useEffect(() => {
        load();
    }, []);

    return (
        <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginBottom: 16 }}>
                <button className="page-action-btn" onClick={() => setCreateOpen(true)} style={{ background: '#1e293b' }}>+ Create Assessment</button>
            </div>
            <div>
                {assessments === undefined ? null : assessments.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
                        <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                        <div style={{ fontWeight: 600 }}>No assessments yet</div>
                        <div style={{ fontSize: 13, marginTop: 4 }}>Click "+ Create Assessment" to add one</div>
                    </div>
                ) : (
                    assessments.map((a) => <AssessmentCard key={a.assessment_id} assessment={a} onEnterMarks={() => setMarksTarget(a)} />)
                )}
            </div>
            <CreateAssessmentModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={load} />
            <MarksEntryModal assessment={marksTarget} onClose={() => setMarksTarget(null)} onSaved={load} />
        </>
    );
}
```
**Hop — `GET /assessments?faculty_id=...`**: **Hop**: `@Roles(..., 'faculty', ...)` (file 03 §2,
`getAssessments`). **Service**: `scopeToCollege(db.assessments, collegeId)`, then filtered by the
query-string `faculty_id` if present — this is a **server-side-filtered** query (passing
`user?.user_id` as the query parameter), unlike `Dashboard.jsx`'s `Metrics`/`Intervention`, which
fetch unfiltered data and filter client-side. One nuance: `user?.user_id` is read at the moment
`load` is *defined* as a closure, but since `load` is a plain function re-created every render
(not memoized), it always captures whatever `user` currently is at call time, not a stale snapshot
— though in practice `user` essentially never changes during a single session once set. `createOpen`
and `marksTarget` are the two pieces of state that open/close the two modals above; both
`onCreated`/`onSaved` callbacks are simply `load` itself — every mutation anywhere in this file
ultimately triggers the exact same single refetch function.

---

Continue to **[10-line-by-line-studentoverview.md](./faculty-10-line-by-line-studentoverview.md)**.
