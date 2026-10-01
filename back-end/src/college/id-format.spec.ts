import { allocateId, buildRegex, DEFAULT_ID_FORMATS, IdTemplate, missingContext, previewId, renderId, validateId, validateTemplate } from './id-format';

describe('id-format', () => {
  const roll: IdTemplate = [{ type: 'year', format: 'YYYY' }, { type: 'dept' }, { type: 'seq', width: 3, reset: 'dept_year' }];
  const slashed: IdTemplate = [
    { type: 'text', value: 'IIITS/' }, { type: 'dept' }, { type: 'text', value: '/' },
    { type: 'year', format: 'YY' }, { type: 'text', value: '/' }, { type: 'seq', width: 3, reset: 'dept_year' },
  ];

  it('renders the documented examples', () => {
    expect(renderId(roll, { year: 2024, deptCode: 'cse' }, 1)).toBe('2024CSE001');
    expect(renderId(slashed, { year: 2024, deptCode: 'CSE' }, 7)).toBe('IIITS/CSE/24/007');
    expect(previewId(DEFAULT_ID_FORMATS.faculty)).toBe('FAC-CSE-001');
  });

  it('requires exactly one sequence and valid parts', () => {
    expect(validateTemplate(roll)).toBeNull();
    expect(validateTemplate([{ type: 'dept' }])).toMatch(/running number/);
    expect(validateTemplate([...roll, { type: 'seq', width: 2, reset: 'never' }])).toMatch(/exactly one/);
    expect(validateTemplate([{ type: 'text', value: '<script>' }, { type: 'seq', width: 3, reset: 'never' }])).toMatch(/Fixed text/);
    expect(validateTemplate([])).toMatch(/at least one/);
  });

  it('validates ids against the template', () => {
    expect(validateId(roll, '2024CSE001')).toBe(true);
    expect(validateId(roll, '2024CSE01')).toBe(false);
    expect(validateId(slashed, 'IIITS/ECE/25/120')).toBe(true);
    expect(buildRegex(slashed).test('IIITS-ECE-25-120')).toBe(false);
  });

  it('allocates per counter and skips taken ids', () => {
    const seq: Record<string, number> = {};
    const taken = new Set(['2024CSE002']);
    expect(allocateId('student', roll, { year: 2024, deptCode: 'CSE' }, seq, taken)).toBe('2024CSE001');
    expect(allocateId('student', roll, { year: 2024, deptCode: 'CSE' }, seq, taken)).toBe('2024CSE003');
    expect(allocateId('student', roll, { year: 2024, deptCode: 'ECE' }, seq, taken)).toBe('2024ECE001');
    expect(allocateId('student', roll, { year: 2025, deptCode: 'CSE' }, seq, taken)).toBe('2025CSE001');
  });

  it('reports missing context', () => {
    expect(missingContext(roll, { year: 2024 })).toBe('a department');
    expect(missingContext(roll, { year: 2024, deptCode: 'CSE' })).toBeNull();
  });
});
