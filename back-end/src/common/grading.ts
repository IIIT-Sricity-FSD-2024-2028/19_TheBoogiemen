/**
 * grading.ts — turns marks_entry into a per-course relative (curved) letter
 * grade and a real CGPA, the calculation nothing in this codebase did before.
 * students[].cgpa was a static seed value nothing ever recomputed.
 *
 * Per-course percentage: weighted average of marks_obtained/max_marks across
 * a student's GRADED assessments in that course, weighted by the assessment's
 * own weightage, normalized by the sum of weightage of only the graded ones —
 * a partially-graded course still yields a valid "so far" percentage, which
 * doubles as the input to predictedFinalGrade(). An assessment the student
 * has no mark for is skipped, not counted as 0.
 *
 * Grading is RELATIVE, not absolute: within a course, every enrolled student
 * who has a percentage is ranked and banded by percentile — there is no fixed
 * "70% = B" cutoff. Confirmed with the user: top 10% O, next 25% A, next 30%
 * B, next 18% C, next 8% D, next 4% P, bottom 5% F, no absolute pass/fail
 * floor. With a small cohort it is expected — not a bug — for the extreme
 * bands to end up empty; see computeCourseGradesForCourse's percentile math.
 *
 * CGPA: credit-weighted average of grade points across every course a
 * student is enrolled in AND has a computed grade for. An ungraded course is
 * skipped entirely, never treated as a 0 — the same "don't count what wasn't
 * measured" convention outcome-mastery.ts already uses for CO/PO mastery.
 */

import { InMemoryDbService } from '../database/in-memory-db.service';

export interface GradeBand {
  letter: string;
  /** Inclusive-from-below, exclusive-from-above when compared against a
   *  percentile-from-top: the first band whose upperPercentile strictly
   *  exceeds a student's percentile is the one they land in. */
  upperPercentile: number;
  points: number;
}

/** Confirmed with the user: relative curve, no absolute floor. */
export const GRADE_BANDS: GradeBand[] = [
  { letter: 'O', upperPercentile: 10, points: 10 },
  { letter: 'A', upperPercentile: 35, points: 9 },
  { letter: 'B', upperPercentile: 65, points: 8 },
  { letter: 'C', upperPercentile: 83, points: 7 },
  { letter: 'D', upperPercentile: 91, points: 6 },
  { letter: 'P', upperPercentile: 95, points: 5 },
  { letter: 'F', upperPercentile: 100, points: 0 },
];

/** percentile is always in [0, 100) for any real rank (see
 *  computeCourseGradesForCourse), so the fallback below is only a defensive
 *  guard against float edge cases, never the normal path. */
export function gradeForPercentile(percentile: number): { letter: string; points: number } {
  for (const band of GRADE_BANDS) {
    if (percentile < band.upperPercentile) return { letter: band.letter, points: band.points };
  }
  const last = GRADE_BANDS[GRADE_BANDS.length - 1];
  return { letter: last.letter, points: last.points };
}

/** This student's current weighted percentage in one course, or null if
 *  nothing of theirs has been graded yet. */
export function computeCoursePercentage(
  db: InMemoryDbService,
  studentId: string,
  courseId: string,
): number | null {
  const assessments = db.assessments.filter((a: any) => a.course_id === courseId);
  let weightedSum = 0;
  let totalWeight = 0;
  for (const a of assessments) {
    const mark = db.marks_entry.find(
      (m: any) => m.student_id === studentId && m.assessment_id === a.assessment_id,
    );
    if (!mark || !(Number(mark.max_marks) > 0)) continue;
    const weight = Number(a.weightage) || 0;
    if (weight <= 0) continue;
    const pct = (Number(mark.marks_obtained) / Number(mark.max_marks)) * 100;
    weightedSum += pct * weight;
    totalWeight += weight;
  }
  if (totalWeight <= 0) return null;
  return Math.round((weightedSum / totalWeight) * 100) / 100;
}

export interface CourseGradeRow {
  student_id: string;
  percentage: number;
  rank: number;
  percentile: number;
  letter: string;
  gradePoint: number;
}

/**
 * The relative curve for one course, ranked across every section's enrolled
 * students together (confirmed with the user: the whole cohort taking the
 * course, not per-section). Students with no graded assessment are excluded
 * from the ranking entirely — not ranked last, not failed.
 */
export function computeCourseGradesForCourse(
  db: InMemoryDbService,
  courseId: string,
): CourseGradeRow[] {
  const studentIds = new Set(
    db.enrollment
      .filter((e: any) => e.course_id === courseId && e.status === 'active')
      .map((e: any) => e.student_id),
  );

  const ranked = Array.from(studentIds)
    .map((studentId) => ({ studentId, percentage: computeCoursePercentage(db, studentId as string, courseId) }))
    .filter((r): r is { studentId: string; percentage: number } => r.percentage !== null)
    .sort((a, b) => b.percentage - a.percentage);

  const n = ranked.length;
  const rows: CourseGradeRow[] = [];
  let currentRank = 0;
  let currentValue: number | null = null;
  ranked.forEach((r, i) => {
    // Ties must never straddle a band boundary: a tied group inherits the
    // rank of its first (best) member, not its own sequential position.
    if (currentValue === null || r.percentage !== currentValue) {
      currentRank = i + 1;
      currentValue = r.percentage;
    }
    const percentile = ((currentRank - 1) / n) * 100;
    const { letter, points } = gradeForPercentile(percentile);
    rows.push({
      student_id: r.studentId,
      percentage: r.percentage,
      rank: currentRank,
      percentile,
      letter,
      gradePoint: points,
    });
  });
  return rows;
}

/** One student's grade for one course, or null if they haven't been graded
 *  (or aren't enrolled) in it at all. */
export function computeStudentCourseGrade(
  db: InMemoryDbService,
  studentId: string,
  courseId: string,
): CourseGradeRow | null {
  const rows = computeCourseGradesForCourse(db, courseId);
  return rows.find((r) => r.student_id === studentId) ?? null;
}

export interface CourseCgpaRow {
  course_id: string;
  course_code: string;
  course_name: string;
  credits: number;
  percentage: number;
  grade: string;
  gradePoint: number;
}

/** Credit-weighted CGPA across every enrolled course this student has a
 *  computed grade for. Courses with nothing graded yet are skipped, not
 *  averaged in as a 0 — null only when NOT ONE enrolled course is gradeable
 *  yet, never a fabricated default. */
export function computeCGPA(
  db: InMemoryDbService,
  studentId: string,
): { cgpa: number | null; courses: CourseCgpaRow[] } {
  const enrolledCourseIds = db.enrollment
    .filter((e: any) => e.student_id === studentId && e.status === 'active')
    .map((e: any) => e.course_id as string);

  const courses: CourseCgpaRow[] = [];
  for (const courseId of enrolledCourseIds) {
    const grade = computeStudentCourseGrade(db, studentId, courseId);
    if (!grade) continue;
    const course = db.courses.find((c: any) => c.course_id === courseId);
    courses.push({
      course_id: courseId,
      course_code: course?.course_code || courseId,
      course_name: course?.course_name || 'Unknown',
      credits: Number(course?.credits) || 0,
      percentage: grade.percentage,
      grade: grade.letter,
      gradePoint: grade.gradePoint,
    });
  }

  const totalCredits = courses.reduce((sum, c) => sum + c.credits, 0);
  if (totalCredits <= 0) return { cgpa: null, courses };

  const weightedSum = courses.reduce((sum, c) => sum + c.gradePoint * c.credits, 0);
  return { cgpa: Math.round((weightedSum / totalCredits) * 100) / 100, courses };
}

/** A single predicted letter for the dashboard headline, derived from the
 *  SAME relative machinery as everything else here — never a second,
 *  absolute percentage scale. Maps the student's blended CGPA to whichever
 *  GRADE_BANDS entry it sits closest to by points, ties broken toward the
 *  higher band. */
export function predictedFinalGrade(
  db: InMemoryDbService,
  studentId: string,
): { letter: string; gradePoint: number } | null {
  const { cgpa } = computeCGPA(db, studentId);
  if (cgpa === null) return null;

  let best = GRADE_BANDS[GRADE_BANDS.length - 1];
  let bestDiff = Infinity;
  for (const band of GRADE_BANDS) {
    const diff = Math.abs(band.points - cgpa);
    if (diff < bestDiff || (diff === bestDiff && band.points > best.points)) {
      best = band;
      bestDiff = diff;
    }
  }
  return { letter: best.letter, gradePoint: best.points };
}
