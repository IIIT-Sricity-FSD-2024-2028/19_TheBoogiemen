import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';
import { selectAuth } from '../../features/auth/authSlice';

/**
 * Route guard. Not signed in -> /login (remembering where the user was going).
 * Signed in with a role that doesn't belong here -> /403.
 * This only shapes navigation; the backend's RolesGuard enforces access.
 */
export default function RequireAuth({ roles, children }) {
  const { status, user, endReason } = useSelector(selectAuth);
  const location = useLocation();

  if (status !== 'authenticated') {
    // After a deliberate sign-out there is nothing to return to.
    if (endReason === 'signed-out') return <Navigate to="/login" replace />;
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/403" replace state={{ from: location.pathname }} />;
  }
  return children;
}
