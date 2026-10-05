/**
 * client.js — session read helpers and the authenticated fetch wrapper.
 *
 * Ported from the legacy front-end/state.js `window.Auth`. The session itself
 * lives in an httpOnly cookie the browser attaches on its own; nothing here
 * ever holds a token. Only the display profile and its expiry are cached,
 * for "am I signed in" UI checks — the server is the sole authority.
 */

const API_BASE = '/api';

export function getUser() {
  const raw = localStorage.getItem('bp_user');
  return raw ? JSON.parse(raw) : null;
}

export function getTokenExpiry() {
  const raw = localStorage.getItem('bp_expires_at');
  const at = raw ? Number(raw) : NaN;
  return Number.isFinite(at) ? at : null;
}

export function isTokenExpired() {
  const expiresAt = getTokenExpiry();
  return expiresAt !== null && Date.now() >= expiresAt;
}

export function clearSession() {
  localStorage.removeItem('bp_user');
  localStorage.removeItem('bp_expires_at');
}

/**
 * A 401/expired session forces a hard navigation rather than an in-SPA
 * redirect, matching the legacy app's own `Auth.logout()` — there is no
 * React state left worth preserving once the session is gone.
 */
function forceLogout(reason) {
  console.warn(`[Auth] ${reason} — signing out.`);
  clearSession();
  window.location.href = '/login';
}

export async function apiFetch(endpoint, options = {}) {
  // A FormData body must NOT carry an explicit Content-Type: the browser
  // sets it itself and appends the multipart boundary, which we cannot know.
  const isMultipart = options.body instanceof FormData;
  const headers = {
    ...(isMultipart ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {}),
  };

  if (isTokenExpired()) {
    forceLogout('Session expired');
    return null;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    // Without this, fetch omits cookies on cross-origin requests.
    credentials: 'same-origin',
  });

  // A 401 means the session is no longer valid. Endpoints must NOT use 401
  // to report a bad value the user typed — that would end the session
  // instead of showing an error.
  if (res.status === 401) {
    forceLogout(`Session rejected by ${endpoint}`);
    return null;
  }

  // 403 = authenticated but not permitted. Must NOT sign the user out —
  // being refused one action does not invalidate the session.
  if (res.status === 403) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || 'Access denied: insufficient permissions');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // NestJS returns errors in data.message (or data.error for custom ones).
    const errMsg =
      (Array.isArray(data.message) ? data.message.join(', ') : data.message) ||
      data.error ||
      `HTTP ${res.status}`;
    throw new Error(errMsg);
  }
  return data;
}
