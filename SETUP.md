# Setup

Requirements: Node.js 20 or later, and npm.

## 1. Backend configuration

```bash
cd back-end
npm install
cp .env.example .env
```

Open `back-end/.env` and set `JWT_SECRET` to a random string of at least 32 characters:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

The app uses the JSON store `back-end/data/mock-db.json` by default (`DATA_STORE=memory`). Changes
made in the app are written back to that file.

## 2. Build the frontend

```bash
cd front-end
npm install
npm run build
```

This writes `front-end/dist`, which the backend serves.

## 3. Run

```bash
cd back-end
npm run start:dev
```

- App: <http://localhost:5001>
- API docs (Swagger): <http://localhost:5001/api/docs>

To work on the UI with hot reload, keep the backend running and start Vite in a second terminal. It
serves <http://localhost:3000> and proxies `/api` to port 5001:

```bash
cd front-end
npm run dev
```

## Scripts (back-end)

| Command | What it does |
|---|---|
| `npm run start:dev` | API and built frontend on port 5001, restarting on change |
| `npm run build` | Compile the backend |
| `npm test` | Unit tests |
| `npm run test:e2e` | Cross-role flow tests on a temporary copy of the seed (the real data file is not touched) |
| `npm run seed:demo` | Rebuild `data/mock-db.json` with the demo colleges. This **replaces** any data you created |

The demo accounts are listed in [README.md](README.md#demo-accounts).

## Logs

Live output appears in the terminal where the backend is running. The same information is kept in
files under `back-end/logs/`:

| File | What it holds |
|---|---|
| `error.log` | Server errors (HTTP 500), with the request and stack trace |
| `access.log` | Every request: time, method, path, status code, user and college |
| `audit.log` | Every change (create, update, delete): who did it and what was sent |

To watch errors as they happen:

```bash
tail -f back-end/logs/error.log
```

To see only failed requests in the access log:

```bash
grep -E " (4|5)[0-9]{2} " back-end/logs/access.log | tail -20
```

In the browser, errors are shown on the page (red message with a Retry button, or a toast at the
bottom right). The browser's developer tools (F12, Console and Network tabs) show the details.

## Troubleshooting

- **"JWT_SECRET is missing"**: set it in `back-end/.env`, as in step 1.
- **Blank page or "Cannot GET /"**: build the frontend (step 2) before starting the backend.
- **Signed-in state lost after changing `JWT_SECRET`**: expected. Existing sessions become invalid, so
  sign in again.
- **Port 5001 already in use**: stop the other process, or set `PORT` in `.env`.
