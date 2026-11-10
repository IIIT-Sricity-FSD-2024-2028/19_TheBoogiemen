# My Contributions- MOHAMMED FAHAM S20240010146 — The Boogiemen Project

> **Contributor:** SPOC & Superadmin Front-End Modules  
> **Stack:** React (Vite), React Router v6, CSS custom properties  
> **Scope:** `front-end-react/src/`

---

## Overview

I was responsible for building the **SPOC (Single Point of Contact)** and **Superadmin** portals of the platform, as well as wiring both into the top-level application router. These portals form the subscription-management and platform-operations layer that sits above the institution's own Admin/Faculty/Student hierarchy.

---

## Files Authored / Owned

| File | Role |
|------|------|
| [`src/App.jsx`](front-end-react/src/App.jsx) | Top-level router — integrated SPOC & Superadmin routes |
| [`src/pages/spoc/SpocDashboard.jsx`](front-end-react/src/pages/spoc/SpocDashboard.jsx) | SPOC portal shell & navigation |
| [`src/pages/spoc/Subscription.jsx`](front-end-react/src/pages/spoc/Subscription.jsx) | Subscription status & plan details view |
| [`src/pages/spoc/Team.jsx`](front-end-react/src/pages/spoc/Team.jsx) | Admin roster & hire-admin flow |
| [`src/pages/spoc/Support.jsx`](front-end-react/src/pages/spoc/Support.jsx) | Real-time support chat with the platform team |
| [`src/pages/superadmin/SuperadminDashboard.jsx`](front-end-react/src/pages/superadmin/SuperadminDashboard.jsx) | Superadmin portal shell & navigation |
| [`src/pages/superadmin/Institutions.jsx`](front-end-react/src/pages/superadmin/Institutions.jsx) | Registered-institutions table + cross-college support inbox |

---

## Detailed Contributions

### 1. `App.jsx` — Route Integration

**What I did:**
- Added the `/spoc/*` protected route, guarded by `ProtectedRoute` with `roles={['spoc']}`, rendering `SpocDashboard`.
- Added the `/superadmin/*` protected route, guarded by `ProtectedRoute` with `roles={['superadmin']}`, rendering `SuperadminDashboard`.
- Imported and composed both dashboard components alongside the existing student, faculty, and admin routes inside `BrowserRouter` → `AuthProvider` → `NotificationsProvider`.

**Key design decision:**  
Both portals use nested `/*` routes so their sub-views are managed internally by each dashboard shell rather than polluting the top-level router — consistent with how the other roles are wired.

---

### 2. `SpocDashboard.jsx` — SPOC Portal Shell

**What I did:**
- Built the top-level layout for the SPOC actor by composing the shared `DashboardShell` component.
- Defined the SPOC-specific nav items: **Subscription**, **Team**, and **Support** — each with inline SVG icons.
- Used a `useState` hook for `activeView` to drive which panel renders inside the shell, keeping navigation stateless and declarative.
- Mapped `activeView` to rendered components (`Subscription`, `Team`, `Support`, `Settings`) and page titles.

**Key design decision:**  
No `data-module` attributes or `applyModuleGating()` calls on any SPOC nav links, matching the legacy `spoc.html` behavior. Module gating is for modules that other roles' nav items depend on; SPOC's own subscription/team/support links never trigger it.

```
SPOC Portal
├── Subscription  →  Subscription.jsx
├── Team          →  Team.jsx
├── Support       →  Support.jsx
└── Settings      →  Settings.jsx (shared)
```

---

### 3. `Subscription.jsx` — Plan & Billing View

**What I did:**
- Ported the legacy `spoc.html` subscription-view and `loadSubscriptionAndAdmins()` plan-rendering logic into a React component.
- Fetches `GET /billing/colleges/me` on mount to load the institution's plan data.
- Renders a **4-card metrics grid**:
  - **Plan Status** — colour-coded `StatusPill` (active / expiring soon / expired / no plan)
  - **Student Seats** — enrolled vs. purchased (e.g. `42 / 100`)
  - **Faculty Seats** — enrolled vs. purchased
  - **Renewal Date** — human-readable date; shown in red if expired
- Below the grid, an "About your plan" card lists included modules (Research, Fees, Discussion Forum, Analytics) and shows contextual renewal/expiry nudges.

**Notable implementation details:**
- `StatusPill` is a self-contained sub-component with inline styles driven by a `PILL_COLORS` lookup — no extra CSS file needed.
- `formatRupees(paise)` converts backend paise values to `₹` locale strings using `en-IN` formatting.
- Graceful empty states: renders `null` while loading, an error message on fetch failure, and a "No subscription on record" card when the plan is absent.

---

### 4. `Team.jsx` — Admin Roster & Hire Flow

**What I did:**
- Ported the admin-roster half of `loadSubscriptionAndAdmins()` and the `hireAdminModal` / `submitHireAdmin` flow from the legacy page.
- Fetches `GET /billing/colleges/me` on mount and reads `data.admins` to populate the roster list.
- Each admin row shows an avatar (initial letter), full name, and email.
- **"+ Hire Admin" button** opens a `HireAdminModal` that posts `POST /users` with `role: 'admin'`, first name, last name, email, and an initial password (min 8 chars).
- On success the modal closes and the roster reloads automatically via the `onHired` callback.

**Key design decision:**  
The `role` field is sent in the request body only for API contract completeness — the backend stamps `'admin'` and binds the correct `college_id` itself via `ROLE_GRANTS` in `common/dto/user.dto.ts`. No role selector is exposed in the UI, matching the legacy behaviour intentionally.

---

### 5. `Support.jsx` — Real-Time Support Chat

**What I did:**
- Ported `loadSupportThread()`, `submitSupportMessage()`, and `renderMessages()` from `spoc.html` into a React component.
- Fetches `GET /billing/support/thread` on mount and then **polls every 20 seconds** (via `setInterval`) to keep the thread near-live.
- The `setInterval` is cleared on component unmount — unlike the legacy page where the poll ran for the entire page lifetime, here it only runs while the Support view is visible.
- Chat bubbles are styled differently for SPOC messages (accent colour, right-aligned) vs. platform team replies (grey, left-aligned).
- A message form at the bottom posts `POST /billing/support/messages` with the message content.
- A **Refresh button** in the header allows manual reload in addition to the automatic poll.
- Error and empty states handled with appropriate UI feedback.

---

### 6. `SuperadminDashboard.jsx` — Superadmin Portal Shell

**What I did:**
- Built the top-level layout for the Superadmin actor using `DashboardShell`.
- Defined a single nav item: **Institutions** (with a building SVG icon).
- Mapped `activeView` to `Institutions` and `Settings` views with corresponding page titles.

**Key design decision:**  
Institutions is the only dedicated nav item because all admin/head-level operations already live in `AdminHeadDashboard`. Keeping the superadmin portal minimal reflects the original `super-admin.html` design intent.

```
Superadmin Portal
├── Institutions  →  Institutions.jsx
└── Settings      →  Settings.jsx (shared)
```

---

### 7. `Institutions.jsx` — Institutions Table & Support Inbox

**What I did:**
- Ported `renderInstitutions()`, `renderSupportInbox()`, `openSupportThread()`, and `submitSuperadminReply()` from `super-admin.html`.

**`InstitutionsTable` sub-component:**
- Fetches `GET /billing/colleges` and renders all registered colleges in a `<table>`.
- Columns: College name + city/state, SPOC email, Admin count, Student count, Faculty count.
- No "Add College" button — by design, a college is onboarded when it purchases a subscription, not via manual superadmin action.

**`SupportInbox` sub-component:**
- Fetches `GET /billing/support/threads` on mount — lists all SPOC support threads across every institution.
- Each row shows the college name, message preview (truncated at 90 chars), message count, and timestamp of the latest message.
- Clicking a row opens `ThreadModal`.

**`ThreadModal` sub-component:**
- Fetches `GET /billing/support/threads/:id` to load the full thread.
- Displays the conversation with bubble styling (superadmin replies in indigo, SPOC messages in grey).
- Superadmin can reply via `POST /billing/support/threads/:id/reply`.
- On a successful reply, the inbox reloads (via `onReplied` callback) so the latest activity timestamp stays current.

---

## Architecture & Patterns Used

| Pattern | Where Applied |
|---------|---------------|
| **`DashboardShell` composition** | `SpocDashboard`, `SuperadminDashboard` — both reuse the shared shell for sidebar, topbar, and layout |
| **`ProtectedRoute` with role guards** | `App.jsx` — `roles={['spoc']}` and `roles={['superadmin']}` |
| **`useNotifications` / `showToast`** | `Support`, `Team`, `Institutions` — uniform error/success feedback |
| **Controlled forms** | `HireAdminModal` (Team), `Support` message form, `ThreadModal` reply field |
| **Polling with cleanup** | `Support.jsx` — `setInterval` + `clearInterval` on unmount |
| **Graceful loading states** | All data-fetching views: `undefined` = loading (render nothing), `null`/`[]` = error or empty |
| **Inline SVG icons** | All nav items — no icon library dependency |

---

## API Endpoints Integrated

| Method | Endpoint | Used In |
|--------|----------|---------|
| `GET` | `/billing/colleges/me` | `Subscription.jsx`, `Team.jsx` |
| `GET` | `/billing/colleges` | `Institutions.jsx` (InstitutionsTable) |
| `POST` | `/users` | `Team.jsx` (HireAdminModal) |
| `GET` | `/billing/support/thread` | `Support.jsx` (SPOC view) |
| `POST` | `/billing/support/messages` | `Support.jsx` |
| `GET` | `/billing/support/threads` | `Institutions.jsx` (SupportInbox) |
| `GET` | `/billing/support/threads/:id` | `Institutions.jsx` (ThreadModal) |
| `POST` | `/billing/support/threads/:id/reply` | `Institutions.jsx` (ThreadModal) |
