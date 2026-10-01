import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { InMemoryDbService } from '../database/in-memory-db.service';
import { AuthenticatedUser } from '../auth/jwt-payload';
import { ErrorCode, errorBody } from '../common/errors/error-codes';
import { isHod } from './roles';

/**
 * Who is asking, and which slice of data they may touch.
 *
 * Every campus record carries `college_id`. A request only ever sees records
 * of the caller's own college (from the verified JWT, never from a header).
 * An HOD is further limited to their department. Records of another college
 * are reported as "not found" rather than "forbidden", so ids cannot be probed.
 */
export interface CampusScope {
  userId: string;
  email?: string;
  role: string;
  collegeId: string;
  departmentId: string | null;
  user: any;
}

export function campusScope(db: InMemoryDbService, claims: AuthenticatedUser): CampusScope {
  const user =
    db.users.find((u) => u.user_id === claims.sub && (!claims.email || u.email === claims.email)) ??
    db.users.find((u) => u.user_id === claims.sub);
  const collegeId = user?.college_id ?? claims.college_id ?? null;
  if (!user || !collegeId) {
    throw new ForbiddenException(
      errorBody(ErrorCode.INSUFFICIENT_ROLE, 'This account is not linked to an institute.'),
    );
  }
  if (user.status === 'inactive') {
    throw new ForbiddenException(errorBody(ErrorCode.INSUFFICIENT_ROLE, 'This account has been deactivated.'));
  }
  return {
    userId: user.user_id,
    email: user.email,
    role: user.role,
    collegeId,
    departmentId: user.department_id ?? null,
    user,
  };
}

/** Rows of the caller's college. */
export function inCollege<T extends { college_id?: string }>(scope: CampusScope, rows: T[]): T[] {
  return rows.filter((r) => r.college_id === scope.collegeId);
}

/** Rows of the caller's college, and of their department when the caller is an HOD. */
export function inReach<T extends { college_id?: string; department_id?: string | null }>(scope: CampusScope, rows: T[]): T[] {
  const own = inCollege(scope, rows);
  if (!isHod(scope.role)) return own;
  return own.filter((r) => r.department_id === scope.departmentId);
}

/** Finds one record of the caller's college or throws 404. */
export function findInCollege<T extends { college_id?: string }>(
  scope: CampusScope,
  rows: T[],
  predicate: (row: T) => boolean,
  what = 'Record',
): T {
  const row = rows.find((r) => r.college_id === scope.collegeId && predicate(r));
  if (!row) throw new NotFoundException(errorBody(ErrorCode.RESOURCE_NOT_FOUND, `${what} not found`));
  return row;
}

/** HODs may only act inside their own department. */
export function assertDepartment(scope: CampusScope, departmentId: string | null | undefined) {
  if (isHod(scope.role) && departmentId !== scope.departmentId) {
    throw new ForbiddenException(
      errorBody(ErrorCode.INSUFFICIENT_ROLE, 'This belongs to another department.'),
    );
  }
}
