/**
 * college.ts — the one college this deployment serves, before a second one
 * exists.
 *
 * Every current deployment of this application runs against exactly one
 * college's academic data (see the tenancy note in
 * SPOC_IMPLEMENTATION_PLAN.md §3 — full row-level isolation of the academic
 * domain across multiple colleges sharing one instance is separate, larger
 * work, not yet done). This id is what `data/mock-db.json`'s backfilled
 * `colleges` row and `002_college_platform_schema.sql`'s seed INSERT both
 * use, so it has to be the same string in all three places.
 */
export const DEFAULT_COLLEGE_ID = 'c-default';
