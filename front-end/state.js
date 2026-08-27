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

        const res = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            credentials: 'include',
            headers
        }).catch(() => null);

        if (!res) {
            return {};
        }

        if (res.status === 401) {
            console.warn(`[Auth API] 401 for ${endpoint} - continuing session with fallback data`);
            return {};
        }
        if (res.status === 403) {
            console.warn(`[Auth API] 403 for ${endpoint} - permission denied`);
            return {};
        }

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            const errMsg = (Array.isArray(data.message) ? data.message.join(', ') : data.message)
                || data.error || `HTTP ${res.status}`;
            console.warn(`[Auth API] Error ${res.status} for ${endpoint}:`, errMsg);
            return data || {};
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

        // 1. SaaS Central Platform Credentials
        if (cleanEmail === 'saasadmin@platform.com' || cleanEmail === 'saasadmin' || cleanEmail === 'admin@platform.com') {
            const user = { user_id: 'saas_admin_1', name: 'SaaS Platform Admin', email: 'saasadmin@platform.com', role: 'PLATFORM_SUPER_ADMIN' };
            const tenant = { tenant_id: 'global', name: 'BarelyPassing SaaS Global', code: 'PLATFORM' };
            localStorage.setItem('bp_token', 'jwt_saas_super_' + Date.now());
            localStorage.setItem('bp_user', JSON.stringify(user));
            localStorage.setItem('bp_tenant', JSON.stringify(tenant));
            localStorage.setItem('user', JSON.stringify(user));
            localStorage.setItem('tenant', JSON.stringify(tenant));
            window.location.href = 'saas.html';
            return true;
        }

        if (cleanEmail === 'sales@platform.com') {
            const user = { user_id: 'saas_sales_1', name: 'SaaS Sales Lead', email: 'sales@platform.com', role: 'PLATFORM_SALES_SUPPORT' };
            const tenant = { tenant_id: 'global', name: 'BarelyPassing SaaS Global', code: 'PLATFORM' };
            localStorage.setItem('bp_token', 'jwt_saas_sales_' + Date.now());
            localStorage.setItem('bp_user', JSON.stringify(user));
            localStorage.setItem('bp_tenant', JSON.stringify(tenant));
            localStorage.setItem('user', JSON.stringify(user));
            localStorage.setItem('tenant', JSON.stringify(tenant));
            window.location.href = 'saas.html';
            return true;
        }

        if (cleanEmail === 'support@platform.com') {
            const user = { user_id: 'saas_tech_1', name: 'Technical Support', email: 'support@platform.com', role: 'PLATFORM_TECH_SUPPORT' };
            const tenant = { tenant_id: 'global', name: 'BarelyPassing SaaS Global', code: 'PLATFORM' };
            localStorage.setItem('bp_token', 'jwt_saas_tech_' + Date.now());
            localStorage.setItem('bp_user', JSON.stringify(user));
            localStorage.setItem('bp_tenant', JSON.stringify(tenant));
            localStorage.setItem('user', JSON.stringify(user));
            localStorage.setItem('tenant', JSON.stringify(tenant));
            window.location.href = 'saas.html';
            return true;
        }

        // 2. Finance Admin Role
        if (cleanEmail === 'finance@iiits.in' || cleanEmail.startsWith('finance@')) {
            const user = { user_id: 'u_fin1', name: 'Finance Officer', email: cleanEmail, role: 'FINANCE_ADMIN' };
            const tenant = { tenant_id: 't1', name: 'IIIT Sri City', code: cleanTenant };
            localStorage.setItem('bp_token', 'jwt_fin_' + Date.now());
            localStorage.setItem('bp_user', JSON.stringify(user));
            localStorage.setItem('bp_tenant', JSON.stringify(tenant));
            localStorage.setItem('user', JSON.stringify(user));
            localStorage.setItem('tenant', JSON.stringify(tenant));
            window.location.href = 'finance.html';
            return true;
        }

        // Backend login mapping helper for seamless API authentication
        let apiEmail = cleanEmail;
        let apiPass  = cleanPass;

        if (cleanEmail === 'student@iiits.in')  { apiEmail = 'student@example.com'; apiPass = 'Student@123'; }
        if (cleanEmail === 'faculty@iiits.in')  { apiEmail = 'faculty@example.com'; apiPass = 'Faculty@123'; }
        if (cleanEmail === 'head@iiits.in')     { apiEmail = 'head@example.com';    apiPass = 'Head@123'; }
        if (cleanEmail === 'director@iiits.in') { apiEmail = 'super@example.com';   apiPass = 'Super@123'; }

        // 3. Attempt API Authentication with backend
        try {
            const res = await fetch(`${API_BASE}/auth/login`, {
                method:  'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ email: apiEmail, password: apiPass, tenant_code: cleanTenant })
            });

            if (res.ok) {
                const payload = await res.json();
                const { token, accessToken, user } = payload;
                const activeToken = token || accessToken || ('jwt_' + Date.now());
                const activeUser  = {
                    ...user,
                    email: cleanEmail,
                    role: user.role === 'superadmin' ? 'INSTITUTE_SUPER_ADMIN' : user.role
                };
                const activeTenant = { tenant_id: 't1', name: cleanTenant === 'NITW' ? 'NIT Warangal' : 'IIIT Sri City', code: cleanTenant };

                localStorage.setItem('bp_token',  activeToken);
                localStorage.setItem('bp_user',   JSON.stringify(activeUser));
                localStorage.setItem('bp_tenant', JSON.stringify(activeTenant));
                localStorage.setItem('accessToken', activeToken);
                localStorage.setItem('user', JSON.stringify(activeUser));
                localStorage.setItem('tenant', JSON.stringify(activeTenant));

                const role = activeUser.role;
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
                window.location.href = 'student.html';
                return true;
            }
        } catch (apiErr) {
            console.warn('API login request failed, falling back to local tenant auth:', apiErr);
        }

        // 4. Demo Credential Fallback Table
        const DEMO_ACCOUNTS = {
            'super@example.com':       { user_id: 'u5', name: 'Super Admin', role: 'INSTITUTE_SUPER_ADMIN', dest: 'director.html' },
            'admin@example.com':       { user_id: 'u3', name: 'Admin',       role: 'INSTITUTE_SUPER_ADMIN', dest: 'director.html' },
            'director@iiits.in':       { user_id: 'u_dir', name: 'Institute Director', role: 'INSTITUTE_SUPER_ADMIN', dest: 'director.html' },
            'head@example.com':        { user_id: 'u4', name: 'Academic Head', role: 'head', dest: 'hod.html' },
            'head@iiits.in':           { user_id: 'u_hod', name: 'Academic Head (CSE)', role: 'head', dest: 'hod.html' },
            'faculty@example.com':     { user_id: 'u2', name: 'Dr. Jane Smith', role: 'faculty', dest: 'faculty.html' },
            'faculty2@example.com':    { user_id: 'u7', name: 'Robert Wilson', role: 'faculty', dest: 'faculty.html' },
            'faculty@iiits.in':        { user_id: 'u_fac', name: 'Faculty (IIITS)', role: 'faculty', dest: 'faculty.html' },
            'student@example.com':     { user_id: 'u1', name: 'John Doe', role: 'student', dest: 'student.html' },
            'student2@example.com':    { user_id: 'u6', name: 'Alice Vance', role: 'student', dest: 'student.html' },
            'student@iiits.in':        { user_id: 'u_stu', name: 'Student (IIITS)', role: 'student', dest: 'student.html' },
            'finance@iiits.in':        { user_id: 'u_fin', name: 'Finance Officer', role: 'FINANCE_ADMIN', dest: 'finance.html' },
        };

        const acct = DEMO_ACCOUNTS[cleanEmail];
        if (acct) {
            const user   = { user_id: acct.user_id, name: acct.name, email: cleanEmail, role: acct.role };
            const tenant = { tenant_id: 't1', name: cleanTenant === 'NITW' ? 'NIT Warangal' : 'IIIT Sri City', code: cleanTenant };
            localStorage.setItem('bp_token',  'jwt_demo_' + Date.now());
            localStorage.setItem('bp_user',   JSON.stringify(user));
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
        const isSaaS = user && (user.role === 'PLATFORM_SUPER_ADMIN' || user.role === 'PLATFORM_SALES_SUPPORT' || user.role === 'PLATFORM_TECH_SUPPORT');
        [
            'bp_token', 'bp_user', 'bp_tenant',
            'currentUser', 'ffsd_db',
            'accessToken', 'refreshToken', 'user', 'tenant'
        ].forEach(k => localStorage.removeItem(k));
        window.location.href = isSaaS ? 'saas-login.html' : 'login.html';
    },

    // ── Route guard (works for all pages) ──────────────────────────────────
    _roleToPage: (role) => {
        if (!role) return 'login.html';
        if (role === 'PLATFORM_SUPER_ADMIN' || role === 'PLATFORM_SALES_SUPPORT' || role === 'PLATFORM_TECH_SUPPORT') return 'saas.html';
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
            console.warn('⛔ Unauthenticated user in requireAuth');
            window.location.href = 'login.html';
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
                console.warn(`⛔ Role "${userRole}" cannot access this page`);
                window.location.href = 'login.html';
                return null;
            }
        }

        return user;
    }
};

// Convenience shorthand
window.apiFetch = window.Auth.apiFetch;
