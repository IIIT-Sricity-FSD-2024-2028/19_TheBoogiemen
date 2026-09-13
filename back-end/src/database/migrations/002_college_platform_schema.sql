-- 002_college_platform_schema.sql
--
-- Adds multi-college tenancy and the SPOC <-> superadmin support channel.
-- Additive only, per the append-only convention this migration set already
-- follows: 001 is never edited, a later concern is always a new file.
--
-- Scope, stated plainly rather than implied:
--   * `colleges` and `users.college_id` are added, and every existing user is
--     backfilled onto one row representing this deployment's college. This is
--     "Phase 1" tenancy — enough for the SPOC actor model to be real.
--   * `support_threads` / `support_messages` back the messaging feature,
--     modelled directly on discussion_posts / discussion_replies below —
--     same shape, same lack of a resolved/status field: any superadmin
--     replying to a thread is what "resolves" it, exactly like any faculty
--     replying to a discussion post does today. No new state machine.
--   * Row-level isolation of the pre-existing academic tables (courses,
--     attendance_log, marks_entry, and the rest) is NOT part of this
--     migration. Those tables gain no college_id here. That is a separate,
--     larger effort — tracked, not silently promised — because Postgres is
--     not the live data store yet (0 of 176 call sites use it; see
--     docs/DATABASE.md) and scoping every one of those call sites by college
--     is real, sequenced work, not a schema change.
--   * Quotes, subscriptions and payments are NOT in this migration. They
--     arrive with the pricing/billing increment that actually implements
--     them — a table with no code reading or writing it is worse than no
--     table, it is a promise the codebase does not keep.

-- ── Colleges ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS colleges (
  college_id  text PRIMARY KEY,
  name        text NOT NULL,
  city        text,
  state       text,
  type        text CHECK (type IN ('government', 'private', 'deemed')),
  status      text NOT NULL DEFAULT 'active'
              CHECK (status IN ('active', 'suspended', 'cancelled')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- One row: the college this deployment already serves. Every pre-existing
-- user is attributed to it below. A fresh clone that runs db:seed after this
-- migration gets the same row `scripts/seed-postgres.ts` will insert from
-- data/mock-db.json's own now-backfilled `colleges` array — this INSERT is
-- only for a database that reaches 002 without ever having run the seeder.
INSERT INTO colleges (college_id, name, status)
VALUES ('c-default', 'BarelyPassing Institute', 'active')
ON CONFLICT (college_id) DO NOTHING;

-- ── users: add college_id, and the 'spoc' role ────────────────────────────────

ALTER TABLE users ADD COLUMN IF NOT EXISTS college_id text REFERENCES colleges(college_id);

-- NULL for superadmin (the vendor operator, tied to no single college).
-- NOT NULL in practice for every other role once app-level validation
-- requires it on creation; not enforced here as a NOT NULL column constraint
-- because 'superadmin' is a legitimate, permanent exception to that rule.
UPDATE users SET college_id = 'c-default'
  WHERE role IN ('student', 'faculty', 'admin', 'head') AND college_id IS NULL;

-- The inline CHECK on 001's `role` column was unnamed, so Postgres assigned
-- it `users_role_check`. Drop and recreate rather than editing 001 in place.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('student', 'faculty', 'admin', 'head', 'superadmin', 'spoc'));

CREATE INDEX IF NOT EXISTS users_college_id_idx ON users(college_id);

-- ── Support messaging ────────────────────────────────────────────────────────
--
-- Deliberately the same two-table shape as discussion_posts / discussion_
-- replies in 001: a thread, and messages hung off it by id. One thread per
-- college (created on the SPOC's first message), read by that SPOC and by
-- any superadmin — never by an academic role, which is enforced in the
-- application layer (@Roles), not by a column here.

CREATE TABLE IF NOT EXISTS support_threads (
  thread_id   text PRIMARY KEY,
  college_id  text NOT NULL REFERENCES colleges(college_id),
  subject     text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS support_messages (
  message_id  text PRIMARY KEY,
  thread_id   text NOT NULL REFERENCES support_threads(thread_id) ON DELETE CASCADE,
  sender_id   text REFERENCES users(user_id) ON DELETE SET NULL,
  sender_name text,                                    -- denormalised display copy
  sender_role text,
  content     text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_threads_college_id_idx ON support_threads(college_id);
CREATE INDEX IF NOT EXISTS support_messages_thread_id_idx ON support_messages(thread_id);
