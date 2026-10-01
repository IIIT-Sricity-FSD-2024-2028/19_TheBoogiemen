/** Role groups used by the shared sections to decide what to show. The server enforces them. */
export const isHodRole = (role) => role === 'head' || role === 'DEPARTMENT_ADMIN_HOD';
export const isDirectorRole = (role) => ['superadmin', 'admin', 'INSTITUTE_SUPER_ADMIN'].includes(role);
export const listOf = (data) => (Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : []);
