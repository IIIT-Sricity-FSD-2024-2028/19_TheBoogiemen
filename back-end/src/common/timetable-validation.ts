import { BadRequestException } from '@nestjs/common';
import { InMemoryDbService } from '../database/in-memory-db.service';
import { scopeToCollege } from './tenancy/scope-to-college';
import { sectionsOfCourse } from './course-sections';

export interface TimetableSlot {
  slot_id: string;
  day: string; // 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI'
  time: string; // '09:00', '10:00', etc.
  course_id: string;
  course_code?: string;
  course_name?: string;
  section: string;
  room?: string;
  type?: 'lecture' | 'lab' | 'tutorial';
  faculty_id?: string;
  faculty_name?: string;
  status?: 'draft' | 'published';
  college_id?: string | null;
  semester?: number;
  academic_year?: string;
  branch?: string;
}

export interface TimetableConflict {
  type:
    | 'ROOM_OCCUPIED'
    | 'FACULTY_BUSY'
    | 'SECTION_OVERLAP'
    | 'STUDENT_OVERLAP'
    | 'ROOM_CAPACITY_EXCEEDED'
    | 'LAB_ROOM_INVALID'
    | 'HOURS_EXCEEDED';
  message: string;
  details?: any;
}

export const TIMETABLE_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
export const TIMETABLE_TIMES = [
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
];

/**
 * A slot's "real" semester is its course's semester, not whatever (if
 * anything) was stamped onto the slot's own `semester` field at save time —
 * that field is a denormalized display copy, and plenty of existing seed
 * rows never got one written at all. Resolving through course_id instead of
 * trusting the stamp is what makes the section-overlap check below actually
 * distinguish "Section A of Semester 3" from "Section A of Semester 5":
 * department sections are commonly reused per-semester (A/B/C every term),
 * so `section` alone is not a unique cohort key.
 */
export function resolveSlotSemester(
  db: InMemoryDbService,
  s: Partial<TimetableSlot>,
): number | undefined {
  if (s.course_id) {
    const course = (db.courses as any[]).find((c) => c.course_id === s.course_id);
    if (course?.semester != null) return course.semester;
  }
  return s.semester;
}

/**
 * Validates a prospective or draft slot against existing slots and constraints.
 */
export function validateSlotConflicts(
  db: InMemoryDbService,
  slot: Partial<TimetableSlot>,
  options: {
    excludeSlotId?: string;
    collegeId: string | null;
    candidateSlots?: TimetableSlot[]; // when validating in-batch
  },
): TimetableConflict[] {
  const conflicts: TimetableConflict[] = [];
  const collegeId = options.collegeId;

  // Active slots in scope
  const existingPool: TimetableSlot[] = options.candidateSlots
    ? options.candidateSlots
    : (scopeToCollege(db.timetable, collegeId) as TimetableSlot[]);

  const otherSlots = existingPool.filter(
    (s) => s.slot_id !== options.excludeSlotId,
  );

  const day = slot.day;
  const time = slot.time;
  const section = slot.section;
  const courseId = slot.course_id;

  if (!day || !time) return conflicts;

  // 1. Same section overlap at the same day & time — scoped to the same
  // semester too (see resolveSlotSemester's own comment): "Section A" of
  // Semester 3 and "Section A" of Semester 5 are different cohorts that can
  // legitimately share a time slot, even though they share a section letter.
  const slotSemester = resolveSlotSemester(db, slot);
  const sectionOverlap = otherSlots.find(
    (s) =>
      s.day === day &&
      s.time === time &&
      s.section === section &&
      resolveSlotSemester(db, s) === slotSemester,
  );
  if (sectionOverlap) {
    conflicts.push({
      type: 'SECTION_OVERLAP',
      message: `Section ${section} already has ${sectionOverlap.course_code || sectionOverlap.course_id} scheduled at ${day} ${time}`,
      details: { existingSlot: sectionOverlap },
    });
  }

  // 2. Room occupied at same day & time
  if (slot.room) {
    const roomOverlap = otherSlots.find(
      (s) => s.day === day && s.time === time && s.room === slot.room,
    );
    if (roomOverlap) {
      conflicts.push({
        type: 'ROOM_OCCUPIED',
        message: `Room/Lab "${slot.room}" is already booked by Section ${roomOverlap.section} (${roomOverlap.course_code || roomOverlap.course_id}) at ${day} ${time}`,
        details: { existingSlot: roomOverlap },
      });
    }

    // Check room capacity and type in resources table if registered
    const resource = (db.resources as any[]).find(
      (r) =>
        (r.name === slot.room || r.resource_id === slot.room) &&
        (r.college_id === undefined || r.college_id === collegeId),
    );
    if (resource) {
      // Validate lab requirement
      if (
        slot.type === 'lab' &&
        resource.type &&
        resource.type.toLowerCase() !== 'lab'
      ) {
        conflicts.push({
          type: 'LAB_ROOM_INVALID',
          message: `Room "${resource.name}" is designated as a ${resource.type}, but a laboratory session was requested`,
          details: { resource },
        });
      }

      // Check section enrollment count vs capacity
      if (resource.capacity) {
        const enrolledStudents = (db.enrollment as any[]).filter(
          (e) =>
            e.course_id === courseId &&
            e.section === section &&
            e.status === 'active',
        );
        if (enrolledStudents.length > resource.capacity) {
          conflicts.push({
            type: 'ROOM_CAPACITY_EXCEEDED',
            message: `Room "${resource.name}" capacity (${resource.capacity}) is exceeded by Section ${section} enrollment (${enrolledStudents.length} students)`,
            details: {
              capacity: resource.capacity,
              enrolled: enrolledStudents.length,
            },
          });
        }
      }
    }
  }

  // 3. Faculty busy at same day & time
  // Resolve faculty id
  let facultyId = slot.faculty_id;
  if (!facultyId && courseId && section) {
    const cs = sectionsOfCourse(db, courseId).find(
      (sec) => sec.section === section,
    );
    if (cs) facultyId = cs.faculty_id;
  }

  if (facultyId) {
    const facultyOverlap = otherSlots.find((s) => {
      if (s.day !== day || s.time !== time) return false;
      if (s.faculty_id === facultyId) return true;
      const sCs = sectionsOfCourse(db, s.course_id).find(
        (sec) => sec.section === s.section,
      );
      return sCs?.faculty_id === facultyId;
    });

    if (facultyOverlap) {
      const faculty = (db.faculty as any[]).find(
        (f) => f.user_id === facultyId,
      );
      const fName = faculty
        ? `${faculty.first_name || ''} ${faculty.last_name || ''}`.trim()
        : facultyId;
      conflicts.push({
        type: 'FACULTY_BUSY',
        message: `Faculty member ${fName} is already teaching Section ${facultyOverlap.section} (${facultyOverlap.course_code || facultyOverlap.course_id}) at ${day} ${time}`,
        details: { existingSlot: facultyOverlap, facultyId },
      });
    }
  }

  // 4. Student elective overlap
  // Check if students enrolled in this course have another active class at the same time
  if (courseId) {
    const enrolledInThisCourse = (db.enrollment as any[])
      .filter(
        (e) =>
          e.course_id === courseId &&
          (section ? e.section === section : true) &&
          e.status === 'active',
      )
      .map((e) => e.student_id);

    if (enrolledInThisCourse.length > 0) {
      // Find what other courses meet at day & time
      const concurrentSlots = otherSlots.filter(
        (s) => s.day === day && s.time === time,
      );
      for (const cs of concurrentSlots) {
        const studentClash = (db.enrollment as any[]).find(
          (e) =>
            e.course_id === cs.course_id &&
            (cs.section ? e.section === cs.section : true) &&
            e.status === 'active' &&
            enrolledInThisCourse.includes(e.student_id),
        );
        if (studentClash) {
          const student = (db.students as any[]).find(
            (st) => st.user_id === studentClash.student_id,
          );
          const sName = student
            ? `${student.first_name} ${student.last_name}`
            : studentClash.student_id;
          conflicts.push({
            type: 'STUDENT_OVERLAP',
            message: `Student ${sName} is enrolled in both ${slot.course_code || courseId} and ${cs.course_code || cs.course_id} which overlap at ${day} ${time}`,
            details: { studentId: studentClash.student_id, collidingSlot: cs },
          });
          break; // Avoid spamming duplicate message for multiple students in same elective clash
        }
      }
    }
  }

  return conflicts;
}

/**
 * Validates course weekly hour requirements for a section:
 * lecture_hours, lab_hours, tutorial_hours, or total contact hours against credits.
 */
export function validateWeeklyHourRequirements(
  db: InMemoryDbService,
  courseId: string,
  section: string,
  slotsForSection: TimetableSlot[],
): {
  course_id: string;
  course_code: string;
  credits: number;
  expectedContactHours: number;
  scheduledHours: number;
  lectureHours: number;
  labHours: number;
  tutorialHours: number;
  isComplete: boolean;
  message?: string;
} {
  const course = (db.courses as any[]).find((c) => c.course_id === courseId);
  const courseCode = course?.course_code || courseId;
  const credits = course?.credits || 3;

  // Expected contact hours: if course explicitly specifies contact_hours or lecture/lab hours, use that, else defaults to credits
  const expectedContactHours =
    (course?.contact_hours ??
      ((course?.lecture_hours || 0) +
        (course?.lab_hours || 0) +
        (course?.tutorial_hours || 0))) ||
    credits;

  const courseSlots = slotsForSection.filter(
    (s) => s.course_id === courseId && s.section === section,
  );
  const scheduledHours = courseSlots.length;
  const lectureHours = courseSlots.filter((s) => s.type === 'lecture').length;
  const labHours = courseSlots.filter((s) => s.type === 'lab').length;
  const tutorialHours = courseSlots.filter(
    (s) => s.type === 'tutorial',
  ).length;

  const isComplete = scheduledHours >= expectedContactHours;
  let message = isComplete
    ? `All ${expectedContactHours} weekly contact hours allocated`
    : `Short by ${expectedContactHours - scheduledHours} hour(s): scheduled ${scheduledHours}/${expectedContactHours}`;

  return {
    course_id: courseId,
    course_code: courseCode,
    credits,
    expectedContactHours,
    scheduledHours,
    lectureHours,
    labHours,
    tutorialHours,
    isComplete,
    message,
  };
}
