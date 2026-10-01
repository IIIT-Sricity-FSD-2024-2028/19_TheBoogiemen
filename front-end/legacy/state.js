/**
 * state.js — B2B Multi-Tenant JWT Auth & API helper
 * Connects old semester work (student.html, faculty.html, super-admin.html)
 * with new semester B2B architecture (multi-tenant, subscription tiers, Redux frontend).
 */

const API_BASE = (function() {
    if (typeof window === 'undefined' || !window.location) return 'http://localhost:5001/api';
    if (window.API_BASE) return window.API_BASE;
    const stored = localStorage.getItem('API_BASE');
    if (stored) return stored;

    const loc = window.location;
    // If accessed over http(s)
    if (loc.protocol && loc.protocol.startsWith('http')) {
        // If served directly from backend (e.g. port 5001, 5002, 5000, 8080)
        if (loc.port && loc.port !== '3000' && loc.port !== '5173' && loc.port !== '5500') {
            return `${loc.origin}/api`;
        }
        // If served from dev static server (e.g. Vite on 3000, live-server on 5500)
        const backendPort = localStorage.getItem('backend_port') || (loc.port === '5002' ? '5002' : '5001');
        return `${loc.protocol}//${loc.hostname}:${backendPort}/api`;
    }
    return 'http://localhost:5001/api';
})();

window.formatDisplayId = function(id, type = 'general') {
    if (!id || id === 'undefined' || id === 'null' || id === '[object Object]') return 'Not available';
    const str = String(id).trim();
    if (/^[A-Z]{2,4}-[0-9]{4,}/.test(str)) return str;

    const numMatch = str.match(/\d+/);
    const numPart = numMatch ? numMatch[0] : '1';
    const padded = numPart.padStart(4, '0');
    const t = (type || '').toLowerCase();

    if (t === 'student' || t === 'stu') return 'STU-2026' + padded;
    if (t === 'faculty' || t === 'fac') return 'FAC-2026' + padded;
    if (t === 'hod' || t === 'head') return 'HOD-2026' + padded;
    if (t === 'director' || t === 'dir' || t === 'superadmin') return 'DIR-2026' + padded;
    if (t === 'finance' || t === 'fin') return 'FIN-2026' + padded;
    if (t === 'support' || t === 'sup' || t === 'platform') return 'SUP-2026' + padded;
    if (t === 'admin' || t === 'adm') return 'ADM-2026' + padded;
    if (t === 'course' || t === 'crs') return 'CRS-1' + padded;
    if (t === 'section' || t === 'sec') return 'SEC-2026' + padded;
    if (t === 'enrollment' || t === 'enr') return 'ENR-2026' + padded;
    if (t === 'request' || t === 'req' || t === 'ticket') return 'REQ-2026' + padded;
    if (t === 'leave' || t === 'lv') return 'LV-2026' + padded;
    if (t === 'fee') return 'FEE-2026' + padded;

    if (str === 'u1' || str.startsWith('u1_') || str === 'student') return 'STU-20260001';
    if (str === 'u6' || str.startsWith('u6_') || str === 'student2') return 'STU-20260002';
    if (str === 'u2' || str.startsWith('u2_') || str === 'faculty') return 'FAC-20260001';
    if (str === 'u7' || str.startsWith('u7_') || str === 'faculty2') return 'FAC-20260002';
    if (str === 'u3' || str === 'admin') return 'ADM-20260001';
    if (str === 'u4' || str === 'head') return 'HOD-20260001';
    if (str === 'u5' || str === 'director') return 'DIR-20260001';
    if (str === 'u_fin' || str.startsWith('u_fin') || str === 'finance') return 'FIN-20260001';
    if (str === 'saas_admin' || str.startsWith('u_support_') || str.startsWith('saas_')) return 'SUP-2026' + padded;
    if (str === 'c1' || str === 'c2' || str === 'c3' || str === 'c4' || str === 'c5' || str === 'c6' || str === 'c7' || str === 'c8') return 'CRS-2026' + padded;
    if (str === 'e1' || str === 'e2' || str === 'e3' || str === 'e4' || str === 'e5' || str === 'e6') return 'ENR-2026' + padded;
    if (str.startsWith('sec_')) return 'SEC-2026' + padded;

    if (/^u\d+/.test(str)) return 'USR-2026' + padded;
    return str;
};

window.formatSafeValue = function(val, fallback = 'Not available') {
    if (val === null || val === undefined || val === '' || Number.isNaN(val) || val === 'undefined' || val === 'null' || val === 'NaN' || val === '[object Object]') {
        return fallback;
    }
    return val;
};

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
            { id: '#1040', institution: 'IIT Madras', tenantId: 't3', contactEmail: 'director@iitm.ac.in', subject: 'Attendance sync delay', priority: 'Medium', status: 'Resolved', raisedAt: 'Yesterday', message: 'Attendance sync is taking longer than expected.', replies: [{ from: 'Support Portal', text: 'Optimized index query on backend. Resolved.', at: 'Yesterday' }] }
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
    replyTicket: (ticketId, replyText, fromName = 'Support Portal') => {
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
                    `Reply to Ticket ${ticketId}: ${replyText}`,
                    'ticket_reply'
                );
            }
            window.SaaSStore.logActivity(`Ticket ${ticketId} replied by ${fromName}`);
        }
    },
    resolveTicket: (ticketId, fromName = 'Support Portal') => {
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

    // ── API fetch with auth header & cookie support ────────────────────────
    apiFetch: async (endpoint, options = {}) => {
        const token  = window.Auth.getToken();
        const user   = window.Auth.getUser();
        const tenant = window.Auth.getTenant();

        const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
        if (token)          headers['Authorization'] = `Bearer ${token}`;
        if (user?.role)     headers['role']          = user.role;
        if (user?.user_id)  headers['user-id']       = user.user_id;
        if (tenant?.tenant_id) headers['x-tenant-id'] = tenant.tenant_id;

        let res;
        try {
            res = await fetch(`${API_BASE}${endpoint}`, {
                ...options,
                credentials: 'include',
                headers
            });
        } catch (netErr) {
            console.error(`[Auth API] Network failure for ${endpoint}:`, netErr);
            throw new Error(`Cannot connect to backend server at ${API_BASE}. Please verify server is running.`);
        }

        if (res.status === 401) {
            console.error(`[Auth API] 401 Unauthorized for ${endpoint}`);
            throw new Error('Authentication required (HTTP 401). Please log in again.');
        }

        if (res.status === 403) {
            console.error(`[Auth API] 403 Forbidden for ${endpoint} (role: ${user?.role || 'unknown'})`);
            throw new Error(`Permission denied (HTTP 403). Your account role cannot access ${endpoint}.`);
        }

        let data;
        try {
            data = await res.json();
        } catch (_) {
            if (!res.ok) throw new Error(`HTTP ${res.status}: Server returned an unparseable response.`);
            return {};
        }

        if (!res.ok) {
            const errMsg = data ? ((Array.isArray(data.message) ? data.message.join(', ') : data.message) || data.error || `HTTP ${res.status}`) : `HTTP ${res.status}`;
            console.error(`[Auth API] Error ${res.status} for ${endpoint}:`, errMsg);
            throw new Error(`HTTP ${res.status}: ${errMsg}`);
        }

        return data;
    },

    // ── B2B Multi-Tenant & SaaS Login ───────────────────────────────────────
    login: async (email, password, tenantCode) => {
        const cleanEmail = (email || '').trim().toLowerCase();
        const cleanPass = password || '';
        const cleanTenant = (tenantCode || 'IIITS').trim().toUpperCase();

        if (!cleanEmail) throw new Error('Please enter your email address.');
        if (!cleanPass)  throw new Error('Please enter your password.');
        if (!cleanTenant) throw new Error('Please enter your institute code.');

        // 1. Attempt API Authentication with backend
        try {
            const res = await fetch(`${API_BASE}/auth/login`, {
                method:  'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ email: cleanEmail, password: cleanPass, tenant_code: cleanTenant })
            });

            if (res.ok) {
                const payload = await res.json();
                const { token, accessToken, user } = payload;
                const activeToken = token || accessToken;
                const isPlatform = (user.role && user.role.startsWith('PLATFORM_')) || cleanEmail.includes('platform');
                const activeUser  = {
                    ...user,
                    email: cleanEmail,
                    role: user.role === 'superadmin' ? 'INSTITUTE_SUPER_ADMIN' : user.role
                };
                const activeTenant = isPlatform
                    ? { tenant_id: 'global', name: 'BarelyPassing Support Global', code: 'PLATFORM' }
                    : { tenant_id: 't1', name: cleanTenant === 'NITW' ? 'NIT Warangal' : 'IIIT Sri City', code: cleanTenant };

                localStorage.setItem('bp_token',  activeToken);
                localStorage.setItem('bp_user',   JSON.stringify(activeUser));
                localStorage.setItem('bp_role',   activeUser.role);
                localStorage.setItem('bp_tenant', JSON.stringify(activeTenant));
                localStorage.setItem('accessToken', activeToken);
                localStorage.setItem('user', JSON.stringify(activeUser));
                localStorage.setItem('tenant', JSON.stringify(activeTenant));

                const role = activeUser.role;
                if (role.startsWith('PLATFORM_') || isPlatform) {
                    window.location.href = 'saas.html';
                    return true;
                }
                if (role === 'INSTITUTE_SUPER_ADMIN' || role === 'superadmin' || role === 'admin') {
                    window.location.href = 'director.html';
                    return true;
                }
                if (role === 'DEPARTMENT_ADMIN_HOD' || role === 'head') {
                    window.location.href = 'hod.html';
                    return true;
                }
                if (role === 'faculty') {
                    window.location.href = 'faculty.html';
                    return true;
                }
                if (role === 'FINANCE_ADMIN') {
                    window.location.href = 'finance.html';
                    return true;
                }
                window.location.href = 'student.html';
                return true;
            } else {
                const errData = await res.json().catch(() => ({}));
                const errMsg = errData?.message || (Array.isArray(errData?.message) ? errData.message.join(', ') : 'Invalid email or password.');
                if (cleanEmail.includes('platform')) {
                    throw new Error(errMsg);
                }
            }
        } catch (apiErr) {
            if (cleanEmail.includes('platform')) {
                throw apiErr;
            }
            console.warn('API login request failed, falling back to local tenant auth:', apiErr);
        }

        // 4. Demo Credential Fallback Table
        const DEMO_ACCOUNTS = {
            'super@example.com':       { user_id: 'u5', name: 'Institute Director', first_name: 'Institute', last_name: 'Director', role: 'INSTITUTE_SUPER_ADMIN', dest: 'director.html' },
            'admin@example.com':       { user_id: 'u3', name: 'System Admin',       first_name: 'System', last_name: 'Admin', role: 'INSTITUTE_SUPER_ADMIN', dest: 'director.html' },
            'director@iiits.in':       { user_id: 'u5', name: 'Institute Director', first_name: 'Institute', last_name: 'Director', role: 'INSTITUTE_SUPER_ADMIN', dest: 'director.html' },
            'head@example.com':        { user_id: 'u4', name: 'Academic Head (CSE)', first_name: 'Academic', last_name: 'Head (CSE)', role: 'head', dest: 'hod.html' },
            'head@iiits.in':           { user_id: 'u4', name: 'Academic Head (CSE)', first_name: 'Academic', last_name: 'Head (CSE)', role: 'head', dest: 'hod.html' },
            'faculty@example.com':     { user_id: 'u2', name: 'Dr. Jane Smith',     first_name: 'Jane', last_name: 'Smith', role: 'faculty', dest: 'faculty.html' },
            'faculty2@example.com':    { user_id: 'u7', name: 'Robert Wilson',      first_name: 'Robert', last_name: 'Wilson', role: 'faculty', dest: 'faculty.html' },
            'faculty@iiits.in':        { user_id: 'u2', name: 'Dr. Jane Smith',     first_name: 'Jane', last_name: 'Smith', role: 'faculty', dest: 'faculty.html' },
            'student@example.com':     { user_id: 'u1', name: 'John Doe',           first_name: 'John', last_name: 'Doe', role: 'student', dest: 'student.html' },
            'student2@example.com':    { user_id: 'u6', name: 'Alice Vance',        first_name: 'Alice', last_name: 'Vance', role: 'student', dest: 'student.html' },
            'student@iiits.in':        { user_id: 'u1', name: 'John Doe',           first_name: 'John', last_name: 'Doe', role: 'student', dest: 'student.html' },
            'finance@iiits.in':        { user_id: 'u_fin', name: 'Finance Officer', first_name: 'Finance', last_name: 'Officer', role: 'FINANCE_ADMIN', dest: 'finance.html' },
        };

        const acct = DEMO_ACCOUNTS[cleanEmail];
        if (acct) {
            const user   = { user_id: acct.user_id, name: acct.name, first_name: acct.first_name, last_name: acct.last_name, username: acct.name, email: cleanEmail, role: acct.role };
            const tenant = { tenant_id: 't1', name: cleanTenant === 'NITW' ? 'NIT Warangal' : 'IIIT Sri City', code: cleanTenant };
            localStorage.setItem('bp_token',  'jwt_demo_' + Date.now());
            localStorage.setItem('bp_user',   JSON.stringify(user));
            localStorage.setItem('bp_role',   acct.role);
            localStorage.setItem('bp_tenant', JSON.stringify(tenant));
            localStorage.setItem('user',      JSON.stringify(user));
            localStorage.setItem('tenant',    JSON.stringify(tenant));
            window.location.href = acct.dest;
            return true;
        }

        throw new Error('Invalid email or password. Please verify your credentials.');
    },

    // ── Logout (clears all B2B + old keys, context-aware redirect) ────────
    logout: () => {
        const user = window.Auth.getUser();
        const pathname = (window.location.pathname || '').toLowerCase();
        const role = (user && user.role) ? user.role : (localStorage.getItem('bp_role') || '');
        const isSaaS = pathname.includes('saas') || role.startsWith('PLATFORM_');
        [
            'bp_token', 'bp_user', 'bp_role', 'bp_tenant',
            'currentUser', 'ffsd_db',
            'accessToken', 'refreshToken', 'user', 'tenant'
        ].forEach(k => localStorage.removeItem(k));
        window.location.href = isSaaS ? 'saas-login.html' : 'login.html';
    },

    // ── Route guard (works for all pages) ──────────────────────────────────
    _roleToPage: (role) => {
        if (!role) return 'login.html';
        if (role.startsWith('PLATFORM_')) return 'saas.html';
        if (role === 'INSTITUTE_SUPER_ADMIN' || role === 'superadmin' || role === 'admin') return 'director.html';
        if (role === 'FINANCE_ADMIN') return 'finance.html';
        if (role === 'DEPARTMENT_ADMIN_HOD' || role === 'head') return 'hod.html';
        if (role === 'faculty') return 'faculty.html';
        return 'student.html';
    },

    requireAuth: (allowedRoles = []) => {
        const user  = window.Auth.getUser();
        const token = window.Auth.getToken();

        if (!user) {
            console.warn('[Auth] Unauthenticated user in requireAuth');
            const pathname = (window.location.pathname || '').toLowerCase();
            window.location.href = pathname.includes('saas') ? 'saas-login.html' : 'login.html';
            return null;
        }

        // Standardize role aliases
        const userRole = user.role;
        const normalizedUserRoles = [userRole];
        if (userRole === 'superadmin' || userRole === 'admin') normalizedUserRoles.push('INSTITUTE_SUPER_ADMIN');
        if (userRole === 'INSTITUTE_SUPER_ADMIN') normalizedUserRoles.push('superadmin', 'admin');
        if (userRole === 'head') normalizedUserRoles.push('DEPARTMENT_ADMIN_HOD');
        if (userRole === 'DEPARTMENT_ADMIN_HOD') normalizedUserRoles.push('head');

        if (allowedRoles.length > 0) {
            const hasAccess = allowedRoles.some(r => normalizedUserRoles.includes(r));
            if (!hasAccess) {
                console.warn(`[Auth] Role "${userRole}" cannot access this page`);
                const pathname = (window.location.pathname || '').toLowerCase();
                window.location.href = (pathname.includes('saas') || (userRole && userRole.startsWith('PLATFORM_'))) ? 'saas-login.html' : 'login.html';
                return null;
            }
        }

        return user;
    }
};

// Convenience shorthand
window.apiFetch = window.Auth.apiFetch;
