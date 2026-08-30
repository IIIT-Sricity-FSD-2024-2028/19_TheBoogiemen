# BarelyPassing — Codebase Study Guide

A complete walkthrough of the system, written for someone who has **never used
NestJS**. Every claim below is mapped to a real file and line in this repository.

**Scope:** 9,391 lines of backend TypeScript, 6,290 lines of frontend HTML/JS,
172 HTTP routes across 17 controllers, 21 feature modules.

---

## Table of contents

- [Part 0 — How to read this guide](#part-0--how-to-read-this-guide)
- [Part 1 — Orientation](#part-1--orientation)
- [Part 2 — NestJS from absolute zero](#part-2--nestjs-from-absolute-zero)
- [Part 3 — Bootstrap, line by line](#part-3--bootstrap-line-by-line)
- [Part 4 — The request lifecycle](#part-4--the-request-lifecycle)
- [Part 5 — Every middleware in depth](#part-5--every-middleware-in-depth)
- [Part 6 — The Nest-layer pipeline](#part-6--the-nest-layer-pipeline)
- [Part 7 — The authentication subsystem](#part-7--the-authentication-subsystem)
- [Part 8 — The data layer](#part-8--the-data-layer)
- [Part 9 — Error handling](#part-9--error-handling)
- [Part 10 — File uploads](#part-10--file-uploads)
- [Part 11 — The frontend](#part-11--the-frontend)
- [Part 12 — Three requests, traced end to end](#part-12--three-requests-traced-end-to-end)
- [Part 13 — Complete file map](#part-13--complete-file-map)
- [Part 14 — Known issues](#part-14--known-issues)
- [Part 15 — Glossary](#part-15--glossary)

---

# Part 0 — How to read this guide

If you know nothing about NestJS, read Parts 2 → 3 → 4 first. Everything else
assumes those three.

If you already know NestJS, skip to [Part 4](#part-4--the-request-lifecycle) and
read Parts 5–10 in any order.

If you are preparing to answer questions about the code, read
[Part 12](#part-12--three-requests-traced-end-to-end) — three complete request
traces — and [Part 14](#part-14--known-issues).

Notation: `file.ts:42` means line 42 of that file. Backend paths are relative to
`back-end/`, frontend paths to `front-end/`.

---

# Part 1 — Orientation

## What the product is

BarelyPassing is an academic progress and outcome tracker for a college. Five
kinds of user, each with a dashboard:

| Role | Dashboard | Can do |
|---|---|---|
| `student` | `student.html` | View attendance, marks, syllabus progress, apply for leave, submit assessments |
| `faculty` | `faculty.html` | Mark attendance, enter marks, manage syllabus, review research milestones |
| `admin` | `super-user.html` | Manage students and faculty, resources, fees |
| `head` | `super-user.html` | Everything admin can, plus institutional reports and attendance overrides |
| `superadmin` | `super-admin.html` | Full user management across all roles |

The role list is defined once, in `src/auth/jwt-payload.ts:12`:

```ts
export const ROLES = ['student', 'faculty', 'admin', 'head', 'superadmin'] as const;
export type Role = typeof ROLES[number];
```

That `as const` matters: it makes `Role` a union of the five literal strings
rather than plain `string`, so a typo like `@Roles('facutly')` is a compile
error, not a silently-never-matching guard.

## The stack

| Layer | Choice | Where |
|---|---|---|
| HTTP framework | NestJS 11 on Express | `package.json`, `src/main.ts` |
| Auth | JWT via `@nestjs/jwt` (no Passport) | `src/auth/` |
| Password hashing | `bcryptjs` | `src/auth/password.service.ts` |
| Session transport | httpOnly cookie | `src/auth/auth-cookie.ts` |
| Logging | `nestjs-pino` / `pino-http` | `src/config/logger.config.ts` |
| Validation | `class-validator` + `ValidationPipe` | `src/common/errors/validation.factory.ts` |
| Security headers | `helmet` 8.3.0 | `src/main.ts` |
| Uploads | `multer` (ships with `@nestjs/platform-express`) | `src/uploads/` |
| Data (live) | JSON file via `InMemoryDbService` | `src/database/in-memory-db.service.ts` |
| Data (provisioned) | PostgreSQL via raw `pg` | `src/database/postgres/` |
| Frontend | Vanilla JS, no framework, no build step | `front-end/` |

**Why no Passport:** Passport adds a strategy abstraction that earns its keep
when you have several auth methods (Google, SAML, local, API key). We have one.
`JwtAuthGuard` verifying a token directly is about 40 lines and has no
indirection to learn.

**Why `bcryptjs` and not `bcrypt`:** `bcrypt` is a native C++ addon and needs
`node-gyp` plus a compiler toolchain, which breaks `npm install` on Windows
machines without Visual Studio Build Tools. `bcryptjs` is pure JavaScript —
slower per hash, but installs everywhere. The reasoning is recorded at
`src/auth/password.service.ts:9`.

## One thing to understand early

**The backend also serves the frontend.** There is no separate web server. Express
serves the six HTML pages as static files from the same process and the same
port (5001) that serves `/api`. This single fact explains a lot of the design:

- CORS is off by default, because there is no cross-origin request to allow.
- `SameSite=Strict` cookies work with no CSRF token library.
- The logger has to filter out static-asset requests or they drown the log.

See `src/main.ts:124-126` (static) and `src/main.ts:130` (the `/api` prefix).

---

# Part 2 — NestJS from absolute zero

Skip this part if you already know NestJS. Otherwise, these six concepts are all
you need; everything in the codebase is built out of them.

## 2.1 A decorator is metadata

A decorator is the `@Something()` syntax attached to a class, method, or
parameter. **It does not run when the request arrives.** It runs once, when the
file is first imported, and its only job is to attach a label to the thing below
it. Nest reads those labels later.

The smallest real example in this codebase is `src/auth/public.decorator.ts:15-17`:

```ts
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

That is the entire implementation. `@Public()` writes `isPublic = true` onto the
method. It has no behaviour of its own. Something else has to look for that label
and decide what it means — in this case `JwtAuthGuard`, at
`src/auth/jwt-auth.guard.ts:35-39`:

```ts
const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
  context.getHandler(),   // the method, e.g. login()
  context.getClass(),     // the controller class, e.g. AuthController
]);
if (isPublic) return true;
```

`Reflector` is Nest's metadata reader. `getAllAndOverride` checks the method
first, then the class, and the **first one found wins** — so a class-level
decorator sets a default and a method-level one overrides it.

This decorator-writes / guard-reads split is the single most important pattern in
the codebase. `@Roles()` works identically (`src/auth/roles.guard.ts:18-20`):

```ts
export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
```

## 2.2 A provider is a class Nest constructs for you

Any class marked `@Injectable()` is a **provider**. You never write
`new PasswordService()`. You declare that you need one, and Nest supplies it:

```ts
// src/auth/auth.service.ts:10-14
constructor(
  private db: InMemoryDbService,
  private jwtService: JwtService,
  private passwordService: PasswordService,
) {}
```

Nest reads the *types* of those constructor parameters (TypeScript emits them as
metadata when `emitDecoratorMetadata` is on), finds a registered provider of each
type, constructs it if it doesn't exist yet, and passes it in. This is
**dependency injection**.

Two consequences worth internalising:

1. **Providers are singletons by default.** There is exactly one
   `InMemoryDbService` for the whole application. That is why an in-memory array
   works as a database at all — every controller injecting it gets the same
   object with the same arrays.
2. **`private db: InMemoryDbService` in a constructor both declares the
   dependency and creates the field.** That's a TypeScript shorthand, not a Nest
   feature. `this.db` exists because of the `private` keyword.

## 2.3 A module is a wiring manifest

A module declares which providers exist, which controllers it owns, and what it
shares with other modules. `src/auth/auth.module.ts`:

```ts
@Global()
@Module({
  imports: [JwtModule.registerAsync({ ... })],
  controllers: [AuthController],
  providers: [AuthService, PasswordService],
  exports: [AuthService, PasswordService, JwtModule],
})
export class AuthModule {}
```

- `providers` — classes this module can construct.
- `controllers` — classes with routes.
- `imports` — other modules whose *exports* become available here.
- `exports` — what this module shares outward.
- `@Global()` — **skip the import step entirely**; these providers are available
  application-wide without any module importing `AuthModule`.

`@Global()` is used deliberately here, and the reason is documented at
`src/auth/auth.module.ts:8-11`: `JwtAuthGuard` is registered globally in
`AppModule`, so it needs `JwtService` injectable there. Without `@Global()`,
`AppModule` would have to import `AuthModule`, which creates a circular-looking
dependency graph for no benefit.

Two other modules are global for the same reason: `DatabaseModule`
(`src/database/database.module.ts:20`) and, implicitly, `ConfigModule` via
`isGlobal: true` (`src/app.module.ts:31`).

## 2.4 A controller maps URLs to methods

```ts
@Controller('auth')          // every route below starts /auth
export class AuthController {
  @Post('login')             // POST /auth/login
  @Public()
  async login(@Body() body: LoginDto, @Res({ passthrough: true }) res: Response) { ... }
}
```

With the global prefix set at `src/main.ts:130`, the real URL is
`POST /api/auth/login`.

The `@Body()`, `@Param()`, `@Query()`, `@Res()` decorators on parameters are
**parameter decorators** — they tell Nest what to pass into each argument.

`@Res({ passthrough: true })` deserves a note. Normally, injecting the raw
response object with `@Res()` means *you* are responsible for sending the
response, and returning a value from the method does nothing. `passthrough: true`
says "give me the response object so I can set a cookie, but still send my
return value as JSON normally." Login needs exactly that: set a cookie **and**
return a body. `src/auth/auth.controller.ts:32`.

## 2.5 The execution context

Guards, filters, and interceptors all receive an `ExecutionContext`. It is a
wrapper that works for HTTP, WebSockets, and microservices alike, so you must
narrow it before use:

```ts
const request = context.switchToHttp().getRequest();
```

You will also see this defensive line at the top of both guards
(`jwt-auth.guard.ts:33`, `roles.guard.ts:27`):

```ts
if (context.getType() !== 'http') return true;
```

Nothing in this app is non-HTTP today. The line costs nothing and means a future
WebSocket gateway does not silently inherit HTTP auth logic that cannot work.

## 2.6 The pipeline

This is the part that matters most, and Part 4 covers it in full. The short
version: a request passes through **middleware → guards → interceptors → pipes →
your handler**, then back out through **interceptors → filters**. Each stage can
stop the request. Order is fixed by the framework and is not configurable.

---

# Part 3 — Bootstrap, line by line

`src/main.ts` is 170 lines and every one of them is load-bearing. Read it top to
bottom with this section beside you.

## 3.1 dotenv before anything else — `main.ts:9-10`

```ts
import * as dotenv from 'dotenv';
dotenv.config({ quiet: true });
```

This is the first executable statement in the entire program, and it is placed
*above* every other import on purpose. The reasoning is at `main.ts:1-8`:

> Nest's ConfigModule populates `process.env` during module *instantiation*, but
> module decorators are evaluated at import time — earlier.

Concretely: `src/database/database.module.ts:22` runs

```ts
const postgresProviders = getDataStore() === 'postgres' ? [PostgresService] : [];
```

at **import** time. If `.env` has not been loaded yet, `DATA_STORE` is
`undefined`, `getDataStore()` returns `'memory'`, and the application starts
against the JSON file while the developer believes it is using PostgreSQL. No
error, no warning — just the wrong behaviour. This bug happened during the
database migration. Do not move this line.

`{ quiet: true }` suppresses dotenv's own banner so it does not print before the
logger is configured.

## 3.2 Creating the app with buffered logs — `main.ts:29`

```ts
const app = await NestFactory.create(AppModule, { bufferLogs: true });
```

`NestFactory.create` walks the module graph, constructs every provider, and
registers every controller's routes — but does **not** start listening.

`bufferLogs: true` holds Nest's own startup output (route mapping, module
initialisation) in memory instead of printing it with the default logger. It is
released a few lines later once Pino is installed, so the whole process emits one
consistent log format from the first line.

## 3.3 Installing the logger — `main.ts:33-35`

```ts
const logger = app.get(Logger);
app.useLogger(logger);
app.flushLogs();
```

`app.get(Logger)` pulls an already-constructed provider out of the DI container
by hand. This is the escape hatch for bootstrap code, which sits outside the DI
system and cannot use constructor injection.

`flushLogs()` releases the buffer from 3.2.

## 3.4 CORS — `main.ts:50-60`

```ts
const corsOrigin = (process.env.CORS_ORIGIN ?? '')
  .split(',').map((o) => o.trim()).filter(Boolean);

app.enableCors({
  origin: corsOrigin.length ? corsOrigin : false,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  credentials: true,
  allowedHeaders: 'Content-Type, Accept, Authorization',
});
```

Covered in depth in [5.1](#51-cors). The key line is
`origin: ... : false` — cross-origin access is **disabled** unless an env var
names an allowed origin.

## 3.5 cookie-parser — `main.ts:64`

```ts
app.use(cookieParser());
```

Populates `request.cookies`. `JwtAuthGuard` reads the session token from there.
Registered in bootstrap rather than as module middleware specifically so it runs
before guards. See [5.2](#52-cookie-parser).

## 3.6 helmet — `main.ts:81-100`

```ts
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'same-origin' },
}));
```

Ten security headers, one deliberately disabled. See [5.3](#53-helmet).

## 3.7 The global exception filter — `main.ts:106`

```ts
app.useGlobalFilters(new AllExceptionsFilter(logger));
```

Note it is constructed with `new`, not injected. A globally-registered filter
that needs a dependency must either be instantiated manually like this or
registered as an `APP_FILTER` provider. Here `logger` is already in hand from
3.3, so manual construction is simpler.

## 3.8 Process-level handlers — `main.ts:110`

```ts
registerProcessHandlers(app, logger);
```

The exception filter only catches errors thrown **during a request**. An error in
a `setTimeout`, an unhandled promise rejection, or a failure in a background task
never reaches it — Node would print a raw stack trace to stderr and, for
`uncaughtException`, terminate. `src/common/errors/process-handlers.ts` catches
those and routes them through the same logger.

## 3.9 Shutdown hooks — `main.ts:113`

```ts
app.enableShutdownHooks();
```

Makes Nest listen for `SIGTERM`/`SIGINT` and run every provider's `onModuleDestroy`
before exiting. Concretely this is what closes the PostgreSQL connection pool
cleanly instead of dropping 5 connections on the floor — which matters on Aiven's
free tier, where the whole team shares 20.

## 3.10 The global validation pipe — `main.ts:119`

```ts
app.useGlobalPipes(new ValidationPipe(VALIDATION_PIPE_OPTIONS));
```

See [6.3](#63-pipes--validationpipe). The options come from
`src/common/errors/validation.factory.ts:83-89`.

## 3.11 Static files — `main.ts:124-126`

```ts
const frontendPath = path.join(__dirname, '..', '..', '..', 'front-end');
app.use(express.static(frontendPath));
```

Three `..` segments because at runtime `__dirname` is
`back-end/dist/src`, so up three is the repository root. This is why moving the
build output would break the frontend.

## 3.12 The API prefix — `main.ts:130`

```ts
app.setGlobalPrefix('api');
```

Every controller route gains `/api`. Static files are unaffected — they were
registered on Express directly, before Nest's router.

## 3.13 Swagger — `main.ts:133-149`

Builds an OpenAPI document by reading the `@Api*` decorators across all
controllers and serves an interactive UI at `/api/docs`.
`.addBearerAuth(...)` plus `.addSecurityRequirements('bearer')` makes the
**Authorize** button appear and applies it to every route by default.

This is why the login response still returns the raw token
(`auth.controller.ts:58-60`) even though the frontend ignores it — pasting it
into Swagger's Authorize box is how you test the API by hand.

## 3.14 Listen — `main.ts:152-153`

```ts
const PORT = 5001;
await app.listen(PORT);
```

`listen()` calls `app.init()` internally if it has not run yet. **That is the
step which registers module-configured middleware**, including `pino-http`. This
detail decides the middleware order — see [Part 4](#part-4--the-request-lifecycle).

---

# Part 4 — The request lifecycle

This is the spine of the whole system. Everything a request touches, in order.

## 4.1 The two-tier ordering rule

There are two separate registration mechanisms, and they do not interleave:

**Tier 1 — Express middleware**, registered by `app.use(...)` inside `bootstrap()`.
These attach to the underlying Express instance immediately, in the order the
lines execute.

**Tier 2 — Nest module middleware**, registered by a module's `configure()`
method. These attach during `app.init()`, which happens inside `app.listen()`.

Because `bootstrap()` runs all its `app.use()` calls *before* it calls
`app.listen()`, **every Tier 1 middleware runs before every Tier 2 middleware.**

`nestjs-pino` is Tier 2 — confirmed at `node_modules/nestjs-pino/LoggerModule.js:75`:

```js
configure(consumer) {
  ...
  consumer.apply(...middlewares).forRoutes(...forRoutes);
}
```

So request logging happens *after* CORS, cookies, helmet, and static file
serving. That is also why static assets never produce a log line, independently
of the `shouldIgnore` filter in `logger.config.ts:49-53`.

## 4.2 The full ordered pipeline

For `POST /api/leave` with a session cookie:

| # | Stage | Type | Code | Can it stop the request? |
|---|---|---|---|---|
| 1 | CORS | Express mw | `main.ts:55` | Yes — preflight rejection |
| 2 | `cookieParser()` | Express mw | `main.ts:64` | No |
| 3 | `helmet()` | Express mw | `main.ts:81` | No — only sets headers |
| 4 | `express.static()` | Express mw | `main.ts:126` | Yes — if a file matches, it responds |
| 5 | `pino-http` | Nest mw | `LoggerModule` | No |
| 6 | Express body parser | built in | Nest default | Yes — malformed JSON → 400 |
| 7 | **`JwtAuthGuard`** | Guard | `jwt-auth.guard.ts:32` | **Yes — 401** |
| 8 | **`RolesGuard`** | Guard | `roles.guard.ts:26` | **Yes — 403** |
| 9 | Interceptors (pre) | Interceptor | e.g. `FileInterceptor` | Yes |
| 10 | **`ValidationPipe`** | Pipe | `main.ts:119` | **Yes — 400** |
| 11 | Param decorators | — | `@CurrentUserId()` etc. | Yes (misconfiguration → 500) |
| 12 | **Controller handler** | — | your method | — |
| 13 | Interceptors (post) | Interceptor | — | — |
| 14 | **`AllExceptionsFilter`** | Filter | `main.ts:106` | Only on throw |

Stages 7–14 are Nest's own pipeline and their order is **fixed by the framework**.
You cannot reorder guards relative to pipes.

## 4.3 Why guards run before pipes

This ordering is not arbitrary and is worth being able to explain.

Pipes transform and validate the request body. Guards decide whether the caller
is allowed in at all. Running guards first means an unauthenticated request is
rejected **without the server doing any work on its payload** — no validation, no
transformation, no DTO instantiation. An attacker cannot use an unauthenticated
endpoint to make the server parse arbitrary structures.

It also means the *error you get back is the honest one*. If pipes ran first, a
request with both a bad token and a malformed body would return 400 "validation
failed", telling an unauthenticated caller something about the body shape the
endpoint expects. With guards first, it returns 401 and reveals nothing.

## 4.4 Why the two guards are in that specific order

`src/app.module.ts:56-67`:

```ts
providers: [
  AppService,
  // Order matters. JwtAuthGuard must run first: it verifies the token and
  // populates request.user, which RolesGuard then reads. Nest applies
  // APP_GUARD providers in registration order.
  { provide: APP_GUARD, useClass: JwtAuthGuard },
  { provide: APP_GUARD, useClass: RolesGuard },
]
```

`APP_GUARD` is a special injection token. Providing it multiple times registers
multiple global guards, applied **in the order they appear in the array**.

`RolesGuard` reads `request.user?.role` (`roles.guard.ts:45`). That property is
set by `JwtAuthGuard` at `jwt-auth.guard.ts:73`. Swap the two entries and
`RolesGuard` sees `undefined` on every request, hits the `if (!role)` branch at
`roles.guard.ts:47`, and every role-protected route returns 403 — the application
breaks completely, but *fails closed*. That is the right failure direction, but
the ordering is what makes it work at all.

---

# Part 5 — Every middleware in depth

The user-facing question "what does each middleware do" has five real answers in
this codebase, plus one that is invisible.

## 5.1 CORS

### What CORS actually is

Browsers enforce the **same-origin policy**: JavaScript running on `site-a.com`
cannot read a response from `site-b.com`. CORS (Cross-Origin Resource Sharing) is
the mechanism by which a server can *selectively relax* that rule by sending
`Access-Control-Allow-Origin` headers.

**This is the point most people get backwards.** CORS is not a security feature
you switch on. It is a way of *turning off* a protection the browser gives you
for free. A permissive CORS config makes you less safe, not more.

### What the config does

```ts
const corsOrigin = (process.env.CORS_ORIGIN ?? '')
  .split(',').map((o) => o.trim()).filter(Boolean);

app.enableCors({
  origin: corsOrigin.length ? corsOrigin : false,
  credentials: true,
  ...
});
```

`origin: false` means "send no `Access-Control-Allow-Origin` header at all", so
the browser blocks every cross-origin read. Since the frontend is served from
this same server (`main.ts:126`), nothing legitimate is cross-origin, and the
default is correct.

### Why this had to change when cookies arrived

The previous config was `origin: true`, which **reflects back whatever `Origin`
header the caller sends** — effectively allowing everyone. Combined with
`credentials: true`, that is:

> any website in the world may make an authenticated request to this API and read
> the response.

While auth was an `Authorization` header that JavaScript set by hand, this was
survivable: a malicious site could make the request, but had no token to attach,
so the API saw an anonymous caller. The moment the session became a **cookie the
browser attaches automatically**, the same config became a live account-takeover
vector. Locking it down was mandatory alongside the cookie change, not optional.

### `credentials: true`

Tells the browser it may include cookies on cross-origin requests *to allowed
origins*. It is retained because if `CORS_ORIGIN` is ever set (a split
deployment), the session cookie must still travel. It does nothing while
`origin` is `false`.

The env var is documented at `.env.example:42-47` with an explicit warning
against wildcards.

## 5.2 cookie-parser

### What it does

Reads the `Cookie:` request header, which arrives as one string:

```
Cookie: bp_session=eyJhbGciOi...; theme=dark
```

and parses it into an object on `request.cookies`:

```js
{ bp_session: 'eyJhbGciOi...', theme: 'dark' }
```

That is the entire job. Without it, `request.cookies` is `undefined`.

### Why it is registered in bootstrap

`main.ts:62-63` explains:

> Registered here rather than as module middleware so it runs before guards.

`JwtAuthGuard` reads `request.cookies[AUTH_COOKIE]` at
`jwt-auth.guard.ts:86`. Guards are stage 7; Tier 2 module middleware is stage 5,
so a module registration would technically still work — but bootstrap
registration makes the ordering explicit and independent of module wiring.

### The import style

```ts
import cookieParser from 'cookie-parser';
```

A **default** import, not `import * as`. This works because `tsconfig.json` sets
`esModuleInterop: true`, which generates the interop shim for CommonJS modules
that use `module.exports = fn`. The `helmet` import on the next line follows the
same pattern for the same reason.

## 5.3 helmet

### What helmet is

A collection of small middlewares that set (or remove) HTTP response headers.
It inspects nothing and blocks nothing — it only annotates responses so the
**browser** behaves more defensively. Version 8.3.0, **zero runtime
dependencies**.

### The ten headers, and what each does here

| Header | Value | Effect in this app |
|---|---|---|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | After one HTTPS visit, the browser refuses plain http for a year. Protects the login page from SSL-strip rewriting. **Inert on localhost** — browsers ignore HSTS delivered over http. |
| `X-Content-Type-Options` | `nosniff` | Browser must honour the declared `Content-Type` instead of guessing. Directly relevant: uploaded documents are served from this origin, and a sniffed `text/html` would execute in the origin holding the session. |
| `X-Frame-Options` | `SAMEORIGIN` | No other site can put our pages in an iframe. Blocks clickjacking a logged-in user into clicking a real "Approve" button. |
| `Referrer-Policy` | `no-referrer` | Our URLs stop leaking outward. We put file ids and student ids in paths. |
| `Cross-Origin-Opener-Policy` | `same-origin` | Severs `window.opener` between our pages and anything that opens them. |
| `Cross-Origin-Resource-Policy` | `same-origin` | Other origins cannot embed our responses as resources. Complements CORS: CORS governs who may *read* a response, CORP governs who may *embed* it. |
| `Origin-Agent-Cluster` | `?1` | Hint that this origin should get its own process. |
| `X-DNS-Prefetch-Control` | `off` | No speculative DNS for links appearing in user-supplied content. |
| `X-Download-Options` | `noopen` | Legacy IE: downloads cannot open in the site's context. |
| `X-Permitted-Cross-Domain-Policies` | `none` | Blocks legacy Flash/PDF cross-domain policy files. |
| `X-XSS-Protection` | `0` | **Deliberately disables** the legacy XSS auditor. |

Helmet also **removes** `X-Powered-By`, so Express stops advertising itself.
Verified in `node_modules/helmet/index.cjs` (`removeHeader("X-Powered-By")`).

### The `X-XSS-Protection: 0` trap

This looks wrong and is worth understanding, because it is the single most common
mistake in hand-written header lists.

`X-XSS-Protection: 1; mode=block` enabled a legacy browser heuristic that tried to
detect reflected XSS and neuter it. The heuristic was itself exploitable — it
could be tricked into disabling legitimate scripts, and in some cases into
creating information leaks that did not otherwise exist. All modern browsers have
removed it. Setting `0` explicitly opts out.

Anyone hand-rolling these headers writes `1; mode=block` because it sounds
protective. Taking the dependency buys you not having to remember which headers
inverted their meaning.

### The one header we do not set, and why

`contentSecurityPolicy: false` is the deliberate part.

Helmet's default CSP includes `script-src 'self'` and `script-src-attr 'none'`.
The second one forbids **inline event handler attributes**. The frontend has:

- **194 inline handlers** — 164 `onclick`, 17 `onsubmit`, 6 `onchange`, 5 drag
  handlers, 1 `onkeyup`
- **5 inline `<script>` blocks** — in `faculty.html`, `signup.html`,
  `student.html`, `super-admin.html`, `super-user.html`

Enforcing the default policy would stop every button in the application from
working. So CSP is off, and the code comment at `main.ts` says so explicitly
along with the condition for turning it on.

**Why we cannot just whitelist them back.** Inline `<script>` blocks have an
escape hatch — compute a `sha256-` hash of each block and list it in
`script-src`. Inline *event handler attributes* have no equivalent: hashes are
ignored for them, and `'unsafe-hashes'` is inconsistently implemented. The
options are `'unsafe-inline'`, which is identical to having no script CSP at all,
or removing the 194 handlers.

Nonces are also unavailable: a nonce must be regenerated per response and injected
into the HTML, but these pages are static files handed to `express.static`. There
is no template engine to inject into.

**The consequence:** a CSP that actually mitigates XSS requires converting 194
inline handlers to delegated `addEventListener` calls — which is the same edit as
escaping the 136 `innerHTML` sites. Both are one frontend pass.

### Placement

`helmet` is registered at `main.ts:81`, before `express.static` at `main.ts:126`.
That ordering is required: registered after, the six HTML pages — the responses
that most need these headers — would be served without them.

## 5.4 express.static

```ts
const frontendPath = path.join(__dirname, '..', '..', '..', 'front-end');
app.use(express.static(frontendPath));
```

Checks whether the request path matches a file under `front-end/`. If it does, it
sends the file and **the request stops there** — it never reaches Nest's router,
guards, or controllers. If not, it calls `next()` and the request continues.

Two consequences:

1. **The frontend is completely unauthenticated.** Anyone can fetch
   `student.html`. This is fine and intentional: the HTML is an empty shell.
   Every piece of real data on it comes from an authenticated `/api` call. The
   route guard in `state.js:204` is a UX affordance, not a security control — its
   own docstring says so at `state.js:196-203`.
2. **Static requests never reach the logger**, because `pino-http` is Tier 2
   (stage 5) but `express.static` at stage 4 has already responded.

## 5.5 pino-http — `src/config/logger.config.ts`

The most configured middleware in the codebase. 148 lines, all of it decisions.

### Why Pino at all

The previous implementation was a hand-rolled Nest interceptor plus scattered
`console.log` calls. Two problems: `console.log` in Node is **synchronous** and
blocks the event loop on every write, and unstructured text cannot be queried.
Pino writes structured JSON asynchronously and is one of the fastest loggers for
Node.

### Registration — `app.module.ts:33`

```ts
LoggerModule.forRoot(buildLoggerConfig()),
```

Registered **after** `ConfigModule.forRoot({ isGlobal: true })` at line 31, and
the comment at 32-34 explains why: `buildLoggerConfig()` is a *function*, not a
constant, precisely so it reads `process.env` at call time rather than at import
time. Same class of bug as [3.1](#31-dotenv-before-anything-else--maints9-10).

### Redaction — `logger.config.ts:27-38`

```ts
const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  'req.body.password',
  'req.body.current_password',
  'req.body.new_password',
  'req.body.password_hash',
  'req.body.token',
];
```

This is the most security-relevant part of the logging config. `pino-http`
serialises request headers by default, and `Authorization` carries a real JWT
while `Cookie` carries the session. Without redaction, **every log line would
contain a working credential**, and logs reach disk, get emailed, get pasted into
issue trackers.

Note `res.headers["set-cookie"]` — the *login response* sets the session cookie,
so the outbound direction leaks too.

The comment at 24-26 explains why these are explicit paths rather than wildcards:
pino compiles them once at logger creation, and wildcard matching is measurably
slower on every subsequent line.

### Static-noise suppression — `logger.config.ts:49-53`

```ts
function shouldIgnore(req: IncomingMessage): boolean {
  const url = req.url ?? '';
  if (url.startsWith('/api')) return false;
  return true;
}
```

Belt-and-braces with the ordering fact from 5.4. If the backend serves the whole
frontend, an unfiltered logger emits a line per CSS file, per image, per script —
four of five lines would be noise.

### Log level by status — `logger.config.ts:62-70`

```ts
if (err || res.statusCode >= 500) return 'error';
if (res.statusCode >= 400) return 'warn';
return 'info';
```

The comment at 55-61 records what this replaced: the old interceptor logged every
4xx at `error`, so a routine 401 from an expired session looked like a server
fault. A 4xx is the client being told "no" — that is a warning at most. Only 5xx
means something broke on our side.

### Request correlation — `logger.config.ts:98-104`

```ts
genReqId: (req, res) => {
  const inbound = req.headers[REQUEST_ID_HEADER];
  const id = (Array.isArray(inbound) ? inbound[0] : inbound) || randomUUID();
  res.setHeader(REQUEST_ID_HEADER, id);
  return id;
},
```

Every request gets an id. If one arrives in the `X-Request-Id` header (from a
proxy), it is honoured so a request can be traced across hops; otherwise a UUID is
minted. Crucially it is **echoed back to the client**, so a user reporting a
failure can quote an id you can grep for.

That same id flows into the error response body at
`http-exception.filter.ts:86` as `requestId`.

### Identity on every line — `logger.config.ts:118-121`

```ts
customProps: (req) => {
  const user = (req as any).user;
  return user ? { userId: user.sub, role: user.role } : {};
},
```

`req.user` is what `JwtAuthGuard` set at `jwt-auth.guard.ts:73`. The comment at
114-116 makes the rule explicit: **never** read a `role` or `user-id` header
here — those are client-supplied and were the original authorization bypass.

There is an ordering subtlety worth understanding: `pino-http` runs at stage 5,
*before* the guard at stage 7. So how can it read `req.user`? Because
`customProps` is not evaluated when the middleware runs — it is evaluated when
the **response** is emitted, at which point the guard has long since run.

### Body logging — `logger.config.ts:128-145`

```ts
serializers: {
  req(req: any) {
    const base = { id: req.id, method: req.method, url: req.url };
    if (req.method !== 'GET' && req.raw?.body && ...) {
      return { ...base, body: req.raw.body };
    }
    return base;
  },
  res: (res: any) => ({ statusCode: res.statusCode }),
}
```

Request bodies are included for non-GET requests (redaction still applies).
**Response bodies are never logged** — the comment at 144 gives the reason: the
login response carries a token.

### Development vs production — `logger.config.ts:82-92`

`pino-pretty` is loaded as a transport in development for human-readable coloured
output, and `undefined` in production. The comment at 80-81 explains: `pino-pretty`
is a devDependency and a formatting transform that undoes most of Pino's
throughput advantage. Production emits one JSON object per line.

## 5.6 The body parser — invisible but present

Nest registers Express's JSON and urlencoded body parsers automatically. You never
see them in `main.ts`, but they run at stage 6 and are why `@Body()` contains a
parsed object.

They matter for one reason: **malformed JSON throws before any of your code
runs.** That error is a plain `Error` with a `status` property, not an
`HttpException`. `AllExceptionsFilter` handles this case explicitly at
`http-exception.filter.ts:100-113`:

```ts
// Body-parser failures arrive as plain Errors with a status property.
const status = (exception as any)?.status ?? (exception as any)?.statusCode;
if (typeof status === 'number' && status >= 400 && status < 600) { ... }
```

Without that branch, sending `{"broken":` to any endpoint would produce a 500
instead of a 400.

## 5.7 multer — conditional middleware

Multer only runs on routes that ask for it, via `@UseInterceptors(FileInterceptor(...))`.
It is covered in [Part 10](#part-10--file-uploads).

---

# Part 6 — The Nest-layer pipeline

## 6.1 Guards

A guard is a class with one method, `canActivate`, returning `true` (proceed) or
throwing. Returning `false` produces a generic 403; **every guard here throws
instead**, so the client gets a specific error code.

### `JwtAuthGuard` — `src/auth/jwt-auth.guard.ts`

Stage 7. Establishes *who you are*.

```ts
async canActivate(context: ExecutionContext): Promise<boolean> {
  if (context.getType() !== 'http') return true;                    // :33

  const isPublic = this.reflector.getAllAndOverride(IS_PUBLIC_KEY, [ // :35
    context.getHandler(), context.getClass(),
  ]);
  if (isPublic) return true;                                         // :39

  const request = context.switchToHttp().getRequest();
  const token = this.extractToken(request);                          // :42

  if (!token) throw new UnauthorizedException(...);                  // :44

  let payload: JwtPayload;
  try {
    payload = await this.jwtService.verifyAsync<JwtPayload>(token);   // :52
  } catch (err) { ... }

  if (!payload?.sub || !isRole(payload.role)) { ... }                // :66

  request.user = payload;                                            // :73
  return true;
}
```

Five things to notice:

**1. Deny by default.** There is no "if a token is present, verify it" — a missing
token is a 401. Opting out requires `@Public()`, and only three routes in the
entire application do (`auth.controller.ts:26`, `:76`, `:195` — login, signup,
logout). Out of 172 routes. The docstring at `public.decorator.ts:5-7` records
why this inverted: authorization used to be opt-in via `@Roles`, and 17 routes
ended up world-readable purely by omitting a decorator. **Forgetting a decorator
now fails closed.**

**2. Verification, not decoding.** `verifyAsync` checks the HMAC signature against
`JWT_SECRET`. Decoding a JWT is trivial — it is base64, not encryption. Verifying
proves *we* issued it.

**3. Uniform error messages.** Lines 53-62 distinguish an expired token from an
invalid signature **in the log only**. The client gets a generic message either
way, so an attacker cannot use error prose to learn whether a forged token had a
valid structure.

**4. Payload shape is validated after verification.** Lines 66-71 check `sub`
exists and `role` is one of the five real roles. A token could be correctly signed
but carry a malformed payload if the signing code ever changed; downstream code
treats `sub` and `role` as guaranteed, so this makes that guarantee real.

**5. The extraction order.** `jwt-auth.guard.ts:85-89`:

```ts
private extractToken(request: any): string | null {
  const fromCookie = request?.cookies?.[AUTH_COOKIE];
  if (typeof fromCookie === 'string' && fromCookie.trim()) return fromCookie.trim();
  return this.extractBearerToken(request);
}
```

Cookie first (browsers), `Authorization: Bearer` second (Swagger, curl, tests).
The docstring at 77-84 addresses the obvious objection: accepting both is not a
weakness, because the header path still requires a valid signed token, and XSS
cannot read the httpOnly cookie to forge one.

### `RolesGuard` — `src/auth/roles.guard.ts`

Stage 8. Establishes *what you may do*.

```ts
const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [...]);
if (!requiredRoles || requiredRoles.length === 0) return true;       // :42

const role = request.user?.role;                                     // :45
if (!requiredRoles.includes(role)) {
  throw new ForbiddenException(errorBody(ErrorCode.INSUFFICIENT_ROLE, ...));  // :57
}
```

**No `@Roles` means "any authenticated user"** (line 42) — authentication was
already enforced at stage 7.

**403, not 401** (comment at 55-56). This distinction is load-bearing and the
frontend depends on it:

- `state.js:80` — a **401** means the session is dead; sign the user out.
- `state.js:88` — a **403** means authenticated but not permitted; show an error
  and **do not** sign out. Being refused one action does not invalidate a session.

Getting this backwards produces the classic bug where clicking a button you lack
permission for silently logs you out.

The header this guard used to read is documented at `roles.guard.ts:4-6`:
`curl -H "role: superadmin"` was a complete authorization bypass.

## 6.2 Param decorators — `src/common/decorators/current-user.decorator.ts`

Custom parameter decorators built with `createParamDecorator`:

```ts
export const CurrentUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    if (!request.user?.sub) {
      throw new InternalServerErrorException(
        'CurrentUserId requested on a route without authentication.',
      );
    }
    return request.user.sub;
  },
);
```

Used as `async applyLeave(@Body() body, @CurrentUserId() userId: string)`.

The docstring at lines 3-5 records the scale of what this replaced:
`@Headers('user-id')` appeared at **32 handler sites**, and let any caller act as
any user by editing a header.

The `InternalServerErrorException` is deliberate: reaching it means a route is
`@Public()` but reads the current user — a wiring mistake by a developer, not
something a client can trigger. A 500 is the honest status for "we built this
wrong".

Three variants exist: `CurrentUser` (the whole payload), `CurrentUserId`
(just `sub`), `CurrentUserRole` (just `role`).

## 6.3 Pipes — ValidationPipe

Stage 10. A pipe transforms and validates a single argument before the handler
sees it.

### How class-validator works

A DTO is a class whose properties carry validation decorators
(`src/common/dto/app.dto.ts`):

```ts
export class LoginDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  password: string;
}
```

`ValidationPipe` sees `@Body() body: LoginDto`, instantiates `LoginDto` from the
raw JSON, runs the validators, and either passes the typed instance through or
throws.

### The options — `validation.factory.ts:83-89`

```ts
export const VALIDATION_PIPE_OPTIONS: ValidationPipeOptions = {
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
  exceptionFactory: validationExceptionFactory,
};
```

| Option | Effect |
|---|---|
| `whitelist` | Strip any property with no validation decorator |
| `forbidNonWhitelisted` | Don't strip — **reject** with 400 |
| `transform` | Return a real DTO class instance, not a plain object |
| `enableImplicitConversion` | Coerce `"5"` → `5` for a `number` property |

The docstring at 78-82 records why `forbidNonWhitelisted` is global now: it used
to apply to four routes only, so everywhere else an unknown key was silently
dropped — which is how a caller could send `role` to a profile-update endpoint and
get a `200` back having changed nothing. Silent success on a rejected field is
worse than an error.

### The custom error shape — `validation.factory.ts:53-73`

Nest's default puts errors in a flat string array:

```json
{ "message": ["email must be an email", "password must be longer than 8 characters"] }
```

which forces the client to parse prose to know which field failed. The factory
produces a field-keyed object instead:

```json
{
  "code": "VALIDATION_FAILED",
  "message": "Validation failed for 2 field(s)",
  "details": {
    "fields": {
      "email": ["email must be an email"],
      "password": ["password must be longer than 8 characters"]
    }
  }
}
```

`rejectedFields` is surfaced separately (lines 56-58) because the fix is
different: the caller should *stop sending* the field, not correct its value.

`flatten()` (lines 24-44) handles nested DTOs with dotted paths
(`address.city`). The guard at line 33 — `if (error.constraints && Object.keys(...).length > 0)` —
exists because a parent node of nested errors has an empty `constraints` object,
and emitting it would put `{"address": []}` next to `{"address.city": [...]}`,
making a client render an empty error for a field that is fine.

### The important limitation

**A route typed `@Body() body: any` gets no validation at all.** There is no DTO
class, so there is nothing to whitelist against, and `ValidationPipe` passes the
raw object straight through. There are **31 such routes** in this codebase (20
`any)`, 11 `any,`). See [Part 14](#part-14--known-issues).

## 6.4 Interceptors

An interceptor wraps the handler and can act before *and* after it. The only one
in use is `FileInterceptor` from `@nestjs/platform-express`
(`uploads.controller.ts:39`).

Historically there was a custom logging interceptor. It was removed in favour of
`pino-http`, and the comment at `main.ts:102-105` records why:

> HTTP request logging is handled by pino-http, which hooks the response
> lifecycle rather than sitting in the response path — a logging fault can no
> longer alter a response, which is what the interceptor this replaces used to do.

That was a real bug: an exception inside the logging interceptor broke `DELETE`
responses.

## 6.5 Exception filters

Stage 14. Covered in full in [Part 9](#part-9--error-handling).

---

# Part 7 — The authentication subsystem

## 7.1 The shape of a JWT

Three base64url segments joined by dots: `header.payload.signature`.

```
eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1MSIsInJvbGUiOiJzdHVkZW50In0.4f3a...
```

**The payload is readable by anyone holding the token.** It is signed, not
encrypted. `jwt-payload.ts:8-9` states the rule:

> A JWT is signed, not encrypted — the holder can read every claim. Never put
> anything here that the user should not see.

The signature is an HMAC of header+payload using `JWT_SECRET`. Change one
character of the payload and the signature no longer matches.

## 7.2 The payload contract — `jwt-payload.ts:20-30`

```ts
export interface JwtPayload {
  sub: string;    // user_id — the authenticated principal
  role: Role;
  email?: string;
  iat?: number;   // issued at, set by the signer
  exp?: number;   // expiry, set by the signer
}
```

`sub` ("subject") is the JWT standard claim for the principal's identifier.

Lines 32-40 do something clever — a global type augmentation:

```ts
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
```

This teaches TypeScript that `request.user` exists and is an `AuthenticatedUser`,
so every consumer gets autocomplete and type checking on a property that Express
itself knows nothing about.

## 7.3 Config validation that fails at boot — `src/config/auth.config.ts`

```ts
const jwtSecret = (env.JWT_SECRET ?? '').trim();
if (!jwtSecret) throw new Error('JWT_SECRET is not set. ...');           // :34
if (jwtSecret.length < MIN_SECRET_LENGTH) throw new Error(...);          // :42
if (isPlaceholder(jwtSecret)) throw new Error(
  'JWT_SECRET is still set to a placeholder value. ...');                // :48
```

Three checks: missing, too short, still a placeholder. Any of them **throws
during module construction**, so the server refuses to start.

This is a deliberate fail-closed design. A default signing key would let anyone
mint an admin token for any deployment of this codebase. A loud crash at boot is
strictly better than a running server with forgeable sessions.

## 7.4 Password handling — `src/auth/password.service.ts`

```ts
async verify(plain: string, storedHash: unknown): Promise<boolean> {
  if (!plain || typeof storedHash !== 'string' || !storedHash) return false;
  if (!PasswordService.isHashed(storedHash)) return false;
  try {
    return await bcrypt.compare(plain, storedHash);
  } catch {
    return false;
  }
}
```

`isHashed` tests `/^\$2[aby]\$\d{2}\$/`, the bcrypt version prefix.

The `isHashed` check is not decoration. Before the migration, passwords were
stored in plaintext and compared with `u.password === password`. If any record
still held plaintext, `bcrypt.compare` would return `false` anyway — but the
explicit check means a plaintext record can **never** authenticate, even by
accident.

`verify` returns `false` rather than throwing for a missing or malformed digest.
That is what makes the "disabled account" pattern work: the seed migration script
gives password-less accounts an unusable random digest
(`scripts/hash-seed-passwords.ts:21-23`), which no input can ever match.

Cost factor comes from `BCRYPT_ROUNDS` (default 12), validated to the range 10-15.

## 7.5 Login — `src/auth/auth.service.ts:20-60`

```ts
// Verify even when the user is unknown, against a dummy digest, so that a
// wrong email and a wrong password take the same time to answer.
const storedHash = user?.password_hash ?? DUMMY_HASH;
const passwordValid = await this.passwordService.verify(password, storedHash);

if (!user || !passwordValid) {
  // Deliberately identical for both cases — no user enumeration.
  throw new UnauthorizedException(
    errorBody(ErrorCode.INVALID_CREDENTIALS, 'Invalid email or password'),
  );
}
```

Two defences in four lines:

**Timing equalisation.** bcrypt at cost 12 takes ~250ms. If an unknown email
returned immediately and a known email took 250ms, an attacker could enumerate
every registered address by timing alone. Hashing against a dummy digest makes
both paths cost the same.

**Identical messages.** "No such user" and "wrong password" are the same string.

Then `roles` are checked (`auth.service.ts:38`) and the token is signed.

## 7.6 The session cookie — `src/auth/auth-cookie.ts`

```ts
export const AUTH_COOKIE = 'bp_session';

function baseOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'strict',
    secure: isProduction(),
    path: '/',
  };
}
```

| Attribute | Effect |
|---|---|
| `httpOnly` | JavaScript cannot read it. `document.cookie` does not show it. XSS cannot steal it. |
| `sameSite: 'strict'` | The browser will not attach it to any cross-site request. This **is** the CSRF defence — no token library needed. |
| `secure` | HTTPS only. Off in development because localhost is plain http. |
| `path: '/'` | Sent for every path on this origin. |

### The identical-attributes rule — `auth-cookie.ts:28-31`

> Attributes must be identical on set and clear, or the browser treats them as two
> different cookies and the "cleared" one quietly survives.

This is why `baseOptions()` exists as a shared function rather than two literal
objects. A logout that appears to work but leaves a live session is exactly the
bug this prevents.

### Cookie lifetime from the token itself — `auth-cookie.ts:59-68`

```ts
export function tokenTtlMs(token: string, fallbackMs = 2 * 60 * 60 * 1000): number {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    const remaining = payload.exp * 1000 - Date.now();
    if (Number.isFinite(remaining) && remaining > 0) return remaining;
  } catch { /* malformed — fall through */ }
  return fallbackMs;
}
```

The cookie expires exactly when the token does, so the two cannot disagree. A
cookie outliving its token produces requests rejected for no visible reason.

Note `exp` is in **seconds** (JWT standard) and JavaScript needs
**milliseconds** — hence `* 1000`.

This decodes without verifying, which is safe and documented at lines 56-57: it
runs immediately after we signed the token ourselves, and the value only decides a
cookie lifetime.

### What httpOnly does not fix — `auth-cookie.ts:16-19`

> XSS can still *use* the session by issuing same-origin fetches from the victim's
> browser — the browser attaches the cookie. It just cannot exfiltrate the
> credential.

This is the honest limit. httpOnly stops theft, not use.

## 7.7 Login response — `auth.controller.ts:32-61`

```ts
const result = await this.authService.login(body.email, body.password);
const ttlMs = tokenTtlMs(result.token);
setAuthCookie(res, result.token, ttlMs);

return {
  success: true,
  user: result.user,
  expires_at: Date.now() + ttlMs,
  token: result.token,   // for Swagger / curl only
};
```

`expires_at` replaces the client decoding the JWT to know when to sign out — it
cannot read the cookie any more. It is a timestamp, not a credential.

`token` is still returned so Swagger's Authorize button works. The frontend
ignores it (`state.js:151-155`).

### Failed-login logging — `auth.controller.ts:63-66`

```ts
// Deliberately no email: failed-login lines would otherwise accumulate a
// list of addresses an attacker probed.
this.logger.warn({ outcome: 'invalid_credentials' }, 'Login failed');
```

## 7.8 Signup — `auth.controller.ts:75-135`

```ts
if (body.role !== 'student') {
  throw new BadRequestException(errorBody(
    ErrorCode.BUSINESS_RULE_VIOLATION,
    'Only student accounts can self-register. ...',
  ));
}
```

Self-registration is limited to students. The reasoning at lines 97-100: faculty
accounts confer the ability to mark attendance and enter grades for real students,
so they must be provisioned by an administrator through `POST /users`, where a
role privilege ceiling applies.

## 7.9 Change password — `auth.service.ts:63-96`

Two different statuses, and the difference is critical:

```ts
if (!user) {
  // The token names someone who no longer exists — the session is invalid.
  throw new UnauthorizedException(...);          // 401
}

const currentValid = await this.passwordService.verify(current, user.password_hash);
if (!currentValid) {
  // A wrong current password is a failure of the form, not of the session.
  throw new BadRequestException(...);            // 400
}
```

The comment at 74-76 spells out the consequence: **401 here would trigger the
client's sign-out handler and silently end the session instead of showing an
error.** This was a real reported bug — changing your password logged you out.

Line 95 is the other half of that fix:

```ts
this.db.persist();
```

Mutating an element in place does not trip the store's array proxy (see
[8.2](#82-the-write-detection-proxy)), so without this the new password would
live only in memory and vanish on restart.

---

# Part 8 — The data layer

## 8.1 Two stores, one switch

`src/database/database.module.ts:22`:

```ts
const postgresProviders = getDataStore() === 'postgres' ? [PostgresService] : [];
```

`DATA_STORE=memory` (the default) opens no connection at all, so the app runs with
no database configured.

**Current status:** the PostgreSQL schema is fully provisioned — 21 tables, 26
foreign keys, 43 indexes — but **176 data-access call sites still use
`InMemoryDbService` and 0 use `PostgresService`**. With `DATA_STORE=postgres` the
app connects and applies migrations, but a `POST /api/leave` still lands in
`data/mock-db.json`. Documented in `back-end/docs/DATABASE.md`.

## 8.2 The write-detection proxy

`src/database/in-memory-db.service.ts:42-60`:

```ts
private createProxyArray(arr: any[]) {
  return new Proxy(arr, {
    get: (target, prop, receiver) => {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value === 'function' &&
          ['push','pop','shift','unshift','splice','sort','reverse'].includes(prop as string)) {
        return (...args: any[]) => {
          const result = value.apply(target, args);
          if (this.isLoaded) this.persist();
          return result;
        };
      }
      return value;
    },
    set: (target, prop, value, receiver) => {
      const result = Reflect.set(target, prop, value, receiver);
      if (this.isLoaded && prop !== 'length') this.persist();
      return result;
    }
  });
}
```

A `Proxy` intercepts operations on an object. Here it wraps the mutating array
methods so that `db.leave_applications.push(x)` automatically writes the whole
JSON file.

**The trap, and it catches people repeatedly:** the proxy only sees operations on
the *array*. Mutating a property of an object already inside the array —

```ts
user.password_hash = await this.passwordService.hash(newPass);
```

— never touches the array, so no write is triggered. Every in-place mutation must
be followed by an explicit `this.db.persist()`. That is why
`auth.service.ts:95` exists.

`isLoaded` (line 10) guards against writing the file 96 times during the bulk
load at startup.

## 8.3 The persist allowlist — `in-memory-db.service.ts:95-125`

```ts
const dataToSave = {
  departments: this.departments,
  users: this.users,
  ...
  resource_bookings: this.resource_bookings,
};
fs.writeFileSync(this.dataPath, JSON.stringify(dataToSave, null, 2), 'utf8');
```

A hardcoded list of 21 collections. **Anything not on this list is silently
dropped on every write.** See [Part 14, issue 3](#part-14--known-issues).

## 8.4 PostgreSQL type parsers — `src/database/postgres/pg-types.ts`

The `pg` driver returns some types in shapes the application does not expect:

| PostgreSQL type | `pg` returns | Application expects |
|---|---|---|
| `NUMERIC` | `string` | `number` |
| `DATE` | `Date` object | `string` |

Both break **silently**, which is worse than loudly:

- `isAtRisk()` (`src/common/academic-rules.ts:85`) checks
  `typeof cgpa === 'number'`. A string CGPA makes it return `false` for every
  student, and at-risk detection quietly stops working.
- The app compares dates as strings (`record.date === today`), which a `Date`
  object never matches.

`pg-types.ts` registers parsers so the database holds real `date`/`numeric` types
while the application sees the shapes it saw from JSON. **They must be applied
before any pool is created** — see `scripts/seed-postgres.ts:165`.

## 8.5 Why the JSON schema, not the ER schema

The team adopted the shape of `data/mock-db.json` rather than the normalised
schema in `Database/dbschema.sql`. Every column name matches the JSON key it came
from, so the existing 176 call sites and the frontend keep working without a
translation layer — the migration carries no transformation risk.

Trade-offs recorded in `docs/DATABASE.md`: denormalised display columns
(`faculty_name`, `student_name`) can drift; nested arrays became `jsonb`; primary
keys are `text` because ids are generated by the application.

---

# Part 9 — Error handling

## 9.1 The design decision

`src/common/errors/error-codes.ts:9-11` states it:

> These are NOT exception classes. Every error in this application is thrown as
> one of Nest's built-in HttpException subclasses — the code is carried in the
> response body alongside it.

No custom exception hierarchy. `BadRequestException`, `UnauthorizedException`,
`ForbiddenException`, `NotFoundException`, `ConflictException` and friends, each
carrying a machine-readable `code` in its body.

## 9.2 Why a code as well as a status

HTTP status is too coarse for a client to act on. A `400` could be a malformed
body, a duplicate record, or a business rule refusing the operation — each
deserves different UI. The status stays authoritative for HTTP semantics; the code
says *which* of the many 400s it is.

24 codes, grouped by status (`error-codes.ts:15-53`):

| Status | Codes |
|---|---|
| 400 | `VALIDATION_FAILED`, `MALFORMED_REQUEST`, `IMMUTABLE_FIELD`, `BUSINESS_RULE_VIOLATION`, `INVALID_STATE_TRANSITION` |
| 401 | `AUTHENTICATION_REQUIRED`, `INVALID_CREDENTIALS`, `TOKEN_INVALID`, `TOKEN_EXPIRED` |
| 403 | `INSUFFICIENT_ROLE`, `NOT_RESOURCE_OWNER`, `PRIVILEGE_CEILING`, `ENVIRONMENT_RESTRICTED` |
| 404 | `RESOURCE_NOT_FOUND`, `ROUTE_NOT_FOUND` |
| 409 | `DUPLICATE_RESOURCE`, `CONSTRAINT_VIOLATION` |
| 413/415/429 | `PAYLOAD_TOO_LARGE`, `UNSUPPORTED_MEDIA_TYPE`, `RATE_LIMITED` |
| 500/503 | `INTERNAL_ERROR`, `DATABASE_ERROR`, `DATABASE_UNAVAILABLE`, `MISCONFIGURATION` |

Line 13: **"Values are part of the API contract. Add freely; never rename or
reuse."**

Usage is a one-liner (`errorBody`, `error-codes.ts:65-71`):

```ts
throw new NotFoundException(
  errorBody(ErrorCode.RESOURCE_NOT_FOUND, 'Course not found', { courseId }),
);
```

## 9.3 The filter — `src/common/filters/http-exception.filter.ts`

`@Catch()` with no arguments catches **everything**, not just `HttpException`.

Four responsibilities, documented at lines 17-27:

### 1. Normalise — `:92-119`

```ts
private normalise(exception: unknown): HttpException {
  if (exception instanceof HttpException) return exception;

  const mapped = mapDatabaseError(exception);      // SQLSTATE → exception
  if (mapped) return mapped;

  const status = (exception as any)?.status ?? (exception as any)?.statusCode;
  if (typeof status === 'number' && status >= 400 && status < 600) { ... }

  return new InternalServerErrorException({ code: ErrorCode.INTERNAL_ERROR, ... });
}
```

Three fallbacks in priority order: already an HttpException → database error →
something with a status property (body-parser) → generic 500.

### 2. One envelope — `:77-88`

```json
{
  "success": false,
  "statusCode": 404,
  "code": "RESOURCE_NOT_FOUND",
  "message": "Leave application not found",
  "path": "/api/leave/l999",
  "requestId": "3f2a...",
  "timestamp": "2026-08-26T09:14:22.318Z"
}
```

### 3. Never leak internals — `:83`

```ts
message: status >= 500 ? 'Internal server error' : message,
```

5xx messages describe our internals and must not reach the caller. 4xx messages
are written for the user and are safe to return. The real message and stack go to
the log with the `requestId` the client was given.

### 4. Log at matching severity — `:56-71`

```ts
if (status >= 500) {
  this.logger.error({ ...logContext, err: exception, msg: ... });
} else {
  this.logger.debug({ ...logContext, reason: message, ... });
}
```

Note `err: exception` — the **original** exception, not the normalised one. The
driver error and stack trace are the whole point of that line.

4xx logs at `debug`, not `warn`. The comment at 26-27 explains: `pino-http`
already emits a `warn` line per 4xx request (`logger.config.ts:68`), so logging
here at `warn` would double every 401.

### The headers-sent guard — `:75`

```ts
if (response.headersSent) return;
```

The response may already be partially written — a file stream that failed midway.
Writing again throws and masks the original error.

## 9.4 Database error mapping — `src/common/errors/database-error.mapper.ts`

Without this, every constraint violation is an unhandled driver error and the
filter reports 500 for what is usually the caller's fault. Worse, the raw message
leaks schema:

```
duplicate key value violates unique constraint "marks_entry_student_id_assessment_id_key"
```

Detection (`:39-45`) — a driver error carries a five-character SQLSTATE:

```ts
export function isPgError(err: unknown): err is PgError {
  return err instanceof Error &&
    typeof (err as PgError).code === 'string' &&
    /^[0-9A-Z]{5}$/.test((err as PgError).code as string);
}
```

| SQLSTATE | Meaning | Maps to |
|---|---|---|
| `23505` | unique violation | 409 `ConflictException` |
| `23503` | foreign key violation | 400 `BadRequestException` |
| `53300` | too many connections | 503 `ServiceUnavailableException` |
| `42xxx` | syntax / undefined column | 500 (our bug, not theirs) |

`CONSTRAINT_MESSAGES` (`:52-61`) maps constraint names to messages explaining the
*rule* rather than the schema:

```ts
marks_entry_student_id_assessment_id_key:
  'Marks for this student and assessment have already been entered.',
```

## 9.5 Errors outside a request — `src/common/errors/process-handlers.ts`

The filter only sees errors thrown during a request. `unhandledRejection` and
`uncaughtException` never reach it. `registerProcessHandlers` (`main.ts:110`)
routes those through the same logger.

---

# Part 10 — File uploads

## 10.1 The architecture

One upload endpoint and one download endpoint for the entire application
(`src/uploads/uploads.controller.ts`). Every form with an attachment — leave,
attendance request, research milestone, assessment submission — posts here first,
then sends the returned `file_id` with its own payload.

That keeps multipart handling in one place instead of spread across five
controllers.

**Bytes on disk, metadata in the store.** The file lives under `back-end/uploads/`
(gitignored); a record describing it lives in the data store.

## 10.2 Where the files go — `upload.config.ts:19-22`

```ts
export const UPLOAD_DIR = path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? 'uploads');
export const MAX_FILE_BYTES = Number(process.env.UPLOAD_MAX_BYTES ?? 5 * 1024 * 1024);
```

## 10.3 The storage engine — `upload.config.ts:76-88`

```ts
export const uploadStorage = diskStorage({
  destination: (_req, _file, cb) => { ensureUploadDir(); cb(null, UPLOAD_DIR); },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname ?? '').toLowerCase();
    cb(null, `${randomUUID()}${ALLOWED_EXTENSIONS.includes(ext) ? ext : ''}`);
  },
});
```

**The client filename is never used as the on-disk name.** The docstring at 70-74
lists what that would allow: path traversal (`../../.env`), collisions, and
overwriting another user's document by uploading the same name.

## 10.4 The two-part type check — `upload.config.ts:90-125`

```ts
const ALLOWED: Record<string, string[]> = {
  '.pdf':  ['application/pdf'],
  '.jpg':  ['image/jpeg'],
  '.png':  ['image/png'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  ...
};
```

Both the extension **and** the MIME type are checked, and they must agree. The
reasoning at 27-31: the browser-supplied MIME type is attacker-controlled, and an
extension alone says nothing about content. Requiring the pair to agree rejects
the easy cases — `payload.exe` renamed to `.pdf`, or a real PDF sent with
`mimetype: application/x-msdownload`.

The honest limitation is stated at 32-34: **this is not content sniffing.** A file
whose bytes are not really a PDF can still get through. It is not executed or
served inline, so the residual risk is storage, not execution.

`.svg` is deliberately absent — an SVG is an XML document that can carry
`<script>`, and would execute if ever served inline.

## 10.5 Multipart limits — `upload.config.ts:128-140`

```ts
export const UPLOAD_OPTIONS = {
  storage: uploadStorage,
  fileFilter: uploadFileFilter,
  limits: { fileSize: MAX_FILE_BYTES, files: 1, fields: 10, parts: 15 },
};
```

`fields` and `parts` are the non-obvious ones — the comment at 137-138 explains
that multipart bodies can smuggle a denial of service through *field count*
rather than file size.

## 10.6 Filename sanitisation — `upload.config.ts:56-64`

```ts
const base = path.basename(String(name ?? ''));
const cleaned = base.replace(/[^A-Za-z0-9._ -]/g, '_').replace(/^\.+/, '').trim();
return (cleaned || 'document').slice(0, 120);
```

`basename()` drops any directory portion, so `../../etc/passwd` becomes `passwd`.
The allowlist then replaces anything outside `[A-Za-z0-9._ -]` with an underscore,
which also removes control characters that could forge line breaks in logs or
headers. `replace(/^\.+/, '')` prevents dotfiles. The `|| 'document'` fallback
prevents an empty name.

## 10.7 Ownership on download

```ts
assertCanRead(record: UploadRecord, userId: string, role: Role): void {
  if (record.uploaded_by === userId) return;
  if (REVIEWER_ROLES.includes(role)) return;
  this.logger.warn({ ... }, 'Blocked attempt to read another user document');
  throw new ForbiddenException(errorBody(ErrorCode.NOT_RESOURCE_OWNER, ...));
}
```

The default is "only the person who uploaded it". Staff (`faculty`, `admin`,
`head`, `superadmin`) may read any document because approving leave requires
seeing the attachment. **A student may not read another student's** — the
docstring at 130-134 notes these are medical certificates.

## 10.8 Path resolution — `uploads.service.ts:107-126`

```ts
const full = path.resolve(UPLOAD_DIR, record.stored_name);
if (!full.startsWith(path.resolve(UPLOAD_DIR) + path.sep)) { ... throw 404 }
if (!fs.existsSync(full)) { ... throw 404 }
```

`stored_name` is generated by us, so traversal should be impossible — but the
docstring at 102-105 gives the reason it is checked anyway: this is the one place
a bad value would become filesystem access, and the check costs nothing.

The second branch handles metadata without bytes — the row outlived the file.

## 10.9 Download headers — `uploads.controller.ts:114-119`

```ts
res.setHeader('Content-Type', 'application/octet-stream');
res.setHeader('X-Content-Type-Options', 'nosniff');
res.setHeader('Content-Disposition',
  `attachment; filename="${record.original_name.replace(/"/g, '')}"`);
```

**Always an attachment, never inline.** The comment at 112-113: a stored HTML or
SVG file rendered inline would execute in this origin, and the origin holds the
session.

`.replace(/"/g, '')` prevents a quote in the filename from breaking out of the
header value.

## 10.10 Orphan cleanup — `uploads.controller.ts:72-73`

```ts
if (!UPLOAD_CONTEXTS.includes(context as UploadContext)) {
  this.uploads.discard(file);
  throw new BadRequestException(...);
}
```

Context is validated *after* the file is on disk, because multer writes it before
the handler runs. A bad context must not leave the bytes behind.

## 10.11 The frontend side — `state.js:109-133`

```js
uploadFile: async (file, context) => {
  if (file.size > window.Auth.MAX_UPLOAD_BYTES) { throw new Error(...); }
  const form = new FormData();
  form.append('file', file);
  const res = await window.Auth.apiFetch(`/uploads?context=${encodeURIComponent(context)}`,
    { method: 'POST', body: form });
  return res && res.data ? res.data : null;
},
```

The critical detail is in `apiFetch` at `state.js:54-58`:

```js
const isMultipart = options.body instanceof FormData;
const headers = {
  ...(isMultipart ? {} : { 'Content-Type': 'application/json' }),
  ...
};
```

**A `FormData` body must not carry an explicit `Content-Type`.** The browser sets
it itself and appends the multipart boundary, which JavaScript cannot know.
Forcing `application/json` makes the server unable to parse the upload at all.
This was a real bug.

---

# Part 11 — The frontend

## 11.1 Structure

No framework, no build step. Six HTML pages plus three scripts, loaded in a fixed
order on every page:

```html
<script src="state.js"></script>   <!-- auth + API helper -->
<script src="script.js"></script>  <!-- login, signup, role selection -->
<script src="fixes.js"></script>   <!-- ALL rendering -->
```

The header of `script.js:1-5` states the division:

> ALL rendering is delegated to fixes.js (loaded after this file).
> DO NOT define render* functions here – they live in fixes.js only.

`fixes.js` is ~3,000 lines and holds every `render*` function.

## 11.2 `state.js` — the auth layer

### The API helper — `state.js:49-100`

```js
apiFetch: async (endpoint, options = {}) => {
  const isMultipart = options.body instanceof FormData;
  const headers = { ...(isMultipart ? {} : { 'Content-Type': 'application/json' }), ... };

  if (window.Auth.isTokenExpired()) { await window.Auth.logout(); return null; }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options, headers,
    credentials: 'same-origin',     // send the session cookie
  });

  if (res.status === 401) { window.Auth.logout(); return null; }
  if (res.status === 403) { throw new Error(...); }   // do NOT sign out
  ...
}
```

**No `Authorization` header.** The session cookie is httpOnly and the browser
attaches it automatically.

The 401 vs 403 split (lines 80-91) is the client half of the contract established
in [6.1](#61-guards). Comment at 76-78: endpoints must not use 401 to report a bad
value the user typed, because that would end the session instead of showing an
error.

### Token accessors after the cookie migration — `state.js:21-46`

```js
getToken: () => null,
```

The session lives in an httpOnly cookie, so there is no token for JavaScript to
read. Kept as a stub so legacy callers do not throw.

```js
getTokenExpiry: () => {
  const raw = localStorage.getItem('bp_expires_at');
  ...
}
```

Was decoded from the JWT; the cookie is unreadable now, so the server returns
`expires_at` at login and it is cached beside the profile. **A timestamp, not a
credential.**

### Logout must be async — `state.js:175-193`

```js
logout: async () => {
  try {
    await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'same-origin' });
  } catch { /* server unreachable — still clear local state */ }
  localStorage.removeItem('bp_user');
  localStorage.removeItem('bp_expires_at');
  localStorage.removeItem('bp_token');      // legacy key
  ...
}
```

The cookie is httpOnly, so **only the server can remove it.** Skipping that call
would leave the browser holding a valid session after "signing out".

### The route guard is not security — `state.js:196-203`

> The role it checks comes from localStorage, which the user can edit. Editing it
> lets someone *render* a dashboard they are not entitled to, but every request
> that dashboard makes still carries their real token, so the server returns 403
> and the page stays empty.

## 11.3 `fixes.js` — rendering

Line 6 aliases the helper:

```js
const api = window.Auth.apiFetch.bind(window.Auth);
```

`bind` is required because `apiFetch` references `window.Auth` internally; passing
the bare function would lose `this`.

Two intentional patterns worth recognising, because they look like duplicate
definitions:

```js
// fixes.js:2789-2791 — decorator over an earlier definition
const _origOpenMarksModal = window.openMarksModal;
window.openMarksModal = async function(...args) {
  await _origOpenMarksModal(...args);
  // then add marks-lock UI
};
```

The same pattern wraps `triggerViewRender` at `fixes.js:2937`. These are
deliberate extensions, not accidents. (One genuine duplicate does exist — see
[Part 14](#part-14--known-issues).)

## 11.4 Dev credentials — `script.js` (end of file)

Selecting a role on the login page fills that actor's seeded credentials.

```js
const IS_LOCAL_DEV = ['localhost', '127.0.0.1', ''].includes(location.hostname);
```

Two guards: it runs only on localhost, and the credential strip is **built in
JavaScript**, so these passwords are never written into `login.html` — on any
other host the markup does not exist at all.

| Role | Email | Password |
|---|---|---|
| student | `student@example.com` | `Student@123` |
| faculty | `faculty@example.com` | `Faculty@123` |
| head | `head@example.com` | `Head@123` |
| superadmin | `super@example.com` | `Super@123` |

Verified by bcrypt-comparing each against the stored hash in `mock-db.json`.
A second student (`student2@example.com`) and faculty (`faculty2@example.com`)
exist with the same passwords — useful for testing the ownership checks in
[10.7](#107-ownership-on-download).

---

# Part 12 — Three requests, traced end to end

## 12.1 `POST /api/auth/login`

| Stage | What happens | Code |
|---|---|---|
| 1-3 | CORS, cookies parsed (none yet), helmet headers set | `main.ts:55,64,81` |
| 4 | `express.static` finds no file at `/api/auth/login`, calls `next()` | `main.ts:126` |
| 5 | `pino-http` mints a request id, sets `X-Request-Id` | `logger.config.ts:98` |
| 6 | Body parser produces `{ email, password }` | Nest default |
| 7 | `JwtAuthGuard` sees `@Public()` → returns `true` immediately | `jwt-auth.guard.ts:39` |
| 8 | `RolesGuard` sees `@Public()` → returns `true` | `roles.guard.ts:33` |
| 10 | `ValidationPipe` builds a `LoginDto`, runs `@IsEmail()` | `main.ts:119` |
| 12 | Handler: `authService.login()` → bcrypt verify → sign JWT | `auth.service.ts:20` |
| 12 | `tokenTtlMs(token)` reads `exp`; `setAuthCookie` sets `bp_session` | `auth-cookie.ts:59,41` |
| 12 | Returns `{ success, user, expires_at, token }` | `auth.controller.ts:52` |
| — | Log line written; `Set-Cookie` redacted | `logger.config.ts:31` |

Frontend then stores `bp_user` and `bp_expires_at` and redirects by role
(`state.js:154-167`).

## 12.2 `POST /api/leave` with a session cookie

| Stage | What happens | Code |
|---|---|---|
| 2 | `cookieParser` populates `request.cookies.bp_session` | `main.ts:64` |
| 7 | `JwtAuthGuard`: no `@Public()`; extracts cookie; `verifyAsync`; checks `sub` + `role`; sets `request.user` | `jwt-auth.guard.ts:42-73` |
| 8 | `RolesGuard`: `@Roles('student','faculty')`; `request.user.role` is `student` → allowed | `roles.guard.ts:54` |
| 10 | `ValidationPipe`: body is typed `any` → **nothing happens** | see Part 14 |
| 11 | `@CurrentUserId()` returns `request.user.sub` | `current-user.decorator.ts:33` |
| 12 | Handler checks required fields, builds the record, `push`es | `common.controller.ts:529-552` |
| 12 | The proxy's `push` trap fires → whole JSON file rewritten | `in-memory-db.service.ts:46-52` |
| — | `pino-http` logs `POST /api/leave 201` with `userId` and `role` | `logger.config.ts:118` |

## 12.3 A failing request: `GET /api/uploads/:id` for someone else's document

| Stage | What happens | Code |
|---|---|---|
| 7 | Token verifies, `request.user` set | `jwt-auth.guard.ts:73` |
| 8 | No `@Roles` on the route → any authenticated user passes | `roles.guard.ts:42` |
| 12 | `findById` locates the record | `uploads.service.ts:90` |
| 12 | `assertCanRead`: not the owner, role is `student` → **throws `ForbiddenException`** | `uploads.service.ts:144` |
| 14 | Filter catches it; already an `HttpException`, so `normalise` passes it through | `filter:93` |
| 14 | Status 403 < 500 → logs at `debug`, keeps the real message | `filter:65,83` |
| 14 | Responds with `code: NOT_RESOURCE_OWNER` and the request id | `filter:77-88` |
| — | Frontend sees 403 → shows an error, **does not sign out** | `state.js:88` |

---

# Part 13 — Complete file map

```
back-end/src/
├── main.ts                          Bootstrap: middleware order, Swagger, listen
├── app.module.ts                    Root wiring; APP_GUARD order (:61-66)
│
├── auth/
│   ├── auth.module.ts               @Global; JwtModule.registerAsync
│   ├── auth.controller.ts           login (:32) signup (:81) logout (:195)
│   ├── auth.service.ts              Timing-safe login (:20); changePassword (:63)
│   ├── auth-cookie.ts               bp_session contract; tokenTtlMs (:59)
│   ├── password.service.ts          bcryptjs wrapper; isHashed guard
│   ├── jwt-auth.guard.ts            Global guard #1 — authentication
│   ├── roles.guard.ts               Global guard #2 — authorization; @Roles (:20)
│   ├── public.decorator.ts          @Public() — the only auth opt-out
│   └── jwt-payload.ts               ROLES, JwtPayload, Express.Request augmentation
│
├── common/
│   ├── decorators/current-user.decorator.ts   @CurrentUser / Id / Role
│   ├── dto/app.dto.ts                          LoginDto, SignupDto, PASSWORD_POLICY (:76)
│   ├── dto/user.dto.ts                         User DTOs
│   ├── errors/error-codes.ts                   24 codes; errorBody() (:65)
│   ├── errors/database-error.mapper.ts         SQLSTATE → HttpException
│   ├── errors/validation.factory.ts            Pipe options (:83); flatten() (:24)
│   ├── errors/process-handlers.ts              unhandledRejection / uncaughtException
│   ├── filters/http-exception.filter.ts        The single error exit point
│   └── academic-rules.ts                       isAtRisk (:84), normalizeLeaveType (:128)
│
├── config/
│   ├── auth.config.ts               Fail-closed JWT_SECRET validation
│   ├── logger.config.ts             pino-http: redaction, correlation, levels
│   └── database.config.ts           DATA_STORE, pool config, TLS
│
├── database/
│   ├── database.module.ts           Conditional PostgresService registration
│   ├── in-memory-db.service.ts      Proxy arrays (:42); persist() (:95)
│   ├── postgres/postgres.service.ts Pool, transactions, migrations
│   ├── postgres/pg-types.ts         NUMERIC/DATE parsers
│   └── migrations/001_initial_schema.sql
│
├── uploads/
│   ├── upload.config.ts             diskStorage (:76), fileFilter (:90), limits (:128)
│   ├── uploads.service.ts           Metadata, assertCanRead (:136), resolvePath (:107)
│   ├── uploads.controller.ts        POST /uploads, GET /uploads/:fileId
│   └── uploads.spec.ts              Sanitisation, filter, access-control tests
│
├── admin/common.controller.ts       The largest controller (~1000 lines)
├── students/  faculty/              Role-specific controllers
└── modules/                         10 workflow modules (fee, report, user,
                                     attendance, resource, research, forum,
                                     leave, assessment, outcome)

front-end/
├── state.js       Auth + apiFetch + uploadFile + logout
├── script.js      Login, signup, selectRole, dev credentials
├── fixes.js       All rendering (~3000 lines)
├── style.css
└── {index,login,signup,student,faculty,super-user,super-admin}.html
```

## Where to look for a given question

| Question | File |
|---|---|
| Why was my request rejected? | `jwt-auth.guard.ts` (401), `roles.guard.ts` (403) |
| What shape do errors take? | `http-exception.filter.ts:77-88` |
| What does `code: X` mean? | `error-codes.ts:15-53` |
| Why is a field being rejected? | `validation.factory.ts:83-89` |
| Where do uploaded files go? | `upload.config.ts:20` |
| Why isn't my change persisting? | `in-memory-db.service.ts:42-60` — call `persist()` |
| What runs before my controller? | `main.ts:50-130` and [Part 4](#part-4--the-request-lifecycle) |
| Which routes skip auth? | `grep -rn "@Public()" src/` — exactly 3 |

---

# Part 14 — Known issues

Findings from a forensic sweep of the current branch. Listed so nobody
rediscovers them mid-demo.

### 1. The signup form offers a Faculty tab the server always rejects

`signup.html:159` renders a Faculty role tab; `auth.controller.ts:101` returns 400
for any role other than `student`. The server is correct — the UI should not offer
the path.

### 2. `npm run start:prod` is broken

`package.json:14` runs `node dist/main`, but the build emits `dist/src/main.js`
because `scripts/` pulls the TypeScript root up a level. Instant
`MODULE_NOT_FOUND`. `npm run start` is unaffected.

### 3. Uploaded documents vanish on server restart

`UploadsService` writes metadata to `db.uploads` (`uploads.service.ts:56`, created
dynamically), then calls `db.persist()`. But `persist()`
(`in-memory-db.service.ts:95-125`) writes a hardcoded list of 21 collections and
**`uploads` is not one of them** — the string appears zero times in that file.
Bytes survive on disk; metadata does not. After a restart every attached document
returns 404.

### 4. Mass assignment on `POST /api/leave`

`common.controller.ts:539-551`:

```ts
const newLeave = {
  leave_id: id, student_id: userId, status: 'pending', applied_on: ...,
  ...body,                          // ← spread lands AFTER the safe defaults
  leave_type: normalizeLeaveType(body.leave_type),
};
```

The route is `@Roles('student','faculty')` and takes `@Body() body: any`, so the
validation whitelist never engages. Posting `{"status":"approved"}` self-approves
the leave; posting `student_id` files it against another student.

### 5. 31 routes take `@Body() body: any`

20 `any)` plus 11 `any,` across all controllers. `ValidationPipe` has no DTO to
validate against on any of them. Issue 4 is one instance;
`Object.assign(event, body)` (`:499`), `Object.assign(res, body)` (`:852`) and
`Object.assign(fee, {...body})` (`:912`) also allow rewriting a primary key.

### 6. Signup bypasses the project's own password policy

`PASSWORD_POLICY` (`app.dto.ts:76`) requires 8 characters with upper, lower,
digit and special, and is enforced on `ChangePasswordDto` (`:88`) and admin user
creation (`user.dto.ts:127`). `SignupDto.password` is only `@MinLength(4)`.
Meanwhile `login.html` displays "Min 8 chars…" and `signup.html:364` blocks under
6 — four different rules, counting the README.

### 7. `renderResourceManagement` is defined twice

`fixes.js:1531` (joins `/resources` with `/events`) and `fixes.js:1605`
(resources only). The later assignment wins, so the richer version is dead code.

### 8. Hardcoded `http://localhost:5001`

`signup.html:392` and `fixes.js:2308`. Harmless while everything is served from
5001, but if the frontend is ever served on a different port those two calls
become cross-origin, and CORS now defaults to `origin: false` — they will fail.
Fix is to use the relative `/api` base like every other call site.

### 9. No rate limiting

No `@nestjs/throttler`, no throttle code. `POST /api/auth/login` accepts unlimited
attempts. bcrypt at cost 12 makes each guess expensive but not bounded, and
concurrent attempts can saturate CPU.

### 10. Stored XSS — audit finding C-06

136 unescaped `innerHTML` sites. httpOnly stops the session token being *stolen*;
an injected script can still *use* the session via same-origin `fetch`. This is
also what blocks a real CSP — see [5.3](#53-helmet).

---

# Part 15 — Glossary

| Term | Meaning here |
|---|---|
| **Bootstrap** | `bootstrap()` in `main.ts` — everything before the server accepts a request |
| **CORS** | Browser mechanism for *relaxing* the same-origin policy. Not a security feature |
| **CORP** | `Cross-Origin-Resource-Policy` — controls who may *embed* our responses |
| **CSP** | `Content-Security-Policy` — declares which sources may load/execute. Disabled here |
| **Decorator** | `@Something()` — attaches metadata at import time; does not run per request |
| **DI** | Dependency injection — Nest constructs your dependencies from constructor types |
| **DTO** | Data Transfer Object — a class describing a request body, with validation decorators |
| **Filter** | Catches thrown exceptions and turns them into responses. Stage 14 |
| **Guard** | Returns true/false (or throws) before the handler. Stages 7-8 |
| **HSTS** | `Strict-Transport-Security` — forces HTTPS after first visit. Inert on localhost |
| **httpOnly** | Cookie flag making the cookie invisible to JavaScript |
| **Interceptor** | Wraps the handler; can act before and after. Stages 9 and 13 |
| **JWT** | JSON Web Token — signed, **not encrypted**; anyone holding it can read the claims |
| **Middleware** | Express-level function running before Nest's pipeline. Stages 1-6 |
| **Module** | A wiring manifest: providers, controllers, imports, exports |
| **Pipe** | Transforms/validates one argument before the handler. Stage 10 |
| **Provider** | An `@Injectable()` class Nest constructs and shares — singleton by default |
| **Proxy** | JS object wrapper intercepting operations. Used for JSON auto-persistence |
| **Reflector** | Nest's metadata reader — how guards find `@Public()` and `@Roles()` |
| **SameSite** | Cookie attribute controlling cross-site attachment. `Strict` here = CSRF defence |
| **SQLSTATE** | Five-character PostgreSQL error code, e.g. `23505` = unique violation |
| **`sub`** | JWT standard claim for the subject — here, `user_id` |
