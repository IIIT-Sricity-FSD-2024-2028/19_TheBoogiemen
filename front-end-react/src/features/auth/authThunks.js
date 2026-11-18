/**
 * authThunks.js — ported byte-for-byte from the pre-Redux AuthContext.jsx's
 * login()/logout(), so the facade (features/auth/useAuth.js) can stay
 * behaviorally identical. Not apiFetch(): login/logout happen before and
 * after a session exists, and apiFetch's 401-forces-logout behavior is
 * meaningless at either boundary.
 */
import { createAsyncThunk } from '@reduxjs/toolkit';
import { clearSession, apiFetch } from '../../api/client';

/** Role → the dashboard route that owns it. */
export const ROLE_HOME = {
  superadmin: '/superadmin',
  admin: '/admin',
  head: '/admin',
  faculty: '/faculty',
  spoc: '/spoc',
  student: '/student',
};

export const loginUser = createAsyncThunk('auth/login', async ({ email, password }) => {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // Required for the browser to store the Set-Cookie response.
    credentials: 'same-origin',
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      (Array.isArray(data.message) ? data.message.join(', ') : data.message) ||
      data.error ||
      'Login failed';
    throw new Error(msg);
  }
  const { user, expires_at } = data;
  // The side effect lives in the thunk, not the reducer — reducers must stay
  // pure. Same two localStorage keys the old AuthContext.jsx wrote, so a
  // page refresh reads back exactly what it wrote before. The token is NOT
  // stored here: it arrived as an httpOnly cookie.
  localStorage.setItem('bp_user', JSON.stringify(user));
  if (expires_at) localStorage.setItem('bp_expires_at', String(expires_at));
  return { user, redirectTo: ROLE_HOME[user.role] || '/student' };
});

export const logoutUser = createAsyncThunk('auth/logout', async () => {
  try {
    // The cookie is httpOnly, so only the server can remove it.
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
  } catch {
    // Server unreachable — still clear local state below.
  }
  clearSession();
});

// Authenticated mutation — apiFetch is correct here, a 401 genuinely means
// "your session died," which should force-logout.
export const changePassword = createAsyncThunk('auth/changePassword', ({ currentPassword, newPassword }) =>
  apiFetch('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  }),
);

// Pre-login flow (ForgotPasswordModal) — calls /auth/reset-password, which
// does not exist anywhere in the backend (only /auth/change-password does,
// an authenticated route). This 404s today in the pre-Redux code too; a
// pre-existing product bug, not something this migration introduces or
// fixes — ported faithfully as-is.
export const resetPassword = createAsyncThunk('auth/resetPassword', ({ email, newPassword }) =>
  apiFetch('/auth/reset-password', { method: 'POST', body: JSON.stringify({ email, new_password: newPassword }) }),
);
