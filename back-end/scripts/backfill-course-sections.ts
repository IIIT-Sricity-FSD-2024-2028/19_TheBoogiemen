/**
 * backfill-course-sections.ts — one-off migration: turn every existing
 * course's single faculty_id/faculty_name into its Section A row in the new
 * course_sections collection, then drop those two fields from courses.
 *
 * COURSE_OWNERSHIP_MIGRATION_PLAN.md §4. Idempotent, same shape as
 * backfill-academic-college-id.ts: safe to re-run — a course with no
 * faculty_id left (already migrated, or created after this script existed)
 * contributes nothing on a second pass.
 *
 * Usage:  npx ts-node scripts/backfill-course-sections.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const DATA_PATH = path.join(__dirname, '..', 'data', 'mock-db.json');

const log = (msg: string) => console.log(`[backfill] ${msg}`);

function main() {
  const db = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  db.course_sections ??= [];

  let created = 0;
  for (const course of db.courses ?? []) {
    if (!course.faculty_id) continue;

    const exists = db.course_sections.find(
      (cs: any) => cs.course_id === course.course_id && cs.section === 'A',
    );
    if (!exists) {
      db.course_sections.push({
        course_section_id: `cs-${course.course_id}`,
        course_id: course.course_id,
        section: 'A',
        faculty_id: course.faculty_id,
        faculty_name: course.faculty_name ?? null,
        college_id: course.college_id ?? null,
      });
      created++;
    }

    delete course.faculty_id;
    delete course.faculty_name;
  }

  fs.writeFileSync(DATA_PATH, JSON.stringify(db, null, 2), 'utf8');
  log(`created ${created} course_sections row(s); courses.faculty_id/faculty_name removed`);
}

main();
