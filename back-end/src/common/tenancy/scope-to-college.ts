/**
 * scope-to-college.ts — the one place "does this row belong to my college"
 * gets decided, for every academic collection.
 *
 * See TENANT_ISOLATION_DIAGNOSIS.md §4 for why this is call-site wrapping
 * rather than a transparent interceptor: InMemoryDbService has no query
 * layer to intercept — `this.db.students` *is* the array every controller
 * calls `.filter()`/`.find()`/`.map()` on directly, so there is no single
 * chokepoint every read passes through. Two functions, used at every one of
 * those call sites instead:
 *
 *   scopeToCollege() — list reads: "give me this college's rows."
 *   isSameCollege()  — single-record reads by id: "is this ONE row mine."
 *
 * Both treat `collegeId === null` as "see everything" — the superadmin
 * exemption. superadmin is the one role with no college_id claim
 * (jwt-payload.ts: "NULL for superadmin, the vendor operator, who belongs to
 * no single college"), the same exemption ROLE_GRANTS.superadmin already
 * gets for user management, extended consistently to data access.
 */

import { DEFAULT_COLLEGE_ID } from '../constants/college';

interface Scoped {
  college_id?: string | null;
}

export function scopeToCollege<T extends Scoped>(
  records: T[],
  collegeId: string | null,
): T[] {
  if (collegeId === null) return records;
  return records.filter((r) => r.college_id === collegeId);
}

/**
 * For a single record found by id (`@Param()`, so client-controlled) rather
 * than a list. A caller who supplies another college's id must see the
 * identical response a nonexistent id would produce — never a 403, which
 * would confirm the record exists somewhere. That is why every call site
 * using this pairs it with the same RESOURCE_NOT_FOUND a missing record
 * already throws, not a new error path.
 */
export function isSameCollege<T extends Scoped>(
  record: T | undefined | null,
  collegeId: string | null,
): boolean {
  if (!record) return false;
  if (collegeId === null) return true;
  return record.college_id === collegeId;
}

/**
 * The value to stamp onto a newly created row. Mirrors the exact fallback
 * `createUser()` already established (admin/common.controller.ts) rather
 * than introducing a second convention: an actor's own college_id when they
 * have one, DEFAULT_COLLEGE_ID (this deployment's one college) when they
 * don't — currently only superadmin, acting through a panel built for a
 * single-college deployment.
 */
export function writeCollegeId(actorCollegeId: string | null): string {
  return actorCollegeId ?? DEFAULT_COLLEGE_ID;
}
