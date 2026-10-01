/**
 * pdf-generator.ts
 * Generates standards-compliant %PDF-1.4 documents without external dependencies:
 * a title, a subtitle line and one table that flows over as many pages as it needs.
 */

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 50;
const USABLE = PAGE_WIDTH - 2 * MARGIN;
const COLUMN_GAP = 8;
const ROW_HEIGHT = 18;
// Helvetica averages about half the font size per character; this errs wide so text never overruns.
const CHAR_WIDTH = 0.54;

/** Type1 Helvetica only covers Latin-1, so common symbols are spelled out and the rest dropped. */
function latin1(value: unknown): string {
  return String(value ?? '')
    .replace(/[–—]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/₹/g, 'Rs. ')
    .replace(/…/g, '...')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '?');
}

const escapeText = (str: string) => str.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

/** Shortens text to what fits in `width` points at `fontSize`, ending in "..." when cut. */
function fit(value: unknown, width: number, fontSize: number): string {
  const text = latin1(value);
  const max = Math.max(1, Math.floor(width / (fontSize * CHAR_WIDTH)));
  return text.length <= max ? text : `${text.slice(0, Math.max(1, max - 3))}...`;
}

/** Shares the page width between columns in proportion to their longest content. */
function columnWidths(headers: string[], rows: (string | number)[][]): number[] {
  const count = headers.length || 1;
  const weights = headers.map((h, i) => {
    const longest = rows.reduce((m, row) => Math.max(m, latin1(row[i]).length), latin1(h).length);
    return Math.min(Math.max(longest, 6), 44);
  });
  const total = weights.reduce((s, w) => s + w, 0) || count;
  return weights.map((w) => (USABLE * w) / total);
}

export function generatePdfBuffer(
  title: string,
  subtitle: string,
  headers: string[],
  rows: (string | number)[][],
): Buffer {
  const widths = columnWidths(headers, rows);
  const xs = widths.reduce<number[]>((acc, w, i) => [...acc, i === 0 ? MARGIN : acc[i - 1] + widths[i - 1]], []);
  const generated = `Generated ${new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}`;

  const text = (font: 'F1' | 'F2', size: number, x: number, y: number, value: string) =>
    `BT /${font} ${size} Tf ${x.toFixed(1)} ${y} Td (${escapeText(value)}) Tj ET`;

  const tableHeader = (y: number) => [
    ...headers.map((h, i) => text('F2', 10, xs[i], y, fit(h, widths[i] - COLUMN_GAP, 10))),
    `${MARGIN} ${y - 6} m ${PAGE_WIDTH - MARGIN} ${y - 6} l S`,
  ];

  // Lay the rows out page by page.
  const pages: string[][] = [];
  let page: string[] = [];
  let y = 0;
  const startPage = (first: boolean) => {
    page = [];
    if (first) {
      page.push(text('F2', 16, MARGIN, 780, fit(title, USABLE, 16)));
      page.push(text('F1', 10, MARGIN, 760, fit(`${subtitle} | ${generated}`, USABLE, 10)));
      page.push(`${MARGIN} 745 m ${PAGE_WIDTH - MARGIN} 745 l S`);
      y = 725;
    } else {
      page.push(text('F1', 9, MARGIN, 780, fit(`${title} (continued)`, USABLE, 9)));
      y = 755;
    }
    page.push(...tableHeader(y));
    y -= 22;
    pages.push(page);
  };

  startPage(true);
  rows.forEach((row) => {
    if (y < 60) startPage(false);
    headers.forEach((_, i) => page.push(text('F1', 9, xs[i], y, fit(row[i], widths[i] - COLUMN_GAP, 9))));
    y -= ROW_HEIGHT;
  });
  if (rows.length === 0) page.push(text('F1', 10, MARGIN, y, 'No records.'));
  pages.forEach((p, i) => p.push(text('F1', 8, PAGE_WIDTH - MARGIN - 60, 30, `Page ${i + 1} of ${pages.length}`)));

  // Objects: 1 catalog, 2 page tree, 3 and 4 fonts, then a page and a content stream per page.
  const kids = pages.map((_, i) => `${5 + i * 2} 0 R`).join(' ');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
  ];
  pages.forEach((p, i) => {
    const content = p.join('\n');
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Contents ${6 + i * 2} 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> >>`,
    );
    objects.push(`<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream`);
  });

  const header = '%PDF-1.4\n';
  const offsets: number[] = [];
  let body = '';
  let offset = Buffer.byteLength(header, 'latin1');
  objects.forEach((obj, i) => {
    const chunk = `${i + 1} 0 obj\n${obj}\nendobj\n`;
    offsets.push(offset);
    body += chunk;
    offset += Buffer.byteLength(chunk, 'latin1');
  });

  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((o) => {
    xref += `${String(o).padStart(10, '0')} 00000 n \n`;
  });
  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${offset}\n%%EOF\n`;
  return Buffer.from(header + body + xref + trailer, 'latin1');
}
