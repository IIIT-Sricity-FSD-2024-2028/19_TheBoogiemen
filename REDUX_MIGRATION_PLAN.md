# Migration Plan: Context/useState → Redux Toolkit + Thunks

> **Revised** to reflect what's shipped since this was first drafted: the SPOC-name/revenue fixes, the academic-metrics + CSV bulk-onboarding feature, and the fee/notification bug fixes. The notification fix in particular changes a real assumption below — `NotificationsContext` now reads `AuthContext` internally (college-scoped broadcast visibility), which §5's notifications design and the Phase 1/2 sequencing note have been updated to account for. New domains (`revenue`, `metrics/academic`, `bulk-onboard`) are folded into §2's inventory, §6's phase-3 ordering, and the team-division tracks. Nothing in the original architecture (§3–4, the thunk pattern itself) needed to change — the new code is more volume through the same shape, not a different shape.

## 1. Goals / non-goals

**Goals**
- Replace `AuthContext` and `NotificationsContext` with RTK slices.
- Replace the per-page `useState` + `apiFetch().then(setX)` pattern (29 files) with slices + `createAsyncThunk`.
- One consistent async pattern everywhere: thunk wraps `apiFetch`, slice tracks `status`/`error`/`data`.
- Zero behavior regression: localStorage persistence, cross-tab sync, 401/403 handling, role-based redirects all keep working exactly as today.

**Non-goals**
- Don't migrate `activeView` (per-dashboard sub-nav), modal-open flags, form-input state, or other single-component ephemeral UI state into Redux. That's not shared state; moving it would just add boilerplate. Redux owns *server data* and the two genuinely cross-cutting pieces of client state (auth, notifications).
- Not adopting RTK Query in this pass. The ask is explicitly the thunk pattern, and RTK Query would replace thunks rather than use them. Worth a footnote as a future option once slices stabilize, not part of this plan.

## 2. Current-state inventory (why this shapes the plan)

| Piece | Shape today | Consumers |
|---|---|---|
| `AuthContext` | `{ user, login, logout }`, backed by `localStorage.bp_user`/`bp_expires_at` | 23 call sites of `useAuth()` |
| `NotificationsContext` | `{ personal[], broadcasts[], toast }` + `send/broadcast/markRead/...`, backed by `localStorage.bp_notifications`/`bp_broadcasts`, 30-day expiry, cross-tab `storage` listener — **now also calls `useAuth()` internally** to stamp/filter broadcasts by the sender's/viewer's `college_id` (the cross-tenant notification-leak fix) | 34 call sites of `useNotifications()` |
| Per-page server state | `useState` + `useEffect(() => apiFetch(...).then(setX))`, no caching, no dedup, refetches every mount | 29 page files across ~20+ backend domains (auth, users, courses, assessments, marks, attendance, leave, outcomes, fees, events, discussions, resources, research, meetings, billing, reports, topics, submissions, **academic metrics, revenue, bulk user onboarding**) |
| Sub-navigation | `useState('dashboard')` per dashboard shell | Local only — **not in scope** |

The two Contexts are small in surface area but high in call-site count (57 combined). The server-data layer is the opposite: large in surface area (29 files) but each site is a near-identical shape, which is exactly what a thunk factory is for.

**New since the first draft** — three domains worth naming explicitly because of how they fetch, not just that they exist:
- **`revenue`** (`superadmin/Institutions.jsx`'s new `RevenueSection`) — `GET /billing/colleges/revenue`, a plain read, no filters. The simplest possible addition to the inventory.
- **`academicMetrics`** (`admin/UserManagement.jsx`'s new `AcademicMetrics`) — `GET /metrics/academic?course_id=&semester=`, refetched on every filter change. Same "key state by the request params, not a single slot" shape §7 already calls out for `ClassPerformance` — a second real example of the same principle, not a new one.
- **`bulkOnboard`** (`UserManagement.jsx`'s new `BulkOnboardModal`) — `POST /users/bulk-onboard`, body is `FormData` (a CSV file), not JSON. The first multipart upload in the app's thunk-shaped surface — see the new example at the end of §4.

## 3. Target architecture

```
src/
  store/
    index.js              # configureStore, root reducer
    hooks.js               # typed useAppDispatch/useAppSelector (or plain for JS)
  features/
    auth/
      authSlice.js          # state: { user, status, error }
      authThunks.js         # login, logout, restoreSession
    notifications/
      notificationsSlice.js
      notificationsThunks.js      # none needed server-side today — see §6
      notificationsMiddleware.js  # localStorage write-through + storage event bridge
    courses/
      coursesSlice.js
      coursesThunks.js
    assessments/
      assessmentsSlice.js
      assessmentsThunks.js
    marks/ ...
    attendance/ ...
    leave/ ...
    outcomes/ ...
    revenue/
      revenueSlice.js
      revenueThunks.js        # GET /billing/colleges/revenue — plain fetch, no params
    academicMetrics/
      academicMetricsSlice.js
      academicMetricsThunks.js  # GET /metrics/academic?course_id=&semester= — keyed state, see §7
    users/
      usersSlice.js
      usersThunks.js           # includes bulkOnboardUsers (FormData) — see §4
    ... one feature folder per backend domain from the inventory above
  api/
    client.js              # UNCHANGED — thunks call this, not fetch directly
```

RTK already bundles `redux-thunk` — no separate install. `configureStore`'s default middleware includes it, so "the thunk pattern" is the default, not an add-on.

## 4. The thunk pattern (the core convention every slice follows)

Every domain gets the same three-part shape. Example for `assessments`:

```js
// features/assessments/assessmentsThunks.js
import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiFetch } from '../../api/client';

export const fetchAssessments = createAsyncThunk(
  'assessments/fetch',
  async (facultyId) => apiFetch(`/assessments?faculty_id=${facultyId}`),
);

export const createAssessment = createAsyncThunk(
  'assessments/create',
  async (payload) => apiFetch('/assessments', { method: 'POST', body: JSON.stringify(payload) }),
);

export const correctMarks = createAsyncThunk(
  'marks/correct',
  async ({ entryId, marksObtained, feedbackText }) =>
    apiFetch(`/marks/${entryId}`, { method: 'PATCH', body: JSON.stringify({ marks_obtained: marksObtained, feedback_text: feedbackText }) }),
);
```

```js
// features/assessments/assessmentsSlice.js
import { createSlice } from '@reduxjs/toolkit';
import { fetchAssessments, createAssessment } from './assessmentsThunks';

const slice = createSlice({
  name: 'assessments',
  initialState: { items: [], status: 'idle', error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAssessments.pending, (s) => { s.status = 'loading'; })
      .addCase(fetchAssessments.fulfilled, (s, a) => { s.status = 'succeeded'; s.items = a.payload; })
      .addCase(fetchAssessments.rejected, (s, a) => { s.status = 'failed'; s.error = a.error.message; })
      .addCase(createAssessment.fulfilled, (s, a) => { s.items.push(a.payload.data ?? a.payload); });
  },
});
export default slice.reducer;
```

`apiFetch` already throws on non-2xx (and handles 401 forced-logout, 403-as-permission-error) — `createAsyncThunk` auto-catches that throw into the `rejected` case with `action.error.message` set from it. **Nothing about the error-handling contract changes**; the thunk is a thin adapter, not a rewrite.

### Cutting the boilerplate across ~20 domains

Since most domains are "fetch a list, maybe create/update/delete one item," a tiny thunk factory removes repetition without hiding the pattern:

```js
// store/createFetchThunk.js
import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiFetch } from '../api/client';

export const createFetchThunk = (typePrefix, endpointFn) =>
  createAsyncThunk(typePrefix, (arg) => apiFetch(typeof endpointFn === 'function' ? endpointFn(arg) : endpointFn));
```
```js
export const fetchHolidays = createFetchThunk('holidays/fetch', '/holidays');
export const fetchCourses = createFetchThunk('courses/fetch', (facultyId) => `/faculty/${facultyId}/courses`);
```
This is optional sugar — each slice can still hand-write `createAsyncThunk` where the endpoint has real logic (query params, POST bodies). Use the factory only for plain GETs.

### A fourth shape: multipart upload (new — `bulkOnboardUsers`)

Every example above sends JSON. The CSV bulk-onboarding feature is the first thunk-shaped endpoint whose body is `FormData`, not `JSON.stringify(...)`:

```js
// features/users/usersThunks.js
export const bulkOnboardUsers = createAsyncThunk(
  'users/bulkOnboard',
  async ({ file, role }) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiFetch(`/users/bulk-onboard?role=${role}`, { method: 'POST', body: formData });
  },
);
```

No change to `apiFetch` or to the thunk pattern itself — `client.js` already special-cases `body instanceof FormData` to skip setting `Content-Type` (so the browser can set the multipart boundary), and `createAsyncThunk` doesn't care what the body's shape is, only that the async function resolves or throws. The only thing worth calling out to the team: don't `JSON.stringify` the `FormData` by habit when copying an existing thunk as a template.

## 5. The two special cases

### AuthContext → authSlice
State: `{ user, status, error }`. `login`/`logout` become thunks; the `localStorage.bp_user`/`bp_expires_at` writes move into the thunk's `fulfilled` handler (or a tiny middleware) — same two keys, same shape, so an already-logged-in user's session survives the migration with zero special-casing.

### NotificationsContext → notificationsSlice + middleware
This is the one place a thunk alone isn't enough, because the current behavior has **three** things async thunks don't naturally give you (a third was added after the first draft — the cross-tenant notification-leak fix):
1. **Write-through to localStorage** on every `send`/`broadcast` (not a server call — purely local).
2. **Cross-tab sync** via the `storage` event, which must re-dispatch into the store when *another tab* writes.
3. **College-scoped visibility.** `broadcast()` now stamps the sender's own `college_id` (read from `AuthContext`, not passed in by any of the ~9 call sites), and every read (`getUnreadBC`/`markBCRead`/`clearAll`) filters by the *viewer's* own `college_id` — `null` (superadmin) means "every college," same convention `scope-to-college.ts` already uses on the backend. This is a genuine **cross-slice read**: the notifications logic needs the auth slice's `user.college_id`, not just its own state.

Plan: keep `send`/`broadcast`/`markRead` as plain `createSlice` reducers (they're synchronous, not server calls — no thunk needed here), and add one middleware. The middleware reads `collegeId` out of the **store's own auth slice** at write time — this is the Redux-native way to do what `NotificationsContext.jsx` does today by calling `useAuth()` directly inside the provider; a plain reducer can't call a hook, so the stamping has to happen one layer up, in the middleware or in the component dispatching `broadcast`:
```js
// features/notifications/notificationsMiddleware.js
export const notificationsPersistenceMiddleware = (store) => (next) => (action) => {
  const result = next(action);
  if (action.type.startsWith('notifications/')) {
    const { personal, broadcasts } = store.getState().notifications;
    localStorage.setItem('bp_notifications', JSON.stringify(personal));
    localStorage.setItem('bp_broadcasts', JSON.stringify(broadcasts));
  }
  return result;
};
```
```js
// features/notifications/notificationsSlice.js — the college-scoping itself
const visibleToViewer = (b, viewerCollegeId) =>
  viewerCollegeId === null || b.collegeId == null || b.collegeId === viewerCollegeId;
// broadcast reducer takes collegeId as part of its payload — the CALLER (a thunk
// or the component via useSelector(state => state.auth.user.collegeId)) supplies
// it, exactly as today's NotificationBell.jsx already passes user.role in.
// getUnreadBC/markBCRead/clearAll selectors take the same collegeId and apply
// visibleToViewer() — a direct line-for-line port of NotificationsContext.jsx's
// current logic, just with the auth read moved from a hook call to a selector arg.
```
Cross-tab sync becomes a single `window.addEventListener('storage', ...)` registered once in `store/index.js`, dispatching a `notifications/syncFromStorage` action when another tab writes — direct translation of the existing `useEffect` listener in `NotificationsContext.jsx`, just living in the store instead of a component.

**Why this raises Phase 2's risk slightly, not just its size:** the facade (§6, Phase 2) has to reproduce college-scoping exactly, including the `null`-means-everyone rule, or a regression here silently reopens the exact cross-tenant leak that was just fixed — manual QA for this phase should explicitly include the two-tab-two-colleges case, not just the two-tab-same-college case the original draft described.

## 6. Phased rollout (strangler pattern — Context and Redux coexist until each phase is done; never a big-bang rewrite)

**Phase 0 — Scaffolding (no behavior change)**
- `npm i @reduxjs/toolkit react-redux`
- `npm i -D vitest @testing-library/react @testing-library/jest-dom jsdom` — there is currently *zero* frontend test runner, and a migration touching 50+ files without any automated check is the real risk here, not Redux itself.
- Add `store/index.js`, wrap `<App>` with `<Provider store={store}>` **outside** the existing `<AuthProvider>`/`<NotificationsProvider>` — both systems live side by side.
- CI/build check only; nothing user-visible changes.

**Phase 1 — `authSlice`**
- Smallest, most foundational, blocks nothing else.
- Keep the `useAuth()` hook's name and return shape (`{ user, login, logout }`) but back it with `useSelector`/`useDispatch` internally — a facade. This means the 23 call sites **do not change**, only `AuthContext.jsx`'s internals do (it becomes a thin re-export, then gets deleted once nothing imports the Provider).
- Verify: login, logout, session-expiry redirect, role-based `ROLE_HOME` routing, page refresh retaining session.

**Phase 2 — `notificationsSlice`**
- Same facade trick: `useNotifications()` keeps its exact API (`send, broadcast, showToast, markRead, ...`), backed by Redux underneath. 34 call sites untouched.
- This is the highest-risk phase because of localStorage + cross-tab sync **and** college-scoped visibility (§5) — budget the most manual QA time here: two browser tabs, two *different* colleges' sessions, confirm a broadcast from one never reaches the other, then the same two-tab test again for the *same* college to confirm cross-tab sync still works. Both cases, not just one.

**Phase 3 — Domain-by-domain slices, ordered by risk (not by alphabet)**
Suggested order, low-risk/read-only first, highest-interaction last:
1. Read-only reference data: `holidays`, `courses`, `programOutcomes`, `learningOutcomes`
2. Reporting pages: `InstitutionalReports`, `AttendanceRegister`, `ClassPerformance`, **`revenue`, `academicMetrics`** (read-heavy, few mutations — the two new additions slot in here, not as a special case)
3. Student self-service: `Grades`, `Attendance`, `Outcomes` (read-heavy, request-attendance mutation)
4. Admin CRUD: `users`, `assessments` (edit/delete), `events`, `fees`
5. Highest-interaction, most recently-touched, most mutation-heavy: `AssessmentMapping`'s marks entry flow (create + correct in one submit), **`bulkOnboard`'s CSV upload + per-row results flow (new — the first multipart thunk, plus a per-row success/failure list to represent in state, not just a single `status`)**, `leave` approval, `resource-booking`

Each page's migration PR: replace its `useState`+`useEffect(apiFetch)` with `useSelector` + `dispatch(fetchX())` in `useEffect`, delete the local state. One page (or tightly-coupled group, e.g. a modal + its parent) per PR — keeps diffs reviewable and keeps a working app at every commit.

**Phase 4 — Cleanup**
- Delete `AuthContext.jsx`/`NotificationsContext.jsx` and their `<Provider>` wrappers once the facades have no remaining direct Context imports (grep `createContext` should return nothing in `src/context`).
- Delete the `src/context` folder.
- Remove now-dead local `useState` imports page-by-page (cheap lint pass: `eslint` with `no-unused-vars` will catch these).

**Phase 5 — Hardening**
- Add RTK Devtools check to CI smoke test (optional).
- Backfill tests for the two trickiest slices (`notifications` persistence/cross-tab, `auth` session-expiry) since those are the ones with real logic, not just fetch-wrapping.

## 7. Before/after example (one real page, `ClassPerformance.jsx`)

**Before** (current):
```js
const [performance, setPerformance] = useState(undefined);
useEffect(() => {
  if (!courseId) return;
  apiFetch(`/faculty/me/class-performance?course_id=${courseId}`).then(setPerformance);
}, [courseId]);
```

**After**:
```js
const dispatch = useDispatch();
const performance = useSelector((s) => s.classPerformance.byCourse[courseId]);
const status = useSelector((s) => s.classPerformance.status);
useEffect(() => {
  if (courseId) dispatch(fetchClassPerformance(courseId));
}, [courseId, dispatch]);
```
Note the state shape change: `byCourse[courseId]` rather than a single `performance` var — this is deliberate. A plain single slot gets stale/wrong data if the user switches courses quickly before the first fetch resolves; keying by `courseId` fixes a real class of bug the current `useState` version is exposed to today (switching the course dropdown fast enough can show the *previous* course's data labeled as the new one, since nothing cancels the first promise). Worth calling out to the team as a correctness improvement, not just a refactor.

## 8. Risk register

| Risk | Mitigation |
|---|---|
| No frontend test runner exists today | Phase 0 adds Vitest + RTL before any slice lands, not after |
| 57 combined `useAuth`/`useNotifications` call sites | Facade pattern — hook signatures unchanged, zero call-site edits in Phases 1–2 |
| Cross-tab notification sync is easy to silently break | Explicit two-tab manual test script before Phase 2 is called done |
| Stale-closure bugs from switching dropdowns fast (see §7) | Keying state by request param (`byCourse[id]`) fixes this as a side effect of the migration |
| 29 files touched over many PRs → merge conflicts | Migrate by domain folder, one PR per domain, land small and often rather than a long-lived branch |
| Bundle size | RTK + react-redux ≈ 12–15kB gzipped; current build is already flagged for chunk size (901kB as of the latest build) — add `manualChunks` splitting in the same pass if it tips noticeably |
| Notifications' new auth dependency gets dropped during migration (§5) | Phase 2 can't be "just" a localStorage+cross-tab port anymore — the college-scoping logic is part of the spec now, and the Phase 2 QA script must test cross-college isolation explicitly, not just cross-tab sync |
| Bulk-onboard's `FormData` thunk gets copy-pasted as JSON by habit | Call out the multipart example (§4) explicitly in Dev 5's onboarding to the pattern — it's the one thunk in the app that isn't `JSON.stringify` |

## 9. Rollback

Because Phases 1–2 are facades, rolling back = reverting the slice + restoring the Context file, zero call-site changes either direction. Phase 3 rollbacks are per-domain and independent — a bad `assessments` migration doesn't block or revert `courses`.

---

# Team Division (5 developers)

Divided by **file ownership first, domain second** — the real merge-conflict risk is two people editing the same JSX file, not two people touching "related" backend domains. Phase 0 (store scaffolding) is the one hard blocker; everything else fans out in parallel once it lands.

## Track assignments

### Dev 1 — Platform Lead (infra + integration)
**Owns:** `store/index.js`, `store/hooks.js`, `store/createFetchThunk.js`, Vitest/RTL setup, `authSlice` + facade `useAuth()`, final Phase 4 cleanup (deleting `src/context`), Phase 5 CI/devtools hardening.
**Why this person:** smallest, most foundational slice (auth), and the natural reviewer for everyone else's slice PRs since they wrote the pattern everyone else copies.
**Sequence:** Week 1, solo — blocks nothing for long since Phase 0 is small. Reviews every other dev's first PR for pattern consistency before they continue. Returns at the end to delete both Context files once a repo-wide grep for `createContext`/`<AuthProvider>`/`<NotificationsProvider>` comes back empty.

### Dev 2 — Notifications (highest-risk single piece)
**Owns:** `notificationsSlice`, `notificationsMiddleware` (localStorage write-through + cross-tab `storage` bridge), facade `useNotifications()`.
**Why solo-assigned:** this is the one slice with real logic (persistence + cross-tab sync), not just fetch-wrapping — bundling it with other work risks it getting rushed.
**Sequence:** Starts right after Phase 0 lands (not blocked by Dev 1's auth work). Needs a second person for the two-tab manual QA script before calling it done — pull in Dev 3 for a 30-minute cross-review once the PR is up.
**Second assignment once done:** rotates into student-facing read-only domains — `Grades`, `grade-trend`, `Attendance`, `Outcomes` (student pages) — good follow-up since it's lower-risk after the hard piece.

### Dev 3 — Reporting & reference data (lowest risk, good onboarding track)
**Owns:** `holidays`, `programOutcomes`, `learningOutcomes`, `courses` (read-only reference), `InstitutionalReports.jsx`, `AttendanceRegister.jsx` (admin), `ClassPerformance.jsx` (faculty).
**Why:** all read-heavy, few mutations, no shared-file conflicts with anyone else. If anyone on the team is newer to Redux, put them here.
**Sequence:** Starts right after Phase 0. No dependency on Dev 1 or Dev 2's work beyond the store existing.

### Dev 4 — Faculty workflows (most mutation-heavy single file)
**Owns:** `faculty/me/students`, `faculty/me/courses`, faculty timetable, `AssessmentMapping.jsx` (assessments CRUD **and** marks create/correct — these two domains live in one file, so one owner avoids a split-brain PR), `MarkAttendance.jsx`, faculty-side `LeavePanel.jsx`, `Dashboard.jsx`'s Intervention panel + `StudentOverview.jsx` (both read the same `faculty/me/students` slice — same owner on purpose).
**Why:** the highest-interaction page in the app (`AssessmentMapping`'s submit() splits into create/correct/skip) deserves one person who holds the whole flow in their head, not two people coordinating across a shared file.
**Sequence:** Starts after Phase 0. This track is the most likely to run long — give it the most calendar time, or pair Dev 1 in for review once `AssessmentMapping` is up since it's still the single riskiest file in the plan on business-logic complexity (`UserManagement.jsx`, Dev 5's track, is the other file that now deserves the same treatment — see below — but for new-pattern risk rather than branching logic).

### Dev 5 — Admin/billing CRUD (broadest surface area)
**Owns:** admin `users` **(now including `UserManagement.jsx`'s `AcademicMetrics` filter-driven view and `BulkOnboardModal`'s CSV/FormData flow — both new, both live in this one file, same owner on purpose)**, `events`, `resources`/`resource-booking`, `fees`, `discussions`, admin-side `leave` approval, `billing`/`onboarding`/`colleges` **(now including `Institutions.jsx`'s `revenue` section)**, `meetings`, `topics`/`topic-completions`, `submissions`.
**Why:** largest number of domains, and most are a shallow, near-identical CRUD shape — exactly where the `createFetchThunk` factory from Dev 1's Phase 0 pays off — but `UserManagement.jsx` itself is no longer "shallow": the metrics view is filter-keyed state (same shape as Dev 3's `ClassPerformance`, see §7) and the bulk-onboard flow is the app's one multipart thunk (§4) plus a per-row results list to model, not a single status flag. Budget this one file more like a mid-sized track of its own than a one-line CRUD page.
**Sequence:** Starts after Phase 0. Lowest coordination risk — none of these files overlap with another dev's track. Worth a second reviewer on `UserManagement.jsx` specifically (pull in Dev 1, same reasoning as `AssessmentMapping.jsx`'s review pairing) given it now holds the bulk-onboard flow.

## Coordination points (the only places tracks actually touch)

| Point | Who | What |
|---|---|---|
| Phase 0 merge | Dev 1 → everyone | Hard blocker — nobody else's branch should fork before this lands |
| Pattern review | Dev 1 reviews first PR from each of Dev 2–5 | Catches slice-shape drift early, before 20 domains have diverged |
| Cross-tab + cross-college QA | Dev 2 + Dev 3 | Notifications test now needs two tabs AND two different colleges' logins, not just two tabs (§5/§6) |
| `AssessmentMapping.jsx` risk review | Dev 4 + Dev 1 | Riskiest single file, worth a second reviewer |
| `UserManagement.jsx` risk review | Dev 5 + Dev 1 | Newest complexity (filter-keyed metrics + the app's one multipart thunk) — same reasoning as `AssessmentMapping` |
| Context deletion | Dev 1, gated on everyone | Only happens once all 4 other tracks report zero remaining `useAuth`/`useNotifications`→Context imports |

## Rough timeline

- **Week 1:** Dev 1 only (Phase 0 + authSlice). Devs 2–5 can read the plan / set up local branches but shouldn't fork off `main` until Phase 0 merges.
- **Weeks 2–4:** All 5 tracks run in parallel. Dev 2 and Dev 3 (lighter tracks) likely finish first and can absorb overflow — Dev 5's track grew with the new metrics/bulk-onboard/revenue work, so it and Dev 4's track are now the two most likely to run long, not Dev 4 alone.
- **Week 5:** Integration — Dev 1 does the grep-for-zero-imports check, deletes `src/context`, runs full regression pass across all 5 tracks' pages, including the two-tab/two-college notifications check (§5/§6) specifically.

This keeps every dev on an independent set of files (no two people editing the same `.jsx`), puts the one genuinely hard piece (notifications — now with college-scoping baked into its spec, not just localStorage mechanics) on its own track instead of buried inside a bigger one, and lets the two riskiest pages (`AssessmentMapping.jsx` and, as of this revision, `UserManagement.jsx`) each get a dedicated owner plus a second reviewer rather than being split across people.
