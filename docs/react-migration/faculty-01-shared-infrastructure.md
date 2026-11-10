# Faculty Actor — Study Guide 1: Shared Infrastructure

Every faculty page sits on top of this layer. None of it is faculty-specific — most of it is used
identically by every other actor — but you cannot understand what a faculty component's one line of
`apiFetch(...)` actually does without understanding every hop underneath it, so this file walks the
full stack: context providers → the fetch wrapper → layout chrome → shared modals. Read it in order;
later sections assume earlier ones.

---

## 1. `AuthContext.jsx` — who's signed in, login, logout

**Origin:** legacy `state.js`'s `window.Auth` global object, re-expressed as React context so
components read the signed-in user by calling a hook instead of reaching into a global.

### Exports

**`ROLE_HOME`** — a plain object, not a hook: `{ superadmin: '/superadmin', admin: '/admin', head: '/admin', faculty: '/faculty', spoc: '/spoc', student: '/student' }`.
Mirrors the legacy `login()` redirect table. Note `admin` and `head` both resolve to the same route —
they share one dashboard (`AdminHeadDashboard`, outside this guide's scope), distinguished only by
which nav items `Sidebar` shows them, not by route.

**`AuthProvider({ children })`** — the context provider, mounted once near the app root (outside
this guide's scope, but it wraps everything, including `/faculty/*`).

- `const [user, setUser] = useState(() => getUser())` — `getUser()` comes from `api/client.js`
  (§3 below); it reads `localStorage.getItem('bp_user')` and `JSON.parse`s it. This is a **lazy
  initializer** — the function only runs once, on mount, not on every render.

- **`login(email, password)`** — an `async` function wrapped in `useCallback` with an empty
  dependency array (it closes over nothing that changes, so it's created once and never
  reconstructed). It does *not* go through `apiFetch` — it calls `fetch('/api/auth/login', ...)`
  directly, because `apiFetch` would reject a non-401 failure in a way that's awkward for a login
  form (it throws, but the caller here wants the raw response to build a friendlier message). On
  success it does three things: (1) writes `loggedInUser` to `localStorage['bp_user']`, (2) writes
  `expires_at` to `localStorage['bp_expires_at']` if the server sent one, (3) calls `setUser`. It
  returns `ROLE_HOME[loggedInUser.role] || '/student'` — the caller (the login page, outside this
  guide) uses that return value to `navigate()` there. **Critically, the JWT itself is never
  touched here** — it arrived as a `Set-Cookie` header the browser stored automatically because the
  request carries `credentials: 'same-origin'`. Only the *display* profile and its expiry are
  cached client-side, and neither is a credential on its own.

- **`logout()`** — also `useCallback`, empty deps. POSTs to `/api/auth/logout` to let the server
  clear the httpOnly cookie (the client has no way to clear an httpOnly cookie itself), wrapped in
  `try/catch` so a network failure doesn't prevent local cleanup, then calls `clearSession()`
  (from `client.js`) and `setUser(null)`.

**`useAuth()`** — the consumer hook. `useContext(AuthContext)`, throws `'useAuth must be used
within AuthProvider'` if called outside the tree. Every faculty component that needs `user.user_id`,
`user.first_name`, etc. calls this.

### Where faculty actually uses it
`Dashboard.jsx` (SyllabusManager needs `user.user_id` to filter "my sections"), `MarkAttendance.jsx`
(AttendanceRequests needs `user.first_name` for the notification "from" field), `AssessmentMapping.jsx`
(both modals — filtering sections by `faculty_id === user.user_id`, and the "from" name on marks
notifications), `StudentOverview.jsx` (BTP assignment notification "from" name, broadcast "from"
name), `Sidebar.jsx` (display name in the user card), `SendAlertModal.jsx` and `MeetingModal.jsx`
(both need the current user's name as the notification sender).

---

## 2. `NotificationsContext.jsx` — toasts + the notification bell's data

**Origin:** legacy `fixes.js`'s `window.Notifications` IIFE and its `showToast()` function. Still
backed by the exact same `localStorage` keys the legacy app used (`bp_notifications`,
`bp_broadcasts`, and a per-role `bp_bc_read_<role>` read-marker key), so a real user's existing data
from the old app keeps working unmodified after the migration.

### The two localStorage-backed collections

- **`personal`** (`KEY = 'bp_notifications'`) — targeted, one-to-one notifications: `{ id, to,
  from, message, type, read, time, timestamp }`. `to` is a specific `user_id`.
- **`broadcasts`** (`BKEY = 'bp_broadcasts'`) — one-to-many: `{ id, forRole, from, message, type,
  time, timestamp }`. `forRole` is either a specific role string or `'all'`.

Both are capped — `personal` at 200 entries, `broadcasts` at 500 — by `.slice(0, 200)` /
`.slice(0, 500)` after prepending the new entry, so the arrays can never grow unbounded in
localStorage.

### `readJSON(key, fallback)` — module-private helper
`JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback))` wrapped in try/catch, returning
`fallback` on any parse error. Used for every localStorage read in this file.

### `notExpired(entry)` — module-private helper
`!entry.timestamp || Date.now() - entry.timestamp < THIRTY_DAYS`. Both state initializers filter
through this, so stale notifications older than 30 days silently disappear on next load rather than
accumulating forever.

### `NotificationsProvider({ children })`

- Two `useState` calls initialize `personal`/`broadcasts` from localStorage via `readJSON(...).filter(notExpired)`.
- Two `useEffect`s mirror `personal`/`broadcasts` back to localStorage on every change — this is the
  **write side**.
- **The cross-tab `storage` event listener** (the most load-bearing piece of this file) —
  a third `useEffect`, mount-only (`[]` deps), registers a `window.addEventListener('storage', onStorage)`.
  The `storage` event is a browser primitive that **fires in every other tab sharing the same
  origin whenever one tab writes to localStorage** — critically, it never fires in the tab that did
  the writing. `onStorage` checks `e.key` and re-reads+re-filters whichever collection changed. This
  is what makes a faculty broadcast sent from one browser tab appear, unprompted, in an already-open
  student tab on the same browser without a manual reload. The file's own header comment explains why
  this exists: the *legacy* app re-read localStorage fresh on every page load and every bell render
  (because it had no persistent in-memory state to go stale), so this problem never existed for it —
  but the React version's provider mounts once and only reads localStorage once, so without this
  listener a second open tab would never see a write from a first tab until a hard refresh. This is
  explicitly documented as a **bug fix introduced during the migration**, not a straight port.

- **`showToast(msg, type)`** — `useCallback`, empty deps. Clears any pending dismiss timer,
  sets `toast = { id: Date.now(), msg, type }`, and schedules `setToast(null)` after 3500ms. Only
  one toast exists at a time; calling this again before the timer fires replaces the current toast
  and restarts the clock (because `clearTimeout` runs first). `type` defaults to `'success'`, and
  `Toast.jsx` (§8) only knows three colors (`error`, `warning`, `success`) — anything else falls back
  to the success color.

- **`forUser(uid)`** — `useCallback`, depends on `[personal]`. `personal.filter(n => n.to === uid)`.

- **`getUnreadBC(role)`** — `useCallback`, depends on `[broadcasts]`. Reads the per-role read-marker
  array (`bp_bc_read_${role}`) fresh from localStorage every call (not cached in state — this key is
  never mirrored into React state at all, only written/read directly), and returns broadcasts
  matching `forRole === 'all' || forRole === role` whose `id` isn't in that read-marker list.

- **`unread(uid)`** — `useCallback`, depends on `[forUser]`. `forUser(uid).filter(n => !n.read).length`.

- **`send(toUserId, fromName, message, type)`** — `useCallback`, empty deps. Prepends a new personal
  notification, slices to 200. This is the function every faculty component calls to push a
  targeted notification — e.g. `AssessmentMapping.jsx`'s marks-entry flow calls `send(student_id,
  facultyName, "📊 Your marks for ... have been posted ...", 'marks')` once per student whose marks
  were just saved.

- **`broadcast(targetRole, fromName, message, type)`** / **`broadcastAll(...)`** — `broadcast` is
  the general form; `broadcastAll` is `broadcast('all', ...)`. `StudentOverview.jsx`'s "Broadcast to
  All Students" button calls `broadcast('student', ...)` directly (not `broadcastAll`, since it's
  role-targeted, not everyone).

- **`markRead(uid)`** / **`markBCRead(role)`** — mutate `personal`/write the read-marker key.
  `NotificationBell.jsx` (§7) calls both together when its panel opens.

- **`clearAll(role)`** — empties `personal` entirely (not just the current user's — this is a
  known legacy behavior quirk preserved as-is: it clears *every* personal notification in the whole
  store, not just the signed-in user's, because the legacy version operated on the same single
  shared localStorage array) and marks every current broadcast for `role` as read.

### `useNotifications()` — the consumer hook
Same pattern as `useAuth()`: throws if used outside the provider.

### Where faculty actually uses it
Every faculty page that shows a toast or sends a notification: `Dashboard.jsx`, `MarkAttendance.jsx`,
`AssessmentMapping.jsx`, `StudentOverview.jsx`, `MeetingModal.jsx`, `SendAlertModal.jsx`,
`ResourceBookingModal.jsx`, `DiscussionForum.jsx`, `LeavePanel.jsx`, `ResearchPanel.jsx`. Only
`EventScheduler.jsx` and `Timetable.jsx` don't need it (both are pure read/display views with no
form to submit and nothing to notify about).

---

## 3. `api/client.js` — session helpers + the authenticated fetch wrapper

**Origin:** legacy `state.js`'s `window.Auth` session-reading helpers, plus the global `api()`
fetch wrapper fixes.js/script.js called everywhere.

- **`API_BASE = '/api'`** — a module constant. Every `apiFetch` call is relative to this. (This is
  also the single biggest deployment-topology assumption in the whole frontend — see the
  conversation's earlier infra audit: this relative path only works when the frontend and backend
  are served from the same origin, which is true today but would break under a split-origin
  deployment like Vercel+Render without changing this to an absolute URL.)

- **`getUser()`** — `JSON.parse(localStorage.getItem('bp_user'))` or `null`. Backs `AuthContext`'s
  lazy initializer.

- **`getTokenExpiry()`** — reads `bp_expires_at`, returns a `Number` or `null` if not finite.

- **`isTokenExpired()`** — `expiresAt !== null && Date.now() >= expiresAt`. Purely a client-side UX
  shortcut to force logout *before* even making a request, when the cached expiry has clearly
  passed — it's not authoritative (the server's own session check is), just avoids one pointless
  round trip.

- **`clearSession()`** — removes both localStorage keys. Does **not** touch the httpOnly cookie —
  it can't; only the server can clear that (see `logout()` above).

- **`forceLogout(reason)`** — module-private. Logs a warning, clears the session, and does a **hard
  navigation** (`window.location.href = '/login'`), not a React Router navigate. The file's own
  comment explains why: this matches the legacy app's `Auth.logout()` exactly, and there's no React
  state worth preserving once the session is actually gone — a full page load guarantees every
  component remounts clean.

- **`apiFetch(endpoint, options)`** — the workhorse every faculty component calls instead of raw
  `fetch`. Walk through it:
  1. **Content-Type handling**: if `options.body instanceof FormData` (file uploads — see §4), it
     deliberately omits `Content-Type` entirely, because the browser must set that header itself
     (it needs to append the multipart boundary string, which JS code cannot know in advance).
     Otherwise it defaults to `application/json`, overridable by `options.headers`.
  2. **Pre-flight expiry check**: if `isTokenExpired()`, calls `forceLogout` and returns `null`
     *without making the request at all* — this is a pure client-side optimization.
  3. The actual `fetch(`${API_BASE}${endpoint}`, { ...options, headers, credentials: 'same-origin' })`.
     `credentials: 'same-origin'` is what makes the browser attach the httpOnly session cookie — and,
     per the earlier infra audit, is the line that would need to become `'include'` under a
     split-origin deployment.
  4. **401 → forced logout.** The comment is explicit: a 401 means the *session itself* is invalid,
     never "you sent a bad value" — endpoints must not reuse 401 for validation errors, specifically
     so this global handler can safely assume "sign this user out" every time it fires.
  5. **403 → thrown, not logged out.** "Authenticated but not permitted" must not end the session —
     refusing one action (e.g. a faculty member hitting a route scoped to a different section) is not
     grounds for signing them out of everything else.
  6. Any other non-OK status → throws an `Error` built from NestJS's error shape: `data.message`
     (joined if it's an array — NestJS's `ValidationPipe` returns arrays of per-field messages) or
     `data.error`, falling back to `HTTP ${status}`.
  7. On success, returns the parsed JSON body (`{}` if the body couldn't be parsed as JSON, e.g. a
     204 No Content).

### Where faculty actually uses it
Every single faculty component with a network call — there is no faculty component that bypasses
`apiFetch` for a JSON request. (The only direct, non-`apiFetch` `fetch` calls anywhere in the
faculty-reachable code are `AuthContext.login/logout`, and `uploads.js`'s `downloadDocument`, both
for reasons specific to those operations — see §1 and §4.)

---

## 4. `api/uploads.js` — file upload/download

**Origin:** legacy `state.js`'s upload helpers, used by every form with an attachment.

- **`MAX_UPLOAD_BYTES = 5 * 1024 * 1024`** — a module constant the file's own comment says is "kept
  in step with" the backend's `UPLOAD_MAX_BYTES` env-configurable default (`back-end/src/uploads/upload.config.ts`,
  outside this guide's direct scope but referenced in file 03). This is a **client-side duplication**,
  not a shared constant — if the backend's env var ever changes, this file has to be updated by
  hand to match, or the client will accept files the server then rejects.

- **`uploadFile(file, context)`** — `async`. Returns `null` immediately if no file. Throws early
  (before even building the request) if `file.size > MAX_UPLOAD_BYTES`, with a friendly "File must
  be under NMB" message — this check exists purely to fail fast client-side rather than wasting a
  round trip on a file the server will reject anyway. Builds a `FormData` with one `file` field, and
  POSTs via `apiFetch('/uploads?context=...', { method: 'POST', body: form })`. `context` is a
  free-text tag (`'leave'`, `'research_milestone'`, etc.) the backend attaches to the stored file
  record so it can be associated with the right feature later. Returns `res.data` (the uploaded
  file's metadata: `file_id`, `original_name`, etc.) or `null`.

- **`fileUrl(fileId)`** — `` `/api/uploads/${encodeURIComponent(fileId)}` ``. Exported mainly so
  `downloadDocument` can reuse it, not meant to be used as a plain `<a href>` — the comment is
  explicit that the route is authenticated and ownership-checked, so a bare anchor tag (which sends
  no cookie-bearing fetch, just a browser navigation that *would* send the cookie automatically
  actually — but more importantly wouldn't let you control the download filename or handle an error
  response gracefully) isn't the right tool here.

- **`downloadDocument(fileId, suggestedName)`** — `async`. This is the one place in the whole
  faculty-reachable frontend that calls raw `fetch` instead of `apiFetch`, because it needs the raw
  `Response` object to read `Content-Disposition` and to call `.blob()` — `apiFetch` already
  consumes the body as JSON. Throws `'No document attached'` if no `fileId`. On a non-OK response,
  tries to parse a JSON error body for a message, falling back to `Download failed (HTTP N)`. On
  success: reads the `Content-Disposition` header and regexes out the server's sanitized filename
  (preferred over `suggestedName`, since the server's name is the one that's actually been through
  the sanitization pass), converts the response to a `Blob`, creates an object URL, synthesizes an
  `<a download>` element, clicks it programmatically, removes it, and revokes the object URL after a
  10-second delay (immediate revocation can cancel the download in some browsers — hence the delay).

### Where faculty actually uses it
`AssessmentMapping.jsx` (downloading a student's online-exam submission file, or an already-uploaded
assessment attachment), `MarkAttendance.jsx` (downloading an attendance-request's supporting
document), `LeavePanel.jsx` (downloading a leave application's attached document — shared with
student/admin), `ResearchPanel.jsx`'s faculty branch (downloading a student's BTP submission file).
`uploadFile` itself is used by `LeavePanel.jsx` and `ResearchPanel.jsx`'s *student* branch, not
directly by any faculty-only component — faculty only ever downloads in this actor's flows, never
uploads (faculty has no file-attaching form of its own; it only reviews what students attached).

---

## 5. `hooks/useBodyClass.js`

Twelve lines, one job: `useEffect(() => { document.body.classList.add(className); return () =>
document.body.classList.remove(className); }, [className])`. The comment explains the need
precisely: the legacy app was one `<body class="dashboard-body">` (or `login-body`, `onboard-body`)
per HTML file, and `style.css`'s page-level selectors key off that class. A single-page app has
exactly one `<body>` for the whole session, so each top-level page has to add its own class on mount
and clean it up on unmount instead of relying on a fresh page load to reset it. `DashboardShell`
calls this once with `'dashboard-body'` — every actor's dashboard, faculty included, inherits this
for free by composing `DashboardShell`.

---

## 6. `DashboardShell.jsx` / `Sidebar.jsx` / `Topbar.jsx` — the chrome

**`DashboardShell`** is the one layout every actor composes (origin comment: "Phases 1–5 will
compose... One shell, parameterized by props, instead of five copies"). What it does, in order:
1. `useBodyClass('dashboard-body')` (§5).
2. `const { logout } = useAuth()`, `const navigate = useNavigate()`.
3. **Module licensing fetch** — `useState(null)` for `licensedModules`, then a mount-only
   `useEffect` that calls `apiFetch('/billing/colleges/me/modules')` and sets
   `res?.data?.modules || null` on success, silently swallowing any failure (empty `.catch(() => {})`)
   — a failed lookup leaves `licensedModules` at its initial `null`, which `Sidebar` treats as
   "show everything" (§7 of file 00, and the sidebar section just below).
4. `handleLogout` — `await logout()` then `navigate('/login')`. This is a React Router navigate
   (SPA-internal), unlike `apiFetch`'s own forced-logout path which does a hard navigation — the
   difference matters: this is a *voluntary* logout through a UI button, where staying in the SPA
   for the transition is fine; `apiFetch`'s forced logout is reacting to an already-invalid session
   where a full remount is the safer choice.
5. Renders `<Sidebar>` (passed everything needed to build the nav + user card) and a
   `<div className="main-content">` containing `<Topbar>` (with `<NotificationBell
   onNavigate={onSelect}>` as its child — this is how the bell, several component layers away from
   any specific view, is still able to navigate the dashboard: `onSelect` is threaded all the way
   down from `FacultyDashboard`'s own `setActiveView`) and the actual `children` (the active view).

**`Sidebar`** — reads `user` from `useAuth()` for the display name. Its one piece of real logic:
`visibleItems = navItems.filter(item => !item.module || !licensedModules || licensedModules.includes(item.module))`
— ported from legacy `script.js`'s `applyModuleGating()`. Renders each visible item as a `<button>`
(not an `<a>`, since there's no URL to navigate to — this is why the legacy `onclick="...; return
false;"` pattern doesn't need porting at all: a `<button>` has no default navigation to suppress).
The `onClick` ternary (`item.onAction ? item.onAction() : onSelect(item.id)`) is the mechanism behind
file 00 §5's nav-item-vs-nav-action distinction.

**`Topbar`** — the simplest component in this entire guide: renders a title, optional badges, and
`children` (the bell). No state, no hooks. Pure presentational.

---

## 7. `NotificationBell.jsx` — the bell icon and its panel

**Origin:** legacy `fixes.js`'s `window.Notifications` (`injectBell`/`renderPanel`/`updateBell`).

**`TYPE_META`** — a lookup table mapping a notification's `type` string (`meeting`, `event`, `alert`,
`info`, `fee`, `marks`, `leave`, falling back to `default`) to its icon/colors/label *and* which
dashboard view clicking it should navigate to (`viewId`). This is a deliberately **shared, cross-actor**
table — the file's own comment notes not every actor has every view (only students have
`'attendance'`), but that's a non-issue: a faculty user will simply never receive a notification
whose `type` maps to a view they don't have, so there's no need to maintain a separate map per actor.

- `togglePanel()` — the one function in this component worth tracing carefully, because of a
  documented bug fix. **Capture-then-mark-then-render ordering**: when opening, it builds
  `panelItems` (unread broadcasts for this role + all personal notifications for this user) and
  calls `setPanelItems(items)` **before** calling `markRead`/`markBCRead`. The component's own header
  comment explains the bug this avoids: an earlier version marked things read *in the click handler*
  and then re-derived the displayed list from `getUnreadBC()` on the next render — but marking-read
  updates the very read-marker list `getUnreadBC` filters against, so by the time that next render
  happened, the just-opened panel would already show zero broadcasts. Snapshotting first and
  rendering from the snapshot (not from live `getUnreadBC()`/`forUser()` calls) sidesteps the problem
  entirely; closing the panel clears the snapshot so the next open starts fresh.
- `unreadCount = unread(user.user_id) + getUnreadBC(user.role).length` — drives the red badge.
- Clicking an item calls `onNavigate?.(navView)` (the `onSelect`/`setActiveView` passed all the way
  down from `FacultyDashboard`), then closes the panel and clears the snapshot.
- Returns `null` entirely if there's no signed-in `user` — the bell simply doesn't render pre-login.

---

## 8. `Modal.jsx` and `Toast.jsx`

**`Modal`** — the single shared `.modal-backdrop`/`.modal-window`/`.modal-header` wrapper every
legacy modal hand-duplicated. `open` is the only thing controlling visibility — if falsy, the
component returns `null` outright rather than rendering hidden markup (unlike the legacy app, which
toggled a CSS class on a backdrop that always existed in the DOM). Takes `title` (can be a string or
JSX — `AssessmentMapping.jsx`'s `MarksEntryModal` passes a `<>...</>` fragment to color part of the
title), optional `maxWidth`, and `children` for the body/footer markup the caller supplies directly
(there's no separate `ModalBody`/`ModalFooter` subcomponent — callers just use the plain
`className="modal-body"` / `className="modal-footer"` div wrappers, which exist only as CSS hooks
into `style.css`, not as components).

**`Toast`** — reads `toast` from `useNotifications()`; renders `null` if there isn't one. Fixed
position bottom-right, color keyed by `toast.type` through the local `COLORS` map (only
`error`/`warning`/`success` are defined; anything else silently falls back to `success`'s green).
Mounted once at the app root (outside this guide's scope) — every faculty `showToast(...)` call,
from any component at any depth, surfaces through this one instance.

---

## 9. `ProtectedRoute.jsx`

Already covered in file 00 §2 — repeated here only to make explicit what it is *not*: it has no
`useEffect`, makes no network call, and trusts `user.role` from context (ultimately from
localStorage) completely. Its own header comment states the threat model plainly: editing
localStorage lets someone render a dashboard they're not entitled to, but every API call that
dashboard then makes still carries the real session cookie, so the backend's `@Roles(...)` guard
returns 403 regardless. This component exists purely so a mismatched role doesn't even get to see
an empty/erroring dashboard shell — it bounces them to `/login` before any of that renders.

---

## 10. `LeavePanel.jsx` — shared across student/faculty/admin/head

**Origin:** three different legacy functions folded into one component — student's
`renderStudentLeave()`+`submitLeaveApplication()`, faculty's `renderFacultyLeaveList()`+
`submitFacultyLeave()`, and admin/head's `renderLeaveManagement()`+`updateLeave()` — because all
three operate on the same backend resource (`/leave`), just with different UI and different allowed
actions.

**`LeavePanel({ role })`** — a thin dispatcher with no hooks of its own: `admin`/`head` → `<AdminLeaveManagement/>`;
`student`/`faculty` → `<PersonalLeavePanel role={role}/>`; anything else → `null`. The comment notes
this avoids a wasted `/leave` fetch on the admin/head path, since that branch renders an entirely
different component tree with its own data needs.

**`PersonalLeavePanel({ role })`** (the faculty-relevant branch) — fetches `/leave` on mount, derives
`total`/`rejected` counts for the two metric cards, and renders either `LeaveTable` (faculty — a
`<table>`) or a list of `LeaveRow` cards (student). The faculty/student split here is purely
presentational, not behavioral — same data, same modal, different markup. `LeaveApplyModal` is
shared by both roles verbatim, with `role` only changing one label ("Leave applied" vs. "Leave
application submitted") and one dropdown option's text ("Event/Conference" vs. "Event Participation").

**`LeaveApplyModal({ role, open, onClose, onSubmitted })`** — validates leave type, both dates
present and `end >= start`, and a reason of at least 10 characters, with the warning message itself
phrased differently per role. Optionally uploads a file via `uploadFile(file, 'leave')` (§4) before
POSTing `{ leave_type, start_date, end_date, reason, file_id }` to `/leave`.

**`AdminLeaveManagement`** and **`AdminLeaveRow`** are *not* faculty-reachable (only rendered for
`admin`/`head`) — included here only because they live in the same file and share its module-level
`STATUS_COLORS` constant; skip them if you're focused purely on faculty.

---

## 11. `MeetingModal.jsx`

**Origin:** legacy `fixes.js`'s `openMeetingModal()` + `submitScheduleMeeting()`.

Used from two different call sites in faculty's own pages — `Dashboard.jsx`'s intervention list and
`StudentOverview.jsx`'s student cards — each passing a different `preselected` value, which is
exactly how the legacy function supported both call shapes: `openMeetingModal(studentId, name)`
(preselected, dropdown locked) vs. `openMeetingModal()` with no arguments (open dropdown, fetches
every student this faculty teaches via `/faculty/me/students`).

Validation, in order: student selected, date present and not in the past, hour+minute both
selected, meeting mode selected, agenda at least 5 characters. The 12-hour-to-24-hour conversion is
inline arithmetic: `h += 12` if PM and not 12 o'clock, `h = 0` if AM and 12 o'clock (midnight), then
zero-pads. POSTs `{ student_id, date, time, agenda, mode }` to `/meetings`, then calls `send(...)`
to notify the student with a human-readable time string (`timeDisplay`, built separately from the
24-hour `time` sent to the server) and the mode's friendly label.

---

## 12. `ResearchPanel.jsx` — faculty's half

**Origin:** the student branch ports `renderStudentResearch()` + `openBTPUploadModal()` +
`submitResearchProgress()`; the **faculty branch** — the one relevant here — ports
`renderFacultyResearchEnhanced()` + `openFacultyBTPModal()` + `submitFacultyBTPProgress()`. The
file's own comment flags that the *enhanced* version (not the original `renderFacultyResearch`) is
what got ported — see file 04 §2 for why two versions existed in the legacy code at all (a runtime
monkey-patch).

**`ResearchPanel({ role })`** — fetches `/research` once on mount (role-agnostic fetch: the backend
returns different projects depending on who's asking, scoped server-side, not by a query param),
then branches entirely on `role` for rendering. Faculty branch:

- Maps each project to a **`FacultyProjectCard`** — shows supervised student name(s)
  (`project.students` array, each mapped to a full name, joined — falls back to legacy singular
  `student_name`/`student_id` fields if `students` isn't present, a defensive compatibility path),
  a progress bar, and conditionally either a green "Student Work Submitted" block (with a download
  button for `project.uploads`'s *last* entry — `uploads[uploads.length - 1]`, i.e. the most recent
  submission) or a yellow "Awaiting student work submission" block.
- Clicking "Update Progress / Feedback" opens **`FacultyBTPProgressModal`** for that project.

**`FacultyBTPProgressModal({ project, onClose, onSaved })`** — a controlled `progress` number
input (0–100) and a `feedback` textarea (minimum 5 characters, with its own inline error state
distinct from the global toast — the file deliberately uses a dedicated `feedbackError` string
rather than just a toast, so the error renders directly under the field). On submit, `PATCH
/research/:id/progress` with `{ progress, faculty_feedback }`, then `send(...)` to notify the
supervised student — note the student id resolution: `project.student_id ||
project.students?.[0]?.user_id`, handling both the legacy singular shape and the newer array shape.

`ProjectCard` and `BTPUploadModal` (student-only) are in this same file but not faculty-reachable —
skip them if focused on faculty, though `StudentOverview.jsx`'s `AssignBTPModal` is the thing that
*creates* the projects this faculty branch later manages (`POST /research`), so the two are tightly
coupled across files.

---

## 13. `DiscussionForum.jsx`

**Origin:** legacy `fixes.js`'s `renderDiscussions()` + `openThreadDetail()` +
`submitThreadReply()` + `submitNewDiscussion()`. The component's own comment notes this is **fully
role-agnostic** already in the legacy code (identical markup/behavior on `student.html` and
`faculty.html`, just a different container id) — so unlike `LeavePanel`/`ResearchPanel`/`Timetable`,
this component takes **no `role` prop at all**.

Three pieces: a list of `ThreadRow`s (title, tag badge, 100-char content preview, author/date/reply-count
footer), `NewThreadModal` (title ≥3 chars, content ≥10 chars, a fixed category dropdown, optional
free-text course id), and `ThreadDetailModal` (fetches the full thread + its replies on open by
`postId`, lets the signed-in user post a reply). Backend role restrictions (who can *post* vs. who
can only *read*) live entirely server-side — see file 03 §2's `discussions` rows.

---

## 14. `ResourceBookingModal.jsx`

**Origin:** legacy `fixes.js`'s `openResourceBookingModal()` + `submitResourceBooking()` — one of
several modals the legacy app injected into *every* dashboard page at runtime rather than declaring
statically in each HTML file.

Fetches `/resources` on open, filters client-side to `status === 'available'` (the backend returns
all resources regardless of status; the filtering is purely a frontend convenience so the dropdown
doesn't offer something already booked). On submit, `POST /resource-booking` with `{ resource_id,
date, purpose }`, then — notably — calls `broadcast('admin', ...)` **and** `broadcast('head', ...)`
separately (two calls, not one), since admin and head are modeled as two distinct notification
audiences even though they share one dashboard.

Mounted at the `FacultyDashboard` level (file 00 §5), not inside the `VIEWS` map, because it's a nav
*action*, not a nav *view*.

---

## 15. `SendAlertModal.jsx`

**Origin:** legacy `fixes.js`'s `openAlertModal()` + `sendCustomAlert()`. The component's own
comment is emphatic about one thing: this is **client-side only** — nothing is persisted
server-side, it purely calls `send(...)` to push a bell notification. This matches legacy behavior
exactly; it is not a migration gap, it's a faithful port of a feature that was always this
lightweight. `TEMPLATES` gives three one-click canned messages (low attendance, low performance,
pending assignment) that just populate the textarea — the user can still edit before sending.
Validation: message must be at least 5 characters.

Used from `Dashboard.jsx`'s intervention list and `StudentOverview.jsx`'s student cards — same dual
call-site pattern as `MeetingModal`.

---

## 16. `Settings.jsx`

**Origin:** legacy `fixes.js`'s `renderSettings()`/`changePassword()`. One component reused
unchanged across every actor (student today in the legacy numbering; faculty/admin/spoc/superadmin
reuse it identically). Reads `user` from `AuthContext` to render the read-only profile block
(name/email/role/id). The password-change form enforces, client-side, the exact same regex the
sign-in page's own password rule uses:
`^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$` — 8+ characters, at least one
lowercase, one uppercase, one digit, one special character from that fixed set. Also checks the new
password differs from the current one and that confirm matches, before ever hitting the network.
POSTs `{ current_password, new_password }` to `/auth/change-password` (file 03 §3). The component's
own comment on its `catch` block is worth noting: a wrong current password returns `400`, which
`apiFetch` throws as an ordinary `Error` rather than routing through the global 401 handler — so it
surfaces as a toast here instead of silently logging the user out.

---

Continue to **[02-pages-deep-dive.md](./faculty-02-pages-deep-dive.md)** for the six faculty-specific
page files, now that every shared piece they lean on is covered.
