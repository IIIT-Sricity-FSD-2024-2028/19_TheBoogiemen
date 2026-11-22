/**
 * bulk-onboard.util.ts — turning a human-compiled CSV into the field shape
 * createUser()'s logic already expects.
 *
 * The explicit use case (per the feature request) is a Google Form export:
 * headers are whatever question title someone typed ("Email Address",
 * "Student's Full Name"), not a clean `first_name`/`email` pair. Rather than
 * requiring an exact header match, every header is normalized (trimmed,
 * lowercased, non-alphanumerics collapsed to `_`) and then run through a
 * synonym table for the handful of column names a roster realistically has.
 * Anything left unrecognized is dropped and reported, never silently kept —
 * same "count it, don't hide it" convention scripts/seed-postgres.ts already
 * uses for its own column mismatches.
 */

export type BulkRole = 'student' | 'faculty';

export const CANONICAL_COLUMNS = [
  'first_name',
  'last_name',
  'email',
  'phone',
  'role',
  'password',
  'branch',
  'batch',
  'section',
  'cgpa',
  'designation',
  'department_id',
] as const;

export type CanonicalColumn = (typeof CANONICAL_COLUMNS)[number];

/** Normalized header -> canonical column. Covers the header text a Google
 *  Form question title or a manually-typed spreadsheet realistically uses. */
const SYNONYMS: Record<string, CanonicalColumn> = {
  first_name: 'first_name',
  firstname: 'first_name',
  first: 'first_name',
  given_name: 'first_name',
  name: 'first_name', // split further in splitFullName() below if last_name is absent

  last_name: 'last_name',
  lastname: 'last_name',
  last: 'last_name',
  surname: 'last_name',
  family_name: 'last_name',

  email: 'email',
  email_address: 'email',
  e_mail: 'email',
  college_email: 'email',
  student_email: 'email',

  phone: 'phone',
  phone_number: 'phone',
  mobile: 'phone',
  mobile_number: 'phone',
  contact: 'phone',
  contact_number: 'phone',

  role: 'role',
  user_type: 'role',
  user_role: 'role',
  account_type: 'role',

  password: 'password',
  initial_password: 'password',

  branch: 'branch',
  department: 'branch',
  stream: 'branch',
  course: 'branch',

  batch: 'batch',
  year: 'batch',
  batch_year: 'batch',
  graduating_year: 'batch',

  section: 'section',
  class: 'section',
  div: 'section',
  division: 'section',

  cgpa: 'cgpa',
  gpa: 'cgpa',

  designation: 'designation',
  title: 'designation',
  position: 'designation',

  department_id: 'department_id',
  dept: 'department_id',
  dept_id: 'department_id',
};

/** "Email Address" -> "email_address"; "E-Mail" -> "e_mail". */
export function normalizeHeader(header: string): string {
  return String(header ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/** A bare "Name" column with no separate last-name column: split on the
 *  first run of whitespace, everything after it is the last name. A
 *  single-word name has no last name, same as a real single-name person. */
function splitFullName(full: string): { first_name: string; last_name: string } {
  const trimmed = full.trim().replace(/\s+/g, ' ');
  const spaceAt = trimmed.indexOf(' ');
  if (spaceAt === -1) return { first_name: trimmed, last_name: '' };
  return { first_name: trimmed.slice(0, spaceAt), last_name: trimmed.slice(spaceAt + 1) };
}

/** Same shape/purpose as colleges.service.ts's randomTempPassword(): shown
 *  once in the bulk-import response so it can be relayed out of band, never
 *  a security boundary on its own. */
export function randomRosterPassword(): string {
  return 'Bp' + Math.random().toString(36).slice(2, 10) + '!1';
}

/** Maps one CSV row (raw header -> raw value) to canonical fields. A bare
 *  "Name" column is only ever a fallback for first_name/last_name — a real
 *  first_name (and/or last_name) column always wins if present, resolved in
 *  a second pass so column order in the sheet can't change the outcome. */
export function mapRowToCanonicalFields(
  row: Record<string, string>,
  unrecognizedHeaders: Set<string>,
): Partial<Record<CanonicalColumn, string>> {
  const fields: Partial<Record<CanonicalColumn, string>> = {};
  let fullName: string | null = null;

  for (const [rawHeader, rawValue] of Object.entries(row)) {
    const value = (rawValue ?? '').trim();
    if (!value) continue;
    const normalized = normalizeHeader(rawHeader);
    if (normalized === 'name') {
      fullName = value;
      continue;
    }
    const canonical = SYNONYMS[normalized];
    if (!canonical) {
      unrecognizedHeaders.add(rawHeader);
      continue;
    }
    fields[canonical] = value;
  }

  if (!fields.first_name && fullName) {
    const split = splitFullName(fullName);
    fields.first_name = split.first_name;
    if (!fields.last_name && split.last_name) fields.last_name = split.last_name;
  }

  return fields;
}
