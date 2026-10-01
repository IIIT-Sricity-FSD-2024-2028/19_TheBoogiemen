/**
 * Which portal each backend role uses. The backend's RolesGuard is the real
 * access control; this map only decides where to send a user and which
 * client routes to show them.
 */
export const PORTALS = {
  student: { path: '/student', label: 'Student', roles: ['student'] },
  faculty: { path: '/faculty', label: 'Faculty', roles: ['faculty'] },
  hod: { path: '/hod', label: 'Head of Department', roles: ['head', 'DEPARTMENT_ADMIN_HOD'] },
  director: { path: '/director', label: 'Director', roles: ['superadmin', 'admin', 'INSTITUTE_SUPER_ADMIN'] },
  finance: { path: '/finance', label: 'Finance', roles: ['FINANCE_ADMIN'] },
  spoc: { path: '/spoc', label: 'Institute SPOC', roles: ['spoc'] },
  support: {
    path: '/support',
    label: 'Platform Support',
    roles: ['PLATFORM_SUPER_ADMIN', 'PLATFORM_SUPPORT_MANAGER', 'PLATFORM_TECH_SUPPORT', 'PLATFORM_SUPPORT_AGENT', 'PLATFORM_SALES_SUPPORT'],
  },
};

export function portalForRole(role) {
  return Object.values(PORTALS).find((p) => p.roles.includes(role)) || null;
}

export function homeForRole(role) {
  return portalForRole(role)?.path || '/403';
}

const ROLE_LABELS = {
  student: 'Student',
  faculty: 'Faculty',
  head: 'Head of Department',
  DEPARTMENT_ADMIN_HOD: 'Head of Department',
  superadmin: 'Director',
  INSTITUTE_SUPER_ADMIN: 'Director',
  admin: 'Administrator',
  FINANCE_ADMIN: 'Finance Officer',
  spoc: 'Institute SPOC',
  PLATFORM_SUPER_ADMIN: 'Platform Super Admin',
  PLATFORM_SUPPORT_MANAGER: 'Support Manager',
  PLATFORM_TECH_SUPPORT: 'Technical Support',
  PLATFORM_SUPPORT_AGENT: 'Support Agent',
  PLATFORM_SALES_SUPPORT: 'Sales Support',
};

export const roleLabel = (role) => ROLE_LABELS[role] || 'User';
