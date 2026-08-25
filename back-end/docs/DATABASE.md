# Database — PostgreSQL migration

How the persistence layer is built, and how to switch between the JSON seed
pipeline and a real PostgreSQL database.

---

## Status

**Partially migrated.** The database is fully provisioned and correct, but the
application does not read from it yet.

| Done | Not done |
|---|---|
| Connection, TLS, pool sizing, fail-closed config | API reads from PostgreSQL |
| Schema: 21 tables (+ `schema_migrations`), 26 FKs, 43 indexes | API writes to PostgreSQL |
| Migration runner (idempotent, transactional) | Repository layer |
| Seed importer — all 96 rows from `mock-db.json` | |
| Type parsers preserving app-visible shapes | |

Concretely: **176 data-access call sites still use `InMemoryDbService`, and 0 use
`PostgresService`.** With `DATA_STORE=postgres` the app connects, applies
migrations and is ready — but a `POST /api/leave` still lands in
`data/mock-db.json`, not in the database.

You can see this for yourself:

```bash
docker exec bp-pg-test psql -U bpuser -d barelypassing_dev -t -A \
  -c "SELECT count(*) FROM leave_applications;"          # 3
node -e "console.log(require('./data/mock-db.json').leave_applications.length)"  # 3

# POST a leave through the API, then re-run both:
#   PostgreSQL -> still 3
#   JSON file  -> now 4
```

Closing that gap is the repository phase (see [What remains](#what-remains)).

---

## Switching environments

One variable decides which store backs the app.

```bash
# back-end/.env
DATA_STORE=memory     # data/mock-db.json  (default)
DATA_STORE=postgres   # PostgreSQL
```

### Mock seed pipeline (default)

Nothing else required — no database, no connection string.

```bash
DATA_STORE=memory
```

Data lives in `data/mock-db.json` and is rewritten on every mutation. Reset it
with `git checkout -- data/mock-db.json`.

### PostgreSQL

```bash
DATA_STORE=postgres
DATABASE_URL=postgres://user:password@host:port/database
PGSSLROOTCERT=./certs/ca.pem   # required for any non-local host
DB_POOL_MAX=5                  # optional, default 5
```

With `DATA_STORE=memory`, no connection is opened and `DATABASE_URL` is ignored
entirely — so switching back is always safe.

---

## Local development

```bash
docker run -d --name bp-pg-test \
  -e POSTGRES_PASSWORD=devpass \
  -e POSTGRES_USER=bpuser \
  -e POSTGRES_DB=barelypassing_dev \
  -p 55432:5432 postgres:16-alpine
```

```bash
# back-end/.env
DATA_STORE=postgres
DATABASE_URL=postgres://bpuser:devpass@localhost:55432/barelypassing_dev
```

```bash
npm run db:seed      # apply schema + import mock-db.json
npm run db:reset     # same, but TRUNCATE first
npm run db:migrate   # schema only, no data
npm run build && node dist/src/main.js
```

`db:seed` is idempotent (`ON CONFLICT DO NOTHING`), and the schema is also
applied automatically at startup, so a fresh clone is usable immediately.

Tear down with `docker rm -f bp-pg-test` — and remember to set
`DATA_STORE=memory`, or the app will fail to boot.

---

## Aiven

1. Download `ca.pem` from the service overview page into `back-end/certs/`.
2. Configure:

```bash
DATABASE_URL=postgres://avnadmin:<password>@<service>.aivencloud.com:<port>/barelypassing_dev?sslmode=verify-full
PGSSLROOTCERT=./certs/ca.pem
```

The server **refuses to start** against a remote host without a CA certificate.
Do not work around that by disabling certificate verification: it leaves the
connection encrypted but unauthenticated, so anything able to intercept the route
can impersonate the database and collect every credential the app sends.

`ca.pem` is a public certificate and safe to commit. `DATABASE_URL` contains the
password and must be treated exactly like `JWT_SECRET` — `.env` only, gitignored.

### Free-tier constraints that shaped the design

- **20 connections total, no PgBouncer.** Every connection is a real backend
  process shared by the whole team, so the pool defaults to 5 per instance.
  Budget it: e.g. 5 deployed + 5 spare + 5 developers + 5 for migrations and
  `psql`. Exceeding it gives `too many clients already`, which reads like an
  application bug rather than a capacity limit.
- **One service per type per organisation.** Environments are separate
  *databases* inside the single service (`barelypassing_dev`,
  `barelypassing_prod`), each with its own role. `defaultdb` is admin-only.
- 1 GB storage, 1 GB RAM, single node, backups but no PITR.

---

## How the schema was derived

The team chose to mirror `data/mock-db.json` exactly rather than adopt the
normalised ER schema in `Database/dbschema.sql`. Every column name matches the
JSON key it came from, so the existing call sites and the frontend keep working
without a translation layer — the migration carries no transformation risk.

The trade-offs, recorded so they are not rediscovered later:

- **Denormalised display columns are kept** (`faculty_name`, `student_name`,
  `course_code`, `fees.first_name`). They can drift from the row they were copied
  from; nothing prevents that.
- **Nested arrays became `jsonb`** rather than child tables — research
  `milestones`/`uploads`/`students`, syllabus `modules`.
- **Primary keys are `text`, not `serial`.** Ids are generated by the application
  (`u1`, `c1`, `uuid`, `` `p${Date.now()}` ``), so the database accepts whatever
  the app supplies.
- **`discussion_posts.course_id` has no foreign key** — the seed stores a course
  *code* (`CS201`) there, not a `course_id` (`c1`).

### Constraints now enforced by the database

Several bugs found in the security audit become structurally impossible:

| Audit finding | Enforced by |
|---|---|
| H-07 duplicate attendance ids | `attendance_log_pkey` |
| M-01 duplicate attendance per student/course/date | `UNIQUE (student_id, course_id, date)` |
| H-03 marks-lock bypass | `UNIQUE (student_id, assessment_id)` |
| M-02 invalid attendance status | `CHECK (status IN ('present','absent','excused'))` |
| C-04 invalid role | `CHECK (role IN (...))` |
| Orphaned rows | 26 foreign keys |

H-01 (in-place mutations never persisting) is gone by construction — there is a
real `transaction()` on `PostgresService`.

---

## Things that bit us

Worth knowing before extending this.

**`pg` returns types the app does not expect.** `NUMERIC` comes back as a
*string* and `DATE` as a *Date object*. Both break silently rather than loudly:
`isAtRisk()` checks `typeof cgpa === 'number'`, so a string CGPA makes it return
`false` for every student and at-risk detection quietly stops working; and the
app compares dates as strings (`record.date === today`), which a Date never
matches. `src/database/postgres/pg-types.ts` registers parsers so the database
holds real `date`/`numeric` types while the app sees the same shapes it saw from
JSON. **Those parsers must be applied before any pool is created.**

**`nest build` does not copy `.sql` files.** The migration runner would find an
empty directory in a production build and silently apply nothing. Fixed via the
`assets` entry in `nest-cli.json`.

**Environment variables are read before `.env` loads.** Module decorators
evaluate at *import* time; `ConfigModule` populates `process.env` at
*instantiation* time — later. `DATA_STORE` was therefore `undefined` and the app
silently chose `memory` while claiming to use Postgres. `main.ts` now calls
`dotenv.config()` before any import. Keep it there.

---

## Layout

```
back-end/
├── certs/ca.pem                              Aiven CA (gitignored dir; cert is public)
├── scripts/seed-postgres.ts                  schema + data importer
└── src/
    ├── config/database.config.ts             connection, TLS, pool, fail-closed checks
    └── database/
        ├── database.module.ts                selects the store from DATA_STORE
        ├── in-memory-db.service.ts           JSON store (still serving all traffic)
        ├── migrations/001_initial_schema.sql the schema
        └── postgres/
            ├── postgres.service.ts           pool, query, transaction, migrations
            └── pg-types.ts                   type parsers
```

---

## What remains

1. **Repository interfaces** over the existing in-memory store — no behaviour
   change, fully revertible. The large mechanical commit.
2. **Move the 176 call sites** behind those interfaces (125 are in
   `admin/common.controller.ts` alone). Still in-memory, still revertible.
3. **SQL implementations** behind the same interfaces, selected by `DATA_STORE`.
4. **Run both and compare**, then delete `InMemoryDbService`.

Steps 1–2 carry almost no risk and are worth doing regardless. Step 3 is where
the interesting bugs live — and by then the store is a single swappable layer
rather than 176 scattered edits.

A good first slice is one vertical (users/auth): it is small, it exercises the
whole path, and it makes the count check at the top of this document flip from
JSON to PostgreSQL.
