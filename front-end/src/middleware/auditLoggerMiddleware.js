/**
 * Custom Redux Middleware: auditLoggerMiddleware
 * 
 * Responsibilities:
 * Intercepts high-level administrative actions (user management, department setup, subscription upgrades)
 * and records them to the backend audit compliance log.
 */

export const auditLoggerMiddleware = (store) => (next) => (action) => {
  const result = next(action);

  const auditActions = [
    'hierarchy/addDepartment',
    'hierarchy/assignRole',
    'subscription/upgradeTier',
    'tenant/onboardInstitute',
  ];

  if (auditActions.some((type) => action.type?.includes(type))) {
    const state = store.getState();
    const user = state.auth?.user;
    const tenant = state.tenant?.activeTenant;

    if (user && tenant) {
      fetch('/api/platform/audit-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenant.tenant_id,
          'user-id': user.user_id,
        },
        body: JSON.stringify({
          action: action.type,
          details: JSON.stringify(action.payload || {}),
        }),
      }).catch((err) => console.error('Audit logging failed:', err));
    }
  }

  return result;
};
