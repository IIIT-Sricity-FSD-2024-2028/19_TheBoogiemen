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
