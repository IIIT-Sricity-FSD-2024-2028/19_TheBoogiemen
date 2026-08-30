/**
 * backfill-academic-college-id.ts — one-off migration: stamp college_id onto
 * every pre-existing academic row.
 *
 * Idempotent, same as hash-seed-passwords.ts: a row that already carries
 * college_id is left untouched, so this is safe to re-run.
 *
 * Usage:  npx ts-node scripts/backfill-academic-college-id.ts
 *
 * For collections with an owner link (student_id, faculty_id, author_id...),
 * college_id is DERIVED from that owner's own users.college_id — more
 * correct than blindly stamping the default, and the right habit even
 * though every account in this deployment resolves to the same college
 * today. Collections with no owner link at all (events, resources,
 * timetable, syllabus_progress, departments) get the deployment's one
 * college directly, because there is no more precise source of truth for
 * them to derive from.
 */

import * as fs from 'fs';
import * as path from 'path';
import { DEFAULT_COLLEGE_ID } from '../src/common/constants/college';

const DATA_PATH = path.join(__dirname, '..', 'data', 'mock-db.json');

const log = (msg: string) => console.log(`[backfill] ${msg}`);

function main() {
  const db = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));

  // user_id -> college_id, resolved once. Falls back to the deployment
  // default for an orphaned or malformed owner reference rather than
  // leaving college_id unset, which scopeToCollege() would treat as
  // invisible to everyone.
  const userCollege = new Map<string, string>();
  for (const u of db.users ?? []) {
    userCollege.set(u.user_id, u.college_id ?? DEFAULT_COLLEGE_ID);
  }
  const collegeOf = (userId: string | undefined | null): string =>
    (userId && userCollege.get(userId)) || DEFAULT_COLLEGE_ID;

  let stamped = 0;
  const stampVia = (
    collection: string,
    linkField: string,
  ): void => {
    for (const row of db[collection] ?? []) {
      if (row.college_id) continue;
      row.college_id = collegeOf(row[linkField]);
      stamped++;
    }
  };
  const stampDirect = (collection: string): void => {
    for (const row of db[collection] ?? []) {
      if (row.college_id) continue;
      row.college_id = DEFAULT_COLLEGE_ID;
      stamped++;
    }
  };

  // Group A — owner-linked (TENANT_ISOLATION_DIAGNOSIS.md §3).
  stampVia('students', 'user_id');
  stampVia('faculty', 'user_id');
  stampVia('courses', 'faculty_id');
  stampVia('enrollment', 'student_id');
  stampVia('attendance_log', 'student_id');
  stampVia('assessments', 'faculty_id');
  stampVia('marks_entry', 'student_id');
  stampVia('leave_applications', 'student_id');
  stampVia('research_projects', 'student_id');
  stampVia('discussion_posts', 'author_id');
  stampVia('discussion_replies', 'author_id');
  stampVia('fees', 'student_id');
  stampVia('submissions', 'student_id');
  stampVia('attendance_requests', 'student_id');
  stampVia('resource_bookings', 'requested_by');

  // Group B — no owner link at all.
  stampDirect('departments');
  stampDirect('events');
  stampDirect('resources');
  stampDirect('timetable');
  stampDirect('syllabus_progress');

  fs.writeFileSync(DATA_PATH, JSON.stringify(db, null, 2), 'utf8');
  log(`stamped college_id on ${stamped} row(s) across 20 collections`);
}

main();
