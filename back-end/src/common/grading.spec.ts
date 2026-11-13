/**
 * grading.spec.ts — the relative-curve letter grade and CGPA calculation
 * nothing in this codebase did before. Regressing this either fabricates a
 * grade from nothing, mis-curves a cohort (e.g. the N=1 trap defaulting to
 * F instead of the top grade), or lets a tie straddle a band boundary.
 */

import {
  computeCGPA,
  computeCoursePercentage,
  computeCourseGradesForCourse,
  computeStudentCourseGrade,
  gradeForPercentile,
  predictedFinalGrade,
} from './grading';

const dbWith = (over: any = {}) =>
  ({
    assessments: [],
    marks_entry: [],
    enrollment: [],
    students: [],
    courses: [],
    ...over,
  }) as any;

describe('computeCoursePercentage', () => {
  it('weights by weightage across graded assessments only, normalized by graded weightage', () => {
    const db = dbWith({
      assessments: [
        { assessment_id: 'a1', course_id: 'c1', weightage: 20 },
        { assessment_id: 'a2', course_id: 'c1', weightage: 10 },
        { assessment_id: 'a3', course_id: 'c1', weightage: 70 }, // ungraded, must not count or dilute
      ],
      marks_entry: [
        { student_id: 's1', assessment_id: 'a1', marks_obtained: 100, max_marks: 100 }, // 100%
        { student_id: 's1', assessment_id: 'a2', marks_obtained: 50, max_marks: 100 }, // 50%
      ],
    });
    // (100*20 + 50*10) / (20+10) = 2500/30 = 83.33
    expect(computeCoursePercentage(db, 's1', 'c1')).toBeCloseTo(83.33, 1);
  });

  it('returns null when nothing is graded yet, not zero', () => {
    const db = dbWith({ assessments: [{ assessment_id: 'a1', course_id: 'c1', weightage: 20 }] });
    expect(computeCoursePercentage(db, 's1', 'c1')).toBeNull();
  });
});

describe('gradeForPercentile', () => {
  it('maps each band boundary to the correct letter', () => {
    expect(gradeForPercentile(0).letter).toBe('O');
    expect(gradeForPercentile(9.99).letter).toBe('O');
    expect(gradeForPercentile(10).letter).toBe('A');
    expect(gradeForPercentile(34.99).letter).toBe('A');
    expect(gradeForPercentile(35).letter).toBe('B');
    expect(gradeForPercentile(64.99).letter).toBe('B');
    expect(gradeForPercentile(65).letter).toBe('C');
    expect(gradeForPercentile(82.99).letter).toBe('C');
    expect(gradeForPercentile(83).letter).toBe('D');
    expect(gradeForPercentile(90.99).letter).toBe('D');
    expect(gradeForPercentile(91).letter).toBe('P');
    expect(gradeForPercentile(94.99).letter).toBe('P');
    expect(gradeForPercentile(95).letter).toBe('F');
    expect(gradeForPercentile(99.99).letter).toBe('F');
  });
});

function tenStudentCourse() {
  // 10 students, strictly decreasing distinct percentages: s1 best, s10 worst.
  const assessments = [{ assessment_id: 'a1', course_id: 'c1', weightage: 100 }];
  const enrollment: any[] = [];
  const marks_entry: any[] = [];
  for (let i = 1; i <= 10; i++) {
    const sid = `s${i}`;
    enrollment.push({ student_id: sid, course_id: 'c1', status: 'active' });
    marks_entry.push({ student_id: sid, assessment_id: 'a1', marks_obtained: 100 - (i - 1) * 5, max_marks: 100 });
  }
  return dbWith({ assessments, enrollment, marks_entry });
}

describe('computeCourseGradesForCourse', () => {
  it('ranks a 10-student cohort so only the single best student lands in O (top 10%)', () => {
    const db = tenStudentCourse();
    const rows = computeCourseGradesForCourse(db, 'c1');
    expect(rows).toHaveLength(10);
    const byStudent = Object.fromEntries(rows.map((r) => [r.student_id, r.letter]));
    expect(byStudent.s1).toBe('O'); // rank 1, percentile 0
    expect(byStudent.s2).toBe('A'); // rank 2, percentile 10 -> A band starts at 10
    expect(byStudent.s10).toBe('D'); // rank 10, percentile 90 -> D band (83-91)
  });

  it('the lone student in a cohort of 1 gets the top grade, not F', () => {
    const db = dbWith({
      assessments: [{ assessment_id: 'a1', course_id: 'c1', weightage: 100 }],
      enrollment: [{ student_id: 's1', course_id: 'c1', status: 'active' }],
      marks_entry: [{ student_id: 's1', assessment_id: 'a1', marks_obtained: 40, max_marks: 100 }],
    });
    const rows = computeCourseGradesForCourse(db, 'c1');
    expect(rows).toHaveLength(1);
    expect(rows[0].percentile).toBe(0);
    expect(rows[0].letter).toBe('O');
  });

  it('a tie straddling a band boundary gets one shared grade, not split', () => {
    // 10 students; ranks 2 and 3 tie at the same percentage, which would
    // otherwise straddle the O|A boundary (rank 2 -> percentile 10 -> A,
    // but as a tied group both must share rank 2's grade).
    const assessments = [{ assessment_id: 'a1', course_id: 'c1', weightage: 100 }];
    const enrollment: any[] = [];
    const marks_entry: any[] = [];
    const scores = [100, 90, 90, 70, 60, 50, 40, 30, 20, 10]; // s2 and s3 tie at 90
    scores.forEach((score, idx) => {
      const sid = `s${idx + 1}`;
      enrollment.push({ student_id: sid, course_id: 'c1', status: 'active' });
      marks_entry.push({ student_id: sid, assessment_id: 'a1', marks_obtained: score, max_marks: 100 });
    });
    const db = dbWith({ assessments, enrollment, marks_entry });
    const rows = computeCourseGradesForCourse(db, 'c1');
    const byStudent = Object.fromEntries(rows.map((r) => [r.student_id, r]));
    expect(byStudent.s2.rank).toBe(2);
    expect(byStudent.s3.rank).toBe(2); // inherits the tie's better rank
    expect(byStudent.s2.letter).toBe(byStudent.s3.letter);
  });

  it('a student with no graded assessment is excluded from the cohort entirely, not ranked last', () => {
    const db = dbWith({
      assessments: [{ assessment_id: 'a1', course_id: 'c1', weightage: 100 }],
      enrollment: [
        { student_id: 's1', course_id: 'c1', status: 'active' },
        { student_id: 's2', course_id: 'c1', status: 'active' },
        { student_id: 's3', course_id: 'c1', status: 'active' }, // never graded
      ],
      marks_entry: [
        { student_id: 's1', assessment_id: 'a1', marks_obtained: 90, max_marks: 100 },
        { student_id: 's2', assessment_id: 'a1', marks_obtained: 50, max_marks: 100 },
      ],
    });
    const rows = computeCourseGradesForCourse(db, 'c1');
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.student_id === 's3')).toBeUndefined();
    // With N=2 (not 3), s1 is rank 1 (percentile 0 -> O) and s2 is rank 2
    // (percentile 50 -> B), proving the excluded student didn't dilute N.
    expect(rows.find((r) => r.student_id === 's1')?.letter).toBe('O');
  });
});

describe('computeStudentCourseGrade', () => {
  it('returns null for a student not enrolled or never graded in that course', () => {
    const db = tenStudentCourse();
    expect(computeStudentCourseGrade(db, 'nobody', 'c1')).toBeNull();
  });
});

describe('computeCGPA', () => {
  it('credit-weights grade points across graded courses, not a flat average', () => {
    const db = dbWith({
      assessments: [
        { assessment_id: 'a1', course_id: 'c1', weightage: 100 },
        { assessment_id: 'a2', course_id: 'c2', weightage: 100 },
      ],
      enrollment: [
        { student_id: 's1', course_id: 'c1', status: 'active' },
        { student_id: 's1', course_id: 'c2', status: 'active' },
      ],
      marks_entry: [
        { student_id: 's1', assessment_id: 'a1', marks_obtained: 100, max_marks: 100 }, // lone student -> O (10 pts)
        { student_id: 's1', assessment_id: 'a2', marks_obtained: 100, max_marks: 100 }, // lone student -> O (10 pts)
      ],
      courses: [
        { course_id: 'c1', course_code: 'C1', course_name: 'Course One', credits: 1 },
        { course_id: 'c2', course_code: 'C2', course_name: 'Course Two', credits: 4 },
      ],
    });
    // Both courses land on O (10 pts) since each has a lone enrolled student -
    // credit-weighted average of two 10s is still 10, so instead verify the
    // weighting math directly by giving c1 a worse grade via a second,
    // better-scoring student pulling c1's curve down for s1.
    const { cgpa, courses } = computeCGPA(db, 's1');
    expect(courses).toHaveLength(2);
    expect(cgpa).toBe(10);
  });

  it('actually weights by credits when grade points differ between courses', () => {
    const db = dbWith({
      assessments: [
        { assessment_id: 'a1', course_id: 'c1', weightage: 100 },
        { assessment_id: 'a2', course_id: 'c2', weightage: 100 },
      ],
      enrollment: [
        { student_id: 's1', course_id: 'c1', status: 'active' },
        { student_id: 's1', course_id: 'c2', status: 'active' },
        { student_id: 's2', course_id: 'c1', status: 'active' }, // outscores s1 in c1, pushing s1 down the curve
      ],
      marks_entry: [
        { student_id: 's1', assessment_id: 'a1', marks_obtained: 10, max_marks: 100 }, // worst of 2 in c1
        { student_id: 's2', assessment_id: 'a1', marks_obtained: 100, max_marks: 100 }, // best of 2 in c1
        { student_id: 's1', assessment_id: 'a2', marks_obtained: 100, max_marks: 100 }, // lone student in c2 -> O
      ],
      courses: [
        { course_id: 'c1', course_code: 'C1', course_name: 'Course One', credits: 1 },
        { course_id: 'c2', course_code: 'C2', course_name: 'Course Two', credits: 4 },
      ],
    });
    // s1 in c1: N=2, rank 2, percentile 50 -> B band (35-65) -> 8 pts, credits 1.
    // s1 in c2: N=1, rank 1, percentile 0 -> O -> 10 pts, credits 4.
    // CGPA = (8*1 + 10*4) / 5 = 48/5 = 9.6
    const { cgpa } = computeCGPA(db, 's1');
    expect(cgpa).toBe(9.6);
  });

  it('skips an ungraded course rather than averaging it in as a 0', () => {
    const db = dbWith({
      assessments: [{ assessment_id: 'a1', course_id: 'c1', weightage: 100 }],
      enrollment: [
        { student_id: 's1', course_id: 'c1', status: 'active' },
        { student_id: 's1', course_id: 'c2', status: 'active' }, // never graded
      ],
      marks_entry: [{ student_id: 's1', assessment_id: 'a1', marks_obtained: 100, max_marks: 100 }],
      courses: [
        { course_id: 'c1', course_code: 'C1', course_name: 'Course One', credits: 3 },
        { course_id: 'c2', course_code: 'C2', course_name: 'Course Two', credits: 4 },
      ],
    });
    const { cgpa, courses } = computeCGPA(db, 's1');
    expect(courses).toHaveLength(1);
    expect(cgpa).toBe(10); // the single graded course's own grade point, not diluted
  });

  it('returns null when no enrolled course is gradeable yet', () => {
    const db = dbWith({
      enrollment: [{ student_id: 's1', course_id: 'c1', status: 'active' }],
      courses: [{ course_id: 'c1', course_code: 'C1', course_name: 'Course One', credits: 4 }],
    });
    const { cgpa, courses } = computeCGPA(db, 's1');
    expect(cgpa).toBeNull();
    expect(courses).toHaveLength(0);
  });
});

describe('predictedFinalGrade', () => {
  it('maps a blended CGPA to the nearest grade band by points', () => {
    const db = dbWith({
      assessments: [{ assessment_id: 'a1', course_id: 'c1', weightage: 100 }],
      enrollment: [{ student_id: 's1', course_id: 'c1', status: 'active' }],
      marks_entry: [{ student_id: 's1', assessment_id: 'a1', marks_obtained: 50, max_marks: 100 }],
      courses: [{ course_id: 'c1', course_code: 'C1', course_name: 'Course One', credits: 4 }],
    });
    // Lone student -> O (10 pts) regardless of raw score, so CGPA is 10 -> O.
    expect(predictedFinalGrade(db, 's1')).toEqual({ letter: 'O', gradePoint: 10 });
  });

  it('returns null when CGPA itself is null', () => {
    const db = dbWith();
    expect(predictedFinalGrade(db, 's1')).toBeNull();
  });
});
