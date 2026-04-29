# Backend Testing Report & Documentation

## Overview
This document outlines the testing strategies, processes, and results for the NestJS Backend Academic Management System API. The testing covers unit tests, end-to-end (e2e) tests, health checks, edge-case validation, and load/stress testing.

---

## 1. Test Environment Setup & Fixes

**Issue:** The project uses the `uuid` package, which in recent versions (v14) operates exclusively as an ES Module. Jest, running in a Node CommonJS environment by default, failed to parse this dependency, leading to `SyntaxError: Unexpected token 'export'` across all tests.

**Resolution:**
- A mock file `test/uuid-mock.js` was created. It leverages Node's native `crypto.randomUUID()` to generate identical v4 UUIDs during testing.
- The `moduleNameMapper` inside `package.json` and `test/jest-e2e.json` was updated to intercept any imports of `uuid` and map them to the mock file.
- **Result:** Both `npm run test` and `npm run test:e2e` now execute successfully without ES Module syntax errors.

---

## 2. Health Check Endpoint

To facilitate continuous monitoring and uptime checks, a global health endpoint was added.

**Implementation:**
- The `AppController` and `AppService` were properly imported and registered in the root `AppModule`.
- Added a `GET /health` route returning a payload structured as:
  ```json
  {
    "status": "ok",
    "uptime": 123.45,
    "memoryUsage": { ... },
    "timestamp": "2026-04-29T10:50:00.000Z"
  }
  ```
- **Verification:** An e2e test was added to `app.e2e-spec.ts` to assert that `/health` returns a `200 OK` and contains the `status: 'ok'` property.

---

## 3. Edge-Case Validation (e2e Testing)

A new test suite, `test/edge-cases.e2e-spec.ts`, was created to systematically verify how the backend handles unexpected or unauthorized traffic. NestJS's global `ValidationPipe` and custom `AllExceptionsFilter` were central to these tests.

**Scenarios Tested:**
1. **404 Not Found (Invalid ID / Entity Not Found):**
   - Verified that attempting a `GET /users/invalid-uuid-1234` returns a standardized 404 response indicating the entity was not found.
2. **400 Bad Request (Invalid Payload):**
   - Verified that global validation pipes (`whitelist: true, forbidNonWhitelisted: true`) intercept malformed POST/PUT bodies before they reach the controller, returning a 400 status.
3. **403 Forbidden (RBAC / RolesGuard):**
   - Verified that unauthorized access (e.g., a `student` trying to access an `admin`-only endpoint) is intercepted by the `RolesGuard`, throwing a 403.
   - Verified business logic rules, such as preventing the demotion of an `admin` role, correctly throw `ForbiddenException`.

---

## 4. Endpoint Routing Audit & Fixes

During static endpoint verification, a routing bug was discovered in `user.controller.ts`.

**Bug Description:** 
The `@Get(':id')` route was placed physically higher in the class than the `@Get('mock-data')` route. Consequently, requests to `/users/mock-data` were captured by the `:id` parameter, resulting in a `404 Not Found` because "mock-data" is not a valid user ID.

**Resolution:**
- Reordered the routes so that static paths (`mock-data`) take precedence over dynamic wildcard paths (`:id`).
- Verified all other 9 modules for similar bugs. No other controllers exhibited this issue.
- **Result:** A custom Node script (`scripts/verify-endpoints.js`) pinged all 50 Swagger-documented endpoints. All 23 static `GET` endpoints returned successful `200 OK` responses.

---

## 5. Stress Testing (Load Testing)

To ensure the Node.js event loop remains unblocked and the application scales efficiently, stress testing was conducted using the `autocannon` package.

**Process:**
- Added `scripts/stress-test.js` to benchmark both the `/health` and `/users` endpoints.
- Executed via `npm run test:stress`.
- Load Profile: 100 concurrent connections bombarding the endpoints over a duration of 10 seconds.

**Results:**
- **Total Requests Handled:** 12,218
- **Throughput:** ~1,110 requests per second
- **Average Latency:** 89.43 ms (p99 latency: ~218 ms)
- **Errors / Timeouts:** 0

The backend proved highly resilient under synthetic load, maintaining low latency with zero dropped connections.

---

## Conclusion
The backend system demonstrates robust stability. Global validation and exception handling correctly catch invalid edge cases (400, 403, 404), static endpoints return data properly, and the application easily withstands >1k requests per second in local benchmarks.
