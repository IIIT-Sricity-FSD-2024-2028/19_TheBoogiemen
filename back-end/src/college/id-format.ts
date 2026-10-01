/**
 * College-defined ID formats (roll numbers, employee ids).
 *
 * A template is an ordered list of tokens, e.g. for "2024CSE001":
 *   [{type:'year',format:'YYYY'}, {type:'dept'}, {type:'seq',width:3,reset:'dept_year'}]
 * and for "IIITS/CSE/24/001":
 *   [{type:'text',value:'IIITS/'}, {type:'dept'}, {type:'text',value:'/'},
 *    {type:'year',format:'YY'}, {type:'text',value:'/'}, {type:'seq',width:3,reset:'dept_year'}]
 *
 * Pure functions only, so they are easy to test and reuse.
 */

export type IdToken =
  | { type: 'text'; value: string }
  | { type: 'year'; format: 'YYYY' | 'YY' }
  | { type: 'dept' }
  | { type: 'programme' }
  | { type: 'section' }
  | { type: 'seq'; width: number; reset: 'never' | 'year' | 'dept' | 'dept_year' };

export type IdTemplate = IdToken[];

export interface IdContext {
  year: number;
  deptCode?: string | null;
  programmeCode?: string | null;
  section?: string | null;
}

export const DEFAULT_ID_FORMATS: Record<string, IdTemplate> = {
  student: [{ type: 'year', format: 'YYYY' }, { type: 'dept' }, { type: 'seq', width: 3, reset: 'dept_year' }],
  faculty: [{ type: 'text', value: 'FAC-' }, { type: 'dept' }, { type: 'text', value: '-' }, { type: 'seq', width: 3, reset: 'dept' }],
  staff: [{ type: 'text', value: 'STF-' }, { type: 'seq', width: 3, reset: 'never' }],
};

const MAX_TOKENS = 12;

/** Returns an error message, or null when the template is valid. */
export function validateTemplate(template: IdTemplate): string | null {
  if (!Array.isArray(template) || template.length === 0) return 'Add at least one part to the format.';
  if (template.length > MAX_TOKENS) return `A format can have at most ${MAX_TOKENS} parts.`;
  const seqs = template.filter((t) => t.type === 'seq');
  if (seqs.length !== 1) return 'The format needs exactly one running number (sequence) so every ID is unique.';
  for (const t of template) {
    switch (t.type) {
      case 'text':
        if (typeof t.value !== 'string' || !t.value.length) return 'Fixed text parts cannot be empty.';
        if (t.value.length > 12) return 'Fixed text parts can be at most 12 characters.';
        if (!/^[A-Za-z0-9/\-_. ]+$/.test(t.value)) return 'Fixed text can use letters, numbers, spaces and / - _ .';
        break;
      case 'year':
        if (t.format !== 'YYYY' && t.format !== 'YY') return 'Year must be YYYY or YY.';
        break;
      case 'seq':
        if (!Number.isInteger(t.width) || t.width < 1 || t.width > 8) return 'The running number must be 1 to 8 digits wide.';
        if (!['never', 'year', 'dept', 'dept_year'].includes(t.reset)) return 'Invalid reset rule for the running number.';
        break;
      case 'dept':
      case 'programme':
      case 'section':
        break;
      default:
        return 'Unknown part in the format.';
    }
  }
  return null;
}

/** Which counter a new ID draws from, e.g. "student:CSE:2024". */
export function sequenceKey(kind: string, template: IdTemplate, ctx: IdContext): string {
  const seq = template.find((t) => t.type === 'seq') as Extract<IdToken, { type: 'seq' }>;
  const dept = (ctx.deptCode || '').toUpperCase();
  switch (seq.reset) {
    case 'year': return `${kind}:${ctx.year}`;
    case 'dept': return `${kind}:${dept}`;
    case 'dept_year': return `${kind}:${dept}:${ctx.year}`;
    default: return `${kind}`;
  }
}

function needs(template: IdTemplate, type: IdToken['type']) {
  return template.some((t) => t.type === type);
}

/** Missing context for this template (e.g. a department code), or null. */
export function missingContext(template: IdTemplate, ctx: IdContext): string | null {
  if (needs(template, 'dept') && !ctx.deptCode) return 'a department';
  if (needs(template, 'programme') && !ctx.programmeCode) return 'a programme';
  if (needs(template, 'section') && !ctx.section) return 'a section';
  return null;
}

/** Renders an ID for a given sequence number. */
export function renderId(template: IdTemplate, ctx: IdContext, seqNumber: number): string {
  return template
    .map((t) => {
      switch (t.type) {
        case 'text': return t.value;
        case 'year': return t.format === 'YY' ? String(ctx.year).slice(-2) : String(ctx.year);
        case 'dept': return (ctx.deptCode || '').toUpperCase();
        case 'programme': return (ctx.programmeCode || '').toUpperCase();
        case 'section': return (ctx.section || '').toUpperCase();
        case 'seq': return String(seqNumber).padStart(t.width, '0');
        default: return '';
      }
    })
    .join('');
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\/-]/g, '\\$&');

/** Regex that matches IDs of this template (used to validate imported IDs). */
export function buildRegex(template: IdTemplate): RegExp {
  const body = template
    .map((t) => {
      switch (t.type) {
        case 'text': return escapeRe(t.value);
        case 'year': return t.format === 'YY' ? '\\d{2}' : '\\d{4}';
        case 'dept':
        case 'programme':
        case 'section': return '[A-Z0-9]+';
        case 'seq': return `\\d{${t.width},}`;
        default: return '';
      }
    })
    .join('');
  return new RegExp(`^${body}$`, 'i');
}

export function validateId(template: IdTemplate, id: string): boolean {
  return buildRegex(template).test(String(id || '').trim());
}

/** Human-readable example for the format builder preview. */
export function previewId(template: IdTemplate, ctx: Partial<IdContext> = {}): string {
  return renderId(
    template,
    { year: ctx.year ?? new Date().getFullYear(), deptCode: ctx.deptCode ?? 'CSE', programmeCode: ctx.programmeCode ?? 'BTECH', section: ctx.section ?? 'A' },
    1,
  );
}

/**
 * Allocates the next ID: bumps the counter in `sequences` (mutated) and skips
 * values already taken, so a manually entered ID never causes a duplicate.
 */
export function allocateId(
  kind: string,
  template: IdTemplate,
  ctx: IdContext,
  sequences: Record<string, number>,
  taken: Set<string>,
): string {
  const key = sequenceKey(kind, template, ctx);
  let n = sequences[key] ?? 0;
  let id: string;
  do {
    n += 1;
    id = renderId(template, ctx, n);
  } while (taken.has(id.toUpperCase()));
  sequences[key] = n;
  return id;
}
