# Mandatory Middleware Technical Documentation

This document provides complete technical specifications, code excerpts, and architecture details for all **5 mandatory middleware types** implemented in **BarelyPassing** for the FDFED Evaluation.

---

## 1. Middleware Registration Architecture in NestJS

All middleware components are registered in `back-end/src/app.module.ts` via the `NestModule` interface and `MiddlewareConsumer`:

```typescript
// back-end/src/app.module.ts
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // 1. Global Security Middleware (OWASP headers, CSP, CORS)
    consumer.apply(SecurityMiddleware).forRoutes('*');

    // 2. Global Logging Middleware (logs to access.log & app.log)
    consumer.apply(LoggingMiddleware).forRoutes('*');

    // 3. Global Rate Limiter & Token Quota Middleware
    consumer.apply(RateLimiterMiddleware).forRoutes('*');

    // 4. Router-Level Tenant Context Middleware (Multi-Tenant Isolation)
    consumer
      .apply(TenantContextMiddleware)
      .forRoutes(
        'admin', 'faculty', 'students', 'platform', 'fees',
        'uploads', 'timetable', 'courses', 'leave', 'attendance', 'reports', 'research'
      );

    // 5. Router-Level Audit Logger Middleware (State Mutations)
    consumer
      .apply(AuditLoggerMiddleware)
      .forRoutes(
        { path: 'admin/*', method: RequestMethod.ALL },
        { path: 'users/*', method: RequestMethod.ALL },
        { path: 'courses/*', method: RequestMethod.ALL },
        { path: 'marks/*', method: RequestMethod.ALL },
        { path: 'leave/*', method: RequestMethod.ALL },
        { path: 'fees/*', method: RequestMethod.ALL },
        { path: 'uploads/*', method: RequestMethod.ALL },
        { path: 'timetable/*', method: RequestMethod.ALL }
      );
  }
}
```

---

## 2. Mandatory Middleware #1: Logging Middleware

- **Source File:** `back-end/src/common/middleware/logging.middleware.ts`
- **Scope:** Global (`*`)
- **Disk Log Targets:** `logs/access.log`, `logs/app.log`

### Implementation Highlights
1. Attaches a timestamped execution timer to calculate request duration in milliseconds.
2. Formats console output with color-coded HTTP status codes (2xx Green, 3xx Cyan, 4xx Yellow, 5xx Red).
3. Writes structured log entries containing Method, URL, Status, Latency (ms), Client IP, User ID, and Tenant ID to disk via `FileLoggerService`.

```typescript
// Excerpt from logging.middleware.ts
@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  constructor(private readonly fileLogger: FileLoggerService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const { method, originalUrl, ip, headers } = req;
    const userAgent = headers['user-agent'] || 'unknown';
    const userId = (headers['user-id'] as string) || '';
    const tenantId = (headers['x-tenant-id'] as string) || 't1';

    res.on('finish', () => {
      const durationMs = Date.now() - startTime;
      const statusCode = res.statusCode;

      this.fileLogger.logAccess({
        method,
        url: originalUrl,
        status: statusCode,
        durationMs,
        ip: ip || '',
        userAgent,
        userId,
        tenantId,
      });
    });

    next();
  }
}
```

---

## 3. Mandatory Middleware #2: Error Handling Middleware / Global Exception Filter

- **Source File:** `back-end/src/common/filters/all-exceptions.filter.ts`
- **Scope:** Global (bound via `app.useGlobalFilters(...)` and `APP_FILTER` token)
- **Disk Log Target:** `logs/error.log`

### Implementation Highlights
1. Catches all types of exceptions: `HttpException`, standard JavaScript `Error`, runtime exceptions, and unhandled rejections.
2. Standardizes error responses into a consistent JSON envelope with unique `requestId`.
3. Writes the full error message, endpoint, method, user ID, and stack trace immediately to `logs/error.log` using synchronous disk append.

```typescript
// Sample Standardized Error Response:
{
  "statusCode": 404,
  "timestamp": "2026-08-26T02:15:30.123Z",
  "path": "/api/students/non_existent_id",
  "method": "GET",
  "error": "NotFoundException",
  "message": "Student record not found",
  "requestId": "err_1724638530123_a9b1c"
}
```

---

## 4. Mandatory Middleware #3: File Upload Middleware & Controller

- **Source Files:**
  - `back-end/src/uploads/upload.config.ts` (Multer disk storage & MIME validation)
  - `back-end/src/uploads/uploads.service.ts` (File metadata indexing & storage)
  - `back-end/src/uploads/uploads.controller.ts` (REST endpoints)
  - `back-end/src/uploads/uploads.module.ts` (Module definition)
- **Storage Location:** `./uploads/` directory on disk

### Implementation Highlights
1. Uses `FileInterceptor` from `@nestjs/platform-express` backed by Multer disk storage.
2. Validates allowed MIME types (PDF, DOCX, PNG, JPG, ZIP, TXT) and enforces a 10MB maximum file size.
3. Implements **Issue #50** (Student Progress Report Ingestion & Download Pipeline).
4. Streams downloaded files using NestJS `StreamableFile` with proper `Content-Disposition` headers.

```typescript
// Upload endpoint for Progress Reports
@Post('progress-report')
@UseInterceptors(FileInterceptor('file', { storage: multerStorage, fileFilter, limits: UPLOAD_LIMITS }))
async uploadProgressReport(
  @UploadedFile() file: any,
  @Body('student_id') studentId: string,
  @Body('semester') semester: string
) { ... }
```

---

## 5. Mandatory Middleware #4: Security Middleware

- **Source Files:**
  - `back-end/src/common/middleware/security.middleware.ts` (Security Headers & CORS)
  - `back-end/src/common/middleware/rate-limiter.middleware.ts` (Token Quota & Rate Limiter)
  - `back-end/src/auth/roles.guard.ts` (Role-Based Access Control)
- **Scope:** Global (`*`)

### Implementation Highlights
1. Injects OWASP-compliant security headers:
   - `X-Content-Type-Options: nosniff` (prevents MIME sniffing)
   - `X-Frame-Options: SAMEORIGIN` (prevents clickjacking attacks)
   - `X-XSS-Protection: 1; mode=block` (XSS auditor protection)
   - `Strict-Transport-Security: max-age=31536000; includeSubDomains` (enforces HTTPS)
   - `Referrer-Policy: strict-origin-when-cross-origin`
2. Strips `X-Powered-By` header to hide underlying technology stack.
3. Implements IP-based token bucket rate limiting (200 requests/minute/IP) with `X-RateLimit-*` headers.
4. Role-based route protection enforcing strict hierarchical actor permissions across 5 levels.

---

## 6. Mandatory Middleware #5: Router-Level Middleware

### A. Tenant Context Middleware (`tenant-context.middleware.ts`)
- **Bound Routes:** `/api/admin/*`, `/api/faculty/*`, `/api/students/*`, `/api/platform/*`, `/api/fees/*`, `/api/uploads/*`, `/api/timetable/*`, etc.
- **Functionality:** Extracts `x-tenant-id` / `tenant_code` header, validates institution existence, injects `tenantContext` object into the request, and sets `X-Tenant-ID` in the response header.

### B. Audit Logger Middleware (`audit-logger.middleware.ts`)
- **Bound Routes:** Mutation requests (`POST`, `PUT`, `PATCH`, `DELETE`) on administrative, grading, fee, and user management routes.
- **Disk Log Target:** `logs/audit.log`
- **Functionality:** Logs the actor ID, actor role, targeted resource, and sanitized request body (redacting passwords) whenever a database mutation succeeds.

---

## 7. Log & Error Management System

- **Source File:** `back-end/src/common/services/file-logger.service.ts`
- **Disk Location:** `back-end/logs/`

### Features
1. **Regular Interval Disk Sync:** Buffered log entries are automatically flushed to disk files every **2 seconds** using `setInterval`.
2. **Immediate Emergency Flush:** Critical errors (5xx/unhandled exceptions) and security audit logs bypass the buffer and append to disk synchronously.
3. **Structured Files:**
   - `logs/access.log`: HTTP traffic and response times.
   - `logs/app.log`: Application runtime lifecycle events.
   - `logs/error.log`: Exception stack traces and contextual state.
   - `logs/audit.log`: Administrative state modifications.
4. **Live Log Inspection API:** SaaS Super Admins and Institute Directors can query logs in real-time via `GET /api/platform/logs?type=error&limit=50`.
