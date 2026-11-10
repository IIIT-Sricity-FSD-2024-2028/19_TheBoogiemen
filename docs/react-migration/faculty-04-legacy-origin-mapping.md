# Faculty Actor — Study Guide 4: Legacy Origin Mapping

Every React component in files 01/02 carries a header comment naming the exact legacy function(s)
it replaced. This file is the reverse index: legacy function → line number in `front-end/fixes.js`
(or `script.js`/`state.js`) → which React file now does that job, plus the two structural patterns
the legacy app used that React's component model made unnecessary.

---

## 1. How the legacy app actually worked — the two load-bearing mechanisms

Before the function-by-function table, two mechanisms explain *why* so many legacy functions exist
that have no corresponding static HTML — understanding these two is what makes the rest of this
file make sense.

### Mechanism 1: `switchView()` + `triggerViewRender()` — the legacy "router"

`front-end/fixes.js` lines 51–65 define `window.switchView(viewId, clickedEl)`: it hides every
`.view-section` div, shows the target one by id, highlights the clicked nav `<a>`, updates the page
title from a `VIEW_TITLES` lookup table (lines 29–49), and after an **80ms `setTimeout`** calls
`triggerViewRender(viewId)`. The delay exists purely to let the `display: block` take effect before
measuring/painting anything the render function might need.

`triggerViewRender` (lines 67–101) is a dispatch table (`renders`) mapping every possible `viewId`
to a zero-argument closure that calls the one or two `render*()` functions appropriate to the
*current* signed-in role — it reads `window.Auth.getUser().role` fresh on every call, which is how
one shared `faculty.html`-style file could serve a role-conditional render even though the legacy
app's HTML was otherwise static per-actor. The faculty-relevant rows:

```js
'time-table-view':         () => isStudent ? renderStudentTimetable() : renderFacultyTimetable(),
'leave-management-view':   () => isStudent ? renderStudentLeave()
                                   : isFaculty ? renderFacultyLeaveList()
                                   : renderLeaveManagement(),
'research-projects-view':  () => isStudent ? renderStudentResearch() : renderFacultyResearch(),
'mark-attendance-view':    () => renderMarkAttendanceTable(),
'student-overview-view':   () => renderFacultyStudents(),
'assessment-mapping-view': () => renderAssessmentList(),
'dashboard-view':          () => { if (isAdmin) renderReports(); if (isFaculty) renderFacultyDashboard(); ... },
```

**This is the entire reason every legacy render function re-fetches its data from scratch on every
view switch** — there's no persistent component state to invalidate, so "refresh this view" and
"render this view for the first time" are the same operation, every time. React's version gets the
same effective behavior for free: each `VIEWS[activeView]` element only exists in the tree while
active, so its own `useEffect(() => load(), [])` reruns on every mount, i.e. every navigation back
to it — no explicit "refresh" dispatch table was needed in the port, just normal mount/unmount.

### Mechanism 2: runtime DOM injection — widgets that don't exist in the static HTML

A `DOMContentLoaded` handler near the bottom of `fixes.js` (starting around line 2938) runs once per
page load and, based on the signed-in role, **creates and appends new DOM elements that
`faculty.html`'s markup never declares at all** — not hidden-and-shown like the `.view-section`
pattern, but literally constructed with `document.createElement` and inserted. For `role ===
'faculty'` specifically (lines 2984–2996):

```js
if (role === 'faculty') {
    if (dashView && !document.getElementById('faculty-syllabus-body')) {
        // injects the "📊 Update Syllabus Progress" block into dashboard-view
    }
    const attView = document.getElementById('mark-attendance-view');
    if (attView && !document.getElementById('faculty-att-requests-body')) {
        // injects the "📝 Student Attendance Requests" block into mark-attendance-view
    }
}
```

The same handler injects the **"⚡ Action Required" widget** into `dashboard-view` for every
non-student role (lines 2959–2965), and the **`attendanceRequestModal`** markup itself, globally,
for every role (lines 3012 onward — though that specific modal is student-facing; faculty's own
grant action needs no modal, just a button, per file 02 §3).

**This is why `Dashboard.jsx`'s `ActionRequired`/`SyllabusManager` and `MarkAttendance.jsx`'s
`AttendanceRequests` have no corresponding `<div id="...">` anywhere in `faculty.html`'s 706 lines**
— they were never static markup to begin with. Every React component whose header comment says
"injected into X-view at runtime, not present in faculty.html's static markup" is referring to this
exact mechanism. React obviously doesn't need any of this scaffolding — these are just ordinary
sibling components rendered unconditionally as part of the page, same as everything else.

---

## 2. Function-by-function mapping

| Legacy function | Location | Ported to | Notes |
|---|---|---|---|
| `switchView()` | `fixes.js:51` | *(mechanism, not ported — see §1)* | Replaced by `activeView` state + conditional rendering |
| `triggerViewRender()` | `fixes.js:67` | *(mechanism, not ported — see §1)* | Replaced by mount-effects on each view component |
| `window.renderFacultyDashboard` | `fixes.js:975` | `Dashboard.jsx` (`Metrics` + `Intervention`) | Metric cards + at-risk student list |
| *(the Action Required widget's injection + render)* | `fixes.js:2959-2965` + its own render fn | `Dashboard.jsx` (`ActionRequired`) | Counts attendance-requests-to-grant + BTP-submissions-to-review |
| *(the faculty syllabus widget's injection)* | `fixes.js:2984-2989` | `Dashboard.jsx` (`SyllabusManager`) | Per-section progress sliders |
| `window.renderFacultyTimetable` | `fixes.js:594` | `components/shared/Timetable.jsx` (`role="faculty"`) | Shares the grid-building logic with the student variant — "never differed between the two," per `Timetable.jsx`'s own comment |
| `window.renderFacultyStudents` | `fixes.js:604` | `StudentOverview.jsx` (`load()` + `StudentCard`) | Student roster cards |
| `window.sendCustomAlert` | `fixes.js:704` | `SendAlertModal.jsx` (`submit()`) | Client-side-only notification, no persistence (both legacy and React) |
| `window.sendFacultyBroadcast` | `fixes.js:720` | `StudentOverview.jsx` (`sendBroadcast()`) | `broadcast('student', ...)` |
| `window.filterStudentOverview` | `fixes.js:732` | `StudentOverview.jsx` (`filtered` useMemo) | The one memoized derivation in the whole faculty actor (file 02 §5) |
| `window.renderMarkAttendanceTable` | `fixes.js:744` | `MarkAttendance.jsx` (`AttendanceForm`) | Course/section/date controls + student roster |
| `window.markAllAttendance` | `fixes.js:815` | `MarkAttendance.jsx` (`AttendanceForm.markAll`) | "All Present"/"All Absent" |
| `window.submitAttendance` | `fixes.js:833` | `MarkAttendance.jsx` (`AttendanceForm.submit`) | Carries forward the date-validated-but-ignored quirk (file 02 §3) |
| `window.populateAssessSectionOptions` | `fixes.js:875` | `AssessmentMapping.jsx` (`CreateAssessmentModal`'s `mySections` derivation + auto-select effect) | Section dropdown filtered to this faculty's own sections |
| `window.renderAssessmentList` | `fixes.js:890` | `AssessmentMapping.jsx` (`AssessmentMapping` page root + `AssessmentCard`) | |
| `window.submitCreateAssessment` | `fixes.js:949` | `AssessmentMapping.jsx` (`CreateAssessmentModal.submit`) | Gained a past-date guard the legacy version never had (file 02 §4) |
| `window.openMarksModal` *(original)* | `fixes.js:1028` | `AssessmentMapping.jsx` (`MarksEntryModal`) | See §3 below for the monkey-patch history this folds together |
| `window.submitMarksEntry` | `fixes.js:1083` | `AssessmentMapping.jsx` (`MarksEntryModal.submit`) | Per-record sequential POST, `'locked'`-substring recovery |
| `window.renderFacultyEventsTable` | `fixes.js:1185` | `EventScheduler.jsx` | Read-only; see §4 below for the dead "+ Add Event" button |
| `window.renderFacultyLeaveList` | `fixes.js:1201` | `LeavePanel.jsx` (`PersonalLeavePanel`, `role="faculty"` branch) | Table rendering, vs. student's card rendering |
| `window.submitFacultyLeave` | `fixes.js:1226` | `LeavePanel.jsx` (`LeaveApplyModal`, shared with student) | |
| `window.renderFacultyResearch` *(original)* | `fixes.js:1256` | *(superseded — see row below)* | Overwritten at load time, see §3 |
| `window.openMeetingModal` | `fixes.js:1277` | `MeetingModal.jsx` | Supports both the preselected-student and open-dropdown call shapes |
| `window.submitScheduleMeeting` | `fixes.js:1296` | `MeetingModal.jsx` (`submit()`) | Backend route is a non-persisting stub (file 03 §2) |
| `window.openAssignBTPModal` | `fixes.js:2315` | `StudentOverview.jsx` (`AssignBTPModal`) | Two-source student list merge (file 02 §5) |
| `window.submitAssignBTP` | `fixes.js:2351` | `StudentOverview.jsx` (`AssignBTPModal.submit`) | `POST /research` |
| `window.renderFacultyResearchEnhanced` | `fixes.js:2434` | `ResearchPanel.jsx` (faculty branch: `FacultyProjectCard` + `FacultyBTPProgressModal`) | The richer version — see §3 |
| *(override)* `window.renderFacultyResearch = window.renderFacultyResearchEnhanced` | `fixes.js:2518-2519` | — | The monkey-patch that makes the "enhanced" version the one that actually runs — see §3 |
| `window.submitFacultyBTPProgress` | `fixes.js:2489` | `ResearchPanel.jsx` (`FacultyBTPProgressModal.submit`) | `PATCH /research/:id/progress` |
| `window.renderFacultyAttendanceRequests` | `fixes.js:2754` | `MarkAttendance.jsx` (`AttendanceRequests`) | Injected widget, not static markup — see §1 Mechanism 2 |
| `window.grantAttReq` | `fixes.js:2770` | `MarkAttendance.jsx` (`AttendanceRequests.grant`) | `PATCH /attendance-request/:id/mark` |
| `window.openResourceBookingModal` | `fixes.js:2781` | `ResourceBookingModal.jsx` | One of several modals injected globally, not scoped to one actor's HTML |
| *(override)* `window.openMarksModal` *(wrapper)* | `fixes.js:2916-2933` | `AssessmentMapping.jsx` (`MarksEntryModal`'s `locked` logic) | See §3 — this is the "second definition" `AssessmentMapping.jsx`'s header comment refers to |
| `window.renderDiscussions` | `fixes.js:373` | `DiscussionForum.jsx` | Role-agnostic already in legacy (file 01 §13) |
| `window.openModal` / `window.closeModal` | `fixes.js:20-21` | `Modal.jsx`'s `open` prop | DOM `style.display` toggle → conditional render |
| `showToast()` | `fixes.js:9-18` | `Toast.jsx` + `NotificationsContext.showToast` | DOM-element-creation → React state |
| `restrictDateToFuture()` | `fixes.js:23-26` | native `<input type="date" min={today}>` throughout | A DOM-mutation helper → a plain JSX attribute |

Functions referenced in React header comments but belonging to **other actors**, included only for
completeness since they share a file with faculty's own functions: `renderStudentTimetable`,
`renderStudentLeave`, `renderStudentResearch`, `renderLeaveManagement`,
`renderAdminAttendanceRequests`, `openAttendanceRequestModal`, `submitAttendanceRequest` (all
student- or admin-only; not faculty-reachable).

---

## 3. The `openMarksModal` / `renderFacultyResearch` monkey-patches — in detail

Two separate instances of the exact same legacy pattern, both folded into single functions during
the React port, both explicitly called out in the relevant React file's header comment.

### `openMarksModal` (fixes.js:1028 and fixes.js:2916-2933)

The **original** definition (line 1028) does the complete job: populate hidden fields, open the
modal, fetch `/faculty/me/students` (+ `/submissions` if online-mode), and render one row per
student with a marks `<input>`.

A **second** definition appears over 1800 lines later (line 2916), under the comment header `// ──
Marks Lock UI (pre-load existing marks as read-only) ──`:

```js
const _origOpenMarksModal = window.openMarksModal;
window.openMarksModal = async function(assessmentId, maxMarks, name, examMode) {
    await _origOpenMarksModal(assessmentId, maxMarks, name, examMode);
    setTimeout(async () => {
        const existingMarks = await api(`/marks?assessment_id=${assessmentId}`);
        existingMarks.forEach(m => {
            const inp = document.getElementById(`marks_${m.student_id}`);
            if (inp) { inp.value = m.marks_obtained; inp.disabled = true; /* ...styling... */ }
        });
    }, 500);
};
```

This is a genuine JavaScript **monkey-patch**: it captures a reference to the original function
under a new name (`_origOpenMarksModal`), then replaces `window.openMarksModal` with a wrapper that
calls the original and *then*, after a further 500ms timeout (waiting for the original's own async
student-fetch-and-render to finish), goes back and fetches already-recorded marks, disabling and
re-styling any input whose student already has one. **Which version actually runs at any given
time depends entirely on script-execution order** — since `fixes.js` loads as one file top to
bottom, the line-2916 version always wins by the time the page is interactive, but nothing in
`faculty.html` itself indicates two definitions exist, or that the first one is dead code by the
time any click handler fires. The React port (`MarksEntryModal` in `AssessmentMapping.jsx`, file 02
§4) folds both behaviors into one function from the start: the locking check (`existingMarks.find(...)`)
and the initial student-fetch happen in the same `useEffect`, with no patch-over-patch indirection.

### `renderFacultyResearch` → `renderFacultyResearchEnhanced` (fixes.js:1256, 2434, 2518-2519)

A simpler but structurally identical pattern: `renderFacultyResearch` is defined once at line 1256
(a presumably simpler, earlier version — not read in full for this guide, since it's provably dead
code by the time the page runs). A much larger, richer implementation,
`renderFacultyResearchEnhanced`, is defined at line 2434 — this is the version with the
"Assign BTP to Student" button, the submission-notes display, and the download link for a
student's last upload (everything `FacultyProjectCard` in `ResearchPanel.jsx` actually reproduces,
per file 01 §12). Immediately after that function's definition, line 2518 reads:

```js
// Override the original renderFacultyResearch with enhanced version
window.renderFacultyResearch = window.renderFacultyResearchEnhanced;
```

— a direct reassignment, simpler than `openMarksModal`'s wrap-and-call pattern (no call back to the
original at all; the enhanced version fully replaces it), but the same underlying situation: **two
function bodies exist in the source for the same logical feature, and only reading the whole file
top-to-bottom reveals which one is reachable.** `ResearchPanel.jsx`'s header comment is explicit
that it ports the *enhanced* version specifically, not the original — there is no React
counterpart to the simpler, overwritten `renderFacultyResearch` at all, nor should there be one.

---

## 4. The dead "+ Add Event" button — confirmed absence, not a migration gap

`faculty.html` line 130: `<button class="page-action-btn" onclick="openModal('facultyEventModal');
restrictDateToFuture('fEventDate');">+ Add Event</button>`. Searching the entire legacy source for
`facultyEventModal` turns up **zero matches** — there is no `<div id="facultyEventModal">` anywhere
in `faculty.html`, and no injection of one anywhere in `fixes.js`'s runtime-widget mechanism either
(§1, Mechanism 2 — contrast with `attendanceRequestModal`, which *is* injected globally). Clicking
that button in the legacy, shipped application would call `openModal('facultyEventModal')`
(`fixes.js:20`), which does `document.getElementById('facultyEventModal')` → `null` → the
`if (m)` guard silently no-ops. **The button rendered, was clickable, and did nothing** — a
genuinely dead control in the application the migration was porting from.

`EventScheduler.jsx` (file 02 §6) is deliberately read-only as a direct consequence: the React port
does not invent a working create-event flow for faculty to "complete" something the legacy app
never actually had. The capability does exist on the backend (`POST /events` accepts the `faculty`
role per file 03 §2's table) and admin/head's own dashboard has a real, working event-creation
modal — but that is a *different* modal serving a *different* actor's UI, not something
`EventScheduler.jsx` reuses or extends.

---

## 5. Two nav items legacy never exposed, revisited

File 00 §6 already covers this from the React side; restated here with the exact legacy evidence.
Searching `faculty.html`'s sidebar (`front-end/faculty.html:26-59`) for any `onclick` containing
`'leave-management-view'` or `'event-scheduler-view'` finds **no matches** — every other view id
that has a render function also has a sidebar `<a>` calling `switchView()` with it, except these
two. Yet:
- `leave-management-view` has a full `<div id="leave-management-view">` section (lines 142–163)
  *and* a working `fLeaveModal` (lines 472–527) *and* `renderFacultyLeaveList`/`submitFacultyLeave`
  both exist and are called from the page's own `DOMContentLoaded` handler (`faculty.html:699`).
- `event-scheduler-view` has its own `<div id="event-scheduler-view">` section (lines 126–139) and
  `renderFacultyEventsTable` is likewise called on load (`faculty.html:700`).

Both views were fully functional, reachable only by directly navigating a browser to
`faculty.html#...` fragment-adjacent hacks or by calling `switchView()` from the console — never
through the shipped UI. `FacultyDashboard.jsx` wires both into the nav (file 00 §6) rather than
treating "the legacy sidebar never linked to it" as grounds to drop a feature that otherwise works
end-to-end, front to back.

---

This completes the faculty actor's five-part study guide. Cross-reference:
[00-overview](./faculty-00-overview.md) ·
[01-shared-infrastructure](./faculty-01-shared-infrastructure.md) ·
[02-pages-deep-dive](./faculty-02-pages-deep-dive.md) ·
[03-backend-mapping](./faculty-03-backend-mapping.md) ·
**04-legacy-origin-mapping (this file)**
