/**
 * AuthContext — current user + login/logout, ported from legacy state.js
 * `window.Auth`. Replaces the global object with React context so dashboard
 * components read the signed-in user via props-down-the-tree instead of a
 * global lookup.
 */

import { createContext, useCallback, useContext, useState } from 'react';
import { getUser, clearSession } from '../api/client';

/** Role → the dashboard route that owns it. Mirrors legacy state.js's login() redirect table. */
export const ROLE_HOME = {
  superadmin: '/superadmin',
  admin: '/admin',
  head: '/admin',
  faculty: '/faculty',
  spoc: '/spoc',
  student: '/student',
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getUser());

  const login = useCallback(async (email, password) => {
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
    const { user: loggedInUser, expires_at } = data;
    // The token is NOT stored: it arrived as an httpOnly cookie. Only the
    // display profile and expiry are cached, and neither is a credential.
    localStorage.setItem('bp_user', JSON.stringify(loggedInUser));
    if (expires_at) localStorage.setItem('bp_expires_at', String(expires_at));
    setUser(loggedInUser);
    return ROLE_HOME[loggedInUser.role] || '/student';
  }, []);

  const logout = useCallback(async () => {
    try {
      // The cookie is httpOnly, so only the server can remove it.
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    } catch {
      // Server unreachable — still clear local state below.
    }
    clearSession();
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
