/**
 * BarelyPassing – script.js
 * Handles: auth redirects, login form.
 * ALL rendering is delegated to fixes.js (loaded after this file).
 * DO NOT define render* functions here – they live in fixes.js only.
 */

// ─── Auth Redirects ──────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    if (path.includes('login.html') || path === '/' || path.endsWith('/')) {
        const user = window.Auth.getUser();
        if (user) {
            const role = user.role;
            if (role === 'superadmin')          window.location.href = 'super-admin.html';
            else if (role === 'admin' || role === 'head') window.location.href = 'super-user.html';
            else if (role === 'faculty')         window.location.href = 'faculty.html';
            else                                 window.location.href = 'student.html';
        }
    }
});

// ─── Module Gating ───────────────────────────────────────────────────────────
// Hides nav items whose data-module isn't in the caller's college's licensed
// module set (SPOC_BILLING_ENFORCEMENT_DIAGNOSIS.md bug 3). The real gate is
// RequiresModuleGuard on the actual API routes — this only keeps the UI from
// offering a link that would 403, so it fails open on error rather than
// hiding navigation over a transient network issue.
async function applyModuleGating() {
    const items = document.querySelectorAll('.nav-item[data-module]');
    if (!items.length) return;
    try {
        const res = await window.Auth.apiFetch('/billing/colleges/me/modules');
        const modules = res?.data?.modules || [];
        items.forEach(el => {
            if (!modules.includes(el.dataset.module)) el.style.display = 'none';
        });
    } catch (e) {
        console.warn('[ModuleGating] Could not load licensed modules', e);
    }
}

// ─── Login ───────────────────────────────────────────────────────────────────
async function handleLogin(event) {
    event.preventDefault();
    const email    = document.getElementById('email')?.value.trim();
    const password = document.getElementById('password')?.value.trim();
    const btn      = document.getElementById('loginBtn');
    
    // Email validation
    if (!email) {
        if (typeof showToast === 'function') showToast('Email is required', 'error');
        else alert('Email is required');
        return;
    }
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        if (typeof showToast === 'function') showToast('Please enter a valid email address', 'error');
        else alert('Please enter a valid email address');
        return;
    }
    
    // Password validation
    if (!password) {
        if (typeof showToast === 'function') showToast('Password is required', 'error');
        else alert('Password is required');
        return;
    }
    
    // Password strength validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
        const errorMsg = 'Password must be at least 8 characters with 1 uppercase, 1 lowercase, 1 number, and 1 special character';
        if (typeof showToast === 'function') showToast(errorMsg, 'error');
        else alert(errorMsg);
        return;
    }
    
    if (btn) { btn.textContent = 'Signing in…'; btn.disabled = true; }
    try {
        await window.Auth.login(email, password);
    } catch (err) {
        if (typeof showToast === 'function') showToast(err.message || 'Login failed', 'error');
        else alert(err.message || 'Login failed');
        if (btn) { btn.textContent = 'Sign In'; btn.disabled = false; }
    }
}

// ─── Role Selection (Login Page) ─────────────────────────────────────────────
function selectRole(role) {
    document.querySelectorAll('.role-option').forEach(el => el.classList.remove('active'));
    const opt = document.querySelector(`.role-option[data-role="${role}"]`);
    if (opt) opt.classList.add('active');
    
    // Update form based on selected role
    const formTitle = document.getElementById('form-title-text');
    const formSubtitle = document.getElementById('form-subtitle-text');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    
    // Role-specific configurations
    const roleConfig = {
        student: {
            title: 'Student Login',
            subtitle: 'Access your academic progress and course materials',
            emailPlaceholder: 'student@iiits.in',
            passwordPlaceholder: 'Min 8 chars: 1 uppercase, 1 lowercase, 1 number, 1 special'
        },
        faculty: {
            title: 'Faculty Login',
            subtitle: 'Manage courses, grades, and student assessments',
            emailPlaceholder: 'faculty@iiits.in',
            passwordPlaceholder: 'Min 8 chars: 1 uppercase, 1 lowercase, 1 number, 1 special'
        },
        head: {
            title: 'Academic Head Login',
            subtitle: 'Oversee institutional performance and user management',
            emailPlaceholder: 'head@iiits.in',
            passwordPlaceholder: 'Min 8 chars: 1 uppercase, 1 lowercase, 1 number, 1 special'
        },
        superadmin: {
            title: 'Super Admin Login',
            subtitle: 'Full system access and administrative control',
            emailPlaceholder: 'admin@iiits.in',
            passwordPlaceholder: 'Min 8 chars: 1 uppercase, 1 lowercase, 1 number, 1 special'
        },
        spoc: {
            title: 'Institution Partner Sign In',
            subtitle: "Manage your college's subscription and reach our team",
            emailPlaceholder: 'spoc@yourcollege.edu',
            passwordPlaceholder: 'Min 8 chars: 1 uppercase, 1 lowercase, 1 number, 1 special'
        }
    };
    
    const config = roleConfig[role];
    if (config) {
        if (formTitle) formTitle.textContent = config.title;
        if (formSubtitle) formSubtitle.textContent = config.subtitle;
        if (emailInput) emailInput.placeholder = config.emailPlaceholder;
        if (passwordInput) passwordInput.placeholder = config.passwordPlaceholder;
    }

    fillDemoCredentials(role);
}

// ─── Dev-only demo credentials ───────────────────────────────────────────────
//
// Picking a role fills in that actor's seeded login, so testing is
// click-role -> Sign In instead of retyping a password every time.
//
// DELETE THIS WHOLE BLOCK (and the fillDemoCredentials call above) BEFORE THE
// APP IS DEPLOYED ANYWHERE REAL.
//
// Two things keep it from becoming a credential leak in the meantime:
//   * it runs only on localhost, and
//   * the strip is built in JS, so these passwords are never written into
//     login.html — on any other host the markup does not exist at all.
//
// Verified against back-end/data/mock-db.json by bcrypt-comparing each hash.
// The seeded `admin@example.com` (u3) is deliberately absent: its digest
// matches no known password, and there is no Admin tab on this page anyway.
const DEMO_LOGINS = {
    student:    { email: 'student@example.com', password: 'Student@123' },
    faculty:    { email: 'faculty@example.com', password: 'Faculty@123' },
    head:       { email: 'head@example.com',    password: 'Head@123'    },
    superadmin: { email: 'super@example.com',   password: 'Super@123'   },
    spoc:       { email: 'spoc@example.com',    password: 'Spoc@123'    },
};

// '' covers opening the page as a file:// URL.
const IS_LOCAL_DEV = ['localhost', '127.0.0.1', ''].includes(location.hostname);

function fillDemoCredentials(role) {
    if (!IS_LOCAL_DEV) return;

    const creds = DEMO_LOGINS[role];
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    if (!creds || !emailInput || !passwordInput) return;

    emailInput.value = creds.email;
    passwordInput.value = creds.password;

    const strip = document.getElementById('demo-credentials');
    if (strip) strip.textContent = `DEV · ${creds.email} · ${creds.password}`;
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('loginForm');
    if (!IS_LOCAL_DEV || !form) return;   // not localhost, or not the login page

    const strip = document.createElement('p');
    strip.id = 'demo-credentials';
    strip.style.cssText =
        'margin:14px 0 0;padding:8px 10px;border:1px dashed #cbd5e1;border-radius:8px;' +
        'background:#f8fafc;color:#475569;font-size:12px;text-align:center;' +
        'font-family:ui-monospace,SFMono-Regular,Menlo,monospace;';
    form.appendChild(strip);

    // The Student tab is marked active in the markup, so selectRole() has not
    // run yet and the fields would otherwise start empty.
    const active = document.querySelector('.role-option.active');
    fillDemoCredentials(active?.dataset.role || 'student');
});
