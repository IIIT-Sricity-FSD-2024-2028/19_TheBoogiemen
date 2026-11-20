# Faculty Actor — Study Guide 12: Line-by-Line — the Faculty Backend Module

**Files:** `back-end/src/faculty/faculty.module.ts` (9 lines), `faculty.controller.ts` (146 lines),
`faculty.service.ts` (375 lines). Every method here is reached by at least one frontend call
documented in files 06–11; this file is the other half of every "Hop" box in those five files,
walked through in full rather than summarized. Every request to every route below has already
passed through [file 05](./faculty-05-request-pipeline-reference.md)'s guard pipeline by the time
execution reaches the line numbers discussed here — this file picks up exactly where that one left
off, at the controller method itself.

---

## `faculty.module.ts` (9 lines)

```ts
import { Module } from '@nestjs/common';
import { FacultyController } from './faculty.controller';
import { FacultyService } from './faculty.service';

@Module({
  controllers: [FacultyController],
  providers: [FacultyService],
})
export class FacultyModule {}
```
- **Lines 1–3**: imports the NestJS `@Module` decorator and this module's own controller/service.
- **Lines 5–8**: registers `FacultyController` as this module's controller and `FacultyService` as
  its only provider. **No `imports: []` array at all** — this module doesn't explicitly import
  `DatabaseModule`, yet `FacultyService`'s constructor (below) injects `InMemoryDbService`
  successfully, because `DatabaseModule` is declared `@Global()` (file 03's opening note) — a
  globally-registered module's providers are available for injection everywhere without being
  listed in every consumer's own `imports` array.
- **Line 9**: the module class itself, empty body — all the wiring happens in the decorator above
  it; there's nothing left to put in the class body.
- This module is itself imported into `AppModule` (`app.module.ts` line 23, examined in file 05
  §§3–5) alongside every other feature module, which is what makes `/api/faculty/...` routes exist
  at all on the running server.

---

## `faculty.controller.ts` (146 lines)

### Lines 1–18 — imports
```ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { FacultyService } from './faculty.service';
import { Roles } from '../auth/roles.guard';
import {
  CurrentUserCollegeId,
  CurrentUserId,
  CurrentUserRole,
} from '../common/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { ErrorCode, errorBody } from '../common/errors/error-codes';
```
- **Lines 1–9**: NestJS HTTP decorators (`Controller`, `Get`, `Post`, `Body`, `Param`, `Query`) plus
  `BadRequestException` — the only exception type this controller throws directly (every other
  exception type in this guide's backend routes is thrown from inside a *service* method, not this
  file).
- **Line 10**: this module's own service.
- **Line 11**: `Roles` — imported from `roles.guard.ts`, exactly the `SetMetadata(ROLES_KEY,
  roles)` function examined in file 05 §4; every `@Roles(...)` annotation in this file compiles down
  to a call to this.
- **Lines 12–16**: the three param decorators examined in full in file 05 §3's walkthrough of
  `JwtAuthGuard` — each one throws its own `InternalServerErrorException` if called on a route with
  no authenticated `request.user`, which can't happen here since every method below carries
  `@Roles(...)`.
- **Line 17**: Swagger decorators — purely documentation metadata for the auto-generated API docs
  at `/api/docs`; they have zero runtime effect on request handling.
- **Line 18**: `ErrorCode`/`errorBody` — a shared helper for building a structured error payload
  (`{ code, message, details? }`), used by the one `BadRequestException` this controller throws
  itself (line 125 below).

### Lines 20–23 — class declaration
```ts
@ApiTags('Faculty')
@Controller('faculty')
export class FacultyController {
  constructor(private facultyService: FacultyService) {}
```
`@Controller('faculty')` — combined with the global `'api'` prefix set in `main.ts` (file 05 §1),
every method below is reachable at `/api/faculty/<method's own path>`. Constructor injection of
`FacultyService` — standard NestJS dependency injection, the service instance is a singleton shared
across every request (not re-instantiated per-request), meaning any instance state on the service
would be shared across concurrent requests — though as examined below, `FacultyService` holds no
instance state of its own beyond the injected `db` reference, so this isn't a concern in practice.

### Lines 25–34 — `GET /faculty/me/profile`
```ts
  @Get('me/profile')
  @Roles('faculty')
  @ApiOperation({ summary: 'Get current faculty profile' })
  @ApiResponse({
    status: 200,
    description: 'Faculty profile with department info',
  })
  async getProfile(@CurrentUserId() userId: string) {
    return this.facultyService.getProfile(userId);
  }
```
`@Roles('faculty')` — only a `faculty`-role JWT can pass `RolesGuard` here (file 05 §4); every
other role gets a 403 before this method body ever runs. `@CurrentUserId()` extracts
`request.user.sub` (the verified user id) — the method body does nothing but forward it to the
service and return whatever comes back; the `async`/`await` here is implicit (no `await` keyword
needed since the method directly returns the service call's own Promise, and NestJS awaits a
controller method's return value automatically when it's a Promise). **Not called by any of the
six faculty frontend files** — confirmed in file 03 §1's note that this route exists but the
current faculty UI never fetches a profile; `FacultyDashboard.jsx`'s avatar letter is a hardcoded
prop instead (file 06).

### Lines 36–45 — `GET /faculty/me/courses`
```ts
  @Get('me/courses')
  @Roles('faculty')
  @ApiOperation({ summary: 'Get courses taught by current faculty' })
  @ApiResponse({
    status: 200,
    description: 'List of courses assigned to this faculty',
  })
  async getMyCourses(@CurrentUserId() userId: string) {
    return this.facultyService.getMyCourses(userId);
  }
```
Same shape as `getProfile` — one injected id, forwarded straight to the service. **Called from**:
`MarkAttendance.jsx`'s `AttendanceForm` mount effect (file 08) and `Dashboard.jsx`'s legacy-era
load script (not the React port — the React port's `SyllabusManager` deliberately calls the
broader `GET /courses` instead, per its own inline comment examined in file 07).

### Lines 47–56 — `GET /faculty/me/timetable`
```ts
  @Get('me/timetable')
  @Roles('faculty')
  @ApiOperation({ summary: 'Get timetable grid for current faculty' })
  @ApiResponse({
    status: 200,
    description: 'Weekly timetable grid object keyed by day and time',
  })
  async getTimetable(@CurrentUserId() userId: string) {
    return this.facultyService.getFacultyTimetable(userId);
  }
```
**Called from**: `components/shared/Timetable.jsx` (`role="faculty"` branch — file 01 §12) and
`Dashboard.jsx`'s `Metrics` component (file 07) for its "classes this week" count — two entirely
different frontend components hitting the exact same backend route for two different presentation
purposes (one renders a full grid, the other just counts total slots).

### Lines 58–70 — `GET /faculty/me/students`
```ts
  @Get('me/students')
  @Roles('faculty')
  @ApiOperation({
    summary:
      'Get students enrolled in faculty courses with attendance and risk status',
  })
  @ApiResponse({
    status: 200,
    description: 'List of students with attendance % and risk flags',
  })
  async getMyStudents(@CurrentUserId() userId: string) {
    return this.facultyService.getMyStudents(userId);
  }
```
**Called from**: `AssessmentMapping.jsx`'s `MarksEntryModal` (file 09), `MeetingModal.jsx`'s
unselected-student dropdown (file 01 §11), `StudentOverview.jsx`'s `load()` and `AssignBTPModal`
(file 10) — the single most frequently-called faculty-module route in the entire actor, reached
from four distinct frontend call sites across three different files.

### Lines 72–85 — `GET /faculty/me/at-risk`
```ts
  @Get('me/at-risk')
  @Roles('faculty', 'head', 'admin', 'superadmin')
  @ApiOperation({ summary: 'Get students who are at-risk (low CGPA)' })
  @ApiResponse({
    status: 200,
    description: 'List of at-risk students with attendance data',
  })
  async getAtRisk(
    @CurrentUserId() userId: string,
    @CurrentUserRole() role: string,
    @CurrentUserCollegeId() collegeId: string | null,
  ) {
    return this.facultyService.getAtRiskStudents(collegeId, userId, role);
  }
```
**The only route in this controller allowing roles beyond `faculty` alone**, and the only one
injecting all three identity param decorators at once (`userId`, `role`, `collegeId`) — necessary
because the service method behind it (lines 326–374 below) behaves differently depending on which
of these four roles is calling. **Not called by any of the six faculty frontend files** — this is
the second instance (alongside `getProfile`) of a correctly-built, properly-scoped route the
current React UI simply doesn't exercise; `Dashboard.jsx`'s `Intervention` component instead
fetches the unscoped `/admin/users` and filters client-side (file 07), leaving this route's actual
section-scoping logic unused by faculty's own dashboard.

### Lines 87–92 — `GET /faculty/me/assessments`
```ts
  @Get('me/assessments')
  @Roles('faculty')
  @ApiOperation({ summary: 'Get assessments created by this faculty' })
  async getMyAssessments(@CurrentUserId() userId: string) {
    return this.facultyService.getAssessments(userId);
  }
```
**Not called by any of the six faculty frontend files** — `AssessmentMapping.jsx`'s page root calls
the shared `GET /assessments?faculty_id=...` in `common.controller.ts` instead (file 09). A third
instance of a faculty-module route that exists, works, but sits unused in favor of an equivalent
(or near-equivalent — this one has no college-scoping check visible in its one-line service body,
examined below) route elsewhere.

### Lines 94–111 — `GET /faculty/attendance/today/:courseId`
```ts
  @Get('attendance/today/:courseId')
  @Roles('faculty')
  @ApiOperation({
    summary: 'Get students for today attendance marking for a course',
  })
  async getTodayAttendance(
    @Param('courseId') courseId: string,
    @CurrentUserId() userId: string,
    @CurrentUserCollegeId() collegeId: string | null,
    @Query('section') section?: string,
  ) {
    return this.facultyService.getTodayAttendance(
      courseId,
      userId,
      collegeId,
      section,
    );
  }
```
`@Param('courseId')` — a **client-supplied, untrusted** route parameter, which is exactly why the
service method behind this (lines 139–208 below) performs an explicit college-ownership check on
it before doing anything else. `@Query('section')` is typed `?: string` (optional) — matches the
frontend's own conditional query-string construction (file 08's `AttendanceForm`: `const query =
section ? ... : ''`). **Called from**: `MarkAttendance.jsx`'s `AttendanceForm` roster-fetch effect
(file 08) — the only call site for this route.

### Lines 113–133 — `POST /faculty/attendance`
```ts
  @Post('attendance')
  @Roles('faculty')
  @ApiOperation({ summary: 'Submit bulk attendance for a course session' })
  @ApiResponse({ status: 201, description: 'Attendance recorded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  async recordAttendance(
    @Body() body: any,
    @CurrentUserId() userId: string,
    @CurrentUserCollegeId() collegeId: string | null,
  ) {
    if (!body.course_id || !body.date || !body.records) {
      throw new BadRequestException(
        errorBody(
          ErrorCode.BUSINESS_RULE_VIOLATION,
          'course_id, date, and records are required',
        ),
      );
    }
    return this.facultyService.recordAttendance(body, userId, collegeId);
  }
```
**The one place in this entire controller with its own inline validation**, rather than delegating
every check to the service. `@Body() body: any` — recall from file 05 §6 that the global
`ValidationPipe` has nothing to validate against here (no typed DTO class), so this hand-written
`if` statement **is** the entire body-shape validation for this route; a malformed body that's
missing any of these three keys never even reaches `recordAttendance` in the service. **Called
from**: `MarkAttendance.jsx`'s `AttendanceForm.submit()` (file 08) — the only call site.

### Lines 135–146 — `POST /faculty/marks`
```ts
  @Post('marks')
  @Roles('faculty')
  @ApiOperation({ summary: 'Record marks for a student assessment' })
  @ApiResponse({ status: 201, description: 'Marks recorded successfully' })
  @ApiBody({ schema: { type: 'object', additionalProperties: true } })
  async postMarks(
    @Body() body: any,
    @CurrentUserCollegeId() collegeId: string | null,
  ) {
    return this.facultyService.postMarks(body, collegeId);
  }
```
**No validation at all in this method** — not even the hand-written `if` check the previous method
has — and, as the service body below confirms, none in `postMarks` either. **Not called by any of
the six faculty frontend files** — `AssessmentMapping.jsx`'s `MarksEntryModal.submit()` calls the
shared, far more heavily validated `POST /marks` in `common.controller.ts` instead (file 09, file
03 §2). This is the weakest, least-guarded write endpoint in the entire faculty-reachable backend
surface, and it is simply never exercised by the shipped frontend.

---

## `faculty.service.ts` (375 lines)

### Lines 1–21 — imports and class declaration
```ts
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { InMemoryDbService } from '../database/in-memory-db.service';
import {
  ATTENDANCE_STATUS,
  isAtRisk,
  normalizeAttendanceStatus,
  riskReasons,
  summariseAttendance,
} from '../common/academic-rules';
import { ErrorCode, errorBody } from '../common/errors/error-codes';
import {
  isSameCollege,
  scopeToCollege,
  writeCollegeId,
} from '../common/tenancy/scope-to-college';
import { sectionsTaughtBy, sectionTaughtIn } from '../common/course-sections';

@Injectable()
export class FacultyService {
  constructor(private db: InMemoryDbService) {}
```
- **Line 1**: two exception types used throughout this file — `ForbiddenException` (403, for
  privilege-ceiling violations) and `NotFoundException` (404, for "doesn't exist or isn't yours").
- **Line 2**: `uuidv4` — used exactly once, at line 294, to mint a new attendance-log id.
- **Line 3**: the in-memory data store — every single data read/write in this file goes through
  this one injected instance.
- **Lines 4–10**: the shared academic-rules module (verified by full read, documented precisely in
  file 03 §4) — `ATTENDANCE_STATUS` (the `{ PRESENT, ABSENT, EXCUSED }` constants object),
  `isAtRisk`/`riskReasons` (the one shared at-risk predicate used everywhere, backed by
  `RISK_THRESHOLDS`: **CGPA < 6.0 or attendance < 75%**, either sufficient alone), `normalizeAttendanceStatus`
  (canonicalizes a raw status string — unrecognized values fall through to `ABSENT`, not an error),
  `summariseAttendance` (turns raw log rows into `{ present, absent, excused, total, attended,
  percentage }`, where `attended = present + excused` is the literal expression of the
  EXCUSED-counts-as-attended rule).
- **Lines 11**: the structured-error helper, used in every `throw` in this file.
- **Lines 12–16**: the multi-tenancy primitives (file 03 §4) — `isSameCollege` (guards a
  client-supplied id lookup), `scopeToCollege` (filters a whole collection to one college),
  `writeCollegeId` (stamps the correct college id on a new record).
- **Line 17**: the section-ownership helpers (file 03 §4, read in full) — `sectionsTaughtBy` is by
  far the most-used function imported here; `sectionTaughtIn` is imported but — checking every
  method below — **never actually called anywhere in this file**, an unused import left over from
  an earlier version of this logic.
- **Line 19**: `@Injectable()` — marks this class as a NestJS provider, eligible for dependency
  injection (this is what lets `faculty.module.ts`'s `providers: [FacultyService]` work, and what
  lets `FacultyController`'s constructor receive an instance of it).
- **Line 20**: constructor injecting `InMemoryDbService`, stored as `this.db` — the **only**
  instance field this class has; every method is otherwise stateless, reading/writing through this
  one reference each time.

### Lines 23–39 — `getProfile(userId)`
```ts
  async getProfile(userId: string) {
    const faculty = this.db.faculty.find((f) => f.user_id === userId);
    if (!faculty)
      return {
        user_id: userId,
        first_name: 'Faculty',
        last_name: '',
        designation: 'Professor',
      };
    const dept = this.db.departments.find(
      (d) => d.department_id === faculty.department_id,
    );
    return {
      ...faculty,
      department_name: dept?.department_name || 'Computer Science',
    };
  }
```
**Line 24**: a plain `Array.prototype.find` over the in-memory `faculty` table — this is the entire
"query" layer; there is no indexing, no SQL, this is a linear scan every single call (acceptable
only because the in-memory dataset is small — a real Postgres-backed version of this would need an
actual indexed lookup, which is exactly the kind of data-access-layer work the opening note of file
03 flags as not yet done anywhere in this backend). **Lines 25–31**: if no faculty record exists
for this user id at all, returns a **synthetic placeholder** rather than throwing a 404 — a
deliberate fail-soft default (the comment-free code here was already characterized this way in
file 03 §1, repeated here with the exact line numbers). **Lines 32–38**: otherwise, looks up the
department by `department_id` and spreads the full `faculty` record plus a resolved
`department_name`, defaulting to `'Computer Science'` if the department lookup itself also misses.

### Lines 41–56 — `getMyCourses(userId)`
```ts
  async getMyCourses(userId: string) {
    const mySections = sectionsTaughtBy(this.db, userId);
    const courseIds = new Set(mySections.map((cs) => cs.course_id));
    return this.db.courses
      .filter((c) => courseIds.has(c.course_id))
      .map((c) => {
        const sections = mySections
          .filter((cs) => cs.course_id === c.course_id)
          .map((cs) => cs.section);
        return {
          ...c,
          section: sections[0] || null,
          sections,
        };
      });
  }
```
**Line 42**: every `(course, section)` row this faculty teaches, via the shared helper. **Line 43**:
collapses to a `Set` of unique course ids — this is what prevents a course with two sections both
taught by this faculty from appearing twice in the final list. **Lines 44–53**: filters the full
course catalog down to just those ids, then for each surviving course, re-derives **which of this
faculty's sections belong to it** (filtering `mySections` again, this time by `course_id`) and maps
to just the section names. **Line 51**: `section: sections[0] || null` — the single-value legacy-
shaped field, always just the *first* matching section regardless of how many there actually are.
**Line 52**: `sections` — the full array, which is the field `MarkAttendance.jsx`'s `mySections`
derivation (file 08) actually reads from (with its own fallback to the singular `section` field if
`sections` is somehow absent — though per this code, `sections` is always present, even if empty,
since it's unconditionally assigned here).

### Lines 58–79 — `getFacultyTimetable(userId)`
```ts
  async getFacultyTimetable(userId: string) {
    // Section-scoped, not just course-scoped: two sections of the same
    // course can meet at different times with different faculty, so "my
    // timetable" must match this faculty's own (course_id, section) pairs,
    // not every slot that happens to share a course_id.
    const mySections = sectionsTaughtBy(this.db, userId);
    const slots = this.db.timetable.filter((t) =>
      mySections.some(
        (cs) => cs.course_id === t.course_id && cs.section === t.section,
      ),
    );
    const grid = slots.reduce((acc: any, curr) => {
      if (!acc[curr.day]) acc[curr.day] = {};
      acc[curr.day][curr.time] = curr;
      return acc;
    }, {});
    return {
      grid,
      days: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
      times: ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'],
    };
  }
```
**Lines 65–68**: filters the **entire college's** timetable (not pre-scoped by college at all —
notice there's no `scopeToCollege` call anywhere in this method; it relies entirely on
`sectionsTaughtBy`'s own result, which itself only returns rows for *this specific faculty id*, so
cross-college leakage would require two different colleges somehow sharing the same faculty user
id, which the platform's identity model doesn't permit) down to slots matching one of this
faculty's own `(course_id, section)` pairs — **both fields must match**, not just `course_id`,
exactly as the inline comment states. **Lines 69–73**: a `reduce` building a nested
`grid[day][time] = slot` object — if two slots somehow shared the exact same `(day, time)` for this
faculty (a genuine scheduling conflict that shouldn't exist but isn't structurally prevented here),
the **second** one encountered in iteration order would silently overwrite the first in the grid,
with no error or warning. **Lines 75–78**: `days`/`times` are **hardcoded constant arrays**, not
derived from the actual data at all — a faculty member with a class at `08:00` or on a `SAT` would
have that slot present in `grid` but **absent from the `times`/`days` arrays the frontend
`Timetable.jsx` component iterates over to build its table headers** (file 01 §12), meaning such a
slot would never actually be rendered even though it exists in the response — this is a real,
structural limitation of the fixed Mon–Fri, 9am–3pm shape baked into both this service method and
`Timetable.jsx`'s own `ENDPOINT_BY_ROLE`-adjacent default arrays.

### Lines 81–137 — `getMyStudents(facultyId)`
```ts
  async getMyStudents(facultyId: string) {
    // Section-scoped: enrollment must match this faculty's own section of
    // the course, not any section of it — a colleague teaching Section B of
    // the same course is not "my" roster.
    const mySections = sectionsTaughtBy(this.db, facultyId);
    const studentIds = this.db.enrollment
      .filter((e) =>
        mySections.some(
          (cs) => cs.course_id === e.course_id && cs.section === e.section,
        ),
      )
      .map((e) => e.student_id);

    const uniqueStudentIds = [...new Set(studentIds)];

    return this.db.students
      .filter((s) => uniqueStudentIds.includes(s.user_id))
      .map((s) => {
        const records = this.db.attendance_log.filter(
          (a) => a.student_id === s.user_id,
        );
        // M-02: EXCUSED sessions from approved leave count as attended.
        const attendance = summariseAttendance(records);
        const attendance_pct =
          attendance.total > 0 ? attendance.percentage : null;

        const marks = this.db.marks_entry.filter(
          (m) => m.student_id === s.user_id,
        );
        const scored = marks.filter((m) => Number(m.max_marks) > 0);
        const avgScore =
          scored.length > 0
            ? Math.round(
                scored.reduce(
                  (sum, m) =>
                    sum +
                    (Number(m.marks_obtained) / Number(m.max_marks)) * 100,
                  0,
                ) / scored.length,
              )
            : null;

        return {
          ...s,
          attendance_pct,
          excused_sessions: attendance.excused,
          avg_score: avgScore,
          // M-04: shared predicate — this used the same rule expressed inline,
          // which had already drifted from the admin report's `cgpa < 6.5`.
          is_at_risk: isAtRisk({ cgpa: s.cgpa, attendancePct: attendance_pct }),
          risk_reasons: riskReasons({
            cgpa: s.cgpa,
            attendancePct: attendance_pct,
          }),
        };
      });
  }
```
The most computationally involved read in this entire file, with three separate per-student
derivations layered on top of the section-scoped roster. **Lines 86–92**: filters enrollment rows
to ones matching **both** `course_id` and `section` against this faculty's own sections — exactly
the same dual-field match pattern as the timetable method above, applied here to decide *roster
membership* instead of *schedule membership*. **Line 94**: deduplicates student ids (a student
could in principle be enrolled in more than one of this faculty's sections, e.g. two different
courses — without this, they'd appear twice in the final list). **Lines 96–136**: for every unique
student, computes:
- **`attendance_pct`/`excused_sessions`** (lines 99–105): via the shared `summariseAttendance`
  helper over every attendance_log row for this student **in the whole system, not scoped to this
  faculty's own courses** — note this is a subtle but real distinction from the roster filter
  itself: the roster membership check (lines 86–92) is section-scoped, but the attendance
  *percentage* computed for each roster member is based on **all** of that student's attendance
  records across **every** course they're enrolled in, not just the ones taught by this faculty.
  `attendance_pct` is explicitly `null` (not `0`) when `attendance.total === 0` — the same
  null-vs-zero distinction seen on the frontend in `StudentOverview.jsx`'s `StudentCard` (file 10).
- **`avg_score`** (lines 107–121): iterates every `marks_entry` for this student system-wide,
  filters to ones with a nonzero `max_marks` (guarding against a division by zero), computes each
  entry's percentage (`marks_obtained / max_marks * 100`), averages across all scored entries, and
  rounds — again, `null` if there are zero scored entries rather than `0`.
- **`is_at_risk`/`risk_reasons`** (lines 123–131): the shared predicate, fed this student's `cgpa`
  and the just-computed `attendance_pct` — the comment (`M-04`) explicitly documents this
  replacing an **earlier, independently-drifted inline copy** of the same logic that used a
  different threshold (`cgpa < 6.5`) than whatever the canonical shared version now uses — a
  real historical bug-fix captured in the comment itself, not something this guide is inferring.

### Lines 139–208 — `getTodayAttendance(courseId, userId, collegeId, section?)`
```ts
  async getTodayAttendance(
    courseId: string,
    userId: string,
    collegeId: string | null,
    section?: string,
  ) {
    // course_id is client-supplied (@Param) — without this check a faculty
    // member could read another college's roster by supplying that
    // college's course id.
    const course = this.db.courses.find((c) => c.course_id === courseId);
    if (!isSameCollege(course, collegeId))
      throw new NotFoundException(
        errorBody(ErrorCode.RESOURCE_NOT_FOUND, 'Course not found'),
      );

    // Section-scoped: a faculty may only mark attendance for the section(s) of
    // this course they were actually assigned — see
    // COURSE_OWNERSHIP_MIGRATION_PLAN.md §3/§5.
    const mySections = sectionsTaughtBy(this.db, userId).filter(
      (cs) => cs.course_id === courseId,
    );
    if (!mySections.length)
      throw new ForbiddenException(
        errorBody(
          ErrorCode.PRIVILEGE_CEILING,
          'You are not assigned to any section of this course.',
        ),
      );

    if (section && !mySections.some((cs) => cs.section === section)) {
      throw new ForbiddenException(
        errorBody(
          ErrorCode.PRIVILEGE_CEILING,
          `You are not assigned to Section ${section} of this course.`,
        ),
      );
    }

    const targetSections = section
      ? [section]
      : mySections.map((cs) => cs.section);

    const enrollment = this.db.enrollment.filter(
      (e) => e.course_id === courseId && targetSections.includes(e.section),
    );
    const studentIds = enrollment.map((e) => e.student_id);
    const today = new Date().toISOString().split('T')[0];
    const students = this.db.students
      .filter((s) => studentIds.includes(s.user_id))
      .map((s) => {
        const todayLog = this.db.attendance_log.find(
          (a) =>
            a.student_id === s.user_id &&
            a.course_id === courseId &&
            a.date === today,
        );
        const enrol = enrollment.find((e) => e.student_id === s.user_id);
        return {
          ...s,
          section: enrol?.section,
          today_status: todayLog?.status || 'present',
        };
      });
    return {
      students,
      date: today,
      course_id: courseId,
      section: section || (mySections.length === 1 ? mySections[0].section : undefined),
    };
  }
```
This is the method [file 05 §7](./faculty-05-request-pipeline-reference.md#7-the-controller-method-itself)
and [file 08](./faculty-08-line-by-line-markattendance.md) both reference, examined here line by
line for the first time. **Lines 146–149**: the college-ownership guard — look up the course by the
raw, client-supplied `courseId`; `isSameCollege` returns false both when the course doesn't exist
*and* when it exists but belongs to a different college, and either case produces the **same**
generic 404 — a caller probing with another college's course id learns nothing about whether that
id even exists. **Lines 155–157**: re-derives this faculty's own sections *of this specific course*
— note this is a `.filter()` applied to the already-narrow `sectionsTaughtBy` result, not a fresh
database query. **Lines 158–163**: zero matching sections at all → 403, not 404 — the course itself
is real and in-college, the caller is just not entitled to see any of its rosters. **Lines 165–171**:
a *specific* `section` was requested that isn't among this faculty's own → a more specific 403,
naming the exact section in the message. **Lines 173–175**: `targetSections` resolves to either
the one requested section, or **every** section this faculty teaches of the course — this is the
"all my sections" fallback exercised when `MarkAttendance.jsx`'s section dropdown has "All Assigned
Sections" selected (file 08). **Lines 177–180**: the actual roster — every enrollment row matching
this course and any of the target sections. **Line 182**: `today` computed fresh on the server,
independently of whatever date the client's own request implied (the request doesn't even carry a
date for this particular `GET` — it's always "today" by construction, server-side). **Lines
183–200**: for each enrolled student, finds today's attendance_log entry if one exists and attaches
`section` (from their own enrollment row, which matters when `targetSections` covers more than one
section, so different students in the response can legitimately show different `section` values)
and `today_status`, **defaulting to `'present'`** when no log entry exists yet (`todayLog?.status
|| 'present'`) — this exact default is what the frontend's own seed logic (file 08, lines 76–80)
is independently re-expressing, not reading from any shared constant. **Lines 202–207**: the
returned `section` field is the requested one if explicit, or — if no section was requested **and**
this faculty teaches exactly one section of this course — that one section name; otherwise
`undefined` (when multiple sections exist and none was specified, i.e. the "all sections" case) —
this is the value `AttendanceForm`'s render logic (file 08) uses as a per-row display fallback
(`Sec {s.section || section || '—'}`).

### Lines 210–309 — `recordAttendance(data, userId, actorCollegeId)`
```ts
  async recordAttendance(
    data: any,
    userId: string,
    actorCollegeId: string | null,
  ) {
    const { course_id, date, records, section } = data;

    const course = this.db.courses.find((c) => c.course_id === course_id);
    if (!isSameCollege(course, actorCollegeId))
      throw new NotFoundException(
        errorBody(ErrorCode.RESOURCE_NOT_FOUND, 'Course not found'),
      );

    // Section-scoped, same as getTodayAttendance: this faculty may only
    // mark attendance for their own assigned section(s), and only for students
    // actually enrolled in them — a student id from another section must not
    // be smuggled into the records array.
    const mySections = sectionsTaughtBy(this.db, userId).filter(
      (cs) => cs.course_id === course_id,
    );
    if (!mySections.length)
      throw new ForbiddenException(/* ... */);

    if (section && !mySections.some((cs) => cs.section === section)) {
      throw new ForbiddenException(/* ... */);
    }

    const targetSections = section
      ? [section]
      : mySections.map((cs) => cs.section);

    const myStudentIds = new Set(
      this.db.enrollment
        .filter(
          (e) => e.course_id === course_id && targetSections.includes(e.section),
        )
        .map((e) => e.student_id),
    );

    const collegeId = writeCollegeId(actorCollegeId);

    // M-01: idempotent per student/course/date — re-submitting a session now
    // corrects the existing rows instead of stacking duplicate absences.
    // H-07: UUID identifiers; the previous length-based scheme produced both
    // gaps and outright duplicate primary keys.
    const saved: any[] = [];
    let created = 0;
    let updated = 0;

    for (const r of records || []) {
      if (!r?.student_id || !myStudentIds.has(r.student_id)) continue;
      const status = normalizeAttendanceStatus(r.status);
      const existing = this.db.attendance_log.find(
        (a) =>
          a.student_id === r.student_id &&
          a.course_id === course_id &&
          a.date === date,
      );

      if (existing) {
        // Approved leave outranks a plain absent mark for the same session.
        if (
          normalizeAttendanceStatus(existing.status) ===
            ATTENDANCE_STATUS.EXCUSED &&
          status === ATTENDANCE_STATUS.ABSENT
        ) {
          saved.push(existing);
          continue;
        }
        existing.status = status;
        updated++;
        saved.push(existing);
      } else {
        const log = {
          log_id: uuidv4(),
          student_id: r.student_id,
          course_id,
          date,
          status,
          college_id: collegeId,
        };
        this.db.attendance_log.push(log as any);
        created++;
        saved.push(log);
      }
    }

    if (updated) this.db.persist();
    return { saved: saved.length, created, updated, records: saved };
  }
```
**Line 215**: destructures the request body into four named locals — this is the **write-side**
counterpart to `getTodayAttendance`, and deliberately repeats (rather than shares via a helper) the
exact same college-ownership (lines 217–221) and section-ownership (lines 227–245) checks as the
read method above — **this duplication is intentional defense-in-depth**, not an oversight: a read
endpoint being correctly scoped says nothing about whether the corresponding write endpoint
independently re-verifies the same constraints, and here it does. **Lines 247–256**: builds
`myStudentIds` as a `Set` (not an array) — chosen specifically for its `O(1)` `.has()` lookup, used
immediately below in the per-record loop rather than an array `.includes()` which would be `O(n)`
per record. **Line 258**: `writeCollegeId(actorCollegeId)` — stamps the correct college id for any
*new* record this call might create (existing records being corrected keep whatever college id they
already had; this value is only used at line 299 inside the `else` branch). **Lines 260–263 (the
comment)**: two historical bug-fix ids, `M-01` and `H-07`, documented inline — idempotent-per-
session correction instead of duplicate-stacking, and real UUIDs instead of a length-based scheme
that could mint colliding ids. **Lines 269–305 — the per-record loop**:
- **Line 270**: `if (!r?.student_id || !myStudentIds.has(r.student_id)) continue;` — **this single
  line is the entire enforcement of "you can't submit attendance for a student outside your
  section"**: any record failing this check is silently skipped, with no error surfaced to the
  caller about *which* records were dropped — the response's `saved`/`created`/`updated` counts
  would simply be lower than the number of records sent, and the frontend's own success toast
  (file 08) reports `records.length` from the *request* it built, not from this response's actual
  `saved` count, meaning **a partially-rejected submission would still show a success message
  claiming every student was saved**, when in fact some were silently dropped server-side.
- **Line 271**: canonicalizes the incoming status string via the shared helper.
- **Lines 272–277**: looks for an existing log row for this exact `(student, course, date)` triple.
- **Lines 280–288 — the leave-precedence rule**: if the existing row's status is already `EXCUSED`
  and the *incoming* status is `ABSENT`, the existing row is left untouched (pushed into `saved`
  as-is, `continue`'d past) — an approved leave's excusal can never be silently overwritten by a
  later attendance submission marking the same session absent. Any other combination (including
  `EXCUSED` existing + `PRESENT` incoming, or any status existing + any status incoming that isn't
  this specific `EXCUSED`-blocks-`ABSENT` case) falls through to the plain update at lines 289–291.
- **Lines 292–302 — new row creation**: a fresh UUID, the five relevant fields, and the computed
  college id — pushed directly into the in-memory array.
- **Line 307**: `if (updated) this.db.persist();` — **note this condition only checks `updated`,
  not `created`** — meaning a batch of attendance records that are **entirely new** (every student
  being marked for the very first time on this course+date, `updated === 0` throughout) would
  **never trigger a `persist()` call at all**, leaving every newly-created attendance_log row
  present only in the in-memory array for the remainder of the process's lifetime, never flushed to
  `mock-db.json` on disk — a real, narrow data-durability gap specific to the all-new-records case,
  distinct from (and easy to overlook alongside) the backend-wide "everything is in-memory, nothing
  is Postgres yet" gap already flagged at the top of file 03.

### Lines 311–320 — `postMarks(data, actorCollegeId)`
```ts
  async postMarks(data: any, actorCollegeId: string | null) {
    const entryId = `m${Date.now()}`;
    const newEntry = {
      entry_id: entryId,
      ...data,
      college_id: writeCollegeId(actorCollegeId),
    };
    this.db.marks_entry.push(newEntry);
    return newEntry;
  }
```
**Line 312**: `` `m${Date.now()}` `` — a **timestamp-based** id, not a UUID (contrast with
`recordAttendance`'s `uuidv4()` just above it) — two concurrent calls within the same millisecond
could in principle mint colliding ids, a real (if narrow) regression relative to the `H-07` fix
applied to attendance logging but never carried over to this specific method. **Lines 313–317**: no
presence check on `data.student_id`/`data.assessment_id` at all (contrast with the shared `POST
/marks` in `common.controller.ts`, which requires both); no enrollment check; **no lock check** —
this method would happily record a second entry for a student/assessment pair that already has one,
something the shared route explicitly 400s against. As already flagged in the controller walkthrough
above, this method is simply never called by the shipped frontend — `AssessmentMapping.jsx` uses the
shared, properly-guarded route instead.

### Lines 322–324 — `getAssessments(facultyId)`
```ts
  async getAssessments(facultyId: string) {
    return this.db.assessments.filter((a) => a.faculty_id === facultyId);
  }
```
A single-line filter, no college scoping at all visible in this method itself (relying entirely on
the fact that `faculty_id` values only ever belong to one college's worth of data in practice, same
reasoning as `getFacultyTimetable`'s lack of an explicit `scopeToCollege` call).

### Lines 326–374 — `getAtRiskStudents(collegeId, userId?, role?)`
```ts
  async getAtRiskStudents(
    collegeId: string | null,
    userId?: string,
    role?: string,
  ) {
    // M-04: one predicate for every at-risk surface. This previously filtered on
    // `cgpa < 6` alone, so a student failing only on attendance never appeared.
    let pool = scopeToCollege(this.db.students, collegeId);

    // A faculty member's "at-risk" list previously meant every at-risk
    // student in the whole college — every other section, every other
    // faculty's roster included — because this was never updated when
    // sections became real. admin/head/superadmin keep the full college
    // view, which is correct for them.
    if (role === 'faculty' && userId) {
      const mySections = sectionsTaughtBy(this.db, userId);
      const myStudentIds = new Set(
        this.db.enrollment
          .filter((e) =>
            mySections.some(
              (cs) => cs.course_id === e.course_id && cs.section === e.section,
            ),
          )
          .map((e) => e.student_id),
      );
      pool = pool.filter((s) => myStudentIds.has(s.user_id));
    }

    return pool
      .map((s) => {
        const records = this.db.attendance_log.filter(
          (a) => a.student_id === s.user_id,
        );
        const attendance = summariseAttendance(records);
        const attendance_pct =
          attendance.total > 0 ? attendance.percentage : null;
        return {
          ...s,
          attendance_pct,
          excused_sessions: attendance.excused,
          is_at_risk: isAtRisk({ cgpa: s.cgpa, attendancePct: attendance_pct }),
          risk_reasons: riskReasons({
            cgpa: s.cgpa,
            attendancePct: attendance_pct,
          }),
        };
      })
      .filter((s) => s.is_at_risk);
  }
```
**Line 331**: `let pool` — a mutable binding, deliberately, because it's conditionally narrowed
below. **Lines 333–345**: the `role === 'faculty'` branch re-derives this faculty's section-
enrolled student set (the exact same `sectionsTaughtBy` → `enrollment.filter` → `Set` pattern as
`getMyStudents`, independently re-expressed a third time in this file rather than factored into a
shared helper) and narrows `pool` to just those students — **this is the exact logic
`Dashboard.jsx`'s `Intervention` component (file 07) would benefit from but doesn't use**, since
that component calls the unscoped `/admin/users` instead of this route. **Lines 347–372**: computes
`attendance_pct`/`excused_sessions`/`is_at_risk`/`risk_reasons` per student (a third near-identical
copy of this exact computation block within this one file — compare lines 99–105 and 123–131 in
`getMyStudents` above), then filters the final list down to only the ones where `is_at_risk` is
true — meaning the method does more work than strictly necessary for its own output (it computes
full enrichment for every student in `pool`, including the ones about to be filtered out, rather
than checking `is_at_risk` first and only enriching the survivors).

---

**What this file demonstrates, held up against files 06–11:** every section-scoping check examined
here (`getTodayAttendance`, `recordAttendance`, `getMyStudents`, `getAtRiskStudents`) is paired with
a frontend component that either relies on it correctly (`MarkAttendance.jsx`) or bypasses it
entirely in favor of an unscoped alternative (`Dashboard.jsx`'s `Intervention`, `StudentOverview.jsx`'s
roster, both preferring `/admin/users`). The backend's authorization logic is consistently more
rigorous than the frontend's own data-fetching choices — which is exactly the intended shape, per
file 05 §4's framing: the frontend's job is UX, the backend's job is the actual boundary, and this
file is where you can see that boundary enforced even in the specific cases where the frontend
doesn't lean on it.

Continue to **[13-design-principles.md](./faculty-13-design-principles.md)**.
