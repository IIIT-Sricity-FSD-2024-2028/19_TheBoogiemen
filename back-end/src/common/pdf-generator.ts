/**
 * pdf-generator.ts
 * Generates standards-compliant %PDF-1.4 binary documents without external dependencies.
 */

export function generatePdfBuffer(
  title: string,
  subtitle: string,
  headers: string[],
  rows: (string | number)[][],
): Buffer {
  const escapeText = (str: any) =>
    (str ?? '')
      .toString()
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');

  const stream: string[] = [];

  // Header Title
  stream.push('BT');
  stream.push('/F2 16 Tf');
  stream.push('50 780 Td');
  stream.push(`(${escapeText(title)}) Tj`);
  stream.push('ET');

  // Subtitle + Timestamp
  stream.push('BT');
  stream.push('/F1 10 Tf');
  stream.push('50 760 Td');
  stream.push(`(${escapeText(`${subtitle} | Generated: ${new Date().toLocaleString()}`)}) Tj`);
  stream.push('ET');

  // Divider line
  stream.push('50 745 m 560 745 l S');

  // Table Column Headers
  let y = 725;
  stream.push('BT');
  stream.push('/F2 10 Tf');
  const colWidth = Math.floor(510 / (headers.length || 1));
  headers.forEach((h, idx) => {
    stream.push(`${50 + idx * colWidth} ${y} Td`);
    stream.push(`(${escapeText(h)}) Tj`);
    stream.push(`-${50 + idx * colWidth} -${y} Td`);
  });
  stream.push('ET');
  stream.push(`50 ${y - 6} m 560 ${y - 6} l S`);

  // Data Rows
  y -= 22;
  rows.forEach((row) => {
    if (y < 60) return; // single page guard
    stream.push('BT');
    stream.push('/F1 9 Tf');
    row.forEach((cell, idx) => {
      stream.push(`${50 + idx * colWidth} ${y} Td`);
      stream.push(`(${escapeText(cell)}) Tj`);
      stream.push(`-${50 + idx * colWidth} -${y} Td`);
    });
    stream.push('ET');
    y -= 18;
  });

  const content = stream.join('\n');
  const contentLen = Buffer.byteLength(content);

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj\n',
    `4 0 obj\n<< /Length ${contentLen} >>\nstream\n${content}\nendstream\nendobj\n`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    '6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n',
  ];

  const header = '%PDF-1.4\n';
  const offsets = [0];
  let body = '';
  let currentOffset = Buffer.byteLength(header);

  for (const obj of objects) {
    offsets.push(currentOffset);
    body += obj;
    currentOffset += Buffer.byteLength(obj);
  }

  const xrefStart = currentOffset;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }

  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return Buffer.from(header + body + xref + trailer);
}
