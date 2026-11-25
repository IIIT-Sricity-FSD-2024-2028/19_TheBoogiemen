/**
 * students.service.spec.ts — covers resolveOwnCgpa()'s fallback branching
 * only (the one piece of real logic added here), not computeCGPA()'s own
 * credit-weighting math, which grading.spec.ts already covers in depth.
 * grading.ts is mocked so these tests control exactly what "already
 * computed" vs "nothing gradeable yet" looks like, independent of any real
 * enrollment/marks data shape.
 */
import { StudentsService } from './students.service';
import { computeCGPA } from '../common/grading';

jest.mock('../common/grading', () => ({
  computeCGPA: jest.fn(),
  computeGradeTrend: jest.fn(),
  predictedFinalGrade: jest.fn(() => null),
}));

function fakeDb(students: any[]) {
  return { students, persist: jest.fn() } as any;
}

describe('StudentsService — CGPA baseline fallback', () => {
  beforeEach(() => jest.clearAllMocks());

  it('getProfile shows the real computed CGPA once it exists, even over a baseline on record', async () => {
    (computeCGPA as jest.Mock).mockReturnValue({ cgpa: 8.2, courses: [] });
    const service = new StudentsService(fakeDb([{ user_id: 's1', cgpa: 6.0 }]));
    const profile = await service.getProfile('s1');
    expect(profile.cgpa).toBe(8.2);
  });

  it('getProfile falls back to the admin-provided baseline when nothing is gradeable yet', async () => {
    (computeCGPA as jest.Mock).mockReturnValue({ cgpa: null, courses: [] });
    const service = new StudentsService(fakeDb([{ user_id: 's1', cgpa: 7.5 }]));
    const profile = await service.getProfile('s1');
    expect(profile.cgpa).toBe(7.5);
  });

  it('getProfile stays null when neither a computed grade nor a baseline exists', async () => {
    (computeCGPA as jest.Mock).mockReturnValue({ cgpa: null, courses: [] });
    const service = new StudentsService(fakeDb([{ user_id: 's1', cgpa: null }]));
    const profile = await service.getProfile('s1');
    expect(profile.cgpa).toBeNull();
  });

  it('a stray 0 baseline (legacy single-create default) is treated as no baseline, not a real 0.0 GPA', async () => {
    (computeCGPA as jest.Mock).mockReturnValue({ cgpa: null, courses: [] });
    const service = new StudentsService(fakeDb([{ user_id: 's1', cgpa: 0 }]));
    const profile = await service.getProfile('s1');
    expect(profile.cgpa).toBeNull();
  });

  it('getGrades applies the same fallback as getProfile', async () => {
    (computeCGPA as jest.Mock).mockReturnValue({ cgpa: null, courses: [] });
    const service = new StudentsService(fakeDb([{ user_id: 's1', cgpa: 6.8 }]));
    const grades = await service.getGrades('s1');
    expect(grades.cgpa).toBe(6.8);
  });
});
