# Faculty Actor — Study Guide 6: Line-by-Line — `FacultyDashboard.jsx`

**File:** `front-end-react/src/pages/faculty/FacultyDashboard.jsx` (178 lines)

**Convention for this and every following line-by-line file:** every line that carries meaning gets
its own entry. Lines that are pure syntax with no independent meaning of their own — a lone closing
brace, a blank spacer line, the closing tag of a multi-line JSX element already explained — are
folded into the entry for the line that opened the block, so the walkthrough reads as "here is what
this statement does" rather than "here is what the `}` character is." Every network call gets an
explicit **Hop** box citing [file 05](./faculty-05-request-pipeline-reference.md).

---

### Lines 1–7 — file header
```jsx
/**
 * FacultyDashboard — the top-level route for the faculty actor. Composes
 * DashboardShell with faculty nav items, same view-switching pattern as
 * StudentDashboard. "Request Resources" is a nav action (opens a modal),
 * not a view — matches legacy's own onclick="openResourceBookingModal();
 * return false;" link, which never had a view-section behind it.
 */
```
A JSDoc-style block comment, not parsed by anything — pure documentation for a future reader. States
three facts verified elsewhere in this guide: (1) this is the route-level component for `/faculty/*`
(file 00 §2); (2) it follows the same pattern as the student actor's equivalent file (outside this
guide's scope, but the same `DashboardShell`-composition shape `AdminHeadDashboard` and
`SuperadminDashboard` also use); (3) the "Request Resources" item is a nav *action*, not a nav
*view* — the distinction mechanized in `Sidebar.jsx` (file 01 §6) and exercised by line 128 below.

### Lines 9–21 — imports
```jsx
import { useState } from 'react';
import DashboardShell from '../../components/layout/DashboardShell';
import Settings from '../../components/shared/Settings';
import Timetable from '../../components/shared/Timetable';
import LeavePanel from '../../components/shared/LeavePanel';
import ResearchPanel from '../../components/shared/ResearchPanel';
import DiscussionForum from '../../components/shared/DiscussionForum';
import ResourceBookingModal from '../../components/shared/ResourceBookingModal';
import Dashboard from './Dashboard';
import AssessmentMapping from './AssessmentMapping';
import MarkAttendance from './MarkAttendance';
import StudentOverview from './StudentOverview';
import EventScheduler from './EventScheduler';
```
- **Line 9**: only one React hook is needed at this level — `useState`. No `useEffect` here; this
  component makes no network calls of its own (every view it renders does its own fetching once
  mounted).
- **Line 10**: the shared layout shell (file 01 §6) — the single thing every actor's top-level
  dashboard component composes.
- **Line 11**: `Settings` — shared verbatim across every actor (file 01 §16); faculty adds nothing
  to it.
- **Line 12**: `Timetable` — shared, parameterized by a `role` prop this file supplies at line 152
  (file 01 §12 — wait, actually documented in file 01 as the `Timetable` section).
- **Line 13**: `LeavePanel` — shared, also `role`-parameterized (file 01 §10).
- **Line 14**: `ResearchPanel` — shared, also `role`-parameterized (file 01 §12).
- **Line 15**: `DiscussionForum` — shared, **not** role-parameterized at all (file 01 §13) — notice
  it's rendered with no props at line 158 below.
- **Line 16**: `ResourceBookingModal` — shared (file 01 §14), mounted once at this component's own
  level (line 175), not inside the `VIEWS` map.
- **Lines 17–21**: the five faculty-*specific* page components (files 07–11 of this guide each
  walk one of these line by line). Note the relative import depth (`./Dashboard`, not
  `../../pages/faculty/Dashboard`) — these five files live in the same directory as this one.

### Lines 23–30 — a comment explaining two orphaned-then-recovered features
```jsx
// Two nav items below (Leave Management, Event Scheduler) don't exist in
// legacy faculty.html's sidebar at all — but both view-sections, both
// render functions (renderFacultyLeaveList, renderFacultyEventsTable), and
// Leave's full apply modal all exist and work; the page's own load script
// even calls both renderers on mount. They were just unreachable: no nav
// link ever called switchView() for either. Same situation as Phase 1's
// orphaned course-enroll modal — complete, working features missing only
// their entry point — so wired up here rather than left silently dropped.
```
Fully substantiated with exact legacy line numbers in [file 04 §5](./faculty-04-legacy-origin-mapping.md#5-two-nav-items-legacy-never-exposed-revisited)
— `leave` and `event-scheduler` nav items (defined at lines 58–65 and 95–104 below) are a
deliberate migration decision, not an oversight, to restore reachability to two fully-functional
legacy features.

### Lines 32–35 — component signature and state
```jsx
export default function FacultyDashboard() {
  const [activeView, setActiveView] = useState('dashboard');
  const [resourceModalOpen, setResourceModalOpen] = useState(false);

  const NAV_ITEMS = [
```
- **Line 32**: the default export — this is the component `App.jsx` (outside this guide's scope)
  mounts for the `/faculty/*` route, wrapped in `<ProtectedRoute roles={['faculty']}>` (file 00 §2).
- **Line 33**: `activeView` — the *entire* internal "router" for this dashboard. Its initial value,
  `'dashboard'`, is why a faculty user always lands on the Dashboard view first, regardless of which
  view they were on the last time they visited (there's no persistence of this state across a full
  page reload — it's plain component state, reset every mount).
- **Line 34**: `resourceModalOpen` — controls the one modal mounted outside the `VIEWS` map (line
  175), toggled only by the nav action at line 128.
- **Line 35**: the start of the `NAV_ITEMS` array literal — rebuilt fresh on *every* render of this
  component (it's a `const` inside the function body, not hoisted to module scope or memoized),
  which is harmless here since this component only re-renders on its own two state changes, and the
  array is small (10 entries, each a cheap object+JSX literal).

### Lines 36–46 — the `dashboard` nav item
```jsx
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
        </svg>
      ),
    },
```
A plain object: `id` (the key both `VIEWS`/`TITLES` below and `Sidebar.jsx`'s active-highlight logic
index by), `label` (display text), `icon` (a four-square grid SVG — a generic "dashboard" glyph, not
faculty-specific art). This exact shape — `{ id, label, icon }`, optionally `+ module` or
`+ onAction` — is the full contract `Sidebar.jsx` (file 01 §6) consumes for every array entry in
this file.

### Lines 47–56 — the `timetable` nav item
```jsx
    {
      id: 'timetable',
      label: 'My Timetable',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
    },
```
Same shape as above; the icon is a calendar-grid glyph. `id: 'timetable'` is the key that line 152's
`VIEWS.timetable` and line 139's `TITLES.timetable` both resolve against — all three locations
(`NAV_ITEMS`, `VIEWS`, `TITLES`) must agree on this string by hand; nothing in this file enforces
that agreement structurally (a typo in any one of the three would silently break navigation for
that view, with no compile-time error — plain object-key string matching).

### Lines 57–65 — the `leave` nav item
```jsx
    {
      id: 'leave',
      label: 'Leave Management',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
        </svg>
      ),
    },
```
The first of the two "recovered" legacy features (lines 23–30's comment). `id: 'leave'` — **note
this exact string**: it is the key `VIEWS.leave` (line 153) resolves, and it is also, not
coincidentally, the same literal string the previously-documented admin/head `'leave-management'`
bug *fails* to match against — this file gets the key right where that one (outside this guide's
scope) didn't.

### Lines 66–75 — the `assessment-mapping` nav item
```jsx
    {
      id: 'assessment-mapping',
      label: 'Assessment Mapping',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      ),
    },
```
A document-with-lines glyph (the same base path as `leave`'s icon, with two extra `<line>`s to
differentiate it — a document with ruled lines vs. a plain folder shape). Resolves `VIEWS['assessment-mapping']`
(line 154) → the full `AssessmentMapping.jsx` component, walked line by line in file 09.

### Lines 76–84 — the `mark-attendance` nav item
```jsx
    {
      id: 'mark-attendance',
      label: 'Mark Attendance',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      ),
    },
```
A checkmark-in-a-box glyph. Resolves `VIEWS['mark-attendance']` (line 155) → `MarkAttendance.jsx`
(file 08). **This exact string, `'mark-attendance'`, is the key `Dashboard.jsx`'s `ActionRequired`
component should be navigating to but doesn't** — it hardcodes `'attendance'` instead (documented
precisely in file 02 §2 and file 07's walkthrough of that same bug).

### Lines 85–94 — the `student-overview` nav item
```jsx
    {
      id: 'student-overview',
      label: 'Student Overview',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
```
A two-people glyph (one filled circle + path for the primary figure, two more paths for a second,
smaller figure behind it — the standard "multiple users" icon shape). Resolves
`VIEWS['student-overview']` (line 156) → `StudentOverview.jsx` (file 10). This same `id` string is
also what `Dashboard.jsx`'s `Metrics` component correctly navigates to when its "Total Students"
card is clicked (file 07) — unlike the `mark-attendance` case above, this one is wired correctly end
to end.

### Lines 95–104 — the `event-scheduler` nav item
```jsx
    {
      id: 'event-scheduler',
      label: 'Event Scheduler',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
    },
```
The second "recovered" legacy feature. Note its icon is **identical markup** to `timetable`'s icon
(lines 51–54) — both use the same calendar-grid glyph, a deliberate (or at least harmless) reuse
rather than a distinct icon per view; nothing distinguishes these two nav items visually by icon
alone, only by label text. Resolves `VIEWS['event-scheduler']` (line 157) → `EventScheduler.jsx`
(file 11, the simplest of the six faculty pages).

### Lines 105–114 — the `discussion` nav item (the first module-gated item)
```jsx
    {
      id: 'discussion',
      label: 'Discussion Forum',
      module: 'forum',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
    },
```
**Line 108, `module: 'forum'`**, is the one new key this entry has that every previous one lacked.
This is read by `Sidebar.jsx`'s `visibleItems` filter (file 01 §6): `!item.module ||
!licensedModules || licensedModules.includes(item.module)` — if the signed-in college's licensed
module list doesn't include `'forum'`, this entire nav item is omitted from the rendered sidebar
(file 00 §7). The icon is a single speech-bubble path. Resolves `VIEWS.discussion` (line 158) →
`DiscussionForum.jsx` (file 01 §13 — a shared component, not walked line-by-line in this guide
since files 01–04 already cover it at component-and-hook granularity and it belongs to no single
actor).

### Lines 115–124 — the `research` nav item (second module-gated item)
```jsx
    {
      id: 'research',
      label: 'Research Projects',
      module: 'research',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      ),
    },
```
Same pattern as `discussion`, gated on `module: 'research'` instead. Icon is a single zig-zag
polyline (an EKG/pulse-line glyph, a common visual stand-in for "research/analysis"). Resolves
`VIEWS.research` (line 159) → `<ResearchPanel role="faculty" />` — note this is the only `VIEWS`
entry among the module-gated pair that passes a prop; `DiscussionForum` (line 158) takes none.

### Lines 125–134 — the `request-resources` nav **action** (not a view)
```jsx
    {
      id: 'request-resources',
      label: 'Request Resources',
      onAction: () => setResourceModalOpen(true),
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4"/>
        </svg>
      ),
    },
```
**Line 128, `onAction: () => setResourceModalOpen(true)`**, is the mechanism the header comment
(lines 23–30... actually lines 1–7) and file 00 §5 both describe. `Sidebar.jsx`'s click handler
(file 01 §6) is `() => (item.onAction ? item.onAction() : onSelect(item.id))` — because this entry
has an `onAction`, clicking it **never** calls `setActiveView('request-resources')`; there is
deliberately no `VIEWS['request-resources']` or `TITLES['request-resources']` key anywhere below,
because this id is never used to look anything up in either map — it only exists to give the nav
item a React `key` and to be a readable name in this source file. The icon is a tray-with-a-plus
glyph (a box shape plus a `+`-like cross below it).

### Line 135 — close of the array
```jsx
  ];
```
Closes `NAV_ITEMS`. Ten entries total: 7 plain view items, 2 module-gated view items, 1 action item.

### Lines 137–148 — the `TITLES` lookup
```jsx
  const TITLES = {
    dashboard: 'Faculty Dashboard',
    timetable: 'My Timetable',
    leave: 'Leave Management',
    'assessment-mapping': 'Assessment Mapping',
    'mark-attendance': 'Mark Attendance',
    'student-overview': 'Student Overview',
    'event-scheduler': 'Event Scheduler',
    discussion: 'Discussion Forum',
    research: 'Research Projects',
    settings: 'Settings',
  };
```
A flat `{ viewId: displayTitle }` map. Fed to `Topbar`'s `title` prop at line 172 via
`TITLES[activeView]`. **Note there are only 10 keys here, but `NAV_ITEMS` has 10 entries too — one
of which (`request-resources`) is an action with no corresponding title, and one extra key
(`settings`) exists here with no corresponding `NAV_ITEMS` entry at all**, because Settings isn't
reached through the main nav array — it's `Sidebar.jsx`'s own hardcoded footer button (file 01 §6,
the `<button>` just above Logout), which calls `onSelect('settings')` directly, bypassing
`NAV_ITEMS` entirely. This is why `TITLES.settings` exists here despite no `{id: 'settings', ...}`
object appearing anywhere in the array above it — the mapping has to cover every string `onSelect`
can ever be called with, not just the ones listed in `NAV_ITEMS`.

### Lines 150–161 — the `VIEWS` routing table
```jsx
  const VIEWS = {
    dashboard: <Dashboard onNavigate={setActiveView} />,
    timetable: <Timetable role="faculty" />,
    leave: <LeavePanel role="faculty" />,
    'assessment-mapping': <AssessmentMapping />,
    'mark-attendance': <MarkAttendance />,
    'student-overview': <StudentOverview />,
    'event-scheduler': <EventScheduler />,
    discussion: <DiscussionForum />,
    research: <ResearchPanel role="faculty" />,
    settings: <Settings />,
  };
```
The actual "router." Ten keys, matching `TITLES` exactly (both omit `request-resources`, both
include `settings`). **Every value here is a JSX element descriptor, constructed unconditionally on
every render of `FacultyDashboard`** — React element descriptors are cheap, plain objects
(`{ type, props, ... }`); none of these ten components actually mount/run their own hooks or fetch
logic until the one React picks to actually render is reconciled into the tree, which happens only
for `VIEWS[activeView]`'s single value at line 174. Three of the ten pass a prop (`onNavigate` to
`Dashboard`, `role="faculty"` to `Timetable`/`LeavePanel`/`ResearchPanel` — four occurrences across
three distinct components); the other six/seven take none.

### Line 163 — return statement opens
```jsx
  return (
```
Begins the JSX this component renders — a single `<DashboardShell>` with everything else nested
inside it.

### Lines 164–173 — the `DashboardShell` element and its props
```jsx
    <DashboardShell
      brandSubtitle="Academic Performance & Outcome Tracking"
      avatarLetter="M"
      avatarClassName="avatar-m"
      roleLabel="Faculty"
      navItems={NAV_ITEMS}
      activeView={activeView}
      onSelect={setActiveView}
      title={TITLES[activeView]}
    >
```
Every prop here is documented in file 01 §6's `DashboardShell` walkthrough — specific values for
*this* actor:
- `brandSubtitle="Academic Performance & Outcome Tracking"` — identical text to every other actor's
  shell (it's the platform's tagline, not faculty-specific copy).
- `avatarLetter="M"` — a **hardcoded** single-letter avatar fallback (`M`, presumably standing in for
  a demo faculty member's name, e.g. "Mallikarjun" matching the legacy `faculty.html`'s hardcoded
  "Dr. Mallikarjun Reddy" sidebar text) — not derived from the signed-in user's actual name at all.
  `Sidebar.jsx` (file 01 §6) separately computes the *displayed name* from `useAuth()`'s real user
  object, but the single-letter avatar glyph itself is this static prop, regardless of who's
  actually signed in.
- `avatarClassName="avatar-m"` — a CSS class selecting this avatar's background color from
  `style.css` (not inspected in this guide) — each actor gets a distinct color (`avatar-s` for
  student, `avatar-sa` for superadmin, seen in earlier reads of those dashboards, `avatar-m` here).
- `roleLabel="Faculty"` — the text under the avatar in the sidebar's user card.
- `navItems={NAV_ITEMS}` — the array built above.
- `activeView={activeView}` / `onSelect={setActiveView}` — the two-way binding that makes
  `Sidebar`'s click handlers actually change this component's own state.
- `title={TITLES[activeView]}` — looked up fresh on every render; if `activeView` were ever set to
  a string with no `TITLES` entry (as happens with the `Dashboard.jsx`'s `'attendance'` bug, file 02
  §2), this expression evaluates to `undefined`, and `Topbar`'s `<h1>{title}</h1>` would render an
  empty heading rather than throwing — React silently renders `undefined` as nothing.

### Line 174 — the active view
```jsx
      {VIEWS[activeView]}
```
The payoff of everything above: whichever element `VIEWS[activeView]` currently resolves to becomes
`DashboardShell`'s `children`, rendered inside its `<div className="content-body">` (file 01 §6).
If `activeView` doesn't match any `VIEWS` key, this evaluates to `undefined`, and React renders
nothing in that slot — the content area goes blank, with no error, no fallback message. This is the
exact failure mode the `'attendance'`-vs-`'mark-attendance'` mismatch (file 02 §2) triggers in
practice.

### Line 175 — the resource modal, mounted as a sibling
```jsx
      <ResourceBookingModal open={resourceModalOpen} onClose={() => setResourceModalOpen(false)} />
```
Mounted **unconditionally** alongside the active view (not swapped in/out by `VIEWS`) — per
`Modal.jsx`'s own early-return (file 01 §8), it renders `null` whenever `open` is false, so having
it always present in the tree costs nothing visually while `resourceModalOpen` is false. This is
the component the `request-resources` nav action (line 128) actually opens.

### Lines 176–178 — closing tags
```jsx
    </DashboardShell>
  );
}
```
Closes the JSX and the function. Nothing further to annotate.

---

**Backend hops from this file:** none directly — `FacultyDashboard.jsx` itself makes zero network
calls. Every hop happens inside the components it mounts (`Dashboard`, `MarkAttendance`,
`AssessmentMapping`, `StudentOverview`, `EventScheduler`, plus the shared `Timetable`/`LeavePanel`/
`ResearchPanel`/`DiscussionForum`/`ResourceBookingModal`/`Settings` and `DashboardShell`'s own
module-licensing fetch) — covered in the files that walk each of those line by line.

Continue to **[07-line-by-line-dashboard.md](./faculty-07-line-by-line-dashboard.md)**.
