# Faculty Actor — Study Guide 11: Line-by-Line — `EventScheduler.jsx`

**File:** `front-end-react/src/pages/faculty/EventScheduler.jsx` (57 lines) — the shortest and
simplest of the six faculty pages: one fetch, one table, no mutation, no modal. Backend hop cites
[file 05](./faculty-05-request-pipeline-reference.md).

---

### Lines 1–10 — file header
```jsx
/**
 * EventScheduler — ported from legacy fixes.js renderFacultyEventsTable().
 *
 * Read-only by design, matching the legacy app exactly: faculty.html's
 * "+ Add Event" button calls `openModal('facultyEventModal')`, but no
 * `facultyEventModal` markup exists anywhere in that file or fixes.js — a
 * dead button in the shipped app. Admin/head has its own, real, working
 * event-creation flow (a different modal, Phase 3). Not inventing a new
 * modal here to make this button do something it never did.
 */
```
The full forensic evidence for this claim — confirming `facultyEventModal` has zero matches
anywhere in the legacy source — is documented in [file 04 §4](./faculty-04-legacy-origin-mapping.md#4-the-dead--add-event-button--confirmed-absence-not-a-migration-gap).
This file is the one case in the whole faculty actor where the React port *removes* a control
(the "+ Add Event" button) rather than porting it, precisely because the thing it called never
existed.

### Lines 12–13 — imports
```jsx
import { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';
```
No `useAuth`, no `useNotifications`, no `Modal` — the minimal import set of any file in this guide,
directly reflecting that this component reads data and shows nothing but a table; it has no
identity-dependent logic, shows no toasts, and opens no modal.

### Lines 15–23 — signature, state, and the mount effect
```jsx
export default function EventScheduler() {
  const [events, setEvents] = useState(undefined);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiFetch('/events')
      .then(setEvents)
      .catch((e) => setError(e.message));
  }, []);
```
Two pieces of state: `events` (`undefined` = loading, array = loaded), `error` (`null` = no error,
string = the failure message). **This is the only faculty page in the entire guide that surfaces a
fetch failure directly in its own render** (line 36 below) rather than silently falling back to an
empty array/placeholder the way every other component in files 06–10 does on a `.catch()` — compare
`Dashboard.jsx`'s `Metrics`, which resets to `'—'` on failure with no visible distinction from "zero
classes," against this component, which would instead render a red "Failed: <message>" row.

**Hop — `GET /events`**: `@Roles('student', 'faculty', 'admin', 'head', 'superadmin')` (file 03
§2, `getEvents`). **Service**: `scopeToCollege(db.events, collegeId)` — every event in this
faculty's college, with no further filtering by role at all (the same list a student or an admin
viewing this route would see, modulo the admin/head UI choosing to render it differently
elsewhere). **Line 21**: `.then(setEvents)` — the resolved array passed directly to the state
setter, identical bare-function-reference style as `MarkAttendance.jsx`'s course-list fetch (file
08). **Line 22**: `.catch((e) => setError(e.message))` — here the catch handler actually inspects
the error object and extracts its `message`, rather than discarding it in favor of a generic
fallback — the one place in this file that treats a network failure as worth surfacing verbatim to
the user.

### Lines 25–56 — the render
```jsx
  return (
    <div className="stats-card">
      <div className="stats-card-header">
        <div><h3>Upcoming Events</h3></div>
      </div>
      <div className="stats-card-body">
        <table className="crud-table">
          <thead>
            <tr><th>Type</th><th>Event Details</th><th>Date</th><th>Venue</th></tr>
          </thead>
          <tbody>
            {error ? (
              <tr><td colSpan={4} style={{ color: '#ef4444' }}>Failed: {error}</td></tr>
            ) : events === undefined ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', color: '#64748b', padding: 20 }}>Loading...</td></tr>
            ) : events.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: 'center' }}>No events</td></tr>
            ) : (
              events.map((e) => (
                <tr key={e.event_id}>
                  <td><span style={{ padding: 4, background: '#e2e8f0', borderRadius: 4 }}>🗓️</span></td>
                  <td><div style={{ fontWeight: 600 }}>{e.event_name}</div></td>
                  <td>{e.date} at {e.venue}</td>
                  <td></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```
No "+ Add Event" button anywhere in this markup — the entire header (lines 27–29) is just the
title, with no `page-action-btn` sibling the way `AssessmentMapping.jsx`'s "+ Create Assessment"
button or `DiscussionForum.jsx`'s "+ New Thread" button both have. The table body is a **four-way**
conditional chain (one more branch than the typical loading/empty/populated three-way pattern seen
elsewhere in this guide): error (red text, line 36) → loading (line 38) → empty (line 40) →
populated (lines 42–51). Each row (lines 43–50) renders a static calendar emoji in a gray pill (not
derived from any `event` field — every row gets the identical 🗓️ glyph regardless of event type),
the event name in bold, a combined "date at venue" line, and a **fourth, entirely empty `<td></td>`**
(line 48) — present purely to keep the row's cell count matching the four-column `<thead>` above it,
with no content at all (the legacy table had a fourth column too, per `faculty.html`'s own markup,
though this port doesn't populate it with anything).

---

**Design note on what this file demonstrates:** of the six faculty pages, this is the clearest
single example of the migration's **parity-over-improvement default** (expanded fully in file 13)
— a dead button was *removed* rather than *fixed*, because fixing it would have meant inventing new
backend-reachable behavior faculty never actually had, not porting something that existed.

Continue to **[12-line-by-line-backend.md](./faculty-12-line-by-line-backend.md)** for the faculty
backend module, line by line.
