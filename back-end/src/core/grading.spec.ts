import { DEFAULT_GRADING, GradingConfig, gradeFor, validateGrading } from './grading';

describe('grading', () => {
  it('maps percentages to the default 10-point bands at the boundaries', () => {
    expect(gradeFor(100).grade).toBe('S');
    expect(gradeFor(90).grade).toBe('S');
    expect(gradeFor(89.9).grade).toBe('A');
    expect(gradeFor(40).grade).toBe('E');
    expect(gradeFor(39.9).grade).toBe('F');
    expect(gradeFor(0).points).toBe(0);
  });

  it("uses the college's own scale, whatever order the bands are stored in", () => {
    const fourPoint: GradingConfig = {
      scale: '4pt',
      pass_pct: 50,
      bands: [
        { grade: 'F', min_pct: 0, points: 0 },
        { grade: 'A', min_pct: 85, points: 4 },
        { grade: 'C', min_pct: 50, points: 2 },
        { grade: 'B', min_pct: 70, points: 3 },
      ],
    };
    expect(gradeFor(86, fourPoint)).toEqual({ grade: 'A', min_pct: 85, points: 4 });
    expect(gradeFor(72, fourPoint).grade).toBe('B');
    expect(gradeFor(49, fourPoint).grade).toBe('F');
  });

  it('accepts the default scale and rejects broken ones', () => {
    expect(validateGrading(DEFAULT_GRADING)).toBeNull();
    expect(validateGrading({ ...DEFAULT_GRADING, bands: [{ grade: 'A', min_pct: 50, points: 4 }] })).toMatch(/two grade bands/);
    expect(validateGrading({ ...DEFAULT_GRADING, bands: [{ grade: 'A', min_pct: 50, points: 4 }, { grade: 'A', min_pct: 0, points: 0 }] })).toMatch(/twice/);
    expect(validateGrading({ ...DEFAULT_GRADING, bands: [{ grade: 'A', min_pct: 50, points: 4 }, { grade: 'B', min_pct: 10, points: 0 }] })).toMatch(/start at 0%/);
    expect(validateGrading({ ...DEFAULT_GRADING, pass_pct: 120 })).toMatch(/Pass mark/);
  });
});
