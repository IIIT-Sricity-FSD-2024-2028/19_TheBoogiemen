/**
 * hash-seed-passwords.ts — one-off migration: plaintext `password` -> bcrypt `password_hash`.
 *
 * Idempotent. Records already carrying a bcrypt digest are left alone, so the
 * script is safe to re-run and safe to run against a partially migrated file.
 *
 * Usage:  npm run migrate:passwords
 *
 * The documented demo credentials (Student@123 etc.) are preserved — only their
 * stored form changes. Anyone can still log in with the passwords in README.md.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcryptjs';

const DATA_PATH = path.join(__dirname, '..', 'data', 'mock-db.json');
const ROUNDS = Number(process.env.BCRYPT_ROUNDS ?? 12);
const BCRYPT_PREFIX = /^\$2[aby]\$\d{2}\$/;

/** Accounts with no password at all get an unusable digest rather than a guessable default. */
function unusableSecret(): string {
  return `!disabled!${Date.now()}${Math.random().toString(36).slice(2)}`;
}

function main() {
  if (!fs.existsSync(DATA_PATH)) {
    console.error(`[migrate] Data file not found: ${DATA_PATH}`);
    process.exit(1);
  }

  const db = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  const users: any[] = Array.isArray(db.users) ? db.users : [];

  let hashed = 0;
  let alreadyHashed = 0;
  let disabled = 0;

  for (const user of users) {
    // Already migrated in a previous run.
    if (BCRYPT_PREFIX.test(user.password_hash ?? '')) {
      alreadyHashed++;
      delete user.password;
      continue;
    }

    // A plaintext value may sit in either field depending on how the row was created.
    const plain =
      typeof user.password === 'string' && user.password ? user.password
      : typeof user.password_hash === 'string' && user.password_hash ? user.password_hash
      : null;

    if (plain) {
      user.password_hash = bcrypt.hashSync(plain, ROUNDS);
      hashed++;
    } else {
      user.password_hash = bcrypt.hashSync(unusableSecret(), ROUNDS);
      disabled++;
      console.warn(`[migrate] ${user.user_id} (${user.email}) had no password — set to an unusable digest.`);
    }

    delete user.password;
  }

  fs.writeFileSync(DATA_PATH, JSON.stringify(db, null, 2), 'utf8');

  console.log('[migrate] Password migration complete.');
  console.log(`[migrate]   hashed:         ${hashed}`);
  console.log(`[migrate]   already hashed: ${alreadyHashed}`);
  console.log(`[migrate]   disabled:       ${disabled}`);
  console.log(`[migrate]   total users:    ${users.length}`);

  const leftover = users.filter(u => u.password !== undefined);
  if (leftover.length) {
    console.error(`[migrate] FAILED: ${leftover.length} record(s) still carry a plaintext password field.`);
    process.exit(1);
  }
  console.log('[migrate] Verified: no plaintext password field remains.');
}

main();
