/**
 * state.js — B2B Multi-Tenant JWT Auth & API helper
 * Connects old semester work (student.html, faculty.html, super-admin.html)
 * with new semester B2B architecture (multi-tenant, subscription tiers, Redux frontend).
 */

const API_BASE = (typeof window !== 'undefined' && window.location && (window.location.port === '5001' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
    ? `${window.location.protocol}//${window.location.hostname}:5001/api`
    : 'http://localhost:5001/api';

// ── Interlinked SaaS Support, Onboarding & Activity Sync Store ─────────────
window.SaaSStore = {
    getTickets: () => {
        try {
            const raw = localStorage.getItem('bp_support_tickets');
            if (raw) return JSON.parse(raw);
        } catch (e) {}
        // Default initial tickets
        return [
            { id: '#1042', institution: 'IIIT Sricity', tenantId: 't1', contactEmail: 'director@iiits.in', subject: 'Grade import system inquiry', priority: 'High', status: 'In Progress', raisedAt: '2 hours ago', message: 'We need assistance configuring automated end-of-semester grade imports for EE department.', replies: [] },
            { id: '#1041', institution: 'VIT Vellore', tenantId: 't2', contactEmail: 'admin@vit.ac.in', subject: 'Cannot access fee compliance portal', priority: 'Medium', status: 'Open', raisedAt: '5 hours ago', message: 'Faculty users report a 403 error when updating hostel fee compliance.', replies: [] },
            { id: '#1040', institution: 'IIT Madras', tenantId: 't3', contactEmail: 'director@iitm.ac.in', subject: 'Attendance sync delay', priority: 'Medium', status: 'Resolved', raisedAt: 'Yesterday', message: 'Attendance sync is taking longer than expected.', replies: [{ from: 'SaaS Support', text: 'Optimized index query on backend. Resolved.', at: 'Yesterday' }] }
        ];
    },
    saveTickets: (tickets) => {
        localStorage.setItem('bp_support_tickets', JSON.stringify(tickets));
    },
    addTicket: (ticket) => {
        const list = window.SaaSStore.getTickets();
        const newTicket = {
            id: '#' + Math.floor(1000 + Math.random() * 9000),
            institution: ticket.institution || 'IIIT Sricity',
            tenantId: ticket.tenantId || 't1',
            contactEmail: ticket.contactEmail || 'director@iiits.in',
            subject: ticket.subject,
            priority: ticket.priority || 'Medium',
            status: 'Open',
            raisedAt: 'Just now',
            message: ticket.message,
            replies: []
        };
        list.unshift(newTicket);
        window.SaaSStore.saveTickets(list);
        window.SaaSStore.logActivity(`New Support Ticket ${newTicket.id} created by ${newTicket.contactEmail} (${newTicket.institution})`);
        return newTicket;
    },
    replyTicket: (ticketId, replyText, fromName = 'SaaS Support') => {
        const list = window.SaaSStore.getTickets();
        const t = list.find(x => x.id === ticketId);
        if (t) {
            t.replies.push({ from: fromName, text: replyText, at: 'Just now' });
            t.status = 'In Progress';
            window.SaaSStore.saveTickets(list);
            
            // Broadcast notification to institute user
            if (window.Notifications && window.Notifications.broadcast) {
                window.Notifications.broadcast(
                    'all',
                    fromName,
                    `💬 Reply to Ticket ${ticketId}: ${replyText}`,
                    'ticket_reply'
                );
            }
            window.SaaSStore.logActivity(`Ticket ${ticketId} replied by ${fromName}`);
        }
    },
    resolveTicket: (ticketId, fromName = 'SaaS Support') => {
        const list = window.SaaSStore.getTickets();
        const t = list.find(x => x.id === ticketId);
        if (t) {
            t.status = 'Resolved';
            window.SaaSStore.saveTickets(list);
            window.SaaSStore.logActivity(`Ticket ${ticketId} marked Resolved by ${fromName}`);
        }
    },
    getOnboardingRequests: () => {
        try {
            const raw = localStorage.getItem('bp_onboarding_requests');
            if (raw) return JSON.parse(raw);
        } catch (e) {}
        return [
            { id: 'ob_1', institution: 'Amrita University', name: 'Dr. Rajesh Kumar', email: 'admin@amrita.edu', role: 'Director', plan: 'Enterprise', size: '5,000+ students', submitted: 'Today', status: 'Pending' },
            { id: 'ob_2', institution: 'SRM University', name: 'Prof. Ananya Roy', email: 'it@srmuniv.ac.in', role: 'IT Head', plan: 'Professional', size: '2,000 students', submitted: 'Yesterday', status: 'Pending' }
        ];
    },
    saveOnboardingRequests: (reqs) => {
        localStorage.setItem('bp_onboarding_requests', JSON.stringify(reqs));
    },
    addOnboardingRequest: (req) => {
        const list = window.SaaSStore.getOnboardingRequests();
        const item = { 
            id: 'ob_' + Date.now(), 
            status: 'Pending', 
            submitted: 'Just now',
            role: req.role || 'Director / Administrator',
            ...req 
        };
        list.unshift(item);
        window.SaaSStore.saveOnboardingRequests(list);
        window.SaaSStore.logActivity(`New Institution Registered: "${req.institution}" (${req.email}, Plan: ${req.plan || 'Professional'})`);
        return item;
    },
    addLead: (req) => {
        return window.SaaSStore.addOnboardingRequest(req);
    },
    getActivityLogs: () => {
        try {
            const raw = localStorage.getItem('bp_activity_logs');
            if (raw) return JSON.parse(raw);
        } catch (e) {}
        return [
            { time: '14:30:12', user: 'director@iiits.in', tenant: 'IIIT Sricity (t1)', action: 'LoggedIn', ip: '192.168.1.42' },
            { time: '14:28:05', user: 'saasadmin@platform.com', tenant: 'SaaS Global', action: 'Reviewed Subscriptions', ip: '10.0.0.1' },
            { time: '14:15:22', user: 'head@iiits.in', tenant: 'IIIT Sricity (t1)', action: 'Updated Course Allocations', ip: '192.168.1.18' },
            { time: '13:55:00', user: 'faculty@iiits.in', tenant: 'IIIT Sricity (t1)', action: 'Uploaded EndSem Grades', ip: '192.168.1.88' }
        ];
    },
    logActivity: (action, userOverride) => {
        try {
            const logs = window.SaaSStore.getActivityLogs();
            const u = userOverride || (window.Auth.getUser() ? window.Auth.getUser().email : 'System');
            const tenant = (window.Auth.getUser() && window.Auth.getUser().tenant_id) || 'global';
            const now = new Date().toLocaleTimeString();
            logs.unshift({ time: now, user: u, tenant: tenant === 't1' ? 'IIIT Sricity (t1)' : tenant, action: action, ip: '127.0.0.1' });
            if (logs.length > 50) logs.pop();
            localStorage.setItem('bp_activity_logs', JSON.stringify(logs));
        } catch (e) {}
    }
};

window.Auth = {

    // ── Core storage ────────────────────────────────────────────────────────
    getToken:  () => localStorage.getItem('bp_token'),
    getUser:   () => {
        const u = localStorage.getItem('bp_user');
        return u ? JSON.parse(u) : null;
    },
    getTenant: () => {
        const t = localStorage.getItem('bp_tenant');
        return t ? JSON.parse(t) : null;
    },
    getCurrentUser: () => window.Auth.getUser(), // alias for legacy calls

    // ── API fetch with auth header ──────────────────────────────────────────
    apiFetch: async (endpoint, options = {}) => {
        const token  = window.Auth.getToken();
        const user   = window.Auth.getUser();
        const tenant = window.Auth.getTenant();

        const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
        if (token)          headers['Authorization'] = `Bearer ${token}`;
        if (user?.role)     headers['role']          = user.role;
        if (user?.user_id)  headers['user-id']       = user.user_id;
        if (tenant?.tenant_id) headers['x-tenant-id'] = tenant.tenant_id;

        const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });

        if (res.status === 401) {
            window.Auth.logout();
            return null;
        }
        if (res.status === 403) {
            throw new Error('Access denied: insufficient permissions for your role');
        }

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            const errMsg = (Array.isArray(data.message) ? data.message.join(', ') : data.message)
                || data.error || `HTTP ${res.status}`;
            throw new Error(errMsg);
        }
        return data;
    },

    // ── B2B Multi-Tenant Login ──────────────────────────────────────────────
    login: async (email, password, tenantCode) => {
        try {
            const res = await fetch(`${API_BASE}/auth/login`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ email, password, tenant_code: tenantCode || 'IIITS' })
            });

            if (!res.ok) {
                const err = await res.json();
                const msg = Array.isArray(err.message)
                    ? err.message.join(', ')
                    : (err.message || err.error || 'Login failed');
                throw new Error(msg);
            }

            const payload = await res.json();
            const { token, accessToken, user, tenant } = payload;

            // Store tokens and user context (B2B multi-tenant aware)
            localStorage.setItem('bp_token',  token || accessToken);
            localStorage.setItem('bp_user',   JSON.stringify(user));
            if (tenant) localStorage.setItem('bp_tenant', JSON.stringify(tenant));

            // Also write keys that the new React/Redux index.html reads
            localStorage.setItem('accessToken', token || accessToken);
            localStorage.setItem('user',        JSON.stringify(user));
            if (tenant) localStorage.setItem('tenant', JSON.stringify(tenant));

            // ── Backend Role-Based Redirection Matrix ──
            const role = user?.role;

            // New B2B Platform-Level Roles → SaaS portal
            if (role === 'PLATFORM_SUPER_ADMIN' || role === 'PLATFORM_SALES_SUPPORT' || role === 'PLATFORM_TECH_SUPPORT') {
                window.location.href = 'saas.html';
                return true;
            }

            // Level 1: Institute Director
            if (role === 'INSTITUTE_SUPER_ADMIN' || role === 'superadmin' || role === 'admin') {
                window.location.href = 'director.html';
                return true;
            }

            // Finance Officer (separate portal)
            if (role === 'FINANCE_ADMIN') {
                window.location.href = 'finance.html';
                return true;
            }

            // Level 2: HOD
            if (role === 'DEPARTMENT_ADMIN_HOD' || role === 'head') {
                window.location.href = 'hod.html';
                return true;
            }

            // Level 3: Faculty
            if (role === 'faculty') {
                window.location.href = 'faculty.html';
                return true;
            }

            // Level 4: Student (default)
            window.location.href = 'student.html';
            return true;

        } catch (err) {
            throw err;
        }
    },

    // ── Logout (clears all B2B + old keys, context-aware redirect) ────────
    logout: () => {
        const user = window.Auth.getUser();
        const isSaaS = user && (user.role === 'PLATFORM_SUPER_ADMIN' || user.role === 'PLATFORM_SALES_SUPPORT' || user.role === 'PLATFORM_TECH_SUPPORT');
        [
            'bp_token', 'bp_user', 'bp_tenant',
            'currentUser', 'ffsd_db',
            'accessToken', 'refreshToken', 'user', 'tenant'
        ].forEach(k => localStorage.removeItem(k));
        window.location.href = isSaaS ? 'saas-login.html' : 'login.html';
    },

    // ── Route guard (works for all pages) ──────────────────────────────────
    // Maps a role to its correct dashboard page
    _roleToPage: (role) => {
        if (!role) return 'login.html';
        if (role === 'PLATFORM_SUPER_ADMIN' || role === 'PLATFORM_SALES_SUPPORT' || role === 'PLATFORM_TECH_SUPPORT') return 'saas.html';
        if (role === 'INSTITUTE_SUPER_ADMIN' || role === 'superadmin' || role === 'admin') return 'director.html';
        if (role === 'DEPARTMENT_ADMIN_HOD' || role === 'head') return 'hod.html';
        if (role === 'faculty') return 'faculty.html';
        return 'student.html'; // Level 4 default
    },

    // ── Full-page access denied screen (no close, auto-redirects to login) ──
    _showAccessDenied: (message) => {
        // Wipe out whatever partial page was rendered
        document.documentElement.style.cssText = 'margin:0;padding:0;height:100%;';
        document.body.innerHTML = `
            <div id="access-denied-screen" style="
                display:flex;align-items:center;justify-content:center;
                min-height:100vh;background:#0f172a;
                font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
                margin:0;padding:24px;box-sizing:border-box;">
                <div style="
                    background:#1e293b;border:1px solid #ef444433;border-radius:20px;
                    padding:52px 48px;max-width:480px;width:100%;text-align:center;
                    box-shadow:0 0 60px #ef44441a;">
                    <div style="
                        width:80px;height:80px;border-radius:50%;
                        background:linear-gradient(135deg,#ef4444,#b91c1c);
                        display:flex;align-items:center;justify-content:center;
                        margin:0 auto 28px;font-size:36px;
                        box-shadow:0 8px 32px #ef444440;">⛔</div>
                    <h1 style="color:#f8fafc;font-size:24px;font-weight:700;margin:0 0 12px;">
                        Access Denied
                    </h1>
                    <p style="color:#94a3b8;font-size:15px;line-height:1.6;margin:0 0 32px;">
                        ${message || 'You do not have permission to view this page.'}
                    </p>
                    <div style="
                        background:#0f172a;border-radius:12px;padding:16px 24px;
                        margin-bottom:28px;">
                        <p style="color:#64748b;font-size:13px;margin:0 0 6px;">
                            Redirecting to login in
                        </p>
                        <p style="color:#ef4444;font-size:36px;font-weight:800;margin:0;
                            line-height:1;" id="access-denied-countdown">5</p>
                    </div>
                    <p style="color:#475569;font-size:12px;margin:0;">
                        You will be sent back to the login page automatically.
                    </p>
                </div>
            </div>`;

        const user = window.Auth.getUser();
        const isSaaS = (user && (user.role === 'PLATFORM_SUPER_ADMIN' || user.role === 'PLATFORM_SALES_SUPPORT' || user.role === 'PLATFORM_TECH_SUPPORT')) || (typeof window !== 'undefined' && window.location.pathname.includes('saas'));
        const targetLogin = isSaaS ? 'saas-login.html' : 'login.html';

        // ── Clear ALL session data immediately so no page can bounce back ──
        [
            'bp_token', 'bp_user', 'bp_tenant',
            'accessToken', 'refreshToken', 'user', 'tenant',
            'currentUser', 'ffsd_db'
        ].forEach(k => localStorage.removeItem(k));

        // Countdown timer — no way to dismiss
        let secs = 5;
        const el = document.getElementById('access-denied-countdown');
        const iv = setInterval(() => {
            secs--;
            if (el) el.textContent = secs;
            if (secs <= 0) {
                clearInterval(iv);
                // Use replace() so the back button won't return to the denied page
                window.location.replace(targetLogin);
            }
        }, 1000);
    },


    requireAuth: (allowedRoles = []) => {
        const user  = window.Auth.getUser();
        const token = window.Auth.getToken();

        // Not logged in at all → show denied screen then go to login
        if (!user || !token) {
            console.warn('⛔ Unauthenticated — redirecting to login');
            window.Auth._showAccessDenied('You are not logged in. Please sign in to continue.');
            return null;
        }

        // Role doesn't match this page → show denied screen then go to login
        if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
            console.warn(`⛔ Role "${user.role}" cannot access this page`);
            window.Auth._showAccessDenied(
                `Your account role (<strong style="color:#f87171">${user.role}</strong>) ` +
                `does not have access to this page.`
            );
            return null;
        }

        return user;
    }
};

// Convenience shorthand
window.apiFetch = window.Auth.apiFetch;
