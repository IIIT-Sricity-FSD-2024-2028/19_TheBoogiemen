/**
 * seed-postgres.ts — load data/mock-db.json into PostgreSQL.
 *
 * Usage:
 *   npm run db:migrate     apply schema only
 *   npm run db:seed        apply schema, then import the JSON
 *   npm run db:seed -- --reset   truncate everything first
 *
 * Runs in one transaction: either the whole dataset lands or none of it does.
 * Idempotent via ON CONFLICT DO NOTHING, so re-running will not duplicate rows.
 *
 * Two known data defects are repaired here rather than carried into the database,
 * because both would abort the import:
 *   * duplicate attendance_log ids (audit H-07) — a duplicate 'al14' was
 *     reproduced in live data and violates the primary key;
 *   * rows referencing a user or course that does not exist, which violate the
 *     foreign keys.
 * Both are reported, not silently dropped.
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { Pool, PoolClient } from 'pg';

// This script runs outside Nest, so ConfigModule has not populated process.env.
// Load .env explicitly before any config is read.
dotenv.config();
import { buildPoolConfig, describeConnection } from '../src/config/database.config';
import { applyPgTypeParsers } from '../src/database/postgres/pg-types';

const DATA_PATH = path.join(__dirname, '..', 'data', 'mock-db.json');
const MIGRATIONS_DIR = path.join(__dirname, '..', 'src', 'database', 'migrations');

/** Insertion order matters: parents before children, or the foreign keys reject. */
const LOAD_ORDER = [
  'departments', 'users', 'students', 'faculty', 'courses',
  'enrollment', 'attendance_log', 'assessments', 'marks_entry',
  'syllabus_progress', 'timetable', 'submissions',
  'leave_applications', 'attendance_requests', 'research_projects',
  'discussion_posts', 'discussion_replies',
  'events', 'resources', 'resource_bookings', 'fees',
] as const;

/** Columns that hold nested arrays and must be passed as JSON strings. */
const JSON_COLUMNS: Record<string, string[]> = {
  research_projects: ['students', 'uploads', 'milestones'],
  syllabus_progress: ['modules'],
};

/** Natural keys used for ON CONFLICT, since some tables have composite keys. */
const CONFLICT_TARGET: Record<string, string> = {
  syllabus_progress: '(course_id, section)',
};

const log = (msg: string) => console.log(`[seed] ${msg}`);
const warn = (msg: string) => console.warn(`[seed] WARN  ${msg}`);

interface Report {
  table: string;
  inserted: number;
  skipped: number;
  reasons: string[];
}

async function applyMigrations(client: PoolClient) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  const { rows } = await client.query<{ filename: string }>('SELECT filename FROM schema_migrations');
  const applied = new Set(rows.map((r) => r.filename));

  const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
  for (const filename of files) {
    if (applied.has(filename)) continue;
    await client.query(fs.readFileSync(path.join(MIGRATIONS_DIR, filename), 'utf8'));
    await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
    log(`applied migration ${filename}`);
  }
}

/**
 * Drop keys the target table does not have.
 *
 * The JSON accumulated fields the schema does not model (a stray `cgpa` on a
 * user, say). Inserting them would fail; ignoring them silently would hide a
 * real mismatch, so they are counted and reported.
 */
async function columnsOf(client: PoolClient, table: string): Promise<Set<string>> {
  const { rows } = await client.query<{ column_name: string }>(
    `SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1`,
    [table],
  );
  return new Set(rows.map((r) => r.column_name));
}

async function insertTable(
  client: PoolClient,
  table: string,
  records: any[],
): Promise<Report> {
  const report: Report = { table, inserted: 0, skipped: 0, reasons: [] };
  if (!records?.length) return report;

  const columns = await columnsOf(client, table);
  const jsonCols = new Set(JSON_COLUMNS[table] ?? []);
  const conflict = CONFLICT_TARGET[table];
  const droppedKeys = new Set<string>();

  for (const raw of records) {
    const keys = Object.keys(raw).filter((k) => {
      if (columns.has(k)) return true;
      droppedKeys.add(k);
      return false;
    });
    if (!keys.length) { report.skipped++; continue; }

    const values = keys.map((k) => {
      const v = raw[k];
      if (jsonCols.has(k)) return JSON.stringify(v ?? []);
      // '' is not a valid date/numeric; treat empty strings as absent.
      return v === '' ? null : v;
    });

    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const quoted = keys.map((k) => `"${k}"`).join(', ');
    const target = conflict ?? '';

    try {
      const res = await client.query(
        `INSERT INTO ${table} (${quoted}) VALUES (${placeholders}) ON CONFLICT ${target} DO NOTHING`,
        values,
      );
      if (res.rowCount) report.inserted++;
      else {
        report.skipped++;
        report.reasons.push(`duplicate key: ${JSON.stringify(raw).slice(0, 90)}`);
      }
    } catch (err: any) {
      // A foreign-key violation means the row points at something that does not
      // exist. Report it rather than aborting the whole import for one bad row.
      if (err.code === '23503') {
        report.skipped++;
        report.reasons.push(`orphan (${err.constraint}): ${JSON.stringify(raw).slice(0, 90)}`);
      } else {
        throw err;
      }
    }
  }

  if (droppedKeys.size) {
    report.reasons.push(`fields not in schema, ignored: ${[...droppedKeys].join(', ')}`);
  }
  return report;
}

async function main() {
  const reset = process.argv.includes('--reset');
  const schemaOnly = process.argv.includes('--schema-only');

  applyPgTypeParsers();
  const config = buildPoolConfig();
  const pool = new Pool(config);

  log(`target: ${describeConnection(String(config.connectionString))}`);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await applyMigrations(client);

    if (schemaOnly) {
      await client.query('COMMIT');
      log('schema only — no data imported');
      return;
    }

    if (reset) {
      // Reverse order and CASCADE so foreign keys do not block the truncate.
      await client.query(`TRUNCATE ${[...LOAD_ORDER].reverse().join(', ')} CASCADE`);
      warn('existing data truncated (--reset)');
    }

    const db = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
    const reports: Report[] = [];

    for (const table of LOAD_ORDER) {
      reports.push(await insertTable(client, table, db[table] ?? []));
    }

    await client.query('COMMIT');

    log('');
    log('table                 inserted  skipped');
    let totalIn = 0, totalSkip = 0;
    for (const r of reports) {
      totalIn += r.inserted; totalSkip += r.skipped;
      log(`  ${r.table.padEnd(20)}${String(r.inserted).padStart(6)}${String(r.skipped).padStart(9)}`);
    }
    log(`  ${'TOTAL'.padEnd(20)}${String(totalIn).padStart(6)}${String(totalSkip).padStart(9)}`);

    const withIssues = reports.filter((r) => r.reasons.length);
    if (withIssues.length) {
      log('');
      warn('rows not imported, or fields ignored:');
      for (const r of withIssues) {
        for (const reason of r.reasons.slice(0, 8)) warn(`  ${r.table}: ${reason}`);
        if (r.reasons.length > 8) warn(`  ${r.table}: … and ${r.reasons.length - 8} more`);
      }
    }
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    console.error('[seed] FAILED — nothing was written.');
    console.error(err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
