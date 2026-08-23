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
    getToken: () => localStorage.getItem('bp_token'),
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
        const token = window.Auth.getToken();
        if (!token) return null;
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
        } catch { return null; }
    },

    isTokenExpired: () => {
        const expiresAt = window.Auth.getTokenExpiry();
        return expiresAt !== null && Date.now() >= expiresAt;
    },

    // ── API fetch with auth header ──────────────────────────────────────────
    apiFetch: async (endpoint, options = {}) => {
        const token = window.Auth.getToken();

        // A FormData body must NOT carry an explicit Content-Type: the browser
        // sets it itself and appends the multipart boundary, which we cannot
        // know. Forcing application/json here makes the server unable to parse
        // the upload at all.
        const isMultipart = options.body instanceof FormData;
        const headers = {
            ...(isMultipart ? {} : { 'Content-Type': 'application/json' }),
            ...(options.headers || {}),
        };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        // Expired tokens are rejected locally so the user gets a clean sign-out
        // rather than a failed action followed by a redirect.
        if (token && window.Auth.isTokenExpired()) {
            console.warn('[Auth] Token expired — signing out.');
            window.Auth.logout();
            return null;
        }

        const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });

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
                body: JSON.stringify({ email, password })
            });
            if (!data.ok) {
                const err = await data.json();
                const msg = Array.isArray(err.message) ? err.message.join(', ') : (err.message || err.error || 'Login failed');
                throw new Error(msg);
            }
            const { token, user } = await data.json();
            localStorage.setItem('bp_token', token);
            localStorage.setItem('bp_user',  JSON.stringify(user));

            // Redirect based on role
            const role = user.role;
            if (role === 'superadmin') {
                window.location.href = 'super-admin.html';
            } else if (role === 'admin' || role === 'head') {
                window.location.href = 'super-user.html';
            } else if (role === 'faculty') {
                window.location.href = 'faculty.html';
            } else {
                window.location.href = 'student.html';
            }
            return true;
        } catch (err) {
            throw err;
        }
    },

    // ── Logout ──────────────────────────────────────────────────────────────
    logout: () => {
        localStorage.removeItem('bp_token');
        localStorage.removeItem('bp_user');
        // Also clear old mock data keys
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
        const user  = window.Auth.getUser();
        const token = window.Auth.getToken();

        if (!user || !token) {
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
