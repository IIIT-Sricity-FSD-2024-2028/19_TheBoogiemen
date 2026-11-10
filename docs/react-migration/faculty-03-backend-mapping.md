# Faculty Actor — Study Guide 3: Backend Mapping

Every backend endpoint the faculty frontend (files covered in 01/02) actually calls, in one place,
with its controller location, role guard, request/response shape, and the service logic behind it.
Split into: **faculty-owned routes** (§1, live in `back-end/src/faculty/`, faculty is the only role
that can ever hit most of them) and **shared routes** (§2, live in
`back-end/src/admin/common.controller.ts` — a single ~2000-line controller every actor's frontend
calls into, faculty included). §3 covers the one `auth` route faculty uses. §4 covers the shared
helper modules referenced repeatedly across §§1–2.

A note on the data layer before anything else: **every method below reads and writes
`InMemoryDbService`**, not Postgres — this backend has real, Aiven-targeted Postgres connection
code and a migration/seed script, but the actual data-access layer for every one of these routes
(faculty's own module included) still goes through the in-memory JSON store
(`back-end/data/mock-db.json`), which resets on every server restart. This is a backend-wide gap,
not specific to faculty — flagged here so you don't read `this.db.students` anywhere below and
assume it's talking to a real database.

---

## 1. `faculty.controller.ts` + `faculty.service.ts` — the faculty-owned module

Registered in `faculty.module.ts` with no imports beyond its own controller/service — it reaches
into `InMemoryDbService` directly (that module is `@Global()`, so no explicit import is needed).

### `GET /api/faculty/me/profile` — `@Roles('faculty')`
**Frontend caller:** none of the six faculty pages in this guide call this directly (it exists for
a profile display this actor's current UI doesn't surface — `FacultyDashboard`'s `avatarLetter`
is hardcoded to `'M'` in the JSX rather than fetched).
**Service (`getProfile`):** looks up `db.faculty` by `user_id`; if missing, returns a generic
placeholder (`first_name: 'Faculty'`, `designation: 'Professor'`) rather than throwing — a
fail-soft default. Joins in the department name from `db.departments`, defaulting to `'Computer
Science'` if the department record itself is missing.

### `GET /api/faculty/me/courses` — `@Roles('faculty')`
**Frontend callers:** `MarkAttendance.jsx`'s `AttendanceForm` (populates the course dropdown),
legacy page-load script (not React).
**Service (`getMyCourses`):** `sectionsTaughtBy(db, userId)` (§4) gives every `(course_id,
section)` pair this faculty teaches; collects the unique `course_id`s, filters `db.courses` to
those, and for each attaches `section` (the *first* matching section — a legacy-shaped
single-value field kept for backward compatibility) and `sections` (every section this faculty
teaches of that course — the shape the frontend actually branches on when a faculty teaches more
than one section).

### `GET /api/faculty/me/timetable` — `@Roles('faculty')`
**Frontend callers:** `Timetable.jsx` (`role="faculty"` branch), `Dashboard.jsx`'s `Metrics`
(counts total slots for "Classes This Week").
**Service (`getFacultyTimetable`):** filters `db.timetable` to slots matching one of this
faculty's `(course_id, section)` pairs — **section-scoped, not just course-scoped**, per the
service's own comment: two sections of the same course can meet at different times with different
faculty, so matching on `course_id` alone would show a colleague's slots too. Builds a `grid`
object keyed `grid[day][time] = slot`, alongside fixed `days`/`times` arrays the frontend uses to
lay out the table header.

### `GET /api/faculty/me/students` — `@Roles('faculty')`
**Frontend callers:** `MarksEntryModal` (`AssessmentMapping.jsx`), `MeetingModal.jsx` (unselected
case), `StudentOverview.jsx`'s `load()` and `AssignBTPModal` (merged with `/admin/users`).
**Service (`getMyStudents`):** again section-scoped via `sectionsTaughtBy` — collects every
*unique* student id enrolled in any of this faculty's sections, then for each student computes:
`attendance_pct` (via `summariseAttendance`, §4 — null if the student has zero attendance
records, distinguishing "0% attendance" from "no data yet"), `excused_sessions`, `avg_score`
(average of `marks_obtained/max_marks × 100` across every mark entry with a nonzero `max_marks`,
rounded; null if no scored entries exist), `is_at_risk` and `risk_reasons` (both from the shared
`isAtRisk`/`riskReasons` predicate, §4). The code comment flags this predicate replacing what used
to be an inline, already-drifted copy of the same rule used elsewhere.

### `GET /api/faculty/me/at-risk` — `@Roles('faculty', 'head', 'admin', 'superadmin')`
**Frontend caller:** none of the six faculty pages call this — `Dashboard.jsx`'s own
`Intervention` widget instead fetches the unscoped `/admin/users` and filters by `is_at_risk`
client-side (see file 02 §2's note on this). This route exists and is properly section-scoped for
`faculty` role, but the current faculty UI doesn't exercise it — a documented mismatch between
"what the backend can correctly scope" and "what the frontend actually asks for."
**Service (`getAtRiskStudents`):** for `faculty` role specifically, narrows the college-wide
student pool down to only students enrolled in one of this faculty's sections before applying the
`is_at_risk` filter — `admin`/`head`/`superadmin` keep the full college-wide view, which is
correct for them. The comment notes this used to mean *every* at-risk student in the whole
college for a faculty caller too, which was wrong once sections became a real per-faculty concept.

### `GET /api/faculty/me/assessments` — `@Roles('faculty')`
**Frontend caller:** none — `AssessmentMapping.jsx` instead calls the shared `GET
/assessments?faculty_id=...` (§2) directly. This route is a simpler, parameter-free equivalent
that exists on the faculty module but isn't the one the frontend actually uses.
**Service (`getAssessments`):** `db.assessments.filter(a => a.faculty_id === facultyId)` — no
college/section scoping beyond the faculty-id filter itself (every assessment this faculty ever
created, anywhere).

### `GET /api/faculty/attendance/today/:courseId?section=...` — `@Roles('faculty')`
**Frontend caller:** `MarkAttendance.jsx`'s `AttendanceForm`, on every `[courseId, section]` change.
**Controller:** `courseId` is a route param, `section` an optional query string.
**Service (`getTodayAttendance`):** First, a college-ownership check on the course itself (a
client-supplied `courseId` is untrusted — without this check, a faculty member could read another
college's roster by supplying that college's course id). Then resolves `mySections` — this
faculty's sections *of that specific course* — and 403s (`PRIVILEGE_CEILING`) if there are none,
or if a specific `section` was requested that isn't among them. `targetSections` is either the one
requested section, or every section this faculty teaches of the course (if none specified —
"show me everyone across all my sections"). Builds the student list from `db.enrollment` matching
`(course_id, section ∈ targetSections)`, and for each student reads today's `attendance_log`
entry if one exists, defaulting `today_status` to `'present'` if none — this is the server-side
half of the "never-marked defaults to present" behavior `MarkAttendance.jsx`'s frontend mirrors
when it seeds its own `statuses` state.

### `POST /api/faculty/attendance` — `@Roles('faculty')`
**Frontend caller:** `MarkAttendance.jsx`'s `AttendanceForm.submit()`.
**Controller validation:** requires `course_id`, `date`, `records` present in the body, else 400.
**Service (`recordAttendance`):** repeats the same college-ownership check, section-resolution,
and 403 logic as `getTodayAttendance` above — this is the **write-side** mirror of that read-side
check, explicitly necessary because without it a faculty member could submit attendance for
students outside their own section by smuggling extra ids into the `records` array even if the UI
never offered them. `myStudentIds` is built from enrollment in the target section(s) *specifically*
— any record in the submitted body whose `student_id` isn't in that set is silently skipped (`continue`),
not rejected with an error.

For each surviving record: normalizes the status string (`normalizeAttendanceStatus`, §4), then —
this is the **idempotency + leave-precedence logic**, called out in the code as fixes `M-01` and
`H-07` — looks for an existing attendance_log row for that exact `(student_id, course_id, date)`.
If one exists and its *current* status is `EXCUSED` (from an approved leave — see `syllabus-progress`'s
sibling concept in §2's `leave` section) while the *new* incoming status is `ABSENT`, the existing
EXCUSED status wins and nothing is overwritten — **approved leave outranks a plain absent mark for
the same session**, a business rule that would otherwise let a faculty member accidentally
overwrite an institutionally-authorized excusal. Otherwise the existing row's status is updated
in place (not duplicated — re-submitting a session corrects it rather than stacking a second,
conflicting log entry, which the comment notes was the previous, buggy behavior). New rows get a
real UUID (`uuidv4()`), replacing a previous length-based id scheme that could mint colliding keys.
Returns `{ saved, created, updated, records }` — three separate counts so the frontend's toast
message, while it doesn't currently break these out, *could* distinguish "N corrected, M new."

### `POST /api/faculty/marks` — `@Roles('faculty')`
**Frontend caller:** none of the six faculty pages — `AssessmentMapping.jsx`'s `MarksEntryModal`
instead calls the shared `POST /marks` (§2), which has considerably more validation (enrollment
check, per-college assessment-ownership check, the actual locking logic) than this simpler
faculty-module equivalent.
**Service (`postMarks`):** no validation at all beyond what the controller already guarantees
(`student_id`/`assessment_id` presence isn't even checked here) — just stamps a new
`marks_entry` id and college id and pushes it. **This route has no locking check** — calling it
directly would let the same student/assessment pair be recorded more than once, unlike the shared
`/marks` route the frontend actually uses. Worth knowing this duplicate, weaker endpoint exists if
you're auditing for ways to bypass the mark-locking business rule.

---

## 2. Shared routes in `admin/common.controller.ts`

This controller is **not faculty-owned** — it's the one controller nearly every actor's frontend
calls into for cross-cutting resources (courses, assessments, marks, discussions, research, events,
leave, users, resources, meetings, syllabus progress, attendance requests). Only the rows faculty's
six pages actually call are detailed below; the controller has many more routes (admin-only user
management, billing, etc.) outside this guide's scope.

| Route | Roles | Faculty-reachable frontend caller |
|---|---|---|
| `GET /courses` | student, faculty, admin, head, superadmin | `Dashboard.jsx` (SyllabusManager), `AssessmentMapping.jsx` (both modals) |
| `GET /assessments?faculty_id=` | student, faculty, admin, head, superadmin | `AssessmentMapping.jsx` (page root) |
| `POST /assessments` | **faculty**, admin, head, superadmin | `AssessmentMapping.jsx` (`CreateAssessmentModal`) |
| `GET /marks?assessment_id=` | faculty, admin, head, superadmin | `AssessmentMapping.jsx` (`MarksEntryModal`) |
| `POST /marks` | faculty, admin, head, superadmin | `AssessmentMapping.jsx` (`MarksEntryModal.submit`) |
| `GET /submissions` | student, faculty, admin, head, superadmin | `AssessmentMapping.jsx` (`MarksEntryModal`, online-exam branch only) |
| `GET /discussions` | student, faculty, admin, head, superadmin + `@RequiresModule('forum')` | `DiscussionForum.jsx` |
| `GET /discussions/:postId` | same + module gate | `DiscussionForum.jsx` (`ThreadDetailModal`) |
| `POST /discussions` | student, **faculty** + module gate | `DiscussionForum.jsx` (`NewThreadModal`) |
| `POST /discussions/:postId/replies` | student, **faculty** + module gate | `DiscussionForum.jsx` (`ThreadDetailModal`) |
| `GET /research` | student, faculty, admin, head, superadmin + `@RequiresModule('research')` | `ResearchPanel.jsx` (faculty branch) |
| `POST /research` | **faculty**, admin, head, superadmin + module gate | `StudentOverview.jsx` (`AssignBTPModal`) |
| `PATCH /research/:id/progress` | student, faculty, admin, head, superadmin + module gate | `ResearchPanel.jsx` (`FacultyBTPProgressModal`) |
| `GET /events` | student, faculty, admin, head, superadmin | `EventScheduler.jsx` |
| `POST /events` | admin, superadmin, head, **faculty** | nothing in the current faculty UI calls this — see note below |
| `GET /leave` | student, faculty, admin, head, superadmin | `LeavePanel.jsx` (`PersonalLeavePanel`) |
| `POST /leave` | student, **faculty** | `LeavePanel.jsx` (`LeaveApplyModal`) |
| `GET /admin/users` | admin, head, superadmin, **faculty** | `Dashboard.jsx` (`Metrics`, `Intervention`), `StudentOverview.jsx`, `AssignBTPModal` |
| `GET /resources` | student, faculty, admin, head, superadmin | `ResourceBookingModal.jsx` |
| `POST /resource-booking` | **faculty**, admin, head, superadmin | `ResourceBookingModal.jsx` |
| `POST /meetings` | **faculty**, admin, head | `MeetingModal.jsx` |
| `GET /syllabus-progress?section=` | student, faculty, admin, head, superadmin | `Dashboard.jsx` (`SyllabusManager`) |
| `PATCH /syllabus-progress` | **faculty**, admin, head, superadmin | `Dashboard.jsx` (`SyllabusManager.save`) |
| `GET /attendance-requests` | student, faculty, admin, head, superadmin | `MarkAttendance.jsx` (`AttendanceRequests`), `Dashboard.jsx` (`ActionRequired`) |
| `PATCH /attendance-request/:id/mark` | **faculty** | `MarkAttendance.jsx` (`AttendanceRequests.grant`) |

### Notable logic, route by route

**`GET /courses`** — every course, enriched with `sections: sectionsOfCourse(db, courseId)` (§4) —
this is why `Dashboard.jsx`'s `SyllabusManager` deliberately calls *this* route instead of
`/faculty/me/courses`: it needs every section's own `faculty_id` to filter down to "my sections,"
which the faculty-scoped route's shape can't represent for a multi-section-same-course faculty
member (see file 02 §2's note on exactly this).

**`POST /assessments`** — the richest validation block faculty hits. If the caller's role is
`faculty` (admin/head/superadmin are exempt — they can set up an assessment "on a faculty member's
behalf"), the server independently re-derives which sections of `body.course_id` this faculty
actually teaches via `sectionsTaughtBy`, and:
- 403s if they teach none of them at all,
- if the client supplied a `section`, 403s unless it's one they actually teach (never trusts the
  client-supplied section blindly),
- if no `section` was supplied and they teach exactly one, defaults to it silently,
- if no `section` was supplied and they teach **more than one**, 400s and tells them exactly which
  sections they'd need to choose between — the server refuses to guess.
This is the same validation shape `faculty.service.ts`'s `getTodayAttendance`/`recordAttendance`
use, and the same one `syllabus-progress`'s `PATCH` uses below — a repeated pattern across this
codebase: never trust a client-supplied section without checking it against `sectionsTaughtBy`.

**`POST /marks`** — the real marks-locking logic (the faculty module's own `/faculty/marks`, §1,
is a weaker duplicate that skips all of this). Requires `student_id` + `assessment_id`. Looks up
the assessment, checks college ownership, and — if the caller is `faculty` — requires
`assessment.faculty_id === userId`, i.e. **you can only post marks against an assessment you
yourself created**, returning a generic "not found" (not a 403) if not, so a faculty member can't
even confirm another faculty's assessment exists by probing this endpoint. Then checks the student
is actually enrolled in that assessment's course+section. Then — the lock itself — looks for an
existing `marks_entry` for this exact `(student_id, assessment_id)` pair scoped to the actor's
college, and 400s with a "marks already locked" style message if one exists. This is the server
side of `MarksEntryModal.jsx`'s `locked` concept (file 02 §4) and the source of the `'locked'`
substring that component's `catch` block specifically checks for when deciding whether to treat a
per-record failure as recoverable.

**`GET /submissions`** — role-branches: a `student` caller only sees their own; everyone else
(including `faculty`) sees all submissions in the college, unfiltered by course/section. This is
why `MarksEntryModal.jsx`'s online-exam branch doesn't need any further client-side filtering by
`assessment_id` beyond the `.find()` it already does against the full list.

**`POST /discussions` / `POST /discussions/:postId/replies`** — both restricted to `student` and
`faculty` only (not `admin`/`head`/`superadmin`, who can still *read* via the `GET` routes but not
post) — faculty is one of only two roles with write access to the forum at all.

**`POST /research`** — the backing endpoint for `StudentOverview.jsx`'s `AssignBTPModal`. Faculty,
admin, head, superadmin can all create a project; the controller snippet shown doesn't enforce the
creating faculty becomes the `supervisor_id` by any ownership check (unlike assessments/marks) —
worth noting as a looser rule than the assessment-creation path, though consistent with
`StudentOverview.jsx`'s own looser "any student in the college, not just my roster" behavior (file
02 §5).

**`GET /research`** role-branching — `faculty` sees only projects where `supervisor_id === userId`
(their own supervised projects); `student` sees only projects where they're in the `students`
array; everyone else sees all. Each returned project is enriched with the supervisor's full name
and each listed student's name — this enrichment is what lets `FacultyProjectCard` (file 01 §12)
display student names without a separate lookup.

**`PATCH /research/:id/progress`** — open to `student` and `faculty` alike (and admin/head/
superadmin), which is *necessary* because this one endpoint serves two entirely different write
patterns depending on who calls it: a student submitting work (`submission_notes` + `file_id`) and
a faculty member recording progress/feedback (`progress` + `faculty_feedback`). The handler doesn't
distinguish caller role at all — it just applies whichever fields are present in the body,
trusting the frontend to only ever send the fields appropriate to the caller (student's
`BTPUploadModal` only ever sends the submission fields; faculty's `FacultyBTPProgressModal` only
ever sends the progress/feedback fields). `uploads` is an **append-only array** — a new
`file_id` is only pushed if it isn't already present, so resubmitting the same file reference is a
no-op rather than a duplicate entry; this is why `FacultyProjectCard`'s download button specifically
takes the *last* entry in `uploads`, not the only one.

**`GET /leave`** — the role-branch faculty actually exercises: **not** "all leaves in the
college" the way admin/head/superadmin get — faculty sees only *their own* leave applications
**plus** leave applications from students they teach (computed via the same `sectionsTaughtBy` →
enrollment → student-id-set pattern used throughout this guide). This is a meaningfully narrower
view than `LeavePanel.jsx`'s `AdminLeaveManagement` branch gets, even though both call the exact
same `GET /leave` route — the difference is entirely server-side role branching, invisible at the
frontend call site.

**`POST /leave`** — canonicalizes `leave_type` on write (`normalizeLeaveType`) specifically
because, per the inline comment (fix `M-09`), the frontend posts lowercase values while older seed
data used capitalized ones, which silently broke exact-match filters downstream before this fix.

**`GET /admin/users`** — despite the `admin/` path prefix (and despite the name suggesting an
admin-only "management panel" route, per its own `@ApiOperation` summary), this is explicitly
`@Roles('admin', 'head', 'superadmin', 'faculty')` — faculty is a first-class caller of this route,
not an exception. Returns every user in the college via `sanitizeUser` (strips password hashes
etc.), completely unscoped by section/enrollment — this is the route behind every "every student in
the college, not just mine" behavior documented in file 02 (`Dashboard.jsx`'s `Metrics`/
`Intervention`, `StudentOverview.jsx`'s roster, `AssignBTPModal`'s dropdown).

**`POST /events`** — `@Roles('admin', 'superadmin', 'head', 'faculty')` includes faculty, which
means **the backend would accept an event-creation request from a faculty member** — but, per file
02 §6, `EventScheduler.jsx` never calls this route at all; it's purely read-only on the frontend.
This is the exact backend-level confirmation of the "dead button" situation file 04 documents in
the legacy code: the capability exists and is correctly guarded, but no faculty-facing UI in either
the legacy or React app ever exercises it (admin/head's own Phase-3 UI is what actually uses this
route in practice).

**`POST /meetings`** — read this one carefully: **the response is a stub.** The handler's own
comment says it plainly — *"Never persisted (see the original comment this carries forward): a
stub response, so there is no collection here to scope."* It builds a `meeting` object with a
fresh id and echoes the request body back, but **never pushes it into any `db` collection**. There
is no `db.meetings` array being written to. This means every meeting `MeetingModal.jsx` "schedules"
exists only in the response payload and the notification it triggers (`send(...)`, client-side,
localStorage-backed) — nothing about the meeting itself is queryable later from the server. This
matches the earlier migration-audit finding (`GET /meetings` having no backing route at all,
documented for the student actor) — the write side has the identical characteristic for faculty:
present, callable, 201-ish-shaped, but fundamentally non-persistent.

**`PATCH /syllabus-progress`** — the same "must actually teach this section" re-derivation pattern
as `POST /assessments`, with its own comment calling out exactly why: *"without this a faculty
could update completion for a section they don't teach at all, which is exactly what the frontend
slider let happen (it offered every section of every course, not just theirs)"* — i.e. this is
documented, in the backend's own comments, as a case where the **frontend's own UI was looser than
the backend's enforcement**, and the fix lives entirely server-side (the frontend still shows every
section it has progress data for — `Dashboard.jsx`'s `SyllabusManager` already filters to `mySections`
before rendering sliders at all, so in the current code the loophole described is closed on the
frontend too, but the backend check is what actually prevents it regardless of what the UI does).

**`GET /attendance-requests` / `PATCH /attendance-request/:id/mark`** — both route through a
shared private helper, `concernedFacultyFor(req)`, which derives *which section* an attendance
request actually concerns (attendance_requests itself carries no section of its own — it has to be
looked up via the student's own enrollment) and *which faculty teaches that section*. The `GET`'s
`faculty` branch filters to `faculty_id === userId` using this derived value — the comment notes
this used to mean "any request for any course this faculty teaches *any* section of," which
let a Section-A faculty member see and grant Section-B requests taught by someone else entirely.
The `PATCH .../mark` endpoint re-derives the same `concernedFacultyFor` value and 403s
(`PRIVILEGE_CEILING`) if it doesn't match the caller — the write-side enforcement mirroring the
read-side filter, same pattern as attendance/assessments/syllabus-progress throughout this guide.
On success, writes (or corrects, idempotently) an `attendance_log` row with status `PRESENT` for
that request's student/course/date.

---

## 3. `auth.controller.ts` — `POST /auth/change-password`

**Frontend caller:** `Settings.jsx` (file 01 §16), used identically by every actor including
faculty.
Restricted to an explicit list of roles rather than "any authenticated user" — the controller's own
comment flags this as deliberate, guarding against a future low-trust role being added without an
explicit decision about whether it should be allowed to self-service its own password. Faculty is
in that explicit list. The handler verifies `current_password` against the stored hash and applies
the same complexity rule `Settings.jsx`'s own client-side regex pre-checks (uppercase, lowercase,
digit, special character, 8+ length) — the client-side check exists purely to give a faster error
message; the server re-validates independently and is the actual authority.

---

## 4. Shared helper modules referenced throughout §§1–2

**`common/course-sections.ts`** — the single source of truth for "who teaches what," introduced
specifically because `courses.faculty_id` was retired in favor of a proper `course_sections` table
(one row per `(course_id, section)`, each with its own `faculty_id`). Every function here is a thin
query over `db.course_sections`:
- `sectionsTaughtBy(db, facultyId)` — every `(course, section)` row this faculty teaches. This is
  the single most-called helper in the entire faculty backend surface — nearly every service method
  described in §1 and every faculty-aware branch in §2 calls this first.
- `courseIdsTaughtBy(db, facultyId)` — the deduplicated course ids from the above (defined but not
  directly used by any route detailed in this guide — most call sites need the full section rows,
  not just course ids).
- `sectionsTaughtIn(db, facultyId, courseId)` / `sectionTaughtIn(db, facultyId, courseId)` —
  narrower single-course variants (also not directly exercised by the routes detailed above, which
  tend to filter `sectionsTaughtBy`'s result inline instead).
- `sectionsOfCourse(db, courseId)` — every section row for a course regardless of who teaches it —
  used by `GET /courses` to attach the full `sections` array every caller (including
  `Dashboard.jsx`'s `SyllabusManager` and both `AssessmentMapping.jsx` modals) depends on.

**`common/academic-rules.ts`** (verified by full read — this section previously summarized it from
inference; the content below is confirmed against the actual file) — exports far more than
`faculty.service.ts` alone consumes: `ATTENDANCE_STATUS`, `normalizeAttendanceStatus`,
`isCountedAsAttended`, `summariseAttendance`, `RISK_THRESHOLDS`, `isAtRisk`, `riskReasons`,
`LEAVE_TYPES`, `normalizeLeaveType`, `isLeaveType`, `MAX_LEAVE_DAYS`, and `eachDateInRange` — only
the first five are actually imported by `faculty.service.ts` (`ATTENDANCE_STATUS`,
`normalizeAttendanceStatus`, `isAtRisk`, `riskReasons`, `summariseAttendance`); the leave-type and
date-range helpers belong to other modules' call sites, not faculty's. The exact thresholds behind
`isAtRisk`/`riskReasons`, confirmed from `RISK_THRESHOLDS`: **CGPA below 6.0**, or **attendance below
75%** — either alone is sufficient to flag a student, and `riskReasons` reports whichever
condition(s) actually triggered it (a student can be flagged for both at once). The module's own
header comment states this replaced **three** independently-drifted inline copies of the same rule
(`cgpa < 6`, `cgpa < 6.5`, and a combined attendance/cgpa rule), not just the two
`faculty.service.ts`'s own comment calls out. `summariseAttendance` is what turns a raw list of
`attendance_log` rows into `{ present, absent, excused, total, attended, percentage }`, where
`attended = present + excused` — the EXCUSED-counts-as-attended rule is literally baked into that one
addition, not a separate branch; `percentage` is `0` (not `null`) when `total` is `0` — note this
differs from `faculty.service.ts`'s own `attendance_pct` field, which the service deliberately
overrides to `null` in that case (`attendance.total > 0 ? attendance.percentage : null`) rather than
exposing the raw `0` this helper would otherwise return — the null-vs-zero distinction documented
throughout this guide is applied by the *caller*, not by `summariseAttendance` itself.

**`common/tenancy/scope-to-college.ts`** (verified by full read) — exports `scopeToCollege`,
`isSameCollege`, and `writeCollegeId`, the multi-tenancy primitives used on nearly every route in
§2. Both `scopeToCollege(records, collegeId)` and `isSameCollege(record, collegeId)` treat
`collegeId === null` as **"see everything"** — this is the superadmin exemption, stated explicitly
in the file's own header comment: superadmin is the one role with no `college_id` claim on its JWT
(`jwt-payload.ts`: "NULL for superadmin, the vendor operator, who belongs to no single college"),
so passing a superadmin's `collegeId` (always `null`) into either function trivially satisfies the
"same college" check for every record, correctly granting superadmin's documented cross-college
view without any separate role check inside these two functions themselves. `isSameCollege` returns
`false` outright if the record doesn't exist at all (`if (!record) return false`) — the *caller* is
responsible for turning that into the same generic 404 a missing record would produce (the file's
own comment is explicit about why: a caller supplying another college's id must get the identical
response a nonexistent id would, never a 403, which would confirm the record exists somewhere else).
`writeCollegeId(actorCollegeId)` is `actorCollegeId ?? DEFAULT_COLLEGE_ID` — an actor's own college
when they have one, falling back to `DEFAULT_COLLEGE_ID` (imported from `../constants/college`,
outside this guide's scope) only for the one caller that has no college of its own: superadmin,
acting through a panel built for a single-college deployment.
