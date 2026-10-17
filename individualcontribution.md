# Individual Contribution Report

**Student Name:** Harshini Reddy  
**Roll Number:** S20240010085  
**GitHub Username:** [Harshinig-123](https://github.com/Harshinig-123)  
**Email:** harshinireddy.g24@iiits.in  
**Project:** BarelyPassing — Academic Progress & Outcome Tracking Platform  
**Branch:** `feature/student-migration`  

---

## 1. Overview of My Contributions

My primary responsibility in this project was two-fold:
1. **Student Actor React Migration:** Complete migration of the legacy student interface (`front-end/student.html` and `front-end/fixes.js`) into a modern, responsive React Single Page Application (`front-end-react/`).
2. **End-to-End Timetable Scheduling Engine:** Designing and building the full-stack class scheduling system, complete with conflict detection (room double-booking and section overlap checks), dynamic slot creation, and real-time React calendar grid updates.

---

## 2. Key Files & Components Built

| Component / File | Purpose & Key Features |
|---|---|
| `StudentDashboard.jsx` | Orchestrates the student portal; manages sidebar tab navigation (`activeView`) across 9 views. |
| `Dashboard.jsx` | Student overview: CGPA/predicted grade, upcoming meetings, pending submissions, and expandable syllabus tracker. |
| `Courses.jsx` | Displays enrolled courses with credits and includes the course enrollment modal. |
| `Attendance.jsx` | 4-metric summary (Present, Absent, Leave, %), per-course progress bars, and attendance request modal. |
| `Profile.jsx` | Clean academic identity card showing student roll number, branch, batch, section, and CGPA. |
| `Timetable.jsx` | Weekly schedule grid with color-coded classes (Lectures, Labs, Tutorials), schedule class modal, and conflict handling. |
| `LeavePanel.jsx` | Student leave application with date validation, status badges, and document attachments. |
| `DiscussionForum.jsx` | Campus discussion board: category tags, thread viewer, and reply submissions. |
| `ResearchPanel.jsx` | BTP research project tracker, milestone progress bar, and document submissions. |
| `Settings.jsx` | Password update form with regex security validation. |
| `Modal.jsx` | Shared reusable dialog modal with backdrop and close handlers. |
| `uploads.js` | Multipart form-data client helper with 5MB file-size validation. |
| `common.controller.ts` | Backend REST endpoints for `POST /api/timetable` (conflict checks), `DELETE /api/timetable/:id`, and enrollment-filtered `GET /api/student-timetable`. |

---

## 3. Core React Concepts Demonstrated (Grading Rubric Mapping)

### A. Component Hierarchy & Props Communication
* **Component Composition:** `StudentDashboard` wraps child pages inside the shared `DashboardShell`, passing down titles, navigation items, and active views.
* **Parent → Child (Data Props):** Parent components pass data objects down to modular cards (e.g., `<Stat label="PRESENT" value={presentCount} />`, `<CourseRow course={c} />`).
* **Child → Parent (Callback Props):** Modals inform parent pages to refresh data upon completion without reloading the browser (e.g., `<EnrollCourseModal onEnrolled={load} />`, `<ScheduleClassModal onCreated={load} />`).
* **Context API:** Eliminates prop drilling by consuming `useAuth()` (logged-in user information) and `useNotifications()` (`showToast` alerts).

### B. State Management & Event Handling
* **State Hooks (`useState`):**
  * View switching: `const [activeView, setActiveView] = useState('dashboard')`
  * Modal toggles: `const [isModalOpen, setIsModalOpen] = useState(false)`
  * Network locking: `const [submitting, setSubmitting] = useState(false)` to prevent duplicate button clicks.
* **Async 3-State Convention:**
  * `undefined`: Loading skeleton is displayed.
  * `[]`: Friendly empty-state message (e.g., "No classes scheduled").
  * `[ ... ]`: Renders populated cards and tables.
* **Controlled Events:** Handled form submissions with `e.preventDefault()` and drag-and-drop file uploads using `onDrop`.

### C. Controlled Forms & Client-Side Validation
All form fields are bound to React state:
* **Course Enrollment:** Automatically filters out courses the student is already enrolled in.
* **Leave Application:** Validates that end date is not before start date (`end >= start`) and prevents selecting past dates (`min={today}`).
* **Password Change:** Strictly enforces regex password security (8+ characters, uppercase, lowercase, number, and special character).
* **Class Scheduling Modal:** Validates day, time, room, and handles backend conflict errors in a clean warning banner.

### D. Side Effects (`useEffect`)
* **Fetching on Mount:** `useEffect(() => { load(); }, [])` fetches data once when the component mounts.
* **Modal Re-initialization:** `useEffect(() => { ... }, [open])` fetches fresh dropdown lists and resets validation states whenever a modal opens.
* **Parallel API Fetching:** Used `Promise.all([apiFetch('/assessments'), apiFetch('/submissions')])` to calculate pending tasks concurrently.
* **Cleanup Functions:** Integrated cancellation flags (`let cancelled = false; return () => { cancelled = true; };`) to prevent memory leaks and race conditions on unmounted components.

---

## 4. End-to-End Timetable Scheduling Engine

In addition to frontend migration, I built the full-stack timetable scheduling engine:
1. **Dynamic Scheduling (`POST /api/timetable`):** Allows scheduling class slots dynamically with room presets and class modalities.
2. **Automated Dual-Conflict Prevention:**
   * **Section Clash Check:** Rejects overlapping classes for the same section at the same day & time (`409 Conflict`).
   * **Room Double-Booking Check:** Prevents two classes from using the same classroom or lab simultaneously (`409 Conflict`).
3. **Personalized Student Schedule (`GET /api/student-timetable`):** Automatically maps the student's active enrollments to timetable slots, ensuring newly enrolled courses immediately show up on their schedule.
4. **Complete Seed Coverage:** Seeded 62 conflict-free slots in `mock-db.json` across all courses (`c1`–`c8`) and sections.

---

## 5. Live Demonstration Checklist (For Viva / Evaluation)

During the project evaluation, I can demonstrate:
1. **Student Dashboard & Syllabus Tracker:** Real-time metrics, upcoming meetings, and expandable course progress accordions.
2. **Course Enrollment:** Live course selection, exclusion of already enrolled courses, and instant schedule update.
3. **Personal Timetable & Conflict Engine:**
   * Viewing enrolled courses on the weekly matrix.
   * Clicking **"+ Schedule Class"** to schedule a new lecture or lab.
   * Demonstrating conflict detection when attempting to double-book a room or section.
   * Deleting a slot with immediate grid refresh.
4. **Attendance Tracker & Regularisation:** Heatmap, safety percentages ($\ge 75\%$), and attendance regularisation requests with file attachments.
5. **Leave Application:** Drag-and-drop file upload, date range validation, and status tracking.
6. **Online Submissions & Discussion Forum:** Submitting assignments with file attachments and interacting on discussion threads.

---

## 6. Git Commits & Traceability

* **Commit `dc4853b`:** `feat: migrate student actor pages, shared components, and routes to React`  
  *(17 files changed, 1,768 insertions)*
* **Commit `ceffaaa`:** `feat: implement end-to-end timetable scheduling engine, conflict prevention, and dynamic React UI`  
  *(5 files changed, 1,604 insertions)*
* **Branch:** `feature/student-migration`
