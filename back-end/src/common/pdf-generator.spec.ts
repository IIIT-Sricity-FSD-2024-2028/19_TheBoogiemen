import { generatePdfBuffer } from './pdf-generator';

describe('generatePdfBuffer', () => {
  const pdf = (rows: (string | number)[][]) => generatePdfBuffer('Report', 'Sub', ['Code', 'Course', 'Marks'], rows).toString('latin1');

  it('produces a PDF with a valid cross-reference offset', () => {
    const out = pdf([['CS301', 'Algorithms', '77%']]);
    expect(out.startsWith('%PDF-1.4')).toBe(true);
    const start = Number(out.match(/startxref\n(\d+)/)![1]);
    expect(out.slice(start, start + 4)).toBe('xref');
  });

  it('shortens text that would run into the next column', () => {
    const long = 'Design and Analysis of Algorithms and Advanced Data Structures for Engineers, Part Two';
    const out = pdf([['CS301', long, '77%']]);
    expect(out).not.toContain(long);
    expect(out).toContain('...');
  });

  it('continues on further pages instead of dropping rows', () => {
    const rows = Array.from({ length: 120 }, (_, i) => [`R${i}`, `Student ${i}`, `${i}%`]);
    const out = pdf(rows);
    expect(Number(out.match(/\/Count (\d+)/)![1])).toBeGreaterThan(1);
    expect(out).toContain('(R119)');
    expect(out).toContain('Page 1 of');
  });

  it('spells out the rupee sign, which the built-in font lacks', () => {
    expect(pdf([['FEE', 'Tuition', '₹75,000']])).toContain('Rs. 75,000');
  });
});
