/**
 * state.js — JWT auth and API helper.
 *
 * Identity and role travel ONLY in the signed bearer token. The old `role` and
 * `user-id` headers are gone: the server derives both from the token's verified
 * claims, so sending them would achieve nothing and inviting them back would
 * reintroduce the bypass they caused.
 */

const API_BASE = '/api';

window.Auth = {

    // ── Core storage ────────────────────────────────────────────────────────
    /**
     * The session lives in an httpOnly cookie the browser attaches by itself,
     * so there is no token for JavaScript to read. Kept as a stub returning
     * null: callers asking "am I signed in?" are answered by the cached
     * profile, and confirmed by the server on the next request.
     */
    getToken: () => null,
    getUser:  () => {
        const u = localStorage.getItem('bp_user');
        return u ? JSON.parse(u) : null;
    },
    getCurrentUser: () => window.Auth.getUser(), // alias for legacy calls

    /**
     * Read the `exp` claim without verifying the signature.
     *
     * This is a UX affordance only — it lets us sign out before firing a request
     * we know will fail. The server is the sole authority on token validity.
     */
    getTokenExpiry: () => {
        // Was decoded from the JWT; the cookie is unreadable now, so the server
        // returns `expires_at` at login and it is cached beside the profile.
        // A timestamp, not a credential.
        const raw = localStorage.getItem('bp_expires_at');
        const at = raw ? Number(raw) : NaN;
        return Number.isFinite(at) ? at : null;
    },

    isTokenExpired: () => {
        const expiresAt = window.Auth.getTokenExpiry();
        return expiresAt !== null && Date.now() >= expiresAt;
    },

    // ── API fetch with auth header ──────────────────────────────────────────
    apiFetch: async (endpoint, options = {}) => {
        // A FormData body must NOT carry an explicit Content-Type: the browser
        // sets it itself and appends the multipart boundary, which we cannot
        // know. Forcing application/json here makes the server unable to parse
        // the upload at all.
        const isMultipart = options.body instanceof FormData;
        const headers = {
            ...(isMultipart ? {} : { 'Content-Type': 'application/json' }),
            ...(options.headers || {}),
        };

        // No Authorization header: the session cookie is httpOnly and the
        // browser attaches it on its own.
        if (window.Auth.isTokenExpired()) {
            console.warn('[Auth] Session expired — signing out.');
            await window.Auth.logout();
            return null;
        }

        const res = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers,
            // Without this, fetch omits cookies on cross-origin requests.
            credentials: 'same-origin',
        });

        // A 401 means the session is no longer valid, so we sign the user out.
        // Endpoints must NOT use 401 to report a bad value the user typed (e.g.
        // a wrong current password on the change-password form) — that would end
        // the session instead of showing an error. Log the origin so any future
        // stray 401 is traceable rather than looking like a random logout.
        if (res.status === 401) {
            console.warn(`[Auth] Session rejected by ${endpoint} — signing out.`);
            window.Auth.logout();
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
            // NestJS returns errors in data.message (or data.error for custom)
            const errMsg = (Array.isArray(data.message) ? data.message.join(', ') : data.message) || data.error || `HTTP ${res.status}`;
            throw new Error(errMsg);
        }
        return data;
    },

    /**
     * Upload one document and get back a file_id to attach to a form payload.
     *
     * Shared by every form with an attachment (leave, attendance request,
     * research milestone, assessment submission) so the size and type rules
     * are stated once. The server enforces them regardless.
     */
    uploadFile: async (file, context) => {
        if (!file) return null;
        if (file.size > window.Auth.MAX_UPLOAD_BYTES) {
            const mb = (window.Auth.MAX_UPLOAD_BYTES / 1024 / 1024).toFixed(0);
            throw new Error(`File must be under ${mb}MB`);
        }
        const form = new FormData();
        form.append('file', file);
        const res = await window.Auth.apiFetch(
            `/uploads?context=${encodeURIComponent(context)}`,
            { method: 'POST', body: form },
        );
        return res && res.data ? res.data : null;
    },

    /** Kept in step with UPLOAD_MAX_BYTES on the server. */
    MAX_UPLOAD_BYTES: 5 * 1024 * 1024,

    /**
     * Download link for an uploaded document.
     *
     * The route is authenticated and ownership-checked, so this cannot be a
     * plain <a href> — fetch it with apiFetch and open the resulting blob.
     */
    fileUrl: (fileId) => `${API_BASE}/uploads/${encodeURIComponent(fileId)}`,

    // ── Login ───────────────────────────────────────────────────────────────
    login: async (email, password) => {
        try {
            const data = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // Required for the browser to store the Set-Cookie response.
                credentials: 'same-origin',
                body: JSON.stringify({ email, password })
            });
            if (!data.ok) {
                const err = await data.json();
                const msg = Array.isArray(err.message) ? err.message.join(', ') : (err.message || err.error || 'Login failed');
                throw new Error(msg);
            }
            const { user, expires_at } = await data.json();
            // The token is NOT stored: it arrived as an httpOnly cookie. Only the
            // display profile and expiry are cached, and neither is a credential
            // — the server re-derives identity from the cookie every request.
            localStorage.setItem('bp_user', JSON.stringify(user));
            if (expires_at) localStorage.setItem('bp_expires_at', String(expires_at));

            // Redirect based on role
            const role = user.role;
            if (role === 'superadmin') {
                window.location.href = 'super-admin.html';
            } else if (role === 'admin' || role === 'head') {
                window.location.href = 'super-user.html';
            } else if (role === 'faculty') {
                window.location.href = 'faculty.html';
            } else if (role === 'spoc') {
                window.location.href = 'spoc.html';
            } else {
                window.location.href = 'student.html';
            }
            return true;
        } catch (err) {
            throw err;
        }
    },

    // ── Logout ──────────────────────────────────────────────────────────────
    logout: async () => {
        // The cookie is httpOnly, so only the server can remove it. Skipping this
        // would leave the browser holding a valid session after "signing out".
        try {
            await fetch(`${API_BASE}/auth/logout`, {
                method: 'POST',
                credentials: 'same-origin',
            });
        } catch {
            // Server unreachable — still clear local state and redirect.
        }
        localStorage.removeItem('bp_user');
        localStorage.removeItem('bp_expires_at');
        // Legacy keys from the localStorage-token era.
        localStorage.removeItem('bp_token');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('ffsd_db');
        window.location.href = 'login.html';
    },

    /**
     * Route guard — UX ONLY, NOT a security control.
     *
     * The role it checks comes from localStorage, which the user can edit. Editing
     * it lets someone *render* a dashboard they are not entitled to, but every
     * request that dashboard makes still carries their real token, so the server
     * returns 403 and the page stays empty. Never rely on this to protect data:
     * authorization lives in the backend guards.
     */
    requireAuth: (allowedRoles = []) => {
        const user = window.Auth.getUser();

        if (!user) {
            console.warn('⛔ Unauthorized — redirecting to login');
            window.location.href = 'login.html';
            return null;
        }
        if (window.Auth.isTokenExpired()) {
            console.warn('⛔ Session expired — redirecting to login');
            window.Auth.logout();
            return null;
        }
        if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
            alert('⛔ You do not have permission to view this page.');
            window.location.href = 'login.html';
            return null;
        }
        return user;
    }
};

// Convenience shorthand
window.apiFetch = window.Auth.apiFetch;
