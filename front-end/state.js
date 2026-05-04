/**
 * state.js — Real JWT-based Auth & API helper
 * Replaces the mock localStorage session system.
 */

const API_BASE = 'http://localhost:5001/api';

window.Auth = {

    // ── Core storage ────────────────────────────────────────────────────────
    getToken: () => localStorage.getItem('bp_token'),
    getUser:  () => {
        const u = localStorage.getItem('bp_user');
        return u ? JSON.parse(u) : null;
    },
    getCurrentUser: () => window.Auth.getUser(), // alias for legacy calls

    // ── API fetch with auth header ──────────────────────────────────────────
    apiFetch: async (endpoint, options = {}) => {
        const token = window.Auth.getToken();
        const user = window.Auth.getUser();
        const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (user) {
            headers['role'] = user.role;
            headers['user-id'] = user.user_id;
        }

        const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });

        if (res.status === 401) {
            window.Auth.logout();
            return null;
        }

        if (res.status === 403) {
            throw new Error('Access denied: insufficient permissions');
        }

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            // NestJS returns errors in data.message (or data.error for custom)
            const errMsg = (Array.isArray(data.message) ? data.message.join(', ') : data.message) || data.error || `HTTP ${res.status}`;
            throw new Error(errMsg);
        }
        return data;
    },

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

    // ── Route guard ─────────────────────────────────────────────────────────
    requireAuth: (allowedRoles = []) => {
        const user  = window.Auth.getUser();
        const token = window.Auth.getToken();

        if (!user || !token) {
            console.warn('⛔ Unauthorized — redirecting to login');
            window.location.href = 'login.html';
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
