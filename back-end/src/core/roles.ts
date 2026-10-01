/**
 * Role groups used across the campus modules. Role strings come from the
 * verified JWT (auth/jwt-payload.ts); several legacy aliases map to the same
 * job, so checks go through these groups instead of raw strings.
 */
export const STUDENT = 'student';
export const FACULTY = 'faculty';
export const HOD_ROLES = ['head', 'DEPARTMENT_ADMIN_HOD'] as const;
export const DIRECTOR_ROLES = ['superadmin', 'admin', 'INSTITUTE_SUPER_ADMIN'] as const;
export const FINANCE_ROLES = ['FINANCE_ADMIN'] as const;
export const SPOC = 'spoc';
export const PLATFORM_ROLES = [
  'PLATFORM_SUPER_ADMIN',
  'PLATFORM_SUPPORT_MANAGER',
  'PLATFORM_TECH_SUPPORT',
  'PLATFORM_SUPPORT_AGENT',
  'PLATFORM_SALES_SUPPORT',
] as const;

/** Roles that manage a whole college (settings, people, reports). */
export const COLLEGE_ADMIN_ROLES = [...DIRECTOR_ROLES, SPOC] as const;
/** Every role that belongs to a college (has a college_id). */
export const CAMPUS_ROLES = [STUDENT, FACULTY, ...HOD_ROLES, ...DIRECTOR_ROLES, ...FINANCE_ROLES, SPOC] as const;
/** Staff who can raise support tickets for their college. */
export const TICKET_RAISER_ROLES = [...HOD_ROLES, ...DIRECTOR_ROLES, ...FINANCE_ROLES, SPOC] as const;

export const isHod = (role: string) => (HOD_ROLES as readonly string[]).includes(role);
export const isDirector = (role: string) => (DIRECTOR_ROLES as readonly string[]).includes(role);
export const isFinance = (role: string) => (FINANCE_ROLES as readonly string[]).includes(role);
export const isCollegeAdmin = (role: string) => (COLLEGE_ADMIN_ROLES as readonly string[]).includes(role);
export const isPlatform = (role: string) => (PLATFORM_ROLES as readonly string[]).includes(role);

/** Normalised role for display and ID formats. */
export function roleKind(role: string): 'student' | 'faculty' | 'hod' | 'director' | 'finance' | 'spoc' | 'support' | 'other' {
  if (role === STUDENT) return 'student';
  if (role === FACULTY) return 'faculty';
  if (isHod(role)) return 'hod';
  if (isDirector(role)) return 'director';
  if (isFinance(role)) return 'finance';
  if (role === SPOC) return 'spoc';
  if (isPlatform(role)) return 'support';
  return 'other';
}
