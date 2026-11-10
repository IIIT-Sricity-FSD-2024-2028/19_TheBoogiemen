/**
 * outcome-mastery.ts — turns marks_entry into Course Outcome (CO) and
 * Program Outcome (PO) mastery, the calculation nothing in this codebase
 * did before (OUTCOMES_TRACKING_PLAN.md). Mastery is a simple average
 * percentage, not a discrete NBA attainment level, per the agreed design.
 *
 * CO mastery: average % across every assessment tagged with that CO the
 * student actually has a mark for. Ungraded assessments are skipped, not
 * counted as 0 — a mark that was never entered says nothing about mastery.
 *
 * PO mastery: a strength-weighted average of the student's own CO masteries
 * across every CO that maps to that PO, per the standard CO→PO rollup
 * formula (weighted, not a flat average — a CO mapped at strength 3
 * contributes three times as much as one mapped at strength 1).
 */

import { InMemoryDbService } from '../database/in-memory-db.service';

export interface LearningOutcome {
  lo_id: string;
  course_id: string;
  code: string;
  description: string;
  po_mapping: { po_id: string; strength: number }[];
  college_id?: string | null;
}

/** This student's mastery % for one CO, or null if nothing graded maps to it yet. */
export function computeCoMastery(
  db: InMemoryDbService,
  studentId: string,
  loId: string,
): number | null {
  const taggedAssessmentIds = new Set(
    db.assessments
      .filter((a: any) => Array.isArray(a.lo_ids) && a.lo_ids.includes(loId))
      .map((a: any) => a.assessment_id),
  );
  if (!taggedAssessmentIds.size) return null;

  const marks = db.marks_entry.filter(
    (m: any) =>
      m.student_id === studentId &&
      taggedAssessmentIds.has(m.assessment_id) &&
      Number(m.max_marks) > 0,
  );
  if (!marks.length) return null;

  const pct =
    marks.reduce((sum: number, m: any) => sum + (Number(m.marks_obtained) / Number(m.max_marks)) * 100, 0) /
    marks.length;
  return Math.round(pct);
}

/** This student's mastery % for one PO, weighted by each contributing CO's mapped strength. */
export function computePoMastery(
  db: InMemoryDbService,
  studentId: string,
  poId: string,
): number | null {
  const contributingCos = (db.learning_outcomes as LearningOutcome[]).flatMap((lo) => {
    const mapping = (lo.po_mapping || []).find((m) => m.po_id === poId);
    return mapping ? [{ lo, strength: mapping.strength }] : [];
  });
  if (!contributingCos.length) return null;

  let weightedSum = 0;
  let totalWeight = 0;
  for (const { lo, strength } of contributingCos) {
    const coMastery = computeCoMastery(db, studentId, lo.lo_id);
    if (coMastery === null) continue;
    weightedSum += coMastery * strength;
    totalWeight += strength;
  }
  if (!totalWeight) return null;
  return Math.round(weightedSum / totalWeight);
}

/**
 * Every CO (across every course this student is enrolled in) and every PO,
 * with this student's mastery for each — the shape the heatmap renders
 * directly, one row per outcome.
 */
export function studentOutcomeReport(db: InMemoryDbService, studentId: string) {
  const courseIds = new Set(
    db.enrollment
      .filter((e: any) => e.student_id === studentId && e.status === 'active')
      .map((e: any) => e.course_id),
  );
  const cos = (db.learning_outcomes as LearningOutcome[])
    .filter((lo) => courseIds.has(lo.course_id))
    .map((lo) => {
      const course = db.courses.find((c: any) => c.course_id === lo.course_id);
      return {
        lo_id: lo.lo_id,
        course_id: lo.course_id,
        course_code: course?.course_code || lo.course_id,
        code: lo.code,
        description: lo.description,
        mastery: computeCoMastery(db, studentId, lo.lo_id),
      };
    });

  const pos = (db.program_outcomes as any[]).map((po) => ({
    po_id: po.po_id,
    code: po.code,
    description: po.description,
    mastery: computePoMastery(db, studentId, po.po_id),
  }));

  return { courseOutcomes: cos, programOutcomes: pos };
}

/** College-wide average CO mastery across every student with at least one
 * computable CO — what /reports/overview's avg_co_attainment is now built
 * from, replacing the hardcoded '3.4/4.0'. */
export function collegeAverageCoMastery(
  db: InMemoryDbService,
  collegeId: string | null,
): number | null {
  const students = (collegeId === null
    ? db.students
    : db.students.filter((s: any) => s.college_id === collegeId)) as any[];
  const cos = (collegeId === null
    ? db.learning_outcomes
    : (db.learning_outcomes as LearningOutcome[]).filter((lo) => lo.college_id === collegeId)) as LearningOutcome[];
  if (!cos.length) return null;

  const perStudentAverages: number[] = [];
  for (const s of students) {
    const values = cos
      .map((lo) => computeCoMastery(db, s.user_id, lo.lo_id))
      .filter((v): v is number => v !== null);
    if (values.length) perStudentAverages.push(values.reduce((a, b) => a + b, 0) / values.length);
  }
  if (!perStudentAverages.length) return null;
  return Math.round(perStudentAverages.reduce((a, b) => a + b, 0) / perStudentAverages.length);
}
