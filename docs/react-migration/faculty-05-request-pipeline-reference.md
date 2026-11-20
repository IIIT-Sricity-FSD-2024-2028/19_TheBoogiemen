# Faculty Actor — Study Guide 5: The Request Pipeline Reference

Every line-by-line file from here on (06–12) hits this same pipeline every time a faculty component
calls `apiFetch(...)`. Rather than re-deriving it at every call site, this file documents it once,
in exact, verified order, straight from the actual middleware/guard registration code — and every
later file just says **"Hop: see pipeline §N"** and fills in only what's specific to that one route.

This file is the answer to "how each hop talks to the backend," stated generally. Files 06–12 apply
it specifically, line by line.

---

## 0. The physical hop — browser to process

Every faculty `apiFetch(endpoint, options)` call (`api/client.js`, documented fully in file 01 §3)
does, underneath:

```js
fetch(`/api${endpoint}`, { ...options, headers, credentials: 'same-origin' })
```

Because the React app and the NestJS API are served from the **same origin** (the Phase 6 cutover —
`express.static` serving `front-end-react/dist` directly from the NestJS process, documented in the
earlier migration audit), this is a same-origin `fetch`. `credentials: 'same-origin'` is what makes
the browser attach the httpOnly session cookie automatically — there is no token the frontend code
ever reads or sets by hand. The request leaves the browser as a plain HTTP request to the same host
and port the page itself was loaded from, carrying:
- `Cookie: bp_auth=<JWT>` (set by the server on login, `auth-cookie.ts`)
- `Content-Type: application/json` (or omitted entirely for a `FormData` upload body — see file 01 §4)
- whatever `options.headers` the caller added (none of the faculty call sites add any)

---

## 1. Express-level middleware — before Nest even sees the request

Registered in `back-end/src/main.ts`, in this exact order, for **every** request regardless of path:

1. **`helmet(...)`** — sets security response headers (HSTS, nosniff, frameguard, etc.). Not
   authorization-relevant, but it runs before anything else, including the static file server.
2. **`cookieParser()`** — populates `req.cookies` from the raw `Cookie` header. This is what makes
   `req.cookies[AUTH_COOKIE]` available to `JwtAuthGuard` later (§3). Without this middleware, the
   guard would only ever see the `Authorization` header path.
3. **`app.enableCors(...)`** (effectively here too, applied before routing) — checks `Origin` against
   `CORS_ORIGIN`; same-origin requests (the only kind faculty's frontend ever makes today) aren't
   subject to this at all — CORS only constrains *cross*-origin requests, and there are none in the
   current single-origin deployment.
4. **`express.static(frontendPath)`** then the **SPA-fallback middleware** — both scoped to skip any
   path starting with `/api`, so they never intercept a faculty API call. They matter here only to
   establish *why* a request to `/api/faculty/...` reaches Nest's router at all rather than being
   swallowed as "serve `index.html`."
5. **`app.setGlobalPrefix('api')`** — this is what turns `@Controller('faculty')`'s
   `@Get('me/courses')` into a route actually registered at `/api/faculty/me/courses`, not
   `/faculty/me/courses`. Every path in files 03/06–12 that says "the route is `/faculty/me/courses`"
   means, on the wire, `/api/faculty/me/courses` — the frontend's `API_BASE = '/api'` constant (file
   01 §3) is what supplies that prefix back on the request side, matching this.

After this point, the request is inside Nest's own request lifecycle.

---

## 2. `RequestAuditMiddleware` — Nest-level middleware

Registered in `AppModule.configure()`, applied to `{ path: '*path', method: ALL }` (every method,
every path under the global prefix) except the routes in `AUDIT_EXCLUDED_ROUTES`. This runs **before
any guard** — it logs the request for audit purposes regardless of whether it will ultimately be
authorized. Not something any faculty component can observe or affect; included here only because
it genuinely is a hop every faculty request passes through, in this exact position in the pipeline.

---

## 3. `JwtAuthGuard` — the first of three global guards

Registered as the **first** `APP_GUARD` provider in `app.module.ts`, with an explicit comment
explaining why order matters: *"JwtAuthGuard must run first: it verifies the token and populates
request.user, which RolesGuard then reads. Nest applies APP_GUARD providers in registration order."*

Step by step, for a faculty request:
1. `context.getType() !== 'http'` — always false for an HTTP API, so this short-circuit never
   applies to anything in this guide.
2. Checks `@Public()` metadata on the handler/class via `Reflector`. **None of the faculty routes
   are `@Public()`** — every one of them requires a session. (Only `/auth/login`, `/auth/signup`,
   and a couple of genuinely public routes carry that decorator, none reachable from the faculty
   dashboard.)
3. `extractToken(request)` — tries `request.cookies[AUTH_COOKIE]` **first**, falls back to a
   `Bearer` `Authorization` header **second**. Every faculty frontend call goes through the cookie
   path exclusively — the React app never sets an `Authorization` header anywhere. The
   header fallback exists for Swagger/`curl`/tests, not for this frontend.
4. If no token at all → **401 `AUTHENTICATION_REQUIRED`**. This is the case `apiFetch`'s own 401
   handler (file 01 §3) reacts to by force-logging-out — though in practice this specific path (no
   cookie at all) would almost never fire for a signed-in faculty user; it's the
   token-rejected-after-verification path below that matters more for a *previously* signed-in
   session.
5. `jwtService.verifyAsync(token)` — cryptographically verifies the JWT's signature and expiry
   against `JWT_SECRET`. A tampered or expired token throws here, logged with a reason
   (`'expired'` vs `'invalid signature or format'`) **server-side only** — the client always gets
   the same **401**, regardless of which specific problem it was. This uniform-401 behavior is
   exactly what lets `apiFetch`'s 401 handler treat every such failure identically as "force logout."
6. Payload shape check — `payload.sub` (the user id) and `isRole(payload.role)` must both be
   present and valid. A verified-but-malformed payload also 401s.
7. On success: **`request.user = payload`** — this single assignment is the only thing that makes
   `@CurrentUserId()`, `@CurrentUserRole()`, and `@CurrentUserCollegeId()` work in every faculty
   controller method documented in files 03/12. Every one of those param decorators reads
   `request.user`, and every one of them would throw its own `InternalServerErrorException` if
   called on a route this guard hadn't already run successfully against — which, per the deny-by-
   default design (§4 below), can't happen on any route reachable from this guide.

---

## 4. `RolesGuard` — the second global guard

Registered second, deliberately after `JwtAuthGuard`, with the same reasoning in reverse — it reads
`request.user.role`, which only exists because the previous guard already set it.

1. Re-checks `@Public()` (redundant with step 3.2 above for any route this guide covers, since no
   faculty route is `@Public()` — included in the guard's own code as defense-in-depth, not
   something that changes behavior here).
2. Reads the route's `@Roles(...)` metadata (set via `SetMetadata(ROLES_KEY, roles)` — this is
   exactly what `@Roles('faculty')` on `faculty.controller.ts`'s methods, and `@Roles('faculty',
   'admin', 'head', 'superadmin')` etc. on the shared `common.controller.ts` routes faculty also
   calls, actually compiles down to).
3. **If a route has no `@Roles()` and isn't `@Public()`** → the guard throws its own **500**
   `MISCONFIGURATION` error, not a 403 — this is a deliberate deny-by-default design choice
   documented in the guard's own header comment: *"a missing declaration must never default to
   open."* Every route any faculty component calls in this guide carries an explicit `@Roles(...)`,
   so this branch never actually fires for faculty traffic — it's listed here because it's the
   mechanism that *guarantees* that fact rather than leaving it to convention.
4. `requiredRoles.includes(role)` — if the signed-in user's verified role isn't in the route's
   allowed list → **403 `INSUFFICIENT_ROLE`**, with the required roles and the actual role both
   included in the error body. This is the exact mechanism behind `ProtectedRoute.jsx`'s own header
   comment (file 01 §9): editing `localStorage` to claim a different role changes nothing here,
   because `role` in this check comes from the **verified JWT payload**, not anything client-supplied.
5. On success: returns `true`, request proceeds.

**This is the single most important guard for understanding "why does this faculty route only work
for faculty."** Every `@Roles('faculty')` annotation documented in files 03/12 is enforced exactly
here, exactly this way, on every single request — there is no caching, no per-session memoization;
this check runs fresh on every hop.

---

## 5. `RequiresModuleGuard` — the third global guard (conditional)

Registered third, explicitly *after* `RolesGuard`, with the comment: *"a caller must already be
permitted by role before whether their college's plan includes the module even matters."*

1. Reads `@RequiresModule(...)` metadata. **Most faculty routes have none at all** — in which case
   this guard returns `true` immediately and is a pure no-op. The only faculty-reachable routes that
   *do* carry this decorator are the `discussions`/`research` routes in `common.controller.ts`
   (`@RequiresModule('forum')` / `@RequiresModule('research')` — see file 03 §2's table), **not**
   anything in `faculty.controller.ts` itself.
2. When it does apply: reads `request.user.college_id` (already verified by the earlier guards —
   never anything client-supplied) and calls `assertModuleEnabled(db, collegeId, requiredModule)`,
   which throws its own `ForbiddenException` (`MODULE_NOT_LICENSED` or `SUBSCRIPTION_EXPIRED`) if
   the college's subscription doesn't include that module.
3. This is the **server-side half** of `Sidebar.jsx`'s client-side `licensedModules` filtering (file
   01 §6) — hiding the "Discussion Forum" or "Research Projects" nav item client-side is pure UX;
   this guard is what actually stops the request if someone reached the route anyway (e.g. by
   typing a URL fragment, or because the client-side list hadn't loaded yet and fail-open let the
   nav item show).

---

## 6. `ValidationPipe` — global, runs after guards, before the handler body

Registered via `app.useGlobalPipes(new ValidationPipe(VALIDATION_PIPE_OPTIONS))` in `main.ts`, with
`forbidNonWhitelisted` **on globally** — an unknown body key is now a **400**, not silently dropped.
None of the faculty controller methods documented in this guide use a typed DTO class for their
`@Body()` parameter (they all declare `body: any` and validate by hand inside the method — see files
03/12) — meaning **this global pipe has nothing to validate against for any faculty route** and
passes every body through unchanged. This is worth knowing explicitly: the "is this body shape
valid" burden for every faculty write (`POST /faculty/attendance`, `POST /marks`,
`PATCH /syllabus-progress`, etc.) falls entirely on the hand-written `if (!body.x) throw
BadRequestException(...)` checks inside each method, not on this pipe.

---

## 7. The controller method itself

By the time execution reaches, say, `FacultyController.getMyCourses(@CurrentUserId() userId:
string)`, every guard has already run, `request.user` is guaranteed populated and verified, and the
param decorator is a zero-risk read of a value that cannot have been forged by the client. The
method calls into its injected service (`FacultyService` for everything in `faculty.controller.ts`;
`CommonController`'s own, much larger service for everything in `common.controller.ts`), which reads
and writes `InMemoryDbService` — a plain in-memory array of JS objects loaded from
`back-end/data/mock-db.json` at boot and optionally flushed back to that file via `db.persist()`
after a mutation. There is no SQL, no ORM, no transaction in this path, for any route in this guide —
see the opening note in file 03 for why (the Postgres wiring exists but isn't used by any of these
services yet).

---

## 8. The response, and the frontend's handling of it

The controller method's return value is JSON-serialized by Nest automatically. Back on the frontend,
`apiFetch` (file 01 §3) does the rest:
- `res.status === 401` → `forceLogout()` — a hard `window.location.href = '/login'` navigation, not
  a React Router one.
- `res.status === 403` → thrown as an ordinary `Error`, caught by whichever component's `.catch()`
  or `try/catch` called it, almost always surfaced as a toast via `showToast(...)`.
- Any other non-OK status → thrown as an `Error` built from the NestJS error body's `message`
  (joined if an array) or `error` field.
- OK → the parsed JSON body is returned directly to the calling component, which is where files
  06–12 pick back up.

---

Every subsequent line-by-line file cites this pipeline by section number (e.g. "Hop: pipeline §§3–4,
`@Roles('faculty')` only — no §5") rather than re-explaining guard order from scratch. Continue to
**[06-line-by-line-facultydashboard.md](./faculty-06-line-by-line-facultydashboard.md)**.
