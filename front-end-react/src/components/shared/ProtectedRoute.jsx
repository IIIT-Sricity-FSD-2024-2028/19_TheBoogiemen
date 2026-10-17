/**
 * ProtectedRoute — ported from legacy state.js `Auth.requireAuth(roles)`.
 *
 * UX guard only, NOT a security control. The role it checks comes from
 * localStorage, which the user can edit. Editing it lets someone *render* a
 * dashboard they are not entitled to, but every request that dashboard
 * makes still carries their real session cookie, so the server returns 403
 * and the page stays empty. Authorization lives in the backend guards.
 */

import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ roles = [], children }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (roles.length > 0 && !roles.includes(user.role)) {
    console.warn('Blocked: user role not permitted on this route', user.role, roles);
    return <Navigate to="/login" replace />;
  }
  return children;
}
