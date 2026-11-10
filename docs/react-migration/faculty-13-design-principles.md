# Faculty Actor — Study Guide 13: Design Principles of the Migration

Files 06–12 walked every line. This file steps back and names the *principles* those lines
repeatedly express — the decisions that, once made, were applied consistently enough to be visible
as a pattern across six frontend files and one backend module, rather than appearing once as a
one-off. Each principle cites the exact lines in files 06–12 where it's demonstrated, so this file
is a synthesis of evidence already shown, not a new set of claims.

---

## 1. Parity first, improvement only when explicitly flagged

The default stance of this migration was: reproduce what the legacy app actually did, including its
quirks, and only deviate when a deviation is called out in a comment as a deliberate, named
exception. This shows up as three distinct sub-patterns:

- **Faithfully reproduced quirks.** `MarkAttendance.jsx`'s date field is validated against "must
  equal today" but the request body always sends the server-computed `today` constant, never the
  validated state variable itself (file 08, lines 97–124) — the file's own header comment names
  this explicitly as "one legacy quirk carried over faithfully, not fixed." `EventScheduler.jsx`
  removes a button rather than inventing the feature it never worked (file 11) — the comment states
  outright that no backing modal ever existed in the legacy source, so building one now would be
  adding a feature, not porting one.
- **Explicitly flagged improvements.** `AssessmentMapping.jsx`'s `CreateAssessmentModal` adds a
  past-date guard the legacy `assessmentModal` never had (file 09, lines 29–36) — but the comment
  doesn't just add the check silently; it's labeled `PAST-DATE GUARD (parity fix)` and explains
  *why* it's an exception: every other date-entry flow in the app already had this guard, so its
  absence here was an inconsistency worth correcting, not a design choice worth preserving.
  `NotificationsContext`'s cross-tab `storage` event listener (file 01 §2) is the same pattern at
  the shared-infrastructure layer: a real behavioral gap the React port's own architecture
  introduced (a long-lived provider instance that only reads localStorage once, unlike the legacy
  app's per-page-load reads) is explicitly diagnosed and fixed, with the fix's necessity explained
  in the file's own header comment.
- **Two legacy monkey-patches folded into one function, not two.** The `openMarksModal` wrap-and-
  extend pattern and the `renderFacultyResearch` full-reassignment pattern (file 04 §3) both existed
  in the legacy source as two competing definitions, with runtime load order deciding which one
  actually ran — a structural hazard invisible from reading the HTML alone. The migration's answer
  wasn't to "pick the one that wins" and port only that, nor to port both and recreate the hazard —
  it was to understand *why* two definitions existed (a base feature, then a later patch adding
  locking/enhancement behavior) and express that *intent* as a single, linear function
  (`MarksEntryModal`, `ResearchPanel`'s faculty branch) from the start.

**Why this ordering (parity, then named exceptions) rather than "just make it good"?** A migration
that silently "fixes" things as it goes is nearly impossible to verify against the original — every
behavioral difference becomes a question of "was this intentional or a porting mistake?" By making
every deviation an explicit, commented exception, the two categories (faithful port vs. deliberate
change) stay distinguishable by reading the code, not by archaeology.

---

## 2. Section-ownership is re-derived server-side on every single hop, never trusted from the client

This is the single most repeated pattern in the entire faculty backend module (file 12). Count the
occurrences: `getTodayAttendance` re-derives `mySections` (file 12, lines 155–157);
`recordAttendance` re-derives it again, independently, in the sibling write method (lines 227–230);
`common.controller.ts`'s `createAssessment` re-derives it a third time for a different resource
(file 03 §2); `PATCH /syllabus-progress` re-derives it a fourth time, with its own comment
explicitly stating *why*: "without this a faculty could update completion for a section they don't
teach at all, which is exactly what the frontend slider let happen" (file 03 §2). **Four different
routes, four different resources (attendance, assessments, syllabus progress, and — on the read
side — rosters), the exact same re-derivation logic, never shared into one reusable permission
check.**

This is a deliberate trade-off, not an oversight — `sectionsTaughtBy` (file 03 §4) *is* a shared
helper, but the decision of "does this specific action require the caller to teach this specific
section" is re-made at every call site rather than centralized into a generic guard, because each
resource's ownership rule has a slightly different shape (assessments ask "do you teach *a*
section of this course," syllabus-progress asks "do you teach *this exact* section," attendance
asks both, depending on whether a specific section was requested). The principle underneath the
repetition: **a frontend filtering the choices it offers (file 09's `CreateAssessmentModal` only
listing sections this faculty teaches; file 07's `SyllabusManager` only rendering sliders for
`mySections`) is a UX convenience, never the actual boundary.** The boundary is the backend
re-checking the same fact independently, on every single request, with no assumption that "the
frontend already filtered this so I don't need to."

---

## 3. The client never holds authority it can't be trusted with — only convenience state

Three distinct instances of the same underlying principle, at three different layers:

- **`ProtectedRoute.jsx`** (file 01 §9) reads `user.role` from `localStorage` — editable by the
  user — and its own header comment says so plainly: this is a UX guard, not a security boundary.
  Editing it lets someone *render* a dashboard, never *use* it, because every subsequent API call
  still carries the real, cryptographically-verified session cookie, and `RolesGuard` (file 05 §4)
  checks the **verified JWT payload's** role, never anything the client asserts.
- **`Sidebar.jsx`'s module-gating filter** (file 01 §6, file 06 lines 108/118) hides a nav item
  whose module isn't licensed — but `RequiresModuleGuard` (file 05 §5) is what actually blocks the
  request if someone reaches the route anyway. The frontend filter and the backend guard are two
  independent implementations of the same rule, deliberately, because hiding a button and
  rejecting a request are different failure modes serving different purposes (one is UX polish, the
  other is the actual enforcement) — and the guard's own registration order (*after* `RolesGuard*,
  file 05 §5's comment: "a caller must already be permitted by role before whether their college's
  plan includes the module even matters") shows this layering is deliberate even *within* the
  backend's own guard stack, not just between frontend and backend.
- **The httpOnly session cookie itself** — `AuthContext.login`/`logout` (file 01 §1) never read or
  write the JWT; only the *display profile* (`bp_user`) and its expiry are cached client-side,
  specifically because neither of those is a credential, while the actual token is deliberately
  placed somewhere client-side JavaScript structurally cannot read (`httpOnly`), closing off an XSS
  theft vector that a `localStorage`-stored token would leave open.

**The underlying principle, stated once:** anything that controls *what a user can do* lives only
on the server, verified from a source the client cannot forge (a signed token's payload, read
server-side). Anything that controls *what a user sees* can live on the client, because showing or
hiding a button has no security consequence as long as the thing it would have triggered is itself
properly guarded underneath.

---

## 4. Idempotent writes over append-only logs, with named historical fixes

`recordAttendance` (file 12, lines 269–305) doesn't append a new attendance_log row every time a
session is (re-)submitted — it looks for an existing row for the exact `(student, course, date)`
triple and corrects it in place, with the fix's own id (`M-01`) and the specific failure mode it
replaced ("stacking duplicate absences") documented inline. The id-generation fix alongside it
(`H-07` — UUIDs instead of a length-based scheme) is the same principle applied to a different
failure mode: a sequential, length-derived id scheme can mint colliding primary keys the moment two
records are deleted and re-created out of order; a UUID structurally cannot collide in practice.

`PATCH /research/:id/progress`'s `uploads` array (file 03 §2) extends this same idea to a list-
shaped field: a resubmitted `file_id` is checked against what's already present (`!uploads.some(u
=> u.file_id === body.file_id)`) before appending, so re-sending the same reference is a no-op, not
a duplicate entry.

**Why this matters specifically for a faculty-facing action like marking attendance**: a faculty
member re-submitting the same session (a page refresh mid-click, a double-tap on a slow network,
genuinely correcting a mistake they just made) is an expected, routine occurrence, not an edge case
— the data model has to treat "the same session, submitted twice" as a correction, not a
duplication, or every real-world retry becomes a data-integrity problem.

---

## 5. Explicit, mutually-exclusive-by-convention loading-state sentinels

Every component in files 06–11 that fetches data picks one of two sentinel conventions for "not
loaded yet," and does so consistently within each component:

- **`undefined`** — used whenever the component needs to distinguish *three* states: not-yet-
  attempted, attempted-and-empty, attempted-and-populated. `Dashboard.jsx`'s `Intervention`,
  `ActionRequired`, `SyllabusManager` (file 07); `AssessmentMapping.jsx`'s page root and
  `MarksEntryModal`'s loading flag reuses this too in places; `StudentOverview.jsx`'s `students`.
- **`null`** — used identically in intent (same three-state distinction), chosen in
  `MarkAttendance.jsx`'s `AttendanceForm` (`courses`, `students`) and `AssessmentMapping.jsx`'s
  `CreateAssessmentModal`/`MarksEntryModal` (`courses`, `students`) — the file's own inline comment
  (file 08, line 40) spells the convention out explicitly: `null = nothing loaded, [] = loaded
  empty`.

**Neither sentinel is "the" standard across the whole codebase** — this guide's own files flag the
inconsistency rather than papering over it (file 08's walkthrough notes `MarkAttendance.jsx` uses
`null` while `Dashboard.jsx`, examined one file earlier, uses `undefined` for the exact same
three-state need). The principle that *is* consistent, despite the sentinel choice varying file to
file: **a scalar placeholder (`'—'`, used only by `Metrics`'s two counters) is reserved for values
with no meaningful "empty" state of their own** (a count of zero is a perfectly normal, displayable
result) — **while a sentinel distinct from both the loading state and a valid empty result
(`undefined` or `null`, the component's choice)** is used whenever "zero results" and "nothing
fetched yet" need to render differently (an empty-state message vs. a loading spinner).

---

## 6. One shared component, parameterized by a `role` prop, instead of N near-identical copies

`Timetable`, `LeavePanel`, `ResearchPanel` all take a `role` prop and branch their *data source* and
sometimes their *entire render tree* on it (file 01 §§10, 12). `DiscussionForum` takes **no** role
prop at all, because its own legacy predecessor was *already* identical in behavior across actors —
the migration didn't impose a `role` prop pattern uniformly as a rule; it looked at whether the
legacy behavior actually differed by actor and only parameterized where it genuinely did.
`LeavePanel`'s own comment makes the cost-benefit explicit: `LeavePanel({ role })` is "a thin
dispatcher with no hooks of its own" specifically to avoid a wasted `/leave` fetch on the
admin/head path, which renders an entirely different component tree — the dispatcher pattern exists
precisely to avoid the alternative (one monolithic component branching internally on role *after*
already having fetched data neither branch might need).

This is also why `faculty.controller.ts`'s own several near-duplicate routes exist
(`/faculty/me/assessments` vs. the shared `/assessments?faculty_id=`, `/faculty/marks` vs. the
shared `/marks`) rather than being collapsed into one — the migration didn't force every
faculty-adjacent concern through a single shared endpoint either; where a faculty-specific,
narrower route already existed and a broader shared one also covers the same need, **both were
left in place**, with the frontend choosing whichever actually fits its needs (several of these
faculty-specific routes, per file 12, are simply never called by the shipped UI — left present,
unused, rather than deleted, a conscious "don't break what might depend on it" stance toward
backend surface area even when a frontend caller no longer exists).

---

## 7. Fail-open, not fail-closed, for degraded *non-security* state

`Sidebar.jsx`'s `licensedModules === null` (not yet loaded, or the fetch failed) is treated as
**"show everything"** (file 01 §6) — the opposite of the security-relevant guards' own
deny-by-default stance (file 05 §4's `RolesGuard`, which 500s a route with no `@Roles()` at all
rather than defaulting it open). These are not a contradiction; they're the same underlying
principle — *"default to the behavior with the lower cost of being wrong"* — applied to two
different kinds of uncertainty. A missing `@Roles()` decorator is a **programming mistake with
unbounded blast radius** if it defaulted open (any future low-trust role silently inheriting access
nobody meant to grant), so it fails closed, loudly, as a 500. A `licensedModules` fetch that hasn't
resolved yet is a **transient, bounded, recoverable state** — hiding a nav item the college
genuinely paid for, over a slow network blip, has a real UX cost and no security benefit (the
backend's `RequiresModuleGuard`, file 05 §5, is the actual enforcement regardless of what the
sidebar shows), so it fails open.

---

## 8. Notifications: a deliberately lightweight, client-side-only channel, kept separate from durable backend state

`SendAlertModal` (file 01 §15) is explicit about this: *"client-side only — nothing is persisted
server-side."* `NotificationsContext.send`/`broadcast` (file 01 §2) write to `localStorage`, full
stop — there is no `/notifications` backend route anywhere in this entire guide's surface. Even
`MarkAttendance.jsx`'s `AttendanceRequests.grant` (file 08), which *does* perform a real, persisted
backend mutation (`PATCH /attendance-request/:id/mark`), follows that mutation with a `send(...)`
call that is **a completely separate, non-transactional side effect** — if the `PATCH` succeeds but
the subsequent `send()` somehow failed (it structurally can't, being a synchronous localStorage
write, but the code is written as if it's a fallible step worth sequencing after the real mutation,
not before or atomically with it), the attendance grant itself would already be durable regardless.

**Why keep notifications this lightweight rather than making them a real, server-persisted
feature?** Every notification in this codebase is a *side effect of* some other, properly-persisted
action (a mark was posted, a meeting was scheduled, an attendance request was granted) — the
durable fact lives in the real resource (`marks_entry`, the stub `meeting` object, `attendance_log`);
the notification is purely "tell the other party this happened," and the migration's choice was to
keep that specific concern as cheap and simple as the legacy app's own `localStorage`-plus-polling
approach, rather than promoting it to a first-class, database-backed, possibly-needing-its-own-
read-receipts feature. This is also *why* the cross-tab `storage`-event fix (file 01 §2, principle
1 above) was worth making: once you've decided notifications stay client-side-only, making that
client-side mechanism actually reliable across tabs is the whole remaining quality bar for the
feature — there's no backend fallback to lean on if the client-side mechanism is broken.

---

## 9. Every network call goes through exactly one chokepoint, and that chokepoint owns the global failure policy

Every single `apiFetch` call across files 06–11 — there are dozens — funnels through the one
function examined in file 01 §3 and re-cited at every hop in file 05. The 401-forces-logout /
403-never-logs-out distinction (file 05 §8) is enforced **once**, in that one function, rather than
being a pattern each of the dozens of call sites has to remember to implement correctly. This is
why no component in files 06–11 ever writes its own `if (res.status === 401)` check — that
decision was centralized specifically so it can never be gotten wrong at an individual call site,
and so a future change to the policy (say, a different handling for a specific route) has exactly
one place to change, not dozens.

The same chokepoint principle appears in miniature inside individual files: `AssessmentMapping.jsx`'s
`AssessmentMapping` page root funnels both `CreateAssessmentModal`'s `onCreated` and
`MarksEntryModal`'s `onSaved` to the **same** `load` function (file 09) — neither modal performs its
own optimistic local update of the assessment list; both simply trigger the one function that
re-fetches the canonical list from the server. This trades a small amount of perceived latency (a
round trip after every mutation, rather than an instant local update) for a strong invariant: the
list the user sees after any mutation is *always* what the server actually has, never a
client-side guess that might drift from it.

---

## 10. Comments carry design intent, not implementation description — and are trusted as primary sources

Nearly every nontrivial decision examined across files 06–13 was *verifiable from an inline
comment*, not inferred from behavior alone: the past-date guard's label (`PAST-DATE GUARD (parity
fix)`, file 09), the leave-precedence rule's rationale (file 12, line 280's comment on why
`EXCUSED` outranks a resubmitted `ABSENT`), the historical bug-fix ids (`M-01`, `M-02`, `M-04`,
`H-07`, scattered through file 12), the cross-tab fix's own before/after description (file 01 §2).
This guide's own method leaned on exactly this property — nearly every claim in files 00–13 traces
back to either the running code's own structure or a comment that states its author's intent
directly, rather than this guide guessing at *why* a pattern exists. **The migration's own
discipline of writing comments that explain *why*, not *what*, is itself what made a guide this
detailed possible to write accurately** — a codebase documented only with what-comments (or none
at all) would have left every design-principle claim in this file as speculation rather than a
cited fact.

---

This completes the extended faculty actor study guide. Full index:
[00-overview](./faculty-00-overview.md) ·
[01-shared-infrastructure](./faculty-01-shared-infrastructure.md) ·
[02-pages-deep-dive](./faculty-02-pages-deep-dive.md) ·
[03-backend-mapping](./faculty-03-backend-mapping.md) ·
[04-legacy-origin-mapping](./faculty-04-legacy-origin-mapping.md) ·
[05-request-pipeline-reference](./faculty-05-request-pipeline-reference.md) ·
[06](./faculty-06-line-by-line-facultydashboard.md)–[11](./faculty-11-line-by-line-eventscheduler.md)
line-by-line walkthroughs ·
[12-line-by-line-backend](./faculty-12-line-by-line-backend.md) ·
**13-design-principles (this file)**
