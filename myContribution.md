# My Contributions- NADIPALLI OMKAR S20240010155 — The Boogiemen Project

> **GitHub:** [@Omkar-n-18](https://github.com/Omkar-n-18) · git author `Omkar` / `omkar069` (omkar.n24@iiits.in)  
> **Contributor:** Admin / Academic Head Front-End Module (legacy → React migration)  
> **Stack:** React (Vite), React Router v6, CSS custom properties  
> **Scope:** `front-end-react/src/` (plus one supporting back-end fix)  
> **Branch:** `feat/migrated-admin-actor-to-react` → merged into `main` via PR #79

---

## Git Trace

| Item | Reference |
|------|-----------|
| Feature branch | `feat/migrated-admin-actor-to-react` |
| Pull request | [#79: feat: Migrated Admin actor to React](https://github.com/IIIT-Sricity-FSD-2024-2028/19_TheBoogiemen/pull/79) |
| Commit | `1493777` (`feat/admin-migrations`): 13 files, +2417 / −18 lines |
| Merge commit | `ee9eeea` (merged into `main`) |

Earlier admin-portal work (legacy HTML version) in my name: `7f5fe6e` (strong password validation on Add User forms in admin dashboards) and `e4f193d` (login validation, head vs superadmin differentiation).

---

## Overview

I was responsible for migrating the **Admin (and Academic Head)** actor from the legacy `super-user.html` + `fixes.js` pages into the React front end. The admin portal is the institution's operations layer: it manages users, courses and sections, fees, resources, events, leave and attendance approvals, and institutional reports for everyone below it in the Admin → Faculty → Student hierarchy.

Since the legacy `super-user.html` served both the `admin` and `head` roles with no role-specific branching in its own JS, the React port uses one dashboard for both roles. Tenant isolation is still enforced server-side.

---

## Files Authored / Owned

| File | Role |
|------|------|
| [`src/App.jsx`](front-end-react/src/App.jsx) | Top-level router: integrated the `/admin/*` route |
| [`src/pages/admin/AdminHeadDashboard.jsx`](front-end-react/src/pages/admin/AdminHeadDashboard.jsx) | Admin/Head portal shell & navigation |
| [`src/pages/admin/Dashboard.jsx`](front-end-react/src/pages/admin/Dashboard.jsx) | Metrics, system overview & "Action Required" widget |
| [`src/pages/admin/InstitutionalReports.jsx`](front-end-react/src/pages/admin/InstitutionalReports.jsx) | At-risk students list + NBA/NAAC & cohort CSV exports |
| [`src/pages/admin/EventScheduler.jsx`](front-end-react/src/pages/admin/EventScheduler.jsx) | Full CRUD event scheduling with broadcast notifications |
| [`src/pages/admin/CourseManagement.jsx`](front-end-react/src/pages/admin/CourseManagement.jsx) | Courses, sections ↔ faculty mapping, student enrollment |
| [`src/pages/admin/ResourceManagement.jsx`](front-end-react/src/pages/admin/ResourceManagement.jsx) | Resource inventory + booking-request approvals |
| [`src/pages/admin/FeeCompliance.jsx`](front-end-react/src/pages/admin/FeeCompliance.jsx) | Per-student fees, bulk semester fees, payment marking |
| [`src/pages/admin/UserManagement.jsx`](front-end-react/src/pages/admin/UserManagement.jsx) | Institutional user CRUD (students & faculty) |
| [`src/pages/admin/AttendanceOverride.jsx`](front-end-react/src/pages/admin/AttendanceOverride.jsx) | Medical overrides + attendance-request approvals |
| [`src/components/shared/LeavePanel.jsx`](front-end-react/src/components/shared/LeavePanel.jsx) | Added the admin/head leave-approval branch to the shared panel |
| [`back-end/src/admin/common.controller.ts`](back-end/src/admin/common.controller.ts) | Fixed `faculty_name` on course sections |

---

## Detailed Contributions

### 1. `App.jsx` — Route Integration

**What I did:**
- Added the `/admin/*` protected route, guarded by `ProtectedRoute` with `roles={['admin', 'head']}`, rendering `AdminHeadDashboard`.
- Placed it alongside the existing student and faculty routes inside `BrowserRouter` → `AuthProvider` → `NotificationsProvider`.

**Key design decision:**  
One route serves both `admin` and `head`, because the legacy `super-user.html` served both roles identically. The nested `/*` route lets the dashboard shell manage its own sub-views, consistent with the other actors.

---

### 2. `AdminHeadDashboard.jsx` — Admin Portal Shell

**What I did:**
- Built the top-level layout for the Admin/Head actor by composing the shared `DashboardShell` component.
- Defined 9 nav items, each with an inline SVG icon: **Dashboard**, **Institutional Reports**, **Event Scheduler**, **Course Management**, **Resources**, **Fee Compliance**, **User Management**, **Overrides**, and **Leave Requests**.
- Used a `useState` hook for `activeView`, mapped to a `VIEWS` object of rendered components and a `TITLES` lookup for page headings.
- Passed `setActiveView` down to `Dashboard` as `onNavigate`, so metric cards and action items can jump straight to the relevant view.

**Key design decision:**  
The sidebar label/avatar stays "Academic Head"/"H" for both roles, exactly as the legacy page hardcoded it, so the migration is behaviour-preserving.

```
Admin / Head Portal
├── Dashboard              →  Dashboard.jsx
├── Institutional Reports  →  InstitutionalReports.jsx
├── Event Scheduler        →  EventScheduler.jsx
├── Course Management      →  CourseManagement.jsx
├── Resources              →  ResourceManagement.jsx
├── Fee Compliance         →  FeeCompliance.jsx
├── User Management        →  UserManagement.jsx
├── Overrides              →  AttendanceOverride.jsx
├── Leave Requests         →  LeavePanel.jsx (shared, admin branch)
└── Settings               →  Settings.jsx (shared)
```

---

### 3. `Dashboard.jsx` — Overview & Action Required

**What I did:**
- Ported legacy `renderReports()` and the action-required widget injection from `fixes.js`.
- **Metrics grid** (from `GET /reports/overview`): Students, Faculty, Active Courses, Avg Attainment. Each card is clickable and navigates to User Management or Institutional Reports.
- **System Overview** card: total students/faculty/courses, active research, overall attendance and fee compliance.
- **Action Required** widget: fetches `/leave`, `/attendance-requests` and `/resource-bookings` in parallel with `Promise.all` and counts pending items. Each pending item links to the view where it can be handled. Shows "✓ Nothing requires your attention" when everything is clear.

**Notable implementation details:**
- Each of the three fetches has its own `.catch(() => [])`, so one failing endpoint doesn't hide the other two counts.

---

### 4. `InstitutionalReports.jsx` — Reports & Exports

**What I did:**
- Ported `renderInstitutionalReports()`.
- Fetches `GET /reports/at-risk` and lists at-risk students with CGPA and attendance %, styled as red alert rows.
- **Export NBA/NAAC Report (CSV)**: builds a CSV of at-risk students.
- **Export Cohort Analysis (CSV)**: fetches `/reports/overview` and exports institution-wide metrics with a generation timestamp.

**Key design decision:**  
CSVs are generated client-side with a `Blob` + temporary `<a download>`, matching the legacy behaviour. The backend has no export endpoint.

---

### 5. `EventScheduler.jsx` — Event CRUD

**What I did:**
- Ported `renderEventsTable()`, `submitScheduleEvent()`, `openEditEvent()`/`submitEditEvent()` and `deleteEvent()`.
- **Schedule Event modal**: name, date, hour/minute/AM-PM pickers, venue and description → `POST /events`.
- **Edit Event modal** → `PUT /events/:id`. **Delete** → `DELETE /events/:id` with confirmation.
- Events are split into **upcoming** (sorted ascending) and **past** (sorted descending).
- On creation, `broadcastAll` notifies every user of the new event.

**Validation:** name ≥ 3 characters, date required and never in the past (for both create and edit), venue required.

**Key design decision:**  
This is a separate component from faculty's read-only Event Scheduler, because the two genuinely differ in the legacy app, not just by permission.

---

### 6. `CourseManagement.jsx` — Courses, Sections & Enrollment

**What I did:**
- Ported `renderCourseManagement()`, the create-course, manage-sections and enroll-student modals and their helpers.
- **`SectionRows`**: a reusable repeatable-row editor (section name + faculty dropdown, add/remove rows), shared by both the Create Course and Manage Sections modals.
- **`CreateCourseModal`**: course name, code and sections → `POST /courses`.
- **`ManageSectionsModal`**: re-assigns sections and faculty → `PUT /courses/:id/sections`.
- **`EnrollStudentModal`**: select student → course → section (section options populate from the chosen course) → `POST /enrollment`, then notifies the student.
- The faculty and student dropdowns are populated from `GET /admin/users`.

---

### 7. `ResourceManagement.jsx` — Resources & Booking Approvals

**What I did:**
- Ported `renderResourceManagement()`, `toggleResource()`, `submitCreateResource()`, `renderAdminResourceBookings()` and `approveBooking()`.
- **Resource list** (`GET /resources`) with an **available / in use** status pill and a toggle (`PUT /resources/:id`) that broadcasts the change to all users.
- **`AddResourceModal`**: name, type (Lab / Hall / Room / Equipment), capacity, location → `POST /resources`.
- **`ResourceBookingRequests`**: approve/reject faculty bookings (`PATCH /resource-booking/:id`). Notifies the requester, and cross-notifies the other oversight role (admin ↔ head).

**Notable implementation details:**  
Approving a booking flips the resource to `in_use` on the server, so the booking component calls an `onResourcesChanged` callback to reload the resource list as well.

---

### 8. `FeeCompliance.jsx` — Fee Management

**What I did:**
- Ported `renderFeeCompliance()`, `payFee()` and the add-fee, bulk-semester-fee and edit-fee modals.
- Loads `GET /fees` and `GET /admin/users` together, groups fees **per student** (`StudentFeeGroup`) and shows overdue count and compliance-rate metrics.
- **`AddFeeModal`**: student, semester (1–8), fee type (Tuition, Exam, Hostel, Lab, Library, Bus, Other), amount and due date → `POST /fees`.
- **`BulkSemFeeModal`**: applies one fee to **every student** in the institution in a single action.
- **`EditFeeModal`** → `PUT /fees/:id`. **Mark as paid** → `PATCH /fees/:id/pay`.
- Every fee change sends the affected student a `fee`-type notification.

**Validation:** all fields required; amount must be ≥ 1.

---

### 9. `UserManagement.jsx` — Institutional Users

**What I did:**
- Ported `renderUsersTable()`, `submitAddUser()`, `openEditUser()`/`submitEditUser()` and `deleteUser()`.
- Users table (`GET /admin/users`) with username, email, role badge, and Edit/Delete actions.
- **`AddUserModal`** → `POST /users` (student or faculty). After creation, it looks up the new user's id and sends a welcome notification.
- **`EditUserModal`**: profile fields via `PUT /users/:id`, and role changes via a **separate** `PATCH /users/:id/role` call, made only when the role actually changed.
- **Delete** → `DELETE /users/:id` after confirmation.

**Key design decision:**  
Profile edits and role changes are separate requests. The server rejects a `role` key on the profile route, so a routine edit can never carry a privilege change, and the role endpoint applies its own ceiling.

---

### 10. `AttendanceOverride.jsx` — Overrides & Attendance Requests

**What I did:** Ported two separate legacy features that share one view:
- **`MedicalOverrides`**: pending *medical* leave requests filtered from `/leave`, approved via `PATCH /leave/:id`, with a notification to the student. The filter is case-insensitive because the student form posts `medical` while older records store `Medical`.
- **`AttendanceRequests`**: the attendance-request workflow (course, section, date, reason, attached document). Approve/reject via `PATCH /attendance-request/:id`. Supporting documents can be downloaded through `downloadDocument`.

**Notification flow on a decision:**
- Student is notified (approved / rejected).
- Only the **assigned faculty** of that student's section is notified, instead of a broadcast to all faculty.
- Head role is informed via `broadcast('head', …)`.

---

### 11. `LeavePanel.jsx` — Admin Leave-Approval Branch (shared component)

**What I did:**
- Extended the shared `LeavePanel` (already used by student & faculty) with an **admin/head approval view**, ported from `renderLeaveManagement()` + `updateLeave()`.
- Added `AdminLeaveManagement` and `AdminLeaveRow`: list all leaves, approve/reject pending ones, view attached documents, and notify the student of the decision.
- Turned the default export into a thin **role dispatcher**: `admin`/`head` → `AdminLeaveManagement`, `student`/`faculty` → `PersonalLeavePanel`.

**Key design decision:**  
The dispatcher has no hooks of its own, so the admin path doesn't trigger a wasted `/leave` fetch for a component it never renders. The admin view also has no metrics grid or apply button, because admins only approve or reject.

---

### 12. Back-end Fix — `common.controller.ts`

**What I did:**  
Fixed course-section creation producing the literal string `"undefined"` as `faculty_name`. The display name lives in the separate faculty-profile collection, not on the bare user record. The fix joins the faculty profile the same way other lookups in the file do, falling back to `username` if no profile row exists.

---

## React Concepts Demonstrated (with file references)

### Components, Props & Communication

- **Composition:** `AdminHeadDashboard` passes `navItems`, `activeView`, `onSelect`, `title` and `children` as props to the shared `DashboardShell` ([AdminHeadDashboard.jsx:124](front-end-react/src/pages/admin/AdminHeadDashboard.jsx)).
- **Parent → child (data props):** `Dashboard` renders small presentational components such as `<Stat label value color />` ([Dashboard.jsx:92](front-end-react/src/pages/admin/Dashboard.jsx)).
- **Child → parent (callback props):** the parent's state setter `setActiveView` is passed down as `onNavigate` ([AdminHeadDashboard.jsx:129](front-end-react/src/pages/admin/AdminHeadDashboard.jsx)), so clicking a metric card in the child `Metrics` component switches the parent's view ([Dashboard.jsx:37](front-end-react/src/pages/admin/Dashboard.jsx)).
- **Sibling communication through the parent:** in `ResourceManagement`, the booking list calls `onResourcesChanged`, which is the parent's `load` function. Approving a booking in one child therefore refreshes the resource list rendered by the parent ([ResourceManagement.jsx:111, 202](front-end-react/src/pages/admin/ResourceManagement.jsx)).
- **Modal pattern:** modals receive `open`, `onClose` and `onCreated`/`onSaved` props. The parent owns the open/close state and the reload logic ([UserManagement.jsx:213-214](front-end-react/src/pages/admin/UserManagement.jsx)).
- **Context API:** `useAuth()` (current user/role) and `useNotifications()` (`showToast`, `send`, `broadcast`) avoid prop-drilling across every page.
- **Conditional rendering / role dispatch:** `LeavePanel` renders `AdminLeaveManagement` or `PersonalLeavePanel` depending on the `role` prop ([LeavePanel.jsx:300](front-end-react/src/components/shared/LeavePanel.jsx)).
- **List rendering with keys:** e.g. `users.map((u) => <tr key={u.user_id}>…)` in `UserManagement`.

### State Management & Event Handling

- `useState` drives view switching (`activeView`), fetched data (`users`, `resources`, `fees`…), modal visibility (`addOpen`, `editTarget`) and submit status (`submitting`, which disables the button to prevent double submits).
- **Three-state data convention:** `undefined` = loading, `[]` = empty/error, array = data. This lets each view show the right UI.
- **Immutable state updates:** `SectionRows` adds/edits/removes rows using `map`, `filter` and spread, never mutating ([CourseManagement.jsx:18-20](front-end-react/src/pages/admin/CourseManagement.jsx)).
- **Event handlers:** `onClick` for approve/reject/delete/toggle actions, `onSubmit` for forms, and `window.confirm` before destructive deletes.

### Controlled Forms

- Every input's `value` is bound to state and updated through `onChange`, e.g. the Add User form ([UserManagement.jsx:66-78](front-end-react/src/pages/admin/UserManagement.jsx)) and the Add Resource form ([ResourceManagement.jsx:57-76](front-end-react/src/pages/admin/ResourceManagement.jsx)).
- `e.preventDefault()` in submit handlers ([UserManagement.jsx:31](front-end-react/src/pages/admin/UserManagement.jsx)), followed by client-side validation (email regex, password ≥ 8, event date not in the past, fee amount ≥ 1) with toast feedback.
- **Dependent dropdowns:** in Enroll Student, the section options depend on the selected course.
- Form state is reset whenever a modal opens.

### useEffect / Side Effects

- **Fetch on mount:** `useEffect(() => { load(); }, [])` in every list view (users, resources, events, fees, courses, leaves).
- **Effect reacting to props:** `useEffect(..., [open])` resets the Add form each time the modal opens ([UserManagement.jsx:22](front-end-react/src/pages/admin/UserManagement.jsx)). `useEffect(..., [user])` pre-fills the Edit form from the selected user ([UserManagement.jsx:102](front-end-react/src/pages/admin/UserManagement.jsx)).
- **Parallel fetching:** `Promise.all` over 3 endpoints in the Action Required widget ([Dashboard.jsx:104-105](front-end-react/src/pages/admin/Dashboard.jsx)).
- **Other side effects:** client-side CSV download (`Blob` + `URL.createObjectURL`) in `InstitutionalReports`, and notifications sent after each mutation.

---

## Architecture & Patterns Used

| Pattern | Where Applied |
|---------|---------------|
| **`DashboardShell` composition** | `AdminHeadDashboard`: reuses the shared sidebar, topbar and layout |
| **`ProtectedRoute` with role guards** | `App.jsx`: `roles={['admin', 'head']}` |
| **View-switching via `activeView` + `onNavigate`** | `AdminHeadDashboard` → `Dashboard` click-through cards |
| **`useNotifications` (`showToast`, `send`, `broadcast`, `broadcastAll`)** | All admin views: toasts for feedback, targeted/role/all-user notifications for every approval, fee, enrollment and event action |
| **Reusable modal components** | `Modal` used by all add/edit/enroll/fee/resource/event forms |
| **Controlled forms + client-side validation** | Every modal: required fields, email regex, min password length, no past dates, amount ≥ 1 |
| **Callback-driven reloads** | `onCreated` / `onSaved` / `onAdded` / `onResourcesChanged` refresh lists after mutations |
| **Parallel fetching** | `Dashboard` (`Promise.all` over 3 endpoints), `FeeCompliance` (fees + users) |
| **Graceful loading states** | `undefined` = loading (render nothing / "Loading…"), `[]` = empty or error |
| **Role-based dispatch in a shared component** | `LeavePanel`: admin/head vs student/faculty branches |
| **Client-side CSV export** | `InstitutionalReports`: `Blob` + `URL.createObjectURL` |
| **Inline SVG icons** | All nav items, with no icon library dependency |

---

## API Endpoints Integrated

| Method | Endpoint | Used In |
|--------|----------|---------|
| `GET` | `/reports/overview` | `Dashboard.jsx`, `InstitutionalReports.jsx` |
| `GET` | `/reports/at-risk` | `InstitutionalReports.jsx` |
| `GET` | `/admin/users` | `UserManagement`, `CourseManagement`, `FeeCompliance` |
| `POST` | `/users` | `UserManagement.jsx` (AddUserModal) |
| `PUT` | `/users/:id` | `UserManagement.jsx` (EditUserModal) |
| `PATCH` | `/users/:id/role` | `UserManagement.jsx` (EditUserModal) |
| `DELETE` | `/users/:id` | `UserManagement.jsx` |
| `GET` / `POST` | `/courses` | `CourseManagement.jsx` |
| `PUT` | `/courses/:id/sections` | `CourseManagement.jsx` (ManageSectionsModal) |
| `POST` | `/enrollment` | `CourseManagement.jsx` (EnrollStudentModal) |
| `GET` / `POST` | `/events` | `EventScheduler.jsx` |
| `PUT` / `DELETE` | `/events/:id` | `EventScheduler.jsx` |
| `GET` / `POST` | `/resources` | `ResourceManagement.jsx` |
| `PUT` | `/resources/:id` | `ResourceManagement.jsx` (status toggle) |
| `GET` | `/resource-bookings` | `ResourceManagement.jsx`, `Dashboard.jsx` |
| `PATCH` | `/resource-booking/:id` | `ResourceManagement.jsx` |
| `GET` / `POST` | `/fees` | `FeeCompliance.jsx` |
| `PUT` | `/fees/:id` | `FeeCompliance.jsx` (EditFeeModal) |
| `PATCH` | `/fees/:id/pay` | `FeeCompliance.jsx` |
| `GET` | `/leave` | `LeavePanel.jsx`, `AttendanceOverride.jsx`, `Dashboard.jsx` |
| `PATCH` | `/leave/:id` | `LeavePanel.jsx`, `AttendanceOverride.jsx` |
| `GET` | `/attendance-requests` | `AttendanceOverride.jsx`, `Dashboard.jsx` |
| `PATCH` | `/attendance-request/:id` | `AttendanceOverride.jsx` |
