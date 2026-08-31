/**
 * course-sections.ts — who teaches what, now that it isn't one scalar.
 *
 * COURSE_OWNERSHIP_MIGRATION_PLAN.md: courses.faculty_id/faculty_name are
 * gone. A course's faculty lives in course_sections, one row per (course,
 * section) — a course can have Section A taught by one faculty member and
 * Section B by another. Every call site that used to read
 * `course.faculty_id === userId` as "do I teach this" routes through here
 * instead, same "one small helper, every call-site wraps it" shape as
 * scope-to-college.ts and billing/subscription.ts.
 */

import { InMemoryDbService } from '../database/in-memory-db.service';

export interface CourseSection {
  course_section_id: string;
  course_id: string;
  section: string;
  faculty_id: string;
  faculty_name?: string | null;
  college_id?: string | null;
}

/** Every (course, section) pair this faculty member currently teaches. */
export function sectionsTaughtBy(
  db: InMemoryDbService,
  facultyId: string,
): CourseSection[] {
  return (db.course_sections as CourseSection[]).filter(
    (cs) => cs.faculty_id === facultyId,
  );
}

/** Course ids this faculty teaches at least one section of — "my courses". */
export function courseIdsTaughtBy(
  db: InMemoryDbService,
  facultyId: string,
): string[] {
  return [...new Set(sectionsTaughtBy(db, facultyId).map((cs) => cs.course_id))];
}

/** This faculty's own section for one course, or undefined if they don't teach it. */
export function sectionTaughtIn(
  db: InMemoryDbService,
  facultyId: string,
  courseId: string,
): string | undefined {
  return sectionsTaughtBy(db, facultyId).find((cs) => cs.course_id === courseId)
    ?.section;
}

/** Every section row for one course — for rendering "who teaches what" on a course. */
export function sectionsOfCourse(
  db: InMemoryDbService,
  courseId: string,
): CourseSection[] {
  return (db.course_sections as CourseSection[]).filter(
    (cs) => cs.course_id === courseId,
  );
}
