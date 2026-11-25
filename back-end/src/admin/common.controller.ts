import {
  validateSlotConflicts,
  validateWeeklyHourRequirements,
  TIMETABLE_DAYS,
  TIMETABLE_TIMES,
} from '../common/timetable-validation';
import {
Controller,
Get,
Post,
Body,
Param,
Put,
Query,
Patch,
Delete,
Req,
BadRequestException,
ForbiddenException,
InternalServerErrorException,
NotFoundException,
UsePipes,
ValidationPipe,
UseInterceptors,
UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { parse as parseCsv } from 'csv-parse/sync';
import { v4 as uuidv4 } from 'uuid';
import { InMemoryDbService } from '../database/in-memory-db.service';
import { Roles } from '../auth/roles.guard';
import {
CurrentUserCollegeId,
CurrentUserId,
CurrentUserRole,
} from '../common/decorators/current-user.decorator';
import { PasswordService } from '../auth/password.service';
import { ErrorCode, errorBody } from '../common/errors/error-codes';
import { DEFAULT_COLLEGE_ID } from '../common/constants/college';
import {
isSameCollege,
scopeToCollege,
writeCollegeId,
} from '../common/tenancy/scope-to-college';
import { assertSeatAvailable } from '../common/billing/subscription';
import {
sectionsOfCourse,
sectionsTaughtBy,
sectionTaughtIn,
} from '../common/course-sections';
import { RequiresModule } from '../common/guards/requires-module.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiConsumes } from '@nestjs/swagger';
import {
ATTENDANCE_STATUS,
eachDateInRange,
isAtRisk,
normalizeAttendanceStatus,
normalizeLeaveType,
riskReasons,
summariseAttendance,
} from '../common/academic-rules';
import { syncLeaveAttendance } from '../common/leave-attendance.sync';
import { excludeHolidays, expandClassDates } from '../common/academic-calendar';
import { collegeAverageCoMastery } from '../common/outcome-mastery';
import { computeCGPA } from '../common/grading';
import { normalizeEmail } from '../common/normalize-email';
import { BULK_ONBOARD_UPLOAD_OPTIONS } from './bulk-onboard-upload.config';
import { mapRowToCanonicalFields, randomRosterPassword } from './bulk-onboard.util';
import {
CreateUserDto,
ResetUserPasswordDto,
UpdateUserDto,
UpdateUserRoleDto,
canAssignRole,
canDeleteRole,
rolesAssignableBy,
} from '../common/dto/user.dto';

/**
* Rejects any body property not declared on the DTO instead of silently
* stripping it, so an attempt to smuggle `role`/`password`/`user_id` through a
* profile update fails loudly rather than appearing to succeed (audit C-04).
*/
const StrictBody = () =>
UsePipes(
new ValidationPipe({
whitelist: true,
forbidNonWhitelisted: true,
transform: true,
}),
);

/**
* Fields that must never be settable through a general update route.
*
* The global ValidationPipe runs before any route-scoped pipe and silently
* strips unknown keys, so `forbidNonWhitelisted` alone never sees them and the
* caller gets a misleading 200. Checking the untouched `request.body` makes the
* refusal explicit and keeps the rule visible at the call site.
*/
const PROTECTED_USER_FIELDS = ['role', 'password', 'password_hash', 'user_id'];

function rejectProtectedFields(
rawBody: any,
fields: string[] = PROTECTED_USER_FIELDS,
) {
const offending = fields.filter(
(f) => rawBody && Object.prototype.hasOwnProperty.call(rawBody, f),
);
if (offending.length) {
throw new BadRequestException(
errorBody(
ErrorCode.IMMUTABLE_FIELD,
`The following fields cannot be changed here: ${offending.join(', ')}. ` +
`Use PATCH /users/:id/role or PATCH /users/:id/password.`,
{ fields: offending },
),
);
}
}

/**
* Copy only the keys the caller actually supplied.
*
* A validated DTO instance carries every optional property as an own key with
* value `undefined`, so a plain `Object.assign` would erase stored values the
* request never mentioned.
*/
function pickDefined<T extends object>(source: T): Partial<T> {
const out: Partial<T> = {};
for (const [key, value] of Object.entries(source ?? {})) {
if (value !== undefined) out[key] = value;
}
return out;
}

/**
* Strip credential material before a user record leaves the server.
*
* The previous `{ ...u, password: undefined }` only covered the legacy plaintext
* field; now that credentials live in `password_hash`, that spread would have
* shipped the bcrypt digest to every caller of GET /users. Deleting the keys
* outright is safer than relying on JSON.stringify dropping `undefined`.
*/
function sanitizeUser<T extends Record<string, any>>(user: T): Partial<T> {
const { password, password_hash, ...safe } = user ?? {};
return safe as Partial<T>;
}

/** One message, one code, for every cross-college lookup miss in this file â€”
*  see scope-to-college.ts's isSameCollege() docstring for why this is
*  always RESOURCE_NOT_FOUND, never a 403: a caller from another college
*  must see an identical response to a genuinely nonexistent id. */
function notFoundInMyCollege(what: string): never {
throw new NotFoundException(errorBody(ErrorCode.RESOURCE_NOT_FOUND, `${what} not found`));
}

@ApiTags('Admin/Reports')
@Controller()
export class CommonController {
constructor(
private db: InMemoryDbService,
private passwordService: PasswordService,
) {}

// â”€â”€ Courses â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
@Get('courses')
@Roles('student', 'faculty', 'admin', 'head', 'superadmin')
@ApiOperation({ summary: 'Get all courses, each with its section/faculty assignments' })
@ApiResponse({ status: 200, description: 'Array of all courses' })
async getCourses(@CurrentUserCollegeId() collegeId: string | null) {
// COURSE_OWNERSHIP_MIGRATION_PLAN.md: a course no longer carries its own
// faculty_id â€” sections does, so every reader (the head's course list,
// a student's "my courses", a faculty member browsing electives) needs
// it folded back in here rather than re-deriving it at each call site.
return scopeToCollege(this.db.courses, collegeId).map((c) => ({
...c,
sections: sectionsOfCourse(this.db, c.course_id),
}));
}

@Post('courses')
@Roles('head', 'admin', 'superadmin')
@ApiOperation({
summary:
'Create a new course, optionally with sections and their assigned faculty',
})
@ApiBody({ schema: { type: 'object', additionalProperties: true } })
async createCourse(
@Body() body: any,
@CurrentUserCollegeId() actorCollegeId: string | null,
) {
if (!body.course_name || !body.course_code)
throw new BadRequestException(
errorBody(
ErrorCode.BUSINESS_RULE_VIOLATION,
'course_name and course_code are required',
),
);
const collegeId = writeCollegeId(actorCollegeId);
// A course code only has to be unique within one college â€” two colleges
// may both legitimately run a "CS201".
if (
scopeToCollege(this.db.courses, collegeId).find(
(c) => c.course_code === body.course_code,
)
)
throw new BadRequestException(
errorBody(ErrorCode.DUPLICATE_RESOURCE, 'Course code already exists'),
);
// A course no longer carries faculty_id/faculty_name (COURSE_OWNERSHIP_
// MIGRATION_PLAN.md Â§4) â€” strip any stray value a client sends for
// either, and never trust a client-supplied `sections` shape beyond
// what replaceCourseSections() below validates field by field.
const { sections, faculty_id, faculty_name, ...courseFields } = body;
const courseId = `c${Date.now()}`;
// Build + validate the section rows BEFORE touching this.db.courses. A bad
// section list (duplicate section name, missing faculty, etc.) must reject
// the whole request with nothing persisted â€” previously the course was
// pushed first and this validation ran after, so a rejected request still
// left a section-less course behind: the client saw the error and never
// added it to Redux state, but the very next full refetch (e.g. a page
// reload) read it straight back out of the DB as if it had been created.
const sectionRows = this.buildCourseSectionRows(courseId, sections, collegeId);
const newCourse = {
course_id: courseId,
...courseFields,
college_id: collegeId,
};
this.db.courses.push(newCourse);
// Confirmed: a course may be created with zero sections and staffed
// later via PUT /courses/:id/sections â€” sections is optional here.
this.commitCourseSections(courseId, sectionRows);
return { success: true, data: { ...newCourse, sections: sectionRows } };
}

@Put('courses/:id/sections')
@Roles('head', 'admin', 'superadmin')
@ApiOperation({
summary:
"Replace a course's section/faculty assignments (add, reassign, or drop a section)",
})
@ApiBody({ schema: { type: 'object', additionalProperties: true } })
async updateCourseSections(
@Param('id') id: string,
@Body() body: { sections?: any[] },
@CurrentUserCollegeId() actorCollegeId: string | null,
) {
const course = this.db.courses.find((c) => c.course_id === id);
if (!isSameCollege(course, actorCollegeId)) notFoundInMyCollege('Course');
const collegeId = writeCollegeId(actorCollegeId);
const sections = this.replaceCourseSections(id, body.sections, collegeId);
return { success: true, data: { ...course, sections } };
}

/**
* Full-replace, not incremental add/remove: one call sets a course's
* entire section list, matching how PUT already works elsewhere in this
* file rather than adding a CRUD sprawl for a small sub-resource. Used by
* updateCourseSections() (later reassignment) as build-then-commit in one
* step; createCourse() calls buildCourseSectionRows()/commitCourseSections()
* separately instead, with the course's own this.db.courses.push() sitting
* between them, so a validation failure here never leaves a course record
* behind with no sections (see createCourse()'s own comment).
*/
private replaceCourseSections(
courseId: string,
rawSections: any,
collegeId: string | null,
): any[] {
const rows = this.buildCourseSectionRows(courseId, rawSections, collegeId);
this.commitCourseSections(courseId, rows);
return rows;
}

/** Validates a raw `sections` payload and builds the course_sections rows
 *  it describes â€” throws on the first invalid/duplicate/unknown-faculty
 *  entry, without touching this.db at all beyond read-only lookups. Safe to
 *  call before any other mutation for the same request. */
private buildCourseSectionRows(
courseId: string,
rawSections: any,
collegeId: string | null,
): any[] {
const requested = Array.isArray(rawSections) ? rawSections : [];
const seenSections = new Set<string>();
return requested.map((s: any) => {
const section = String(s?.section ?? '').trim();
if (!section || !s?.faculty_id)
throw new BadRequestException(
errorBody(
ErrorCode.BUSINESS_RULE_VIOLATION,
'Each section requires a section name and a faculty_id',
),
);
if (seenSections.has(section))
throw new BadRequestException(
errorBody(
ErrorCode.DUPLICATE_RESOURCE,
`Section "${section}" is listed more than once`,
),
);
seenSections.add(section);
// faculty_id is client-supplied â€” same not-found-not-403 discipline as
// every other cross-college foreign id in this file: a head must not
// be able to tell "no such user" apart from "that user is not a
// faculty member at your college" by response shape.
const faculty = this.db.users.find(
(u) => u.user_id === s.faculty_id && u.role === 'faculty',
);
if (!isSameCollege(faculty, collegeId))
notFoundInMyCollege('Faculty member');
// Display name lives in the separate faculty-profile collection, not
// on the bare user record (which only ever has username/email) â€” a
// user-only lookup here previously produced the literal string
// "undefined" via template interpolation. Joined the same way every
// other faculty_name lookup in this file does it (e.g. getResearch()'s
// supervisor_name), with the same last-resort fallback for the
// (expected never to happen) case where a user has no profile row.
const facultyProfile = this.db.faculty.find(
(f) => f.user_id === faculty.user_id,
);
const faculty_name = facultyProfile
? `${facultyProfile.first_name} ${facultyProfile.last_name || ''}`.trim()
: faculty.username;
return {
course_section_id: uuidv4(),
course_id: courseId,
section,
faculty_id: faculty.user_id,
faculty_name,
college_id: collegeId,
};
});
}

/** Commits rows already built by buildCourseSectionRows() â€” the only part
 *  of a sections replace that actually mutates this.db. Kept separate so
 *  createCourse() can build+validate first and only ever call this once a
 *  course record has successfully been created. */
private commitCourseSections(courseId: string, rows: any[]): void {
for (let i = this.db.course_sections.length - 1; i >= 0; i--) {
if (this.db.course_sections[i].course_id === courseId)
this.db.course_sections.splice(i, 1);
}
if (rows.length) this.db.course_sections.push(...rows);
}

// â”€â”€ Timetable â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
@Get('timetable')
@Roles('student', 'faculty', 'admin', 'head', 'superadmin')
@ApiOperation({ summary: 'Get timetable grid for a section' })
async getTimetable(
  @Query('section') section: string = 'A',
  @Query('status') status: string,
  @CurrentUserCollegeId() collegeId: string | null,
  @CurrentUserRole() role: string,
) {
  let slots = scopeToCollege(this.db.timetable, collegeId).filter(
    (t) => t.section === section,
  );
  // Student & Faculty only see published slots unless admin/head
  if (role === 'student' || (role === 'faculty' && status !== 'all')) {
    slots = slots.filter((t) => t.status === undefined || t.status === 'published');
  } else if (status && status !== 'all') {
    slots = slots.filter((t) => t.status === status);
  }
  return {
    grid: buildTimetableGrid(slots),
    slots,
    section,
    ...TIMETABLE_AXES,
  };
}

@Post('timetable/slot')
@Roles('head', 'admin', 'superadmin')
@ApiOperation({ summary: 'Create or update a class session slot with conflict validation' })
async createOrUpdateSlot(
  @Body() body: any,
  @CurrentUserCollegeId() actorCollegeId: string | null,
) {
  const {
    slot_id,
    day,
    time,
    course_id,
    section,
    room,
    type = 'lecture',
    faculty_id,
    status = 'draft',
    semester,
    branch,
  } = body;

  if (!day || !time || !course_id || !section) {
    throw new BadRequestException(
      errorBody(
        ErrorCode.BUSINESS_RULE_VIOLATION,
        'day, time, course_id, and section are required',
      ),
    );
  }

  const collegeId = writeCollegeId(actorCollegeId);
  const course = this.db.courses.find((c) => c.course_id === course_id);
  if (!isSameCollege(course, collegeId)) notFoundInMyCollege('Course');

  // Resolve assigned faculty name and id
  let finalFacultyId = faculty_id;
  let finalFacultyName: string | undefined = undefined;

  if (!finalFacultyId) {
    const cs = sectionsOfCourse(this.db, course_id).find((s) => s.section === section);
    if (cs) finalFacultyId = cs.faculty_id;
  }
  if (finalFacultyId) {
    const fac = (this.db.faculty as any[]).find((f) => f.user_id === finalFacultyId);
    if (fac) finalFacultyName = `${fac.first_name || ''} ${fac.last_name || ''}`.trim() || fac.email;
  }

  const slotData = {
    slot_id: slot_id || `t${Date.now()}`,
    day: day.toUpperCase(),
    time,
    course_id,
    course_code: course?.course_code || '',
    course_name: course?.course_name || '',
    section,
    room: room || 'TBA',
    type: (type.toLowerCase() as any) || 'lecture',
    faculty_id: finalFacultyId,
    faculty_name: finalFacultyName,
    status: status || 'draft',
    college_id: collegeId,
    semester: semester || course?.semester || 1,
    branch: branch || 'CS',
  };

  // Run Conflict Validation
  const conflicts = validateSlotConflicts(this.db, slotData, {
    excludeSlotId: slot_id,
    collegeId,
  });

  // If force flag is not set, reject on critical conflicts
  if (conflicts.length > 0 && !body.force) {
    return {
      success: false,
      hasConflicts: true,
      conflicts,
      message: conflicts[0].message,
    };
  }

  const existingIdx = this.db.timetable.findIndex((t) => t.slot_id === slotData.slot_id);
  if (existingIdx >= 0) {
    this.db.timetable[existingIdx] = slotData;
  } else {
    this.db.timetable.push(slotData);
  }
  this.db.persist();

  return {
    success: true,
    data: slotData,
    conflicts,
    message: conflicts.length > 0 ? 'Slot saved with warning override' : 'Slot scheduled successfully',
  };
}

@Delete('timetable/slot/:id')
@Roles('head', 'admin', 'superadmin')
@ApiOperation({ summary: 'Remove a class session slot' })
async deleteSlot(
  @Param('id') id: string,
  @CurrentUserCollegeId() collegeId: string | null,
) {
  const idx = this.db.timetable.findIndex((t) => t.slot_id === id);
  if (idx < 0) {
    throw new NotFoundException(errorBody(ErrorCode.RESOURCE_NOT_FOUND, 'Slot not found'));
  }
  const slot = this.db.timetable[idx];
  if (!isSameCollege(slot, collegeId)) notFoundInMyCollege('Timetable slot');

  this.db.timetable.splice(idx, 1);
  this.db.persist();
  return { success: true, message: 'Slot deleted successfully' };
}

@Post('timetable/validate')
@Roles('head', 'admin', 'superadmin')
@ApiOperation({ summary: 'Validate section timetable for conflicts and contact hour requirements' })
async validateTimetable(
  @Body() body: { section: string; course_id?: string },
  @CurrentUserCollegeId() collegeId: string | null,
) {
  const section = body.section || 'A';
  const slots = scopeToCollege(this.db.timetable, collegeId).filter(
    (t) => t.section === section,
  );

  const allConflicts: any[] = [];
  slots.forEach((s) => {
    const c = validateSlotConflicts(this.db, s, {
      excludeSlotId: s.slot_id,
      collegeId,
      candidateSlots: slots,
    });
    if (c.length > 0) allConflicts.push({ slot: s, conflicts: c });
  });

  // Check weekly hour requirements for courses in this section
  const sectionCourseIds = [...new Set(slots.map((s) => s.course_id))];
  const hourReports = sectionCourseIds.map((cid) =>
    validateWeeklyHourRequirements(this.db, cid, section, slots),
  );

  return {
    success: true,
    section,
    totalSlots: slots.length,
    conflicts: allConflicts,
    hourReports,
    isValid: allConflicts.length === 0,
  };
}

@Post('timetable/publish')
@Roles('head', 'admin', 'superadmin')
@ApiOperation({ summary: 'Publish draft timetable for a section after validation' })
async publishTimetable(
  @Body() body: { section: string; force?: boolean },
  @CurrentUserCollegeId() collegeId: string | null,
) {
  const section = body.section || 'A';
  const slots = scopeToCollege(this.db.timetable, collegeId).filter(
    (t) => t.section === section,
  );

  if (slots.length === 0) {
    throw new BadRequestException(
      errorBody(ErrorCode.BUSINESS_RULE_VIOLATION, `No slots scheduled for Section ${section}`),
    );
  }

  // Validate all slots
  const allConflicts: any[] = [];
  slots.forEach((s) => {
    const c = validateSlotConflicts(this.db, s, {
      excludeSlotId: s.slot_id,
      collegeId,
      candidateSlots: slots,
    });
    if (c.length > 0) allConflicts.push(...c);
  });

  if (allConflicts.length > 0 && !body.force) {
    throw new BadRequestException(
      errorBody(
        ErrorCode.BUSINESS_RULE_VIOLATION,
        `Cannot publish timetable: ${allConflicts.length} conflict(s) detected. ${allConflicts[0].message}`,
      ),
    );
  }

  // Mark all slots as published
  slots.forEach((s) => {
    s.status = 'published';
  });
  this.db.persist();

  return {
    success: true,
    message: `Section ${section} timetable published successfully (${slots.length} class sessions)`,
    publishedCount: slots.length,
  };
}

@Post('timetable/generate')
@Roles('head', 'admin', 'superadmin')
@ApiOperation({ summary: 'Deterministic automated timetable draft generation with conflict avoidance' })
async generateTimetable(
  @Body() body: { section: string; semester?: number; academic_year?: string; clearExistingDrafts?: boolean },
  @CurrentUserCollegeId() actorCollegeId: string | null,
) {
  const section = body.section || 'A';
  const collegeId = writeCollegeId(actorCollegeId);
  const semester = body.semester;

  if (body.clearExistingDrafts) {
    // Clear only draft slots for this section and college
    for (let i = this.db.timetable.length - 1; i >= 0; i--) {
      const t = this.db.timetable[i];
      if (t.section === section && t.status === 'draft' && isSameCollege(t, collegeId)) {
        this.db.timetable.splice(i, 1);
      }
    }
  }

  // Find all applicable courses for this section
  let coursesToSchedule = scopeToCollege(this.db.courses, collegeId);
  if (semester) {
    coursesToSchedule = coursesToSchedule.filter((c) => c.semester === semester);
  }

  // Filter courses that have this section offered
  coursesToSchedule = coursesToSchedule.filter((c) => {
    const cs = sectionsOfCourse(this.db, c.course_id);
    return cs.some((s) => s.section === section);
  });

  if (coursesToSchedule.length === 0) {
    return {
      success: false,
      message: `No courses found with Section ${section} assigned`,
      generatedSlots: 0,
    };
  }

  // Candidate pool of existing slots
  const candidatePool: any[] = [...scopeToCollege(this.db.timetable, collegeId)];
  const newlyGenerated: any[] = [];
  const days = TIMETABLE_DAYS;
  const times = TIMETABLE_TIMES;

  // Available room resources
  const availableRooms = scopeToCollege(this.db.resources, collegeId).filter(
    (r) => r.type === 'Room' || r.type === 'Hall' || r.type === 'Lab',
  );
  const defaultLectureRoom = availableRooms.find((r) => r.type !== 'Lab')?.name || '101';
  const defaultLabRoom = availableRooms.find((r) => r.type === 'Lab')?.name || 'Lab 1';

  for (const course of coursesToSchedule) {
    const req = validateWeeklyHourRequirements(this.db, course.course_id, section, candidatePool);
    let hoursNeeded = req.expectedContactHours - req.scheduledHours;
    if (hoursNeeded <= 0) continue;

    const cs = sectionsOfCourse(this.db, course.course_id).find((s) => s.section === section);
    const facultyId = cs?.faculty_id;
    const fac = facultyId ? (this.db.faculty as any[]).find((f) => f.user_id === facultyId) : null;
    const facultyName = fac ? `${fac.first_name || ''} ${fac.last_name || ''}`.trim() : undefined;

    // Allocate required hours across available days and times without conflict
    for (const day of days) {
      if (hoursNeeded <= 0) break;
      for (const time of times) {
        if (hoursNeeded <= 0) break;

        const isLab = hoursNeeded === 1 && (course.course_name?.toLowerCase().includes('lab') || course.course_code?.toLowerCase().includes('l'));
        const targetRoom = isLab ? defaultLabRoom : defaultLectureRoom;

        const slotDraft = {
          slot_id: `t_gen_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          day,
          time,
          course_id: course.course_id,
          course_code: course.course_code,
          course_name: course.course_name,
          section,
          room: targetRoom,
          type: (isLab ? 'lab' : 'lecture') as any,
          faculty_id: facultyId,
          faculty_name: facultyName,
          status: 'draft' as const,
          college_id: collegeId,
          semester: course.semester || 1,
          branch: 'CS',
        };

        const conflicts = validateSlotConflicts(this.db, slotDraft as any, {
          collegeId,
          candidateSlots: candidatePool,
        });

        if (conflicts.length === 0) {
          candidatePool.push(slotDraft);
          newlyGenerated.push(slotDraft);
          this.db.timetable.push(slotDraft);
          hoursNeeded--;
        }
      }
    }
  }

  this.db.persist();

  return {
    success: true,
    message: `Generated ${newlyGenerated.length} draft class session(s) for Section ${section}`,
    generatedSlots: newlyGenerated.length,
    slots: newlyGenerated,
  };
}

@Get('timetable/faculty')
@Roles('faculty')
@ApiOperation({ summary: 'Get timetable grid for the logged-in faculty' })
async getFacultyTimetable(
@CurrentUserId() userId: string,
@CurrentUserCollegeId() collegeId: string | null,
) {
// Section-scoped â€” see faculty.service.ts's copy of this same fix for why.
const mySections = sectionsTaughtBy(this.db, userId);
const slots = scopeToCollege(this.db.timetable, collegeId).filter((t) =>
(t.faculty_id === userId ||
mySections.some(
(cs) => cs.course_id === t.course_id && cs.section === t.section,
)) &&
(t.status === undefined || t.status === 'published'),
);
return { grid: buildTimetableGrid(slots), ...TIMETABLE_AXES };
}

// â”€â”€ Assessments â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
@Get('assessments')
@Roles('student', 'faculty', 'admin', 'head', 'superadmin')
@ApiOperation({
summary: 'Get all assessments, optionally filtered by faculty_id',
})
async getAssessments(
@Query('faculty_id') facultyId: string | undefined,
@CurrentUserId() userId: string,
@CurrentUserRole() role: string,
@CurrentUserCollegeId() collegeId: string | null,
) {
const scoped = scopeToCollege(this.db.assessments, collegeId);
let list = facultyId
? scoped.filter((a) => a.faculty_id === facultyId)
: scoped;
// A course can now have several sections, each with a different
// faculty. Without this, a student saw every assessment in the whole
// college â€” including other sections of a course they're in, and
// courses they were never enrolled in at all â€” because nothing here
// checked their own enrollment. An assessment with no `section` stamped
// (legacy rows from before sections existed, or one an admin created
// without picking one) still applies to every enrolled student of the
// course, same as it always did.
if (role === 'student') {
const myEnrollment = this.db.enrollment.filter(
(e) => e.student_id === userId,
);
list = list.filter((a) =>
myEnrollment.some(
(e) => e.course_id === a.course_id && (!a.section || e.section === a.section),
),
);
}
return list.map((a) => {
const course = this.db.courses.find((c) => c.course_id === a.course_id);
return {
...a,
course_name: course?.course_name,
course_code: course?.course_code,
// Lets the UI gate Edit/Delete without an extra request per card —
// see assertCanModifyAssessment's own "locked once marked" policy.
has_marks: this.db.marks_entry.some((m) => m.assessment_id === a.assessment_id),
};
});
}

@Post('assessments')
@Roles('faculty', 'admin', 'head', 'superadmin')
@ApiOperation({ summary: 'Create a new assessment' })
@ApiBody({ schema: { type: 'object', additionalProperties: true } })
async createAssessment(
@Body() body: any,
@CurrentUserId() userId: string,
@CurrentUserRole() actorRole: string,
@CurrentUserCollegeId() actorCollegeId: string | null,
) {
if (!body.course_id)
throw new BadRequestException(
errorBody(ErrorCode.BUSINESS_RULE_VIOLATION, 'course_id is required'),
);
// A course can now have several sections, each with a different faculty
// (COURSE_OWNERSHIP_MIGRATION_PLAN.md). Without this, any faculty could
// create an assessment for a course they don't teach any section of â€”
// and it would then apply to every section's students, not just theirs.
// Admin/head/superadmin aren't teaching a section, so they aren't held
// to this â€” they may set up an assessment on a faculty member's behalf,
// and pass `section` explicitly if it matters which one.
let section: string | undefined = body.section;
if (actorRole === 'faculty') {
const mySectionsForCourse = sectionsTaughtBy(this.db, userId).filter(
(cs) => cs.course_id === body.course_id,
);
if (!mySectionsForCourse.length)
throw new ForbiddenException(
errorBody(
ErrorCode.PRIVILEGE_CEILING,
'You are not assigned to any section of this course.',
),
);
if (body.section) {
// Client-supplied â€” must be one this faculty actually teaches, not
// just any section of the course.
if (!mySectionsForCourse.some((cs) => cs.section === body.section))
throw new ForbiddenException(
errorBody(
ErrorCode.PRIVILEGE_CEILING,
`You are not assigned to Section ${body.section} of this course.`,
),
);
section = body.section;
} else if (mySectionsForCourse.length === 1) {
// Only one section to mean â€” safe to default, same as before this
// faculty was ever assigned a second one.
section = mySectionsForCourse[0].section;
} else {
// Teaches more than one section of this course â€” which one this
// assessment is for is not something the server can guess.
throw new BadRequestException(
errorBody(
ErrorCode.BUSINESS_RULE_VIOLATION,
`You teach more than one section of this course (${mySectionsForCourse.map((cs) => cs.section).join(', ')}). Specify which section this assessment is for.`,
),
);
}
}
const id = `a${Date.now()}`;
const newAssessment = {
assessment_id: id,
faculty_id: userId,
weightage: body.weightage || 10,
...body,
section,
college_id: writeCollegeId(actorCollegeId),
};
this.db.assessments.push(newAssessment);
return { success: true, data: newAssessment };
}

/**
 * Shared gate for PATCH/DELETE: only the owning faculty (admin/head/
 * superadmin may act on any assessment, matching createAssessment's own
 * "set one up on a faculty member's behalf" allowance), and only before
 * the first mark is entered. marks_entry doesn't snapshot weightage, so
 * editing it after grading started would retroactively reshuffle every
 * already-graded student's percentage — same reasoning recordMarks()
 * already applies to locking a mark itself once entered.
 */
private assertCanModifyAssessment(assessment: any, userId: string, role: string) {
if (role === 'faculty' && assessment.faculty_id !== userId) notFoundInMyCollege('Assessment');
const hasMarks = this.db.marks_entry.some(
(m: any) => m.assessment_id === assessment.assessment_id,
);
if (hasMarks)
throw new BadRequestException(
errorBody(
ErrorCode.BUSINESS_RULE_VIOLATION,
'This assessment already has marks recorded — it can no longer be edited or deleted.',
),
);
}

@Patch('assessments/:id')
@Roles('faculty', 'admin', 'head', 'superadmin')
@ApiOperation({ summary: 'Edit an assessment that has no marks recorded yet' })
@ApiBody({ schema: { type: 'object', additionalProperties: true } })
async updateAssessment(
@Param('id') id: string,
@Body() body: any,
@CurrentUserId() userId: string,
@CurrentUserRole() actorRole: string,
@CurrentUserCollegeId() actorCollegeId: string | null,
) {
const assessment = this.db.assessments.find((a) => a.assessment_id === id);
if (!isSameCollege(assessment, actorCollegeId)) notFoundInMyCollege('Assessment');
this.assertCanModifyAssessment(assessment, userId, actorRole);

// course_id/section/faculty_id/college_id/assessment_id are structural —
// moving an assessment to a different course/section/owner is out of
// scope here, same as updateUser's own protected-fields exclusion.
const editable = pickDefined({
name: body.name,
type: body.type,
date: body.date,
max_marks: body.max_marks,
weightage: body.weightage,
exam_mode: body.exam_mode,
});
Object.assign(assessment, editable);
this.db.persist();
return { success: true, data: assessment };
}

@Delete('assessments/:id')
@Roles('faculty', 'admin', 'head', 'superadmin')
@ApiOperation({ summary: 'Delete an assessment that has no marks recorded yet' })
async deleteAssessment(
@Param('id') id: string,
@CurrentUserId() userId: string,
@CurrentUserRole() actorRole: string,
@CurrentUserCollegeId() actorCollegeId: string | null,
) {
const assessment = this.db.assessments.find((a) => a.assessment_id === id);
if (!isSameCollege(assessment, actorCollegeId)) notFoundInMyCollege('Assessment');
this.assertCanModifyAssessment(assessment, userId, actorRole);

const index = this.db.assessments.indexOf(assessment);
this.db.assessments.splice(index, 1);
return { success: true };
}

// OUTCOMES_TRACKING_PLAN.md: which Course Outcomes this assessment
// measures â€” whole-assessment granularity, not per-question. A mark
// entered against this assessment (see Marks below) now feeds every CO
// listed here when computing a student's mastery (common/outcome-mastery.ts).
@Put('assessments/:id/outcomes')
@Roles('faculty')
@ApiOperation({ summary: 'Replace which Course Outcomes this assessment measures' })
@ApiBody({ schema: { type: 'object', additionalProperties: true } })
async setAssessmentOutcomes(
@Param('id') id: string,
@Body() body: { lo_ids: string[] },
@CurrentUserId() userId: string,
@CurrentUserCollegeId() actorCollegeId: string | null,
) {
const assessment = this.db.assessments.find((a) => a.assessment_id === id);
if (!isSameCollege(assessment, actorCollegeId)) notFoundInMyCollege('Assessment');
// Same ownership rule recordMarks() already enforces: only the faculty
// who created this assessment may change it.
if (assessment.faculty_id !== userId) notFoundInMyCollege('Assessment');
if (!Array.isArray(body?.lo_ids))
throw new BadRequestException(
errorBody(ErrorCode.BUSINESS_RULE_VIOLATION, 'lo_ids must be an array'),
);
const validLoIds = new Set(
this.db.learning_outcomes
.filter((lo) => lo.course_id === assessment.course_id)
.map((lo) => lo.lo_id),
);
assessment.lo_ids = body.lo_ids.filter((id2) => validLoIds.has(id2));
this.db.persist();
return { success: true, data: assessment };
}

// â”€â”€ Marks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
@Get('marks')
@Roles('faculty', 'admin', 'head', 'superadmin')
@ApiOperation({
summary: 'Get all marks entries, optionally filtered by assessment_id',
})
async getMarks(
@Query('assessment_id') assessmentId: string | undefined,
@CurrentUserCollegeId() collegeId: string | null,
) {
const scoped = scopeToCollege(this.db.marks_entry, collegeId);
const list = assessmentId
? scoped.filter((m) => m.assessment_id === assessmentId)
: scoped;
return list.map((m) => {
const student = this.db.students.find((s) => s.user_id === m.student_id);
return {
...m,
student_name: student
? `${student.first_name} ${student.last_name}`.trim()
: m.student_id,
};
});
}

@Post('marks')
@Roles('faculty', 'admin', 'head', 'superadmin')
@ApiOperation({ summary: 'Record marks for a student (locked once entered)' })
@ApiBody({ schema: { type: 'object', additionalProperties: true } })
async recordMarks(
@Body() body: any,
@CurrentUserId() userId: string,
@CurrentUserRole() actorRole: string,
@CurrentUserCollegeId() actorCollegeId: string | null,
) {
if (!body.student_id || !body.assessment_id)
throw new BadRequestException(
errorBody(
ErrorCode.BUSINESS_RULE_VIOLATION,
'student_id and assessment_id required',
),
);
const collegeId = writeCollegeId(actorCollegeId);
// The assessment is client-supplied â€” without this a faculty member
// could post marks against an assessment they didn't create (mixing
// into another section's, or another faculty's, gradebook), and for a
// student who was never enrolled in it at all.
const assessment = this.db.assessments.find(
(a) => a.assessment_id === body.assessment_id,
);
if (!isSameCollege(assessment, collegeId)) notFoundInMyCollege('Assessment');
if (actorRole === 'faculty' && assessment.faculty_id !== userId)
notFoundInMyCollege('Assessment');
const enrolled = this.db.enrollment.find(
(e) =>
e.student_id === body.student_id &&
e.course_id === assessment.course_id &&
(!assessment.section || e.section === assessment.section),
);
if (!enrolled)
throw new BadRequestException(
errorBody(
ErrorCode.BUSINESS_RULE_VIOLATION,
'That student is not enrolled in this assessment\'s course/section.',
),
);
// Marks lock: reject if already entered. Scoped so the lock is per
// college â€” the assessment_id namespace is already college-specific by
// construction (created scoped, above), but the lock check stays
// explicit for the same reason every read here is: uniform, greppable.
const existing = scopeToCollege(this.db.marks_entry, collegeId).find(
(m) =>
m.student_id === body.student_id &&
m.assessment_id === body.assessment_id,
);
if (existing)
throw new BadRequestException(
errorBody(
ErrorCode.DUPLICATE_RESOURCE,
'Marks already entered for this student. Use the edit option to correct them.',
),
);
const id = `m${Date.now()}`;
const entry = { entry_id: id, ...body, college_id: collegeId };
this.db.marks_entry.push(entry);
return { success: true, data: entry };
}

/**
 * FR15: faculty must be able to "enter and update" marks — this was the
 * missing half. A correction, not a silent overwrite: previous_marks_obtained/
 * corrected_by/corrected_at are kept alongside the new value, the same
 * one-level "what it was before this change" trail
 * common/leave-attendance.sync.ts already keeps for its own correction case
 * (previous_status/source). CGPA, course grades, and class-performance never
 * need a code change to reflect this — grading.ts computes all of them fresh
 * on every read, so a corrected mark is simply true from here on. In a small
 * cohort this can shift OTHER students' relative-curve letter grade too —
 * that is the curve working correctly on true data, not a side effect.
 */
@Patch('marks/:id')
@Roles('faculty', 'admin', 'head', 'superadmin')
@ApiOperation({ summary: 'Correct an already-entered mark' })
@ApiBody({ schema: { type: 'object', additionalProperties: true } })
async updateMarks(
@Param('id') id: string,
@Body() body: { marks_obtained: number; feedback_text?: string },
@CurrentUserId() userId: string,
@CurrentUserRole() actorRole: string,
@CurrentUserCollegeId() actorCollegeId: string | null,
) {
const entry = this.db.marks_entry.find((m) => m.entry_id === id);
if (!isSameCollege(entry, actorCollegeId)) notFoundInMyCollege('Marks entry');

const assessment = this.db.assessments.find(
(a) => a.assessment_id === entry.assessment_id,
);
if (actorRole === 'faculty' && assessment?.faculty_id !== userId)
notFoundInMyCollege('Marks entry');

const val = Number(body?.marks_obtained);
if (Number.isNaN(val) || val < 0 || val > Number(entry.max_marks)) {
throw new BadRequestException(
errorBody(
ErrorCode.BUSINESS_RULE_VIOLATION,
`marks_obtained must be between 0 and ${entry.max_marks}`,
),
);
}

entry.previous_marks_obtained = entry.marks_obtained;
entry.marks_obtained = val;
entry.corrected_by = userId;
entry.corrected_at = new Date().toISOString();
if (body?.feedback_text !== undefined) entry.feedback_text = body.feedback_text;
this.db.persist();
return { success: true, data: entry };
}

// â”€â”€ Submissions (online assessments) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
@Get('submissions')
@Roles('student', 'faculty', 'admin', 'head', 'superadmin')
@ApiOperation({
summary: 'Get submissions â€” own for student, all for faculty',
})
async getSubmissions(
@CurrentUserId() userId: string,
@CurrentUserRole() role: string,
@CurrentUserCollegeId() collegeId: string | null,
) {
const scoped = scopeToCollege(this.db.submissions, collegeId);
if (role === 'student') return scoped.filter((s) => s.student_id === userId);
return scoped;
}

@Post('submissions')
@Roles('student')
@ApiOperation({ summary: 'Student submits work for an online assessment' })
@ApiBody({ schema: { type: 'object', additionalProperties: true } })
async createSubmission(
@Body() body: any,
@CurrentUserId() userId: string,
@CurrentUserCollegeId() actorCollegeId: string | null,
) {
if (!body.assessment_id)
throw new BadRequestException(
errorBody(ErrorCode.BUSINESS_RULE_VIOLATION, 'assessment_id required'),
);
// assessment_id is client-supplied â€” previously accepted with no check
// at all, so a student could submit against any assessment_id, in any
// college, for a course they were never enrolled in. Same not-found
// treatment as every other cross-tenant lookup miss in this file: "no
// such assessment" and "not one you're enrolled in" must look identical.
const assessment = this.db.assessments.find(
(a) => a.assessment_id === body.assessment_id,
);
if (!isSameCollege(assessment, actorCollegeId))
notFoundInMyCollege('Assessment');
const enrolled = this.db.enrollment.find(
(e) =>
e.student_id === userId &&
e.course_id === assessment.course_id &&
(!assessment.section || e.section === assessment.section),
);
if (!enrolled) notFoundInMyCollege('Assessment');
// Upsert â€” allow re-submission
const existing = this.db.submissions.find(
(s) => s.student_id === userId && s.assessment_id === body.assessment_id,
);
if (existing) {
existing.submitted_at = new Date().toISOString();
existing.notes = body.notes || existing.notes;
if (body.file_id !== undefined) existing.file_id = body.file_id;
existing.status = 'submitted';
return { success: true, data: existing };
}
const newSub = {
submission_id: `sub${Date.now()}`,
student_id: userId,
assessment_id: body.assessment_id,
notes: body.notes || '',
// Set when the student attached a document via POST /uploads.
file_id: body.file_id ?? null,
submitted_at: new Date().toISOString(),
status: 'submitted',
college_id: writeCollegeId(actorCollegeId),
};
this.db.submissions.push(newSub as any);
return { success: true, data: newSub };
}

// â”€â”€ Attendance â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
@Get('attendance/today/:courseId')
@Roles('faculty')
@ApiOperation({ summary: 'Get enrolled students for today attendance' })
async getTodayAttendance(
@Param('courseId') courseId: string,
@CurrentUserCollegeId() collegeId: string | null,
) {
const course = this.db.courses.find((c) => c.course_id === courseId);
if (!isSameCollege(course, collegeId)) notFoundInMyCollege('Course');
const enrollment = this.db.enrollment.filter((e) => e.course_id === courseId);
const students = this.db.students
.filter((s) => enrollment.map((e) => e.student_id).includes(s.user_id))
.map((s) => ({ ...s, today_status: 'present' }));
return { students, date: new Date().toISOString().split('T')[0] };
}

@Post('attendance')
@Roles('faculty')
@ApiOperation({
summary:
'Record bulk attendance for a course session (idempotent per student/course/date)',
})
@ApiBody({ schema: { type: 'object', additionalProperties: true } })
async recordAttendance(
@Body() body: any,
@CurrentUserCollegeId() actorCollegeId: string | null,
) {
const { course_id, date, records } = body;
if (!course_id || !date || !records)
throw new BadRequestException(
errorBody(
ErrorCode.BUSINESS_RULE_VIOLATION,
'course_id, date, and records required',
),
);
const course = this.db.courses.find((c) => c.course_id === course_id);
if (!isSameCollege(course, actorCollegeId)) notFoundInMyCollege('Course');
const collegeId = writeCollegeId(actorCollegeId);
// M-01: re-submitting the same session updates the existing rows rather than
// appending duplicates. A double-click previously logged the same absence
// twice and permanently skewed the student's attendance percentage.
// H-07: identifiers are UUIDs â€” the old `al${length + idx + 1}` scheme both
// skipped values and re-minted ids that already existed.
const saved: any[] = [];
let created = 0;
let updated = 0;
for (const r of records || []) {
if (!r?.student_id) continue;
const status = normalizeAttendanceStatus(r.status);
const existing = this.db.attendance_log.find(
(a) =>
a.student_id === r.student_id &&
a.course_id === course_id &&
a.date === date,
);
if (existing) {
// Never silently discard an excused absence granted by approved leave.
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

// â”€â”€ Discussions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
@Get('discussions')
@Roles('student', 'faculty', 'admin', 'head', 'superadmin')
@RequiresModule('forum')
@ApiOperation({ summary: 'Get all discussion posts with reply counts' })
async getDiscussions(@CurrentUserCollegeId() collegeId: string | null) {
return scopeToCollege(this.db.discussion_posts, collegeId).map((p) => {
const replies = this.db.discussion_replies.filter(
(r) => r.post_id === p.post_id,
);
return { ...p, reply_count: replies.length };
});
}

@Get('discussions/:postId')
@Roles('student', 'faculty', 'admin', 'head', 'superadmin')
@RequiresModule('forum')
@ApiOperation({ summary: 'Get a single discussion post with all replies' })
async getDiscussionDetail(
@Param('postId') postId: string,
@CurrentUserCollegeId() collegeId: string | null,
) {
const post = this.db.discussion_posts.find((p) => p.post_id === postId);
if (!isSameCollege(post, collegeId)) notFoundInMyCollege('Post');
const replies = this.db.discussion_replies.filter(
(r) => r.post_id === postId,
);
return { ...post, replies };
}

@Post('discussions')
@Roles('student', 'faculty')
@RequiresModule('forum')
@ApiOperation({ summary: 'Create a new discussion post' })
@ApiBody({ schema: { type: 'object', additionalProperties: true } })
async createDiscussion(
@Body() body: any,
@CurrentUserId() userId: string,
@CurrentUserCollegeId() actorCollegeId: string | null,
) {
const user = this.db.users.find((u) => u.user_id === userId);
const student = this.db.students.find((s) => s.user_id === userId);
const faculty = this.db.faculty.find((f) => f.user_id === userId);
const authorName = student
? `${student.first_name} ${student.last_name || ''}`.trim()
: faculty
? `${faculty.first_name} ${faculty.last_name || ''}`.trim()
: user?.username || 'Anonymous';
const id = `p${Date.now()}`;
const newPost = {
post_id: id,
title: body.title,
content: body.content,
author_id: userId,
author_name: authorName,
author_role: user?.role || 'student',
tag: body.tag || 'general',
course_id: body.course_id,
created_at: new Date().toISOString(),
reply_count: 0,
college_id: writeCollegeId(actorCollegeId),
};
this.db.discussion_posts.push(newPost as any);
return newPost;
}

@Post('discussions/:postId/replies')
@Roles('student', 'faculty')
@RequiresModule('forum')
@ApiOperation({ summary: 'Reply to a discussion post' })
@ApiBody({ schema: { type: 'object', additionalProperties: true } })
async createReply(
@Param('postId') postId: string,
@Body() body: any,
@CurrentUserId() userId: string,
@CurrentUserCollegeId() actorCollegeId: string | null,
) {
const post = this.db.discussion_posts.find((p) => p.post_id === postId);
if (!isSameCollege(post, actorCollegeId)) notFoundInMyCollege('Post');
const user = this.db.users.find((u) => u.user_id === userId);
const student = this.db.students.find((s) => s.user_id === userId);
const faculty = this.db.faculty.find((f) => f.user_id === userId);
const authorName = student
? `${student.first_name} ${student.last_name || ''}`.trim()
: faculty
? `${faculty.first_name} ${faculty.last_name || ''}`.trim()
: user?.username || 'Anonymous';
const id = `r${Date.now()}`;
const newReply = {
reply_id: id,
post_id: postId,
author_id: userId,
author_name: authorName,
author_role: user?.role,
content: body.content,
created_at: new Date().toISOString(),
college_id: writeCollegeId(actorCollegeId),
};
this.db.discussion_replies.push(newReply as any);
post.reply_count = (post.reply_count || 0) + 1;
return newReply;
}

// â”€â”€ Research â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
@Get('research')
@Roles('student', 'faculty', 'admin', 'head', 'superadmin')
@RequiresModule('research')
@ApiOperation({ summary: 'Get research projects filtered by role' })
async getResearch(
@CurrentUserId() userId: string,
@CurrentUserRole() role: string,
@CurrentUserCollegeId() collegeId: string | null,
) {
const enrich = (p: any) => {
const sup = this.db.faculty.find((f) => f.user_id === p.supervisor_id);
const stuList = (p.students || []).map((s: any) => {
const stu = this.db.students.find((st) => st.user_id === s.user_id);
return {
...s,
first_name: stu?.first_name || s.first_name,
last_name: stu?.last_name || s.last_name || '',
};
});
return {
...p,
supervisor_name: sup
? `${sup.first_name} ${sup.last_name}`.trim()
: p.supervisor_name,
students: stuList,
};
};
const scoped = scopeToCollege(this.db.research_projects, collegeId);
if (role === 'faculty')
return scoped.filter((p) => p.supervisor_id === userId).map(enrich);
if (role === 'student')
return scoped
.filter((p) => p.students.some((s) => s.user_id === userId))
.map(enrich);
return scoped.map(enrich);
}

@Patch('research/:id/status')
@Roles('faculty', 'admin', 'head', 'superadmin')
@RequiresModule('research')
@ApiOperation({ summary: 'Update research project status' })
@ApiBody({ schema: { type: 'object', additionalProperties: true } })
async updateResearchStatus(
@Param('id') id: string,
@Body() body: { status: string },
@CurrentUserCollegeId() collegeId: string | null,
) {
const project = this.db.research_projects.find((p) => p.project_id === id);
if (!isSameCollege(project, collegeId)) notFoundInMyCollege('Project');
project.status = body.status;
return project;
}

@Patch('research/:id/progress')
@Roles('student', 'faculty', 'admin', 'head', 'superadmin')
@RequiresModule('research')
@ApiOperation({
summary:
'Update research project progress, submission notes, or faculty feedback',
})
@ApiBody({ schema: { type: 'object', additionalProperties: true } })
async updateResearchProgress(
@Param('id') id: string,
@Body() body: any,
@CurrentUserCollegeId() collegeId: string | null,
) {
const project = this.db.research_projects.find((p) => p.project_id === id);
if (!isSameCollege(project, collegeId)) notFoundInMyCollege('Project');
// Only update progress if explicitly provided (don't zero it out)
if (body.progress !== undefined && body.progress !== null)
project.progress = Number(body.progress);
if (body.submission_notes !== undefined)
project.submission_notes = body.submission_notes;
if (body.faculty_feedback !== undefined)
project.faculty_feedback = body.faculty_feedback;
// research_projects.uploads already exists as an array in the schema, so a
// milestone document is appended rather than overwriting the previous one.
if (body.file_id) {
const uploads = (project.uploads ??= []);
if (!uploads.some((u: any) => u?.file_id === body.file_id)) {
uploads.push({
file_id: body.file_id,
original_name: body.file_name ?? null,
uploaded_at: new Date().toISOString(),
});
}
}
this.db.persist();
return project;
}

@Post('research')
@Roles('faculty', 'admin', 'head', 'superadmin')
@RequiresModule('research')
@ApiOperation({
summary: 'Create a new research/BTP project and assign to a student',
})
@ApiBody({ schema: { type: 'object', additionalProperties: true } })
async createResearch(
@Body() body: any,
@CurrentUserId() userId: string,
@CurrentUserCollegeId() actorCollegeId: string | null,
) {
if (!body.student_id || !body.title)
throw new BadRequestException(
errorBody(
ErrorCode.BUSINESS_RULE_VIOLATION,
'student_id and title are required',
),
);
const student = this.db.students.find((s) => s.user_id === body.student_id);
// Same not-found for "no such student" and "that student is not in your
// college" â€” a faculty member must not be able to probe another
// college's roster by trying student ids and reading the error shape.
if (!isSameCollege(student, actorCollegeId))
notFoundInMyCollege('Student');
const faculty = this.db.faculty.find((f) => f.user_id === userId);
const supervisorName = faculty
? `${faculty.first_name} ${faculty.last_name}`.trim()
: 'Faculty';
const studentName =
`${student.first_name} ${student.last_name || ''}`.trim();
const id = `rp${Date.now()}`;
const newProject = {
project_id: id,
title: body.title,
abstract: body.abstract || '',
supervisor_id: userId,
supervisor_name: supervisorName,
student_id: body.student_id,
student_name: studentName,
status: body.status || 'active',
progress: body.progress || 0,
students: [{ user_id: body.student_id, first_name: student.first_name }],
uploads: [],
milestones: [],
college_id: writeCollegeId(actorCollegeId),
};
this.db.research_projects.push(newProject as any);
return { success: true, data: newProject };
}

// â”€â”€ Events â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
@Get('events')
@Roles('student', 'faculty', 'admin', 'head', 'superadmin')
@ApiOperation({ summary: 'Get all scheduled events' })
@ApiResponse({ status: 200, description: 'Array of events' })
async getEvents(@CurrentUserCollegeId() collegeId: string | null) {
return scopeToCollege(this.db.events, collegeId);
}

@Post('events')
@Roles('admin', 'superadmin', 'head', 'faculty')
@ApiOperation({ summary: 'Create a new institutional event' })
@ApiBody({ schema: { type: 'object', additionalProperties: true } })
async createEvent(
@Body() body: any,
@CurrentUserCollegeId() actorCollegeId: string | null,
) {
if (!body.event_name || !body.date || !body.venue)
throw new BadRequestException(
errorBody(
ErrorCode.BUSINESS_RULE_VIOLATION,
'event_name, date, and venue are required',
),
);
const id = `ev${Date.now()}`;
const newEvent = { event_id: id, ...body, college_id: writeCollegeId(actorCollegeId) };
this.db.events.push(newEvent);
return { success: true, data: newEvent };
}

@Put('events/:id')
@Roles('admin', 'superadmin', 'head', 'faculty')
@ApiOperation({ summary: 'Update an existing event' })
@ApiBody({ schema: { type: 'object', additionalProperties: true } })
async updateEvent(
@Param('id') id: string,
@Body() body: any,
@CurrentUserCollegeId() collegeId: string | null,
) {
const event = this.db.events.find((e) => e.event_id === id);
if (!isSameCollege(event, collegeId)) notFoundInMyCollege('Event');
Object.assign(event, body);
return { success: true, data: event };
}

@Delete('events/:id')
@Roles('admin', 'superadmin', 'head', 'faculty')
@ApiOperation({ summary: 'Delete an event' })
async deleteEvent(
@Param('id') id: string,
@CurrentUserCollegeId() collegeId: string | null,
) {
const event = this.db.events.find((e) => e.event_id === id);
if (!isSameCollege(event, collegeId)) notFoundInMyCollege('Event');
const index = this.db.events.indexOf(event);
this.db.events.splice(index, 1);
return { success: true, message: 'Event deleted' };
}

// â”€â”€ Leave â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
@Get('leave')
@Roles('faculty', 'admin', 'head', 'superadmin')
@ApiOperation({
summary: 'Get faculty leave applications â€” own for faculty, all for admin/head/superadmin. Student absence excusal now goes through /attendance-request instead (see ATTENDANCE_WORKFLOW_REVAMP notes).',
})
async getLeaves(
@CurrentUserId() userId: string,
@CurrentUserRole() role: string,
@CurrentUserCollegeId() collegeId: string | null,
) {
const scoped = scopeToCollege(this.db.leave_applications, collegeId);
if (role === 'faculty') return scoped.filter((l) => l.student_id === userId);

// Admin/head/superadmin see all of THEIR college's leaves (for approval).
return scoped;
}

@Post('leave')
@Roles('faculty')
@ApiOperation({ summary: 'Submit a new leave application' })
@ApiBody({ schema: { type: 'object', additionalProperties: true } })
async applyLeave(
@Body() body: any,
@CurrentUserId() userId: string,
@CurrentUserCollegeId() actorCollegeId: string | null,
) {
if (
!body.leave_type ||
!body.start_date ||
!body.end_date ||
!body.reason
) {
throw new BadRequestException(
errorBody(
ErrorCode.BUSINESS_RULE_VIOLATION,
'leave_type, start_date, end_date, and reason are required',
),
);
}
const user = this.db.users.find((u) => u.user_id === userId);
const student = this.db.students.find((s) => s.user_id === userId);
const studentName = student
? `${student.first_name} ${student.last_name || ''}`.trim()
: user?.username || 'Unknown';
const id = `l${Date.now()}`;
const newLeave = {
leave_id: id,
student_id: userId,
student_name: studentName,
status: 'pending',
applied_on: new Date().toISOString().split('T')[0],
...body,
// M-09: canonicalise on write. The student form posts lowercase ("medical")
// while seed data was capitalised ("Medical"), so exact-match filters
// downstream matched nothing. One vocabulary from here on.
leave_type: normalizeLeaveType(body.leave_type),
college_id: writeCollegeId(actorCollegeId),
};
this.db.leave_applications.push(newLeave);
return { success: true, data: newLeave };
}

@Patch('leave/:id')
@Roles('admin', 'head', 'superadmin')
@ApiOperation({
summary: 'Approve or reject a leave application (syncs excused attendance)',
})
@ApiBody({ schema: { type: 'object', additionalProperties: true } })
async updateLeave(
@Param('id') id: string,
@Body() body: { status: string },
@CurrentUserCollegeId() collegeId: string | null,
) {
const leave = this.db.leave_applications.find((l) => l.leave_id === id);
if (!isSameCollege(leave, collegeId))
notFoundInMyCollege('Leave application');
const status = String(body?.status ?? '')
.trim()
.toLowerCase();
if (!['pending', 'approved', 'rejected'].includes(status)) {
throw new BadRequestException(
errorBody(
ErrorCode.BUSINESS_RULE_VIOLATION,
'status must be one of: pending, approved, rejected',
),
);
}
leave.status = status;
this.db.persist();
// M-02: approved leave now writes EXCUSED sessions across the leave window so
// the student is not marked absent for time the institution authorised.
// Reverting the approval removes exactly what it added.
const attendance = syncLeaveAttendance(this.db, leave, status, collegeId);
return { success: true, data: leave, attendance };
}

// â”€â”€ Users â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
@Get('users')
@Roles('admin', 'superadmin', 'head')
@ApiOperation({ summary: 'Get all system users' })
async getUsers(@CurrentUserCollegeId() collegeId: string | null) {
return scopeToCollege(this.db.users, collegeId).map(sanitizeUser);
}

@Get('admin/users')
@Roles('admin', 'head', 'superadmin', 'faculty')
@ApiOperation({ summary: 'Get all users for admin management panel' })
async getAllUsers(@CurrentUserCollegeId() collegeId: string | null) {
// Enriched with branch (students) / designation (faculty) so
// UserManagement.jsx's type+branch filters have something to filter on —
// the base `users` row sanitizeUser() works from carries neither. This
// join is read-only and NOT mirrored on the create/update/role mutation
// endpoints below (those keep returning the bare sanitizeUser shape) —
// safe only because UserManagement.jsx already does a full
// fetchAllUsers() refetch after every create/edit, so the enrichment is
// never actually left stale in the one UI that reads it.
const students = this.db.students as any[];
const faculty = this.db.faculty as any[];
return scopeToCollege(this.db.users, collegeId).map((u: any) => {
const safe: any = sanitizeUser(u);
if (u.role === 'student') {
safe.branch = students.find((s) => s.user_id === u.user_id)?.branch || null;
} else if (u.role === 'faculty') {
safe.designation = faculty.find((f) => f.user_id === u.user_id)?.designation || null;
}
return safe;
});
}

@Post('users')
// 'spoc' added alongside the existing three. The ceiling check just below
// is what actually restricts a SPOC to creating 'admin' accounts â€” see
// ROLE_GRANTS in common/dto/user.dto.ts. Without 'spoc' here, the guard
// (roles.guard.ts) would 403 a SPOC before this handler ever ran.
@Roles('admin', 'superadmin', 'head', 'spoc')
@StrictBody()
@ApiOperation({ summary: 'Create a new system user' })
@ApiBody({ type: CreateUserDto })
async createUser(
@Body() body: CreateUserDto,
@CurrentUserRole() actorRole: string,
@CurrentUserCollegeId() actorCollegeId: string | null,
) {
// C-04: a privilege ceiling now applies. Previously any of admin/head/superadmin
// could create an account with any role, contradicting the documented rule that
// an Academic Head cannot create Academic Heads or Super Admins.
if (!canAssignRole(actorRole, body.role)) {
throw new ForbiddenException(
errorBody(
ErrorCode.PRIVILEGE_CEILING,
`Your role (${actorRole || 'unknown'}) may only create users with role: ${rolesAssignableBy(actorRole).join(', ') || 'none'}`,
{ actorRole, assignable: rolesAssignableBy(actorRole) },
),
);
}
// Email stays a GLOBAL uniqueness check, not scoped â€” it is the login
// identifier across the whole app, not a per-college one. Case-insensitive:
// "Name@Example.com" and "name@example.com" are the same account.
const newEmail = normalizeEmail(body.email);
if (this.db.users.find((u) => normalizeEmail(u.email) === newEmail))
throw new BadRequestException(
errorBody(ErrorCode.DUPLICATE_RESOURCE, 'Email already exists'),
);
if (!body.password) {
throw new BadRequestException(
errorBody(
ErrorCode.BUSINESS_RULE_VIOLATION,
'An initial password is required when creating a user',
),
);
}
// The new account's college, resolved server-side â€” never from the
// request body, or a SPOC could plant an admin in a college that is not
// theirs. Two cases:
//   * A SPOC, admin or head has a college â€” every one of those roles is
//     scoped to exactly one (see TENANT_ISOLATION_DIAGNOSIS.md) â€” and the
//     account they create inherits it exactly.
//   * superadmin has none of its own (the vendor operator, not tied to
//     any college), so writeCollegeId() below falls back to
//     DEFAULT_COLLEGE_ID. Superadmin normally provisions a college
//     through POST /billing/colleges, not this route; the fallback only
//     matters for a manual account creation outside that flow.
if (actorRole === 'spoc' && !actorCollegeId) {
// Unreachable in practice â€” a SPOC is never provisioned without a
// college â€” but a 500 here is the honest response to a misconfigured
// account, not a 403 the caller could mistake for something they did.
throw new InternalServerErrorException(
errorBody(
ErrorCode.MISCONFIGURATION,
'This SPOC account has no college on record.',
),
);
}
const collegeId = writeCollegeId(actorCollegeId);
// SPOC_BILLING_ENFORCEMENT_DIAGNOSIS.md bug 2: the plan's seat cap was
// never consulted here. Only student/faculty accounts are seats â€”
// admin/head/spoc/superadmin are staff, not something the plan meters.
if (body.role === 'student' || body.role === 'faculty') {
assertSeatAvailable(this.db, collegeId, body.role);
}
const id = `u${Date.now()}`;
const firstName = body.first_name || body.username || 'New';
const newUser = {
user_id: id,
username: body.username || body.first_name || newEmail.split('@')[0],
first_name: firstName,
last_name: body.last_name || '',
email: newEmail,
phone: body.phone || '',
role: body.role,
college_id: collegeId,
// Hashed, never stored in the clear. The previous default of the literal
// string 'password' meant any account created without one shipped with a
// known credential.
password_hash: await this.passwordService.hash(body.password),
};
this.db.users.push(newUser);
if (body.role === 'student') {
this.db.students.push({
user_id: id,
first_name: firstName,
last_name: body.last_name || '',
branch: 'CSE',
batch: '2024-2028',
// null, not a placeholder number — StudentsService.getProfile()/getGrades()
// now surface a non-null students[].cgpa as a real starting baseline (see
// bulk-onboard's own cgpa field) until the student has real computed
// grades. A fake 7.0 here would show up as if it meant something.
cgpa: null,
section: 'A',
email: newEmail,
join_date: new Date().toISOString().split('T')[0],
dob: '2005-01-01',
phone: body.phone || '',
college_id: collegeId,
});
} else if (body.role === 'faculty') {
this.db.faculty.push({
user_id: id,
first_name: firstName,
last_name: body.last_name || '',
designation: 'Assistant Professor',
department_id: 'dept1',
email: newEmail,
phone: body.phone || '',
college_id: collegeId,
});
}
return { success: true, data: sanitizeUser(newUser) };
}

/**
 * Bulk student/faculty onboarding from a roster CSV — the explicit use case
 * is a Google Form export compiled into a sheet, so headers are matched
 * loosely (bulk-onboard.util.ts) rather than requiring an exact column
 * name. Every row is independent: one bad row (missing email, duplicate,
 * seat limit hit) is skipped and reported, never aborts the rest of the
 * file — same "report what happened, don't all-or-nothing it" convention
 * scripts/seed-postgres.ts already uses for its own bulk import.
 *
 * Reuses the exact same rules createUser() enforces per account (privilege
 * ceiling, global email uniqueness, seat availability, password hashing) —
 * those live in shared functions already, so there's nothing to duplicate
 * but the "assemble one row's user record" shape, which differs enough
 * (more columns, defaults instead of a required DTO) that sharing it with
 * createUser would cost more clarity than it saves.
 */
@Post('users/bulk-onboard')
@Roles('admin', 'superadmin', 'head', 'spoc')
@UseInterceptors(FileInterceptor('file', BULK_ONBOARD_UPLOAD_OPTIONS))
@ApiConsumes('multipart/form-data')
@ApiOperation({
summary: 'Bulk-create student/faculty accounts from a roster CSV',
})
@ApiBody({
schema: {
type: 'object',
required: ['file'],
properties: {
file: { type: 'string', format: 'binary' },
role: { type: 'string', enum: ['student', 'faculty'] },
},
},
})
async bulkOnboardUsers(
@UploadedFile() file: Express.Multer.File | undefined,
@Query('role') defaultRoleRaw: string | undefined,
@CurrentUserRole() actorRole: string,
@CurrentUserCollegeId() actorCollegeId: string | null,
) {
if (!file) {
throw new BadRequestException(
errorBody(
ErrorCode.VALIDATION_FAILED,
'No file was uploaded. Send it as multipart/form-data under the field "file".',
),
);
}
const defaultRole = (defaultRoleRaw || 'student').trim().toLowerCase();
if (defaultRole !== 'student' && defaultRole !== 'faculty') {
throw new BadRequestException(
errorBody(ErrorCode.VALIDATION_FAILED, '"role" must be "student" or "faculty" when given.'),
);
}

let rows: Record<string, string>[];
try {
rows = parseCsv(file.buffer, { columns: true, skip_empty_lines: true, trim: true, bom: true });
} catch (err: any) {
throw new BadRequestException(
errorBody(ErrorCode.VALIDATION_FAILED, `Could not parse CSV: ${err.message}`),
);
}
if (!rows.length) {
throw new BadRequestException(errorBody(ErrorCode.VALIDATION_FAILED, 'The CSV has no data rows.'));
}

const collegeId = writeCollegeId(actorCollegeId);
const unrecognizedHeaders = new Set<string>();
const seenEmails = new Set<string>();
const results: Record<string, any>[] = [];
let created = 0;

for (let i = 0; i < rows.length; i++) {
const rowNum = i + 2; // header is row 1
const fields = mapRowToCanonicalFields(rows[i], unrecognizedHeaders);
const role = (fields.role || defaultRole).trim().toLowerCase();
const email = fields.email ? normalizeEmail(fields.email) : '';

const skip = (reason: string) => {
results.push({ row: rowNum, email: fields.email || null, status: 'skipped', reason });
};

if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
skip('missing or invalid email');
continue;
}
if (!fields.first_name) {
skip('missing name');
continue;
}
if (role !== 'student' && role !== 'faculty') {
skip(`unsupported role "${role}" — only student/faculty may be bulk-onboarded`);
continue;
}
if (!canAssignRole(actorRole, role)) {
skip(`your role may not create "${role}" accounts`);
continue;
}
if (seenEmails.has(email)) {
skip('duplicate email within this file');
continue;
}
if (this.db.users.find((u: any) => normalizeEmail(u.email) === email)) {
skip('email already exists');
continue;
}
seenEmails.add(email);

try {
assertSeatAvailable(this.db, collegeId, role as 'student' | 'faculty');
} catch (err: any) {
skip(err?.getResponse?.()?.message || err.message || 'seat limit exceeded');
continue;
}

const generatedPassword = fields.password ? null : randomRosterPassword();
const password = fields.password || generatedPassword!;
const id = `u${Date.now()}${i}`;
const newUser = {
user_id: id,
username: fields.first_name,
first_name: fields.first_name,
last_name: fields.last_name || '',
email,
phone: fields.phone || '',
role,
college_id: collegeId,
password_hash: await this.passwordService.hash(password),
};
this.db.users.push(newUser);

if (role === 'student') {
this.db.students.push({
user_id: id,
first_name: fields.first_name,
last_name: fields.last_name || '',
branch: fields.branch || 'Unspecified',
batch: fields.batch || '',
// null (not 0) when the roster didn't give one — StudentsService reads
// this as "no admin-provided starting CGPA yet", same as a brand-new
// account with nothing on record; 0 would read as a real, very bad grade.
cgpa: fields.cgpa ? Number(fields.cgpa) : null,
// No section — it isn't decided at roster-upload time (a real section
// assignment happens later). Every read site that matches on section
// already falls back to 'A' when one isn't set yet (see e.g.
// common.controller.ts's own `student?.section || 'A'` reads), so
// leaving this unset here is consistent with that convention, not a gap.
email,
join_date: new Date().toISOString().split('T')[0],
dob: '2005-01-01',
phone: fields.phone || '',
college_id: collegeId,
});
} else {
this.db.faculty.push({
user_id: id,
first_name: fields.first_name,
last_name: fields.last_name || '',
designation: fields.designation || 'Assistant Professor',
department_id: fields.department_id || 'dept1',
email,
phone: fields.phone || '',
college_id: collegeId,
});
}

created++;
results.push({
row: rowNum,
email,
status: 'created',
user_id: id,
role,
...(generatedPassword ? { generated_password: generatedPassword } : {}),
});
}

this.db.persist();

return {
success: true,
data: {
total_rows: rows.length,
created,
skipped: rows.length - created,
unrecognized_headers: [...unrecognizedHeaders],
results,
},
};
}

@Put('users/:id')
@Roles('admin', 'superadmin', 'head')
@StrictBody()
@ApiOperation({
summary: 'Update a user profile (role and password are not accepted here)',
})
@ApiBody({ type: UpdateUserDto })
async updateUser(
@Param('id') id: string,
@Body() body: UpdateUserDto,
@Req() req: any,
@CurrentUserCollegeId() collegeId: string | null,
) {
// C-04: refuse privilege-bearing fields outright. The old
// `Object.assign(user, body)` let a caller escalate privileges, seize an
// account, or corrupt the primary key from this one endpoint.
rejectProtectedFields(req?.body);
const user = this.db.users.find((u) => u.user_id === id);
if (!isSameCollege(user, collegeId)) notFoundInMyCollege('User');
// Case-insensitive, same as creation: compare and store the normalized
// form so "Name@Example.com" doesn't collide with (or fail to collide
// with) "name@example.com" depending on which case was typed.
const newEmail = body.email ? normalizeEmail(body.email) : undefined;
if (
newEmail &&
newEmail !== normalizeEmail(user.email) &&
this.db.users.find((u) => normalizeEmail(u.email) === newEmail && u.user_id !== id)
) {
throw new BadRequestException(
errorBody(
ErrorCode.DUPLICATE_RESOURCE,
'Email already in use by another account',
),
);
}
const changes = pickDefined(body);
if (newEmail) changes.email = newEmail;
Object.assign(user, changes);
this.db.persist();
this.syncProfileRecords(id, changes);
return { success: true, data: sanitizeUser(user) };
}

@Patch('users/:id/role')
@Roles('admin', 'superadmin', 'head')
@StrictBody()
@ApiOperation({
summary: 'Change a user role (subject to the caller privilege ceiling)',
})
@ApiBody({ type: UpdateUserRoleDto })
async updateUserRole(
@Param('id') id: string,
@Body() body: UpdateUserRoleDto,
@CurrentUserRole() actorRole: string,
@CurrentUserId() actorId: string,
@CurrentUserCollegeId() collegeId: string | null,
) {
const user = this.db.users.find((u) => u.user_id === id);
if (!isSameCollege(user, collegeId)) notFoundInMyCollege('User');
if (actorId && actorId === id) {
throw new ForbiddenException(
errorBody(
ErrorCode.PRIVILEGE_CEILING,
'You cannot change your own role',
),
);
}
// The caller must be permitted to grant the new role AND to manage the role
// the account currently holds, so a head cannot demote or hijack a superadmin.
if (!canAssignRole(actorRole, body.role)) {
throw new ForbiddenException(
errorBody(
ErrorCode.PRIVILEGE_CEILING,
`Your role (${actorRole || 'unknown'}) may only assign: ${rolesAssignableBy(actorRole).join(', ') || 'none'}`,
{ actorRole, assignable: rolesAssignableBy(actorRole) },
),
);
}
if (!canAssignRole(actorRole, user.role)) {
throw new ForbiddenException(
errorBody(
ErrorCode.PRIVILEGE_CEILING,
`Your role (${actorRole || 'unknown'}) may not modify a ${user.role} account`,
{ actorRole, targetRole: user.role },
),
);
}
user.role = body.role;
this.db.persist();
return { success: true, data: sanitizeUser(user) };
}

@Patch('users/:id/password')
@Roles('admin', 'superadmin')
@StrictBody()
@ApiOperation({ summary: 'Administrative password reset' })
@ApiBody({ type: ResetUserPasswordDto })
async resetUserPassword(
@Param('id') id: string,
@Body() body: ResetUserPasswordDto,
@CurrentUserRole() actorRole: string,
@CurrentUserCollegeId() collegeId: string | null,
) {
const user = this.db.users.find((u) => u.user_id === id);
if (!isSameCollege(user, collegeId)) notFoundInMyCollege('User');
if (!canAssignRole(actorRole, user.role)) {
throw new ForbiddenException(
errorBody(
ErrorCode.PRIVILEGE_CEILING,
`Your role (${actorRole || 'unknown'}) may not reset a ${user.role} password`,
{ actorRole, targetRole: user.role },
),
);
}
user.password_hash = await this.passwordService.hash(body.new_password);
delete user.password; // drop any legacy plaintext field left on the record
this.db.persist();
return { success: true, message: 'Password reset successfully' };
}

/** Keep the denormalised student/faculty profile rows in step with the user record. */
private syncProfileRecords(userId: string, changes: Partial<UpdateUserDto>) {
const fields = ['first_name', 'last_name', 'email', 'phone'] as const;
let touched = false;
for (const collection of [this.db.students, this.db.faculty]) {
const profile = collection.find((p: any) => p.user_id === userId);
if (!profile) continue;
for (const f of fields) {
if (changes[f] !== undefined) {
profile[f] = changes[f];
touched = true;
}
}
}
if (touched) this.db.persist();
}

@Delete('users/:id')
@Roles('admin', 'superadmin', 'head')
@ApiOperation({ summary: 'Delete a user' })
async deleteUser(
@Param('id') id: string,
@CurrentUserId() actorId: string,
@CurrentUserRole() actorRole: string,
@CurrentUserCollegeId() collegeId: string | null,
) {
// Self-deletion guard: an actor may never delete their own account.
if (actorId === id) {
throw new ForbiddenException(
errorBody(
ErrorCode.PRIVILEGE_CEILING,
'You cannot delete your own account',
),
);
}
const user = this.db.users.find((u) => u.user_id === id);
if (!isSameCollege(user, collegeId)) notFoundInMyCollege('User');

// Privilege ceiling on delete (the gap this fix closes). Same not-found
// shape as every other cross-college lookup, so a caller cannot tell a
// protected record from an absent one; but the role check here is what
// stops an admin/head from deleting other admins, heads, or the spoc.
if (!canDeleteRole(actorRole, user.role)) {
throw new ForbiddenException(
errorBody(
ErrorCode.PRIVILEGE_CEILING,
`Your role (${actorRole}) cannot delete a ${user.role} account`,
{ actorRole, targetRole: user.role },
),
);
}
const index = this.db.users.indexOf(user);
this.db.users.splice(index, 1);
return { success: true, message: 'User deleted' };
}

// â”€â”€ Reports â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
@Get('reports/overview')
@Roles('admin', 'head', 'superadmin')
@ApiOperation({ summary: 'Get high-level institutional overview metrics' })
async getOverview(@CurrentUserCollegeId() collegeId: string | null) {
const fees = scopeToCollege(this.db.fees, collegeId);
const students = scopeToCollege(this.db.students, collegeId);
const faculty = scopeToCollege(this.db.faculty, collegeId);
const courses = scopeToCollege(this.db.courses, collegeId);
const research = scopeToCollege(this.db.research_projects, collegeId);
const totalFees = fees.reduce((s, f) => s + f.amount, 0);
const paidFees = fees
.filter((f) => f.status === 'paid')
.reduce((s, f) => s + f.amount, 0);
// OUTCOMES_TRACKING_PLAN.md: real now â€” the average, across every student
// with at least one gradeable Course Outcome, of their own CO mastery
// (common/outcome-mastery.ts). Was a hardcoded '3.4/4.0' before this.
// placement_rate/student_satisfaction remain placeholders â€” nothing in this
// schema tracks placements or a satisfaction survey, so there is no real
// number to compute here; out of scope for this pass, tracked separately.
const coAttainment = collegeAverageCoMastery(this.db, collegeId);
const studentIds = new Set(students.map((s: any) => s.user_id));
const attendanceRecords = excludeHolidays(
this.db,
this.db.attendance_log.filter((a: any) => studentIds.has(a.student_id)),
collegeId,
);
const overallAttendance = summariseAttendance(attendanceRecords);
return {
summary: {
total_students: students.length,
total_faculty: faculty.length,
total_courses: courses.length,
active_research: research.filter((p) => p.status === 'active').length,
overall_attendance:
attendanceRecords.length > 0 ? `${overallAttendance.percentage}%` : 'No data yet',
fee_compliance:
totalFees > 0 ? `${Math.round((paidFees / totalFees) * 100)}%` : '0%',
avg_co_attainment: coAttainment === null ? 'No data yet' : `${coAttainment}%`,
},
kpis: { placement_rate: '94%', student_satisfaction: '4.2/5' },
};
}

/**
 * Faculty + student metrics for the User Management portal, filterable by
 * course or semester (a student has no semester field of its own —
 * semester lives on courses, so "semester-wise" means "enrolled in a
 * course belonging to that semester," derived via enrollment the same way
 * every other per-course student query in this file already works).
 *
 * With no filter, every student/faculty record counts, matching
 * reports/overview's own convention. With a filter, only students actually
 * enrolled in a matching course (and faculty teaching one) count — the
 * filter narrows who's measured, not just which courses are listed.
 */
@Get('metrics/academic')
@Roles('admin', 'head', 'superadmin')
@ApiOperation({ summary: 'Faculty/student metrics, filterable by course or semester' })
async getAcademicMetrics(
@Query('course_id') courseId: string | undefined,
@Query('semester') semesterRaw: string | undefined,
@CurrentUserCollegeId() collegeId: string | null,
) {
const semester =
semesterRaw !== undefined && semesterRaw !== '' ? Number(semesterRaw) : undefined;
if (semester !== undefined && (!Number.isInteger(semester) || semester < 1)) {
throw new BadRequestException(
errorBody(ErrorCode.BUSINESS_RULE_VIOLATION, 'semester must be a positive integer'),
);
}
const filterActive = !!courseId || semester !== undefined;

const courses = scopeToCollege(this.db.courses, collegeId);
const matchingCourseIds = new Set(
courses
.filter(
(c: any) =>
(!courseId || c.course_id === courseId) &&
(semester === undefined || c.semester === semester),
)
.map((c: any) => c.course_id),
);

const enrollment = scopeToCollege(this.db.enrollment, collegeId).filter(
(e: any) => e.status === 'active' && matchingCourseIds.has(e.course_id),
);

const allStudents = scopeToCollege(this.db.students, collegeId);
const enrolledStudentIds = new Set(enrollment.map((e: any) => e.student_id));
const students = filterActive
? allStudents.filter((s: any) => enrolledStudentIds.has(s.user_id))
: allStudents;

const cgpas = students
.map((s: any) => computeCGPA(this.db, s.user_id).cgpa)
.filter((v: number | null): v is number => v !== null);
const avgCgpa =
cgpas.length > 0
? Math.round((cgpas.reduce((a: number, b: number) => a + b, 0) / cgpas.length) * 100) / 100
: null;

const studentIds = new Set(students.map((s: any) => s.user_id));
const attendanceRecords = excludeHolidays(
this.db,
this.db.attendance_log.filter(
(a: any) => studentIds.has(a.student_id) && matchingCourseIds.has(a.course_id),
),
collegeId,
);
const attendanceSummary = summariseAttendance(attendanceRecords);

const byBranch = new Map<string, number>();
students.forEach((s: any) => {
const branch = s.branch || 'Unspecified';
byBranch.set(branch, (byBranch.get(branch) ?? 0) + 1);
});

// Per-semester and per-course counts are distinct STUDENTS, not enrollment
// rows — a student in two semester-3 courses must not be double-counted
// within that one semester's bucket (showing up in two different
// semesters' buckets at once, e.g. a backlog course, is real and expected).
const bySemester = new Map<string, Set<string>>();
const byCourse = new Map<string, Set<string>>();
enrollment.forEach((e: any) => {
const course = courses.find((c: any) => c.course_id === e.course_id);
const semKey = course?.semester != null ? String(course.semester) : 'unspecified';
if (!bySemester.has(semKey)) bySemester.set(semKey, new Set());
bySemester.get(semKey)!.add(e.student_id);
if (!byCourse.has(e.course_id)) byCourse.set(e.course_id, new Set());
byCourse.get(e.course_id)!.add(e.student_id);
});

const allFaculty = scopeToCollege(this.db.faculty, collegeId);
const sections = scopeToCollege(this.db.course_sections, collegeId).filter((cs: any) =>
matchingCourseIds.has(cs.course_id),
);
const facultyIdsInScope = new Set(sections.map((cs: any) => cs.faculty_id));
const faculty = filterActive
? allFaculty.filter((f: any) => facultyIdsInScope.has(f.user_id))
: allFaculty;

const byDesignation = new Map<string, number>();
faculty.forEach((f: any) => {
const designation = f.designation || 'Unspecified';
byDesignation.set(designation, (byDesignation.get(designation) ?? 0) + 1);
});

const workload = faculty
.map((f: any) => {
const mySections = sections.filter((cs: any) => cs.faculty_id === f.user_id);
return {
faculty_id: f.user_id,
name: `${f.first_name} ${f.last_name || ''}`.trim(),
designation: f.designation || null,
sections_taught: mySections.length,
courses_taught: new Set(mySections.map((cs: any) => cs.course_id)).size,
};
})
.sort((a, b) => b.sections_taught - a.sections_taught);

return {
filters: { course_id: courseId ?? null, semester: semester ?? null },
available_semesters: [...new Set(courses.map((c: any) => c.semester).filter((s: any) => s != null))].sort(
(a: number, b: number) => a - b,
),
students: {
total: students.length,
avg_cgpa: avgCgpa,
avg_attendance_pct: attendanceRecords.length > 0 ? attendanceSummary.percentage : null,
by_branch: [...byBranch.entries()].map(([branch, count]) => ({ branch, count })),
by_semester: [...bySemester.entries()]
.map(([sem, set]) => ({ semester: sem === 'unspecified' ? null : Number(sem), count: set.size }))
.sort((a, b) => (a.semester ?? Infinity) - (b.semester ?? Infinity)),
by_course: [...byCourse.entries()]
.map(([courseIdKey, set]) => {
const course = courses.find((c: any) => c.course_id === courseIdKey);
return {
course_id: courseIdKey,
course_code: course?.course_code || courseIdKey,
course_name: course?.course_name || 'Unknown',
enrolled_count: set.size,
};
})
.sort((a, b) => b.enrolled_count - a.enrolled_count),
},
faculty: {
total: faculty.length,
by_designation: [...byDesignation.entries()].map(([designation, count]) => ({ designation, count })),
workload,
},
};
}

@Get('reports/at-risk')
@Roles('admin', 'head', 'superadmin', 'faculty')
@ApiOperation({ summary: 'Get at-risk students list' })
async getAtRisk(
@CurrentUserId() userId: string,
@CurrentUserRole() role: string,
@CurrentUserCollegeId() collegeId: string | null,
) {
// M-04: uses the shared isAtRisk() predicate. This endpoint previously used
// `cgpa < 6.5` while the faculty dashboard used `cgpa < 6`, so the same
// student appeared at-risk on one screen and healthy on the other.
// M-02: EXCUSED sessions count as attended via summariseAttendance().
let pool = scopeToCollege(this.db.students, collegeId);
// Same gap as faculty.service.ts's getAtRiskStudents, fixed the same
// way: a faculty caller previously got the whole college's at-risk
// list, other sections included, because this route is never updated
// when sections were introduced. admin/head/superadmin keep the full view.
if (role === 'faculty') {
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
const records = excludeHolidays(
this.db,
this.db.attendance_log.filter((a) => a.student_id === s.user_id),
collegeId,
);
const attendance = summariseAttendance(records);
// No attendance data means unknown, not a fabricated 65%.
const attendance_pct =
attendance.total > 0 ? attendance.percentage : null;
// Real, computed from marks_entry via the relative curve (grading.ts) —
// students[].cgpa itself is a static seed value nothing updates.
const { cgpa } = computeCGPA(this.db, s.user_id);
return {
...s,
cgpa,
attendance_pct,
excused_sessions: attendance.excused,
is_at_risk: isAtRisk({ cgpa, attendancePct: attendance_pct }),
risk_reasons: riskReasons({
cgpa,
attendancePct: attendance_pct,
}),
};
})
.filter((s) => s.is_at_risk);
}

/**
 * SRS 6.2 #3 / 6.3 #10: "Manage User Roles and oversee Master Attendance" —
 * nothing before this let admin/head browse the raw attendance register at
 * all, only approve requests (AttendanceOverride.jsx) or read one aggregate
 * percentage (reports/overview). Unfiltered by default — "master" means
 * the whole college's register, not a report pre-narrowed by the server;
 * the frontend picks a sane default view, not this endpoint.
 */
@Get('attendance-register')
@Roles('admin', 'head', 'superadmin')
@ApiOperation({ summary: 'Browse/filter the institution-wide attendance register' })
async getAttendanceRegister(
@Query('course_id') courseId: string | undefined,
@Query('section') section: string | undefined,
@Query('date_from') dateFrom: string | undefined,
@Query('date_to') dateTo: string | undefined,
@Query('status') status: string | undefined,
@Query('student_id') studentId: string | undefined,
@CurrentUserCollegeId() collegeId: string | null,
) {
let records = excludeHolidays(
this.db,
scopeToCollege(this.db.attendance_log, collegeId),
collegeId,
);
if (courseId) records = records.filter((r: any) => r.course_id === courseId);
if (studentId) records = records.filter((r: any) => r.student_id === studentId);
if (dateFrom) records = records.filter((r: any) => r.date >= dateFrom);
if (dateTo) records = records.filter((r: any) => r.date <= dateTo);
if (status)
records = records.filter(
(r: any) => normalizeAttendanceStatus(r.status) === normalizeAttendanceStatus(status),
);

const enriched = records.map((r: any) => {
const student = this.db.students.find((s) => s.user_id === r.student_id);
const course = this.db.courses.find((c) => c.course_id === r.course_id);
const enrollment = this.db.enrollment.find(
(e) => e.student_id === r.student_id && e.course_id === r.course_id,
);
return {
log_id: r.log_id,
student_id: r.student_id,
student_name: student ? `${student.first_name} ${student.last_name || ''}`.trim() : r.student_id,
course_id: r.course_id,
course_code: course?.course_code || r.course_id,
course_name: course?.course_name || 'Unknown',
section: enrollment?.section ?? null,
date: r.date,
status: normalizeAttendanceStatus(r.status),
};
});

// section filters on the joined field, so it has to happen after the join.
const filtered = section ? enriched.filter((r) => r.section === section) : enriched;
filtered.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

return { records: filtered, summary: summariseAttendance(filtered) };
}

// â”€â”€ Resources â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
@Get('resources')
@Roles('student', 'faculty', 'admin', 'head', 'superadmin')
@ApiOperation({ summary: 'Get all resources' })
async getResources(@CurrentUserCollegeId() collegeId: string | null) {
return scopeToCollege(this.db.resources, collegeId);
}

@Post('resources')
@Roles('admin', 'superadmin', 'head')
@ApiOperation({ summary: 'Add a new resource' })
@ApiBody({ schema: { type: 'object', additionalProperties: true } })
async createResource(
@Body() body: any,
@CurrentUserCollegeId() actorCollegeId: string | null,
) {
const id = `res${Date.now()}`;
const newRes = {
resource_id: id,
status: 'available',
...body,
college_id: writeCollegeId(actorCollegeId),
};
this.db.resources.push(newRes);
return { success: true, data: newRes };
}

@Put('resources/:id')
@Roles('admin', 'head', 'superadmin', 'faculty')
@ApiOperation({ summary: 'Update resource status or details' })
@ApiBody({ schema: { type: 'object', additionalProperties: true } })
async updateResource(
@Param('id') id: string,
@Body() body: any,
@CurrentUserCollegeId() collegeId: string | null,
) {
const res = this.db.resources.find((r) => r.resource_id === id);
if (!isSameCollege(res, collegeId)) notFoundInMyCollege('Resource');
Object.assign(res, body);
return { success: true, data: res };
}

// â”€â”€ Fees â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
@Get('fees')
@Roles('admin', 'head', 'superadmin')
@RequiresModule('fees')
@ApiOperation({ summary: 'Get all fee records with compliance summary' })
async getFees(@CurrentUserCollegeId() collegeId: string | null) {
const fees = scopeToCollege(this.db.fees, collegeId);
const paid = fees.filter((f) => f.status === 'paid').length;
return {
fees,
summary: {
total: fees.length,
overdue: fees.filter((f) => f.status === 'overdue').length,
paid,
pending: fees.filter((f) => f.status === 'pending').length,
compliance_rate:
fees.length > 0 ? `${Math.round((paid / fees.length) * 100)}%` : '0%',
},
};
}

@Patch('fees/:id/pay')
@Roles('admin', 'head', 'superadmin')
@RequiresModule('fees')
@ApiOperation({ summary: 'Mark a fee record as paid' })
async payFee(
@Param('id') id: string,
@CurrentUserCollegeId() collegeId: string | null,
) {
const fee = this.db.fees.find((f) => f.fee_id === id);
if (!isSameCollege(fee, collegeId)) notFoundInMyCollege('Fee record');
fee.status = 'paid';
fee.paid_date = new Date().toLocaleDateString();
return { success: true, data: fee };
}

@Post('fees')
@Roles('admin', 'head', 'superadmin')
@RequiresModule('fees')
@ApiOperation({ summary: 'Add a new fee record for a student' })
@ApiBody({ schema: { type: 'object', additionalProperties: true } })
async createFee(
@Body() body: any,
@CurrentUserCollegeId() actorCollegeId: string | null,
) {
if (!body.student_id || !body.fee_type || !body.amount || !body.due_date) {
throw new BadRequestException(
errorBody(
ErrorCode.BUSINESS_RULE_VIOLATION,
'student_id, fee_type, amount, and due_date are required',
),
);
}
const student = this.db.students.find((s) => s.user_id === body.student_id);
if (!isSameCollege(student, actorCollegeId))
notFoundInMyCollege('Student');
// A student already prompted to pay (or who already paid) this exact fee
// must never get a second row for it — re-running "generate semester
// fees" for students who already have that semester's fee, paid or not,
// previously created a brand-new PENDING row sitting right next to their
// already-PAID one: the fee itself looked settled, but the student (and
// the compliance %) still showed it outstanding.
const duplicate = scopeToCollege(this.db.fees, writeCollegeId(actorCollegeId)).find(
(f: any) =>
f.student_id === body.student_id &&
String(f.semester) === String(body.semester) &&
f.fee_type === body.fee_type,
);
if (duplicate) {
throw new BadRequestException(
errorBody(
ErrorCode.DUPLICATE_RESOURCE,
`A "${body.fee_type}" fee for semester ${body.semester} already exists for this student (status: ${duplicate.status}). Edit that record instead of creating a new one.`,
{ existing_fee_id: duplicate.fee_id, status: duplicate.status },
),
);
}
const id = `f${Date.now()}`;
const newFee = {
fee_id: id,
status: 'pending',
...body,
amount: Number(body.amount),
college_id: writeCollegeId(actorCollegeId),
};
this.db.fees.push(newFee);
return { success: true, data: newFee };
}

@Put('fees/:id')
@Roles('admin', 'head', 'superadmin')
@RequiresModule('fees')
@ApiOperation({ summary: 'Update an existing fee record' })
@ApiBody({ schema: { type: 'object', additionalProperties: true } })
async updateFee(
@Param('id') id: string,
@Body() body: any,
@CurrentUserCollegeId() collegeId: string | null,
) {
const fee = this.db.fees.find((f) => f.fee_id === id);
if (!isSameCollege(fee, collegeId)) notFoundInMyCollege('Fee record');
// status (and paid_date, its own side effect) is a protected transition —
// it belongs exclusively to PATCH /fees/:id/pay, same "a privileged field
// must not ride through a general update route" rule updateUser() already
// enforces for role/password. Before this, editing ANY field on an
// already-PAID fee (the frontend's edit form always sent status:
// 'pending', correct or not) silently reverted it to unpaid — the fee was
// genuinely settled, but the record started asking to be paid again.
const { status, paid_date, fee_id, student_id, college_id, ...safeUpdates } = body ?? {};
Object.assign(fee, { ...safeUpdates, amount: Number(safeUpdates.amount || fee.amount) });
return { success: true, data: fee };
}

// â”€â”€ Enrollment (Faculty assigns student to course) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
@Post('enrollment')
@Roles('head', 'admin', 'superadmin')
@ApiOperation({
summary: 'Enroll a student in a course (academic head/admin action)',
})
@ApiBody({ schema: { type: 'object', additionalProperties: true } })
async enrollStudentByCourse(
@Body() body: any,
@CurrentUserCollegeId() actorCollegeId: string | null,
) {
const { student_id, course_id } = body;
if (!student_id || !course_id)
throw new BadRequestException(
errorBody(
ErrorCode.BUSINESS_RULE_VIOLATION,
'student_id and course_id are required',
),
);
const student = this.db.students.find((s) => s.user_id === student_id);
if (!isSameCollege(student, actorCollegeId))
notFoundInMyCollege('Student');
const course = this.db.courses.find((c) => c.course_id === course_id);
if (!isSameCollege(course, actorCollegeId)) notFoundInMyCollege('Course');
const existing = this.db.enrollment.find(
(e) => e.student_id === student_id && e.course_id === course_id,
);
if (existing)
throw new BadRequestException(
errorBody(
ErrorCode.DUPLICATE_RESOURCE,
'Student is already enrolled in this course',
),
);
// A course can have several sections, each with a different faculty
// (COURSE_OWNERSHIP_MIGRATION_PLAN.md) â€” the head picks which one this
// student joins rather than it silently defaulting to their home
// section, which may not even be one this course offers. body.section
// stays optional for any other caller of this route; when given it must
// be a section this course actually has a faculty assigned to.
const courseSections = sectionsOfCourse(this.db, course_id);
let section: string;
if (body.section) {
const match = courseSections.find((cs) => cs.section === body.section);
if (!match)
throw new BadRequestException(
errorBody(
ErrorCode.BUSINESS_RULE_VIOLATION,
`Section "${body.section}" is not offered for this course, or has no faculty assigned yet.`,
),
);
section = match.section;
} else {
section = student.section || 'A';
}
const id = `e${Date.now()}`;
const newEnrollment = {
enrollment_id: id,
student_id,
course_id,
year_id: new Date().getFullYear().toString(),
status: 'active',
section,
college_id: writeCollegeId(actorCollegeId),
};
this.db.enrollment.push(newEnrollment as any);
return { success: true, data: newEnrollment };
}

// â”€â”€ Meetings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€


// â”€â”€ Syllabus Progress â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// OUTCOMES_TRACKING_PLAN.md: retired in favour of real topics with their
// own identity (outcomes/outcomes.controller.ts's /topics +
// /topic-completions) â€” this used to be one hand-set percentage per
// course+section, plus an inert, never-written `modules[]` array nobody
// could actually edit.

// â”€â”€ Attendance Requests (Student â†’ Admin â†’ Faculty) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Merged with what used to be the student side of /leave: one submission,
// a date range (a single day is a range of one) plus a scope of either one
// course or every enrolled course. It expands into one grantable row PER
// (course, date) pair that actually has a scheduled class in that range â€”
// never a flat "every calendar day" excusal â€” skipping holidays and days
// that course doesn't meet at all (ATTENDANCE_WORKFLOW_REVAMP notes).
// Faculty leave (personal time off, no attendance side-effects) stays on
// /leave, unaffected â€” see that route's own comment.
@Post('attendance-request')
@Roles('student')
@ApiOperation({ summary: 'Student requests attendance be excused for a date range, one course or all of them' })
@ApiBody({ schema: { type: 'object', additionalProperties: true } })
async createAttendanceRequest(
@Body() body: any,
@CurrentUserId() userId: string,
@CurrentUserCollegeId() actorCollegeId: string | null,
) {
const scope = body.scope === 'course' ? 'course' : 'all_courses';
if (!body.start_date || !body.end_date || !body.reason)
throw new BadRequestException(
errorBody(
ErrorCode.BUSINESS_RULE_VIOLATION,
'start_date, end_date, and reason required',
),
);
if (body.end_date < body.start_date)
throw new BadRequestException(
errorBody(
ErrorCode.BUSINESS_RULE_VIOLATION,
'end_date cannot be before start_date',
),
);
if (scope === 'course' && !body.course_id)
throw new BadRequestException(
errorBody(ErrorCode.BUSINESS_RULE_VIOLATION, 'course_id is required for a single-course request'),
);

const myEnrollment = this.db.enrollment.filter(
(e) => e.student_id === userId && e.status === 'active',
);
let courseSections: { course_id: string; section: string }[];
if (scope === 'course') {
const enrolled = myEnrollment.find((e) => e.course_id === body.course_id);
if (!enrolled)
throw new BadRequestException(
errorBody(ErrorCode.BUSINESS_RULE_VIOLATION, 'You are not enrolled in this course'),
);
courseSections = [{ course_id: enrolled.course_id, section: enrolled.section }];
} else {
courseSections = myEnrollment.map((e) => ({ course_id: e.course_id, section: e.section }));
}

const dates = eachDateInRange(body.start_date, body.end_date);
const pairs = expandClassDates(this.db, dates, courseSections, actorCollegeId);
if (!pairs.length)
throw new BadRequestException(
errorBody(
ErrorCode.BUSINESS_RULE_VIOLATION,
'No scheduled classes fall in that date range (holidays and non-class days need no request).',
),
);

const student = this.db.students.find((s) => s.user_id === userId);
const studentName = student
? `${student.first_name} ${student.last_name || ''}`.trim()
: userId;
const group_id = `arg${Date.now()}`;
const collegeId = writeCollegeId(actorCollegeId);
const created = pairs.map(({ course_id, date }, i) => {
const course = this.db.courses.find((c) => c.course_id === course_id);
return {
request_id: `ar${Date.now()}_${i}`,
group_id,
student_id: userId,
student_name: studentName,
course_id,
course_code: course?.course_code || course_id,
date,
start_date: body.start_date,
end_date: body.end_date,
scope,
leave_type: body.leave_type ? normalizeLeaveType(body.leave_type) : null,
reason: body.reason,
// The supporting document (medical certificate etc.) this request rests on.
file_id: body.file_id ?? null,
admin_status: 'pending',
faculty_status: 'pending',
created_at: new Date().toISOString(),
college_id: collegeId,
};
});
created.forEach((r) => this.db.attendance_requests.push(r));
return { success: true, data: { group_id, requests: created } };
}

@Get('attendance-requests')
@Roles('student', 'faculty', 'admin', 'head', 'superadmin')
@ApiOperation({ summary: 'Get attendance requests' })
async getAttendanceRequests(
@CurrentUserId() userId: string,
@CurrentUserRole() role: string,
@CurrentUserCollegeId() collegeId: string | null,
) {
const scoped = scopeToCollege(this.db.attendance_requests, collegeId);
// Every caller gets the request enriched with the section the request
// is actually about and who teaches it â€” previously undiscoverable
// (attendance_requests carries no section of its own), and what the fix
// below needs to know who is actually concerned.
const enriched = scoped.map((r) => ({
...r,
...this.concernedFacultyFor(r),
}));
if (role === 'student')
return enriched.filter((r) => r.student_id === userId);
if (role === 'faculty') {
// Was "any request for any course this faculty teaches ANY section
// of" (courseIdsTaughtBy) â€” a faculty teaching Section A saw, and
// could grant, requests from Section B students taught by someone
// else entirely. Now matched to the specific faculty teaching the
// requesting student's own enrolled section.
return enriched.filter((r) => r.faculty_id === userId);
}
return enriched;
}

/** Which section an attendance request's course actually concerns, and
*  who teaches it â€” derived from the student's own enrollment, since
*  attendance_requests itself carries no section. Shared by
*  getAttendanceRequests() and markAttendanceRequest() so "who is
*  concerned" is answered identically by both. */
private concernedFacultyFor(req: { student_id: string; course_id: string }) {
const enrollment = this.db.enrollment.find(
(e) => e.student_id === req.student_id && e.course_id === req.course_id,
);
if (!enrollment) return {};
const courseSection = sectionsOfCourse(this.db, req.course_id).find(
(cs) => cs.section === enrollment.section,
);
return {
section: enrollment.section,
faculty_id: courseSection?.faculty_id ?? null,
faculty_name: courseSection?.faculty_name ?? null,
};
}

@Patch('attendance-request/:id')
@Roles('admin', 'head', 'superadmin')
@ApiOperation({ summary: 'Admin approves or rejects an attendance request' })
@ApiBody({ schema: { type: 'object', additionalProperties: true } })
async updateAttendanceRequest(
@Param('id') id: string,
@Body() body: any,
@CurrentUserCollegeId() collegeId: string | null,
) {
const req = this.db.attendance_requests.find((r) => r.request_id === id);
if (!isSameCollege(req, collegeId))
notFoundInMyCollege('Attendance request');
req.admin_status = body.status || 'approved';
req.admin_reason = body.admin_reason || '';
return { success: true, data: req };
}

@Patch('attendance-request/:id/mark')
@Roles('faculty')
@ApiOperation({ summary: 'Faculty marks attendance after admin approval' })
async markAttendanceRequest(
@Param('id') id: string,
@CurrentUserId() userId: string,
@CurrentUserCollegeId() actorCollegeId: string | null,
) {
const req = this.db.attendance_requests.find((r) => r.request_id === id);
if (!isSameCollege(req, actorCollegeId))
notFoundInMyCollege('Attendance request');
// Same gap as the list endpoint above, on the write side: previously
// any faculty in the college could grant any request, not just one for
// a student they actually teach.
if (this.concernedFacultyFor(req).faculty_id !== userId)
throw new ForbiddenException(
errorBody(
ErrorCode.PRIVILEGE_CEILING,
'You do not teach this student for this course.',
),
);
if (req.admin_status !== 'approved')
throw new BadRequestException(
errorBody(
ErrorCode.BUSINESS_RULE_VIOLATION,
'Admin has not approved this request',
),
);
if (req.faculty_status === 'granted')
throw new BadRequestException(
errorBody(
ErrorCode.BUSINESS_RULE_VIOLATION,
'This request has already been granted',
),
);
req.faculty_status = 'granted';
// H-07: UUID instead of `al${length + 1}`, which minted ids that already existed.
// M-01: correcting an existing record rather than appending a second one.
// Writes EXCUSED, not PRESENT: this request is justified absence (merged
// with what used to be /leave's auto-excusal), not a claim the student was
// physically in class.
const existing = this.db.attendance_log.find(
(a) =>
a.student_id === req.student_id &&
a.course_id === req.course_id &&
a.date === req.date,
);
if (existing) {
existing.status = ATTENDANCE_STATUS.EXCUSED;
} else {
this.db.attendance_log.push({
log_id: uuidv4(),
student_id: req.student_id,
course_id: req.course_id,
date: req.date,
status: ATTENDANCE_STATUS.EXCUSED,
college_id: writeCollegeId(actorCollegeId),
} as any);
}
this.db.persist();
return { success: true, data: req };
}

// â”€â”€ Resource Bookings (Faculty â†’ Admin) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
@Post('resource-booking')
@Roles('faculty', 'admin', 'head', 'superadmin')
@ApiOperation({ summary: 'Faculty requests a resource booking' })
@ApiBody({ schema: { type: 'object', additionalProperties: true } })
async createResourceBooking(
@Body() body: any,
@CurrentUserId() userId: string,
@CurrentUserCollegeId() actorCollegeId: string | null,
) {
if (!body.resource_id || !body.date || !body.purpose)
throw new BadRequestException(
errorBody(
ErrorCode.BUSINESS_RULE_VIOLATION,
'resource_id, date, and purpose required',
),
);
const resource = this.db.resources.find(
(r) => r.resource_id === body.resource_id,
);
if (!isSameCollege(resource, actorCollegeId))
notFoundInMyCollege('Resource');
if (resource.status !== 'available')
throw new BadRequestException(
errorBody(
ErrorCode.BUSINESS_RULE_VIOLATION,
`${resource.name} is currently ${resource.status === 'in_use' ? 'in use' : resource.status} and cannot be requested right now.`,
),
);
const faculty = this.db.faculty.find((f) => f.user_id === userId);
const id = `rb${Date.now()}`;
const booking = {
booking_id: id,
resource_id: body.resource_id,
resource_name: resource?.name || body.resource_id,
requested_by: userId,
requester_name: faculty
? `${faculty.first_name} ${faculty.last_name || ''}`.trim()
: userId,
date: body.date,
time_slot: body.time_slot || 'Full Day',
purpose: body.purpose,
status: 'pending',
created_at: new Date().toISOString(),
college_id: writeCollegeId(actorCollegeId),
};
this.db.resource_bookings.push(booking);
return { success: true, data: booking };
}

@Get('resource-bookings')
@Roles('faculty', 'admin', 'head', 'superadmin')
@ApiOperation({ summary: 'Get resource bookings' })
async getResourceBookings(
@CurrentUserId() userId: string,
@CurrentUserRole() role: string,
@CurrentUserCollegeId() collegeId: string | null,
) {
const scoped = scopeToCollege(this.db.resource_bookings, collegeId);
if (role === 'faculty') return scoped.filter((b) => b.requested_by === userId);
return scoped;
}

@Patch('resource-booking/:id')
@Roles('admin', 'head', 'superadmin')
@ApiOperation({ summary: 'Admin approves or rejects a resource booking' })
@ApiBody({ schema: { type: 'object', additionalProperties: true } })
async updateResourceBooking(
@Param('id') id: string,
@Body() body: any,
@CurrentUserCollegeId() collegeId: string | null,
) {
const booking = this.db.resource_bookings.find((b) => b.booking_id === id);
if (!isSameCollege(booking, collegeId)) notFoundInMyCollege('Booking');
const status = body.status || 'approved';
// Approving a booking previously left the resource itself marked
// 'available', so the same slot could be booked again â€” the resource
// record and the booking record were never actually connected. Mirrors
// the same status toggleResource() already writes (fixes.js), not the
// 'booked' string sitting in seed data, which no code path produces.
if (status === 'approved') {
const resource = this.db.resources.find(
(r) => r.resource_id === booking.resource_id,
);
// Re-checked here, not just at request time (createResourceBooking):
// another booking for the same resource may have been approved, or it
// may have gone into maintenance, in the time since this one was
// submitted. Approving must refuse a resource that isn't available
// right now, whatever it looked like when the request was made.
if (resource && resource.status !== 'available')
throw new BadRequestException(
errorBody(
ErrorCode.BUSINESS_RULE_VIOLATION,
`${resource.name} is currently ${resource.status === 'in_use' ? 'in use' : resource.status} and cannot be approved right now.`,
),
);
if (resource) resource.status = 'in_use';
}
booking.status = status;
// Mutating an existing element doesn't trip the store's array proxy â€”
// without this the status change lives only in memory until some other,
// unrelated write happens to persist it.
this.db.persist();
return { success: true, data: booking };
}

// â”€â”€ Student Timetable by Enrollment â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
@Get('student-timetable')
@Roles('student')
@ApiOperation({
summary: 'Get timetable filtered by student enrolled courses',
})
async getStudentTimetable(
@CurrentUserId() userId: string,
@CurrentUserCollegeId() collegeId: string | null,
) {
const student = this.db.students.find((s) => s.user_id === userId);
const section = student?.section || 'A';
const enrolledCourseIds = this.db.enrollment
.filter((e) => e.student_id === userId && e.status === 'active')
.map((e) => e.course_id);
const slots = scopeToCollege(this.db.timetable, collegeId).filter(
(t) =>
  t.section === section &&
  enrolledCourseIds.includes(t.course_id) &&
  (t.status === undefined || t.status === 'published'),
);
return { grid: buildTimetableGrid(slots), ...TIMETABLE_AXES };
}
}

/** The days/times axis every timetable grid response carries â€” factored out
*  once it stopped being one call site (getTimetable) and became four. */
const TIMETABLE_AXES = {
days: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
times: ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'],
};

/** Same reshape (flat slots -> day/time grid) every timetable endpoint does. */
function buildTimetableGrid(slots: any[]) {
return slots.reduce((acc: any, curr) => {
if (!acc[curr.day]) acc[curr.day] = {};
if (!acc[curr.day][curr.time]) acc[curr.day][curr.time] = curr;
else {
if (!Array.isArray(acc[curr.day][curr.time]))
acc[curr.day][curr.time] = [acc[curr.day][curr.time]];
acc[curr.day][curr.time].push(curr);
}
return acc;
}, {});
}