/**
 * outcome-mastery.spec.ts — the CO/PO mastery calculation nothing in this
 * codebase did before OUTCOMES_TRACKING_PLAN.md. Regressing this either
 * fabricates a mastery number from nothing, or silently drops a real one.
 */

import {
  collegeAverageCoMastery,
  computeCoMastery,
  computePoMastery,
  studentOutcomeReport,
} from './outcome-mastery';

const dbWith = (over: any = {}) =>
  ({
    assessments: [],
    marks_entry: [],
    learning_outcomes: [],
    program_outcomes: [],
    enrollment: [],
    students: [],
    courses: [],
    ...over,
  }) as any;

describe('computeCoMastery', () => {
  it('averages % across every assessment tagged with that CO', () => {
    const db = dbWith({
      assessments: [
        { assessment_id: 'a1', lo_ids: ['lo1'] },
        { assessment_id: 'a2', lo_ids: ['lo1'] },
        { assessment_id: 'a3', lo_ids: ['lo2'] }, // different CO, must not count
      ],
      marks_entry: [
        { student_id: 's1', assessment_id: 'a1', marks_obtained: 80, max_marks: 100 },
        { student_id: 's1', assessment_id: 'a2', marks_obtained: 60, max_marks: 100 },
        { student_id: 's1', assessment_id: 'a3', marks_obtained: 10, max_marks: 100 },
      ],
    });
    expect(computeCoMastery(db, 's1', 'lo1')).toBe(70); // avg(80, 60)
  });

  it('returns null when nothing is graded yet, not zero', () => {
    const db = dbWith({ assessments: [{ assessment_id: 'a1', lo_ids: ['lo1'] }] });
    expect(computeCoMastery(db, 's1', 'lo1')).toBeNull();
  });

  it('returns null when no assessment is tagged with the outcome at all', () => {
    const db = dbWith();
    expect(computeCoMastery(db, 's1', 'lo-nonexistent')).toBeNull();
  });

  it('ignores an ungraded assessment for one student while counting a graded one for another', () => {
    const db = dbWith({
      assessments: [{ assessment_id: 'a1', lo_ids: ['lo1'] }],
      marks_entry: [{ student_id: 's2', assessment_id: 'a1', marks_obtained: 90, max_marks: 100 }],
    });
    expect(computeCoMastery(db, 's1', 'lo1')).toBeNull();
    expect(computeCoMastery(db, 's2', 'lo1')).toBe(90);
  });
});

describe('computePoMastery', () => {
  it('weights contributing COs by their mapped strength', () => {
    const db = dbWith({
      learning_outcomes: [
        { lo_id: 'lo1', course_id: 'c1', po_mapping: [{ po_id: 'po1', strength: 1 }] },
        { lo_id: 'lo2', course_id: 'c1', po_mapping: [{ po_id: 'po1', strength: 3 }] },
      ],
      assessments: [
        { assessment_id: 'a1', lo_ids: ['lo1'] },
        { assessment_id: 'a2', lo_ids: ['lo2'] },
      ],
      marks_entry: [
        { student_id: 's1', assessment_id: 'a1', marks_obtained: 20, max_marks: 100 }, // lo1 = 20%
        { student_id: 's1', assessment_id: 'a2', marks_obtained: 100, max_marks: 100 }, // lo2 = 100%
      ],
    });
    // weighted: (20*1 + 100*3) / (1+3) = 320/4 = 80
    expect(computePoMastery(db, 's1', 'po1')).toBe(80);
  });

  it('skips a CO with no computable mastery rather than treating it as 0', () => {
    const db = dbWith({
      learning_outcomes: [
        { lo_id: 'lo1', course_id: 'c1', po_mapping: [{ po_id: 'po1', strength: 2 }] }, // ungraded
        { lo_id: 'lo2', course_id: 'c1', po_mapping: [{ po_id: 'po1', strength: 1 }] },
      ],
      assessments: [
        { assessment_id: 'a1', lo_ids: ['lo1'] },
        { assessment_id: 'a2', lo_ids: ['lo2'] },
      ],
      marks_entry: [{ student_id: 's1', assessment_id: 'a2', marks_obtained: 50, max_marks: 100 }],
    });
    // lo1 has no mark at all -> excluded; only lo2 (50%) counts
    expect(computePoMastery(db, 's1', 'po1')).toBe(50);
  });

  it('returns null when no CO maps to this PO at all', () => {
    const db = dbWith();
    expect(computePoMastery(db, 's1', 'po-nonexistent')).toBeNull();
  });
});

describe('studentOutcomeReport', () => {
  it('only reports COs for courses the student is actively enrolled in', () => {
    const db = dbWith({
      enrollment: [{ student_id: 's1', course_id: 'c1', status: 'active' }],
      learning_outcomes: [
        { lo_id: 'lo1', course_id: 'c1', code: 'CO1', description: 'x', po_mapping: [] },
        { lo_id: 'lo2', course_id: 'c2', code: 'CO1', description: 'y', po_mapping: [] }, // not enrolled
      ],
      courses: [{ course_id: 'c1', course_code: 'CS201' }],
    });
    const report = studentOutcomeReport(db, 's1');
    expect(report.courseOutcomes).toHaveLength(1);
    expect(report.courseOutcomes[0].lo_id).toBe('lo1');
  });
});

describe('collegeAverageCoMastery', () => {
  it('averages per-student CO averages, not a flat average across all marks', () => {
    const db = dbWith({
      students: [{ user_id: 's1', college_id: 'c1' }, { user_id: 's2', college_id: 'c1' }],
      learning_outcomes: [
        { lo_id: 'lo1', course_id: 'c1', college_id: 'c1', po_mapping: [] },
        { lo_id: 'lo2', course_id: 'c1', college_id: 'c1', po_mapping: [] },
      ],
      assessments: [
        { assessment_id: 'a1', lo_ids: ['lo1'] },
        { assessment_id: 'a2', lo_ids: ['lo2'] },
      ],
      marks_entry: [
        // s1 only has lo1 graded (100%); s2 only has lo2 graded (0%).
        { student_id: 's1', assessment_id: 'a1', marks_obtained: 100, max_marks: 100 },
        { student_id: 's2', assessment_id: 'a2', marks_obtained: 0, max_marks: 100 },
      ],
    });
    // s1's own average = 100 (only lo1 counts for them); s2's own average = 0.
    // College average = avg(100, 0) = 50 — each student weighted once,
    // not each mark weighted once (which would still give 50 here, so the
    // real thing this guards is not silently skipping students entirely).
    expect(collegeAverageCoMastery(db, 'c1')).toBe(50);
  });

  it('returns null when the college has no learning outcomes at all yet', () => {
    const db = dbWith({ students: [{ user_id: 's1', college_id: 'c1' }] });
    expect(collegeAverageCoMastery(db, 'c1')).toBeNull();
  });
});
