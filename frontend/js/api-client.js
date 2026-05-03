// front-end/js/api-client.js
// Centralized API client — the ONLY file that knows the backend URL.
// All other files must import from here.

const BASE_URL = 'http://localhost:3000';

// Role is set once at login/session init and used on every request
let currentRole = localStorage.getItem('__session_role') || 'student';
let currentUserId = localStorage.getItem('__session_user_id') || null;

/**
 * Set session info. These two localStorage keys are the ONLY entries that survive.
 */
function setSession(role, userId) {
  currentRole = role;
  currentUserId = userId;
  localStorage.setItem('__session_role', role);
  localStorage.setItem('__session_user_id', userId);
}

/**
 * Get current session info.
 */
function getSession() {
  return { role: currentRole, userId: currentUserId };
}

/**
 * Clear the session (logout).
 */
function clearSession() {
  currentRole = 'student';
  currentUserId = null;
  localStorage.removeItem('__session_role');
  localStorage.removeItem('__session_user_id');
}

/**
 * Core request function. Sends JSON with x-user-role header.
 * Backend always returns { success, data, message }.
 */
async function request(method, path, body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-user-role': currentRole,
    },
  };
  if (body) options.body = JSON.stringify(body);

  console.log(`[API] ${method} ${BASE_URL}${path}`, body || '', `(role: ${currentRole})`);

  const res = await fetch(`${BASE_URL}${path}`, options);

  // Handle non-JSON responses gracefully
  let json;
  try {
    json = await res.json();
  } catch (_) {
    if (!res.ok) {
      console.error(`[API] ${method} ${path} → ${res.status} (no body)`);
      throw new Error(`HTTP ${res.status}`);
    }
    return null;
  }

  if (!res.ok) {
    const msg = json?.message || `HTTP ${res.status}`;
    console.error(`[API] ${method} ${path} → ${res.status}:`, json);
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
  }

  console.log(`[API] ${method} ${path} → ${res.status} ✓`, json.data ? '(has data)' : '');

  // Backend wraps in { success, data, message }
  return json.data ?? json;
}

// Convenience wrappers
const api = {
  get:    (path)         => request('GET',    path),
  post:   (path, body)   => request('POST',   path, body),
  patch:  (path, body)   => request('PATCH',  path, body),
  put:    (path, body)   => request('PUT',    path, body),
  delete: (path)         => request('DELETE', path),
};

// Make available globally (non-module scripts use these)
window.API_CLIENT = { api, setSession, getSession, clearSession };
