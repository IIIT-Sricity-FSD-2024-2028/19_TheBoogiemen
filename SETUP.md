# BarelyPassing - Academic Management Platform

## Quick Setup (All Operating Systems)

### Prerequisites
- **Node.js** (v18 or higher): Download from https://nodejs.org/
- **npm** (comes with Node.js)

### Step 1: Install Backend Dependencies
Open a terminal/command prompt in the project folder:

```bash
cd back-end
npm install
```

### Step 2: Configure the environment  *(required — the server will not start without this)*

Authentication uses signed JWTs, so the server needs a signing secret. It refuses
to boot without one rather than falling back to a built-in default.

```bash
cd back-end
cp .env.example .env          # Windows: copy .env.example .env
```

Then open `.env` and replace the `JWT_SECRET` placeholder with a real random value:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

`.env` is gitignored — never commit it.

### Step 3: Prepare the seed data (first run only)

Seeded passwords are stored as bcrypt hashes. Run the migration once to convert
the shipped data file:

```bash
npm run migrate:passwords
```

The script is idempotent — running it again is harmless. The login credentials
below are unchanged; only their stored form is.

### Step 4: Start the Server
```bash
npm run start
```

If `npm run start` doesn't work, try:
```bash
npx nest start
```

### Step 5: Open the Application
Open your browser and go to: **http://localhost:5001**

---

## Login Credentials

Demo accounts only. These are seeded fixtures for local development — do not
reuse them anywhere real, and never add a genuine account's password to this file.

| Role        | Email                  | Password  |
|-------------|------------------------|-----------|
| Student     | student@example.com    | Student@123 |
| Faculty     | faculty@example.com    | Faculty@123 |
| Admin       | admin@example.com      | password  |
| Head        | head@example.com       | Head@123 |
| Super Admin | super@example.com      | Super@123 |

> `admin@example.com` uses a password that does not meet the strength policy the
> app now enforces on password *changes*. It still logs in, but cannot be reset
> to the same value.

## Database

The backend can run against either the JSON file or PostgreSQL, selected by
`DATA_STORE`. It defaults to `memory`, so the app still runs with no database.

| Variable | Required when | Notes |
|---|---|---|
| `DATA_STORE` | always | `memory` (data/mock-db.json) or `postgres` |
| `DATABASE_URL` | `DATA_STORE=postgres` | Contains the password — treat it like `JWT_SECRET` |
| `PGSSLROOTCERT` | any non-local database | Path to Aiven's `ca.pem` |
| `DB_POOL_MAX` | optional | Default 5. See the connection budget below |

### Local development with Docker

```bash
docker run -d --name bp-pg \
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
npm run db:seed        # create the schema and import data/mock-db.json
npm run db:reset       # same, but truncate first
npm run db:migrate     # schema only, no data
```

`db:seed` is idempotent — re-running will not duplicate rows. The schema is also
applied automatically at startup, so a fresh environment is usable immediately.

### Connecting to Aiven

1. Download `ca.pem` from the service overview page into `back-end/certs/`.
2. Set both variables:

```bash
DATABASE_URL=postgres://avnadmin:<password>@<service>.aivencloud.com:<port>/barelypassing_dev?sslmode=verify-full
PGSSLROOTCERT=./certs/ca.pem
```

The server refuses to start against a remote database without a CA certificate.
Do not work around this by disabling certificate verification — that leaves the
connection encrypted but unauthenticated, so anything able to intercept the route
can impersonate the database and collect every credential the app sends.

### Connection budget

Aiven's free tier allows **20 connections in total** and has no PgBouncer, so
every connection is a real backend process shared across the whole team. The
pool defaults to 5 per application instance. Budget it deliberately — for
example 5 deployed, 5 spare instance, 5 developers, 5 headroom for migrations
and `psql`. Exceeding it produces `too many clients already`, which looks like an
application bug rather than a capacity limit.

The free tier also allows only **one service per type per organisation**, so
separate environments live as separate *databases* inside the single service
(`barelypassing_dev`, `barelypassing_prod`), each with its own role. `defaultdb`
is for administration only.

---

## Logging

The backend logs structured JSON through [Pino](https://getpino.io). One line per
request, plus application events.

| Variable | Default | Notes |
|---|---|---|
| `LOG_LEVEL` | `debug` in dev, `info` in production | `trace`/`debug`/`info`/`warn`/`error`/`fatal` |

- **Development** output is colourised and human-readable (via `pino-pretty`).
- **Production** (`NODE_ENV=production`) emits raw JSON — one object per line —
  ready to pipe into any log collector. `pino-pretty` is a devDependency and is
  never loaded in production.

To read production-format logs locally:

```bash
node dist/src/main.js | npx pino-pretty
```

Every request carries a `reqId`, echoed to the client as the `X-Request-Id`
response header — so a user reporting a problem can quote an id you can grep for.
Authenticated requests also carry `userId` and `role`, taken from the verified
JWT claims.

Credentials are redacted before anything is written: the `Authorization` header,
cookies, and any `password` / `current_password` / `new_password` /
`password_hash` field. Response bodies are never logged, because the login
response contains a token.

Static asset requests are not logged — only paths under `/api`.

---

## How authentication works

1. `POST /api/auth/login` verifies the password against its bcrypt hash and
   returns a signed JWT (2h lifetime by default).
2. The browser stores the token and sends it as `Authorization: Bearer <token>`
   on every request.
3. The server derives both **identity** (`sub`) and **role** from the token's
   verified claims. There are no `role` or `user-id` headers any more — sending
   them has no effect.
4. Requests without a valid token get `401`. A valid token without sufficient
   privilege gets `403`.

Only `POST /api/auth/login` and `POST /api/auth/signup` are reachable without a
token. Self-registration creates **student** accounts only; faculty and staff
accounts are created by an administrator.

In Swagger (`/api/docs`), click **Authorize** and paste a token from login.

---

## Project Structure
```
├── front-end/          # HTML, CSS, JS (served automatically)
│   ├── index.html      # Login page
│   ├── student.html    # Student dashboard
│   ├── faculty.html    # Faculty dashboard
│   ├── admin.html      # Admin dashboard
│   ├── head.html       # Academic Head dashboard
│   ├── fixes.js        # Core business logic
│   └── style.css       # Styles
│
├── back-end/           # NestJS Backend
│   └── src/
│       ├── auth/       # Authentication
│       ├── students/   # Student APIs
│       ├── faculty/    # Faculty APIs
│       ├── admin/      # Admin/Common APIs
│       ├── database/   # In-memory database
│       ├── modules/    # Pranjal's modular backend
│       │   ├── fee/
│       │   ├── assessment/
│       │   ├── attendance/
│       │   ├── forum/
│       │   ├── leave/
│       │   ├── outcome/
│       │   ├── report/
│       │   ├── research/
│       │   ├── resource/
│       │   └── user/
│       └── common/     # Shared guards, filters, DTOs
│
├── Database/           # ER diagrams & SQL schema
├── Figma Designs/      # UI/UX design files
└── SRS.pdf             # Software Requirements Specification
```

## API Documentation
After starting the server, visit: **http://localhost:5001/api/docs**

## Troubleshooting

### Windows Users
- Use **Command Prompt** or **PowerShell** (not Git Bash for npm commands)
- If you get EACCES errors, run as Administrator

### Mac/Linux Users
- If port 5001 is busy: `kill $(lsof -ti:5001)` then restart

### Common Issues
- **"Module not found"**: Run `npm install` in the `back-end` folder again
- **Port already in use**: Kill the process on port 5001 and retry
