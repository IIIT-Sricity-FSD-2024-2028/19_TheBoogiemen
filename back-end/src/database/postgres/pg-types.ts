/**
 * pg-types.ts — keep PostgreSQL's return types compatible with the application.
 *
 * The app was written against a JSON file, so it treats dates as strings and
 * numbers as numbers. node-postgres does neither by default, and the mismatches
 * are silent — they produce wrong answers rather than errors:
 *
 *   DATE        -> JS Date       breaks `record.date === today` and `date > today`
 *   TIMESTAMPTZ -> JS Date       breaks ISO-string comparisons and JSON output
 *   NUMERIC     -> string        breaks `typeof cgpa === 'number'` in isAtRisk(),
 *                                which then reports every student as not-at-risk
 *   INT8/COUNT  -> string        breaks arithmetic on counts
 *
 * Registering these parsers once, before any pool is created, means the database
 * holds real `date`/`numeric` types — indexable, sortable, checkable — while the
 * application still sees exactly the shapes it saw from the JSON file.
 */

import { types } from 'pg';

// PostgreSQL type OIDs. Stable across versions; see pg_type.
const OID = {
  INT8: 20,
  NUMERIC: 1700,
  DATE: 1082,
  TIMESTAMP: 1114,
  TIMESTAMPTZ: 1184,
} as const;

let applied = false;

export function applyPgTypeParsers(): void {
  if (applied) return;

  // 'YYYY-MM-DD' — already the wire format, so pass it through untouched rather
  // than round-tripping through Date and risking a timezone shift.
  types.setTypeParser(OID.DATE, (value: string) => value);

  // Normalise to the ISO-8601 strings the app produces with toISOString().
  const toIso = (value: string) => {
    if (value === null || value === undefined) return value;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
  };
  types.setTypeParser(OID.TIMESTAMPTZ, toIso);
  types.setTypeParser(OID.TIMESTAMP, toIso);

  // Safe here: the largest values are marks, fees and CGPA, all far inside
  // double precision. This would need revisiting for money at scale.
  types.setTypeParser(OID.NUMERIC, (value: string) =>
    value === null ? null : Number.parseFloat(value),
  );

  // COUNT(*) comes back as int8 and would otherwise be a string.
  types.setTypeParser(OID.INT8, (value: string) =>
    value === null ? null : Number.parseInt(value, 10),
  );

  applied = true;
}
