# Academic Management System - Backend

This is the fully implemented, fully orchestrated Next.js back-end for the Academic Management System.

## Architecture & Technology
- Framework: NestJS (TypeScript)
- Paradigm: 4-Layer Architectural System (Repository → Service → Controller → Module)
- Memory: 100% In-memory Data seeding with pre-determined UUIDs.
- Infrastructure context: Centralized exception catching, standard response payloads, strict RBAC guards.

## Feature Modules Implemented
This backend comprises exactly 10 modules constructed directly from the provided ER semantics:
1. **Fee**: Audit generation with calculated balances.
2. **Report**: Grades formatting.
3. **User**: Role-elevation operations.
4. **Attendance**: Statistical analytics with sub-75% flag alarms.
5. **Resource**: Conflict-tested schedule booking.
6. **Research**: Milestone staging and approval sequence.
7. **Forum**: Hierarchical posting across Domains & Threads.
8. **Leave**: Date-ranged attendance exemption pipeline.
9. **Assessment**: Grade publishing and course progression tracking.
10. **Outcome**: Analytical assessment performance matrix generation.

## How to Initialize
1. Ensure dependencies are fetched: `npm install`
2. Start the hot-reload developer server: `npm run start:dev`

## Accessing the Swagger API Manual
This project uses `@nestjs/swagger` connected synchronously to `main.ts` with custom document dumping.
When you run `npm run start` or `start:dev`, the entire live configuration is scraped and saved properly to `docs/swagger.json`.
Further, you can freely examine the live UI here in any browser:
> http://localhost:3000/api

## Testing Access Endpoints
All endpoints are strictly constrained by the globally activated \`RolesGuard\`.
To bypass security and impersonate actors, append the header key:
`x-user-role: "admin"` (or `student`, `faculty`, `academic_head`).
