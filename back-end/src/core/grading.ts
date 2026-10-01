/**
 * College grading. Each college stores its own scale in college_settings;
 * these defaults are used only when a college has not configured one yet.
 */
export interface GradeBand {
  grade: string;
  min_pct: number;
  points: number;
}

export interface GradingConfig {
  scale: '10pt' | '4pt' | 'percentage';
  bands: GradeBand[];
  pass_pct: number;
}

export const DEFAULT_GRADING: GradingConfig = {
  scale: '10pt',
  pass_pct: 40,
  bands: [
    { grade: 'S', min_pct: 90, points: 10 },
    { grade: 'A', min_pct: 80, points: 9 },
    { grade: 'B', min_pct: 70, points: 8 },
    { grade: 'C', min_pct: 60, points: 7 },
    { grade: 'D', min_pct: 50, points: 6 },
    { grade: 'E', min_pct: 40, points: 5 },
    { grade: 'F', min_pct: 0, points: 0 },
  ],
};

export function gradeFor(pct: number, grading: GradingConfig = DEFAULT_GRADING): GradeBand {
  const bands = [...(grading.bands?.length ? grading.bands : DEFAULT_GRADING.bands)].sort((a, b) => b.min_pct - a.min_pct);
  return bands.find((b) => pct >= b.min_pct) ?? bands[bands.length - 1];
}

export function validateGrading(g: GradingConfig): string | null {
  if (!g || !Array.isArray(g.bands) || g.bands.length < 2) return 'Add at least two grade bands.';
  const grades = new Set<string>();
  for (const b of g.bands) {
    if (!b.grade || typeof b.grade !== 'string') return 'Every band needs a grade letter.';
    if (grades.has(b.grade)) return `Grade "${b.grade}" is listed twice.`;
    grades.add(b.grade);
    if (typeof b.min_pct !== 'number' || b.min_pct < 0 || b.min_pct > 100) return 'Minimum % must be between 0 and 100.';
    if (typeof b.points !== 'number' || b.points < 0) return 'Grade points must be zero or more.';
  }
  if (!g.bands.some((b) => b.min_pct === 0)) return 'One band must start at 0% so every mark gets a grade.';
  if (typeof g.pass_pct !== 'number' || g.pass_pct < 0 || g.pass_pct > 100) return 'Pass mark must be between 0 and 100.';
  return null;
}
