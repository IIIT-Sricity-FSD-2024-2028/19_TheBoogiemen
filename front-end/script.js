/**
 * BarelyPassing – script.js
 * Handles: auth redirects, module gating, login and signup forms.
 * ALL rendering is delegated to fixes.js (loaded after this file).
 */

// ─── Module Gating ───────────────────────────────────────────────────────────
async function applyModuleGating() {
    const items = document.querySelectorAll('.nav-item[data-module]');
    if (!items.length) return;
    try {
        const res = await window.Auth?.apiFetch?.('/billing/colleges/me/modules');
        const modules = res?.data?.modules || [];
        items.forEach(el => {
            if (!modules.includes(el.dataset.module)) el.style.display = 'none';
        });
    } catch (e) {
        console.warn('[ModuleGating] Could not load licensed modules', e);
    }
}

// ─── Login Form Submission ───────────────────────────────────────────────────
async function handleLogin(event) {
    if (event && event.preventDefault) event.preventDefault();
    const tenantInput = document.getElementById('tenantCode');
    const emailInput  = document.getElementById('email');
    const pwInput     = document.getElementById('password');

    const email      = emailInput ? emailInput.value.trim() : '';
    const password   = pwInput ? pwInput.value : '';
    const tenantCode = tenantInput ? tenantInput.value.trim().toUpperCase() : '';

    const btn = document.getElementById('loginBtn');
    const tenantErr = document.getElementById('tenant-error');
    const pwErr = document.getElementById('password-error');

    let valid = true;

    // Mandatory Tenant Code check
    if (!tenantCode) {
        if (tenantInput) tenantInput.classList.add('error');
        if (tenantErr) {
            tenantErr.textContent = 'Institute code is required.';
            tenantErr.style.display = 'block';
        }
        valid = false;
    } else {
        if (tenantInput) tenantInput.classList.remove('error');
        if (tenantErr) tenantErr.style.display = 'none';
    }

    // Email check
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        if (emailInput) emailInput.classList.add('error');
        valid = false;
    } else {
        if (emailInput) emailInput.classList.remove('error');
    }

    // Password check
    if (!password) {
        if (pwInput) pwInput.classList.add('error');
        if (pwErr) {
            pwErr.textContent = 'Password is required.';
            pwErr.style.display = 'block';
        }
        valid = false;
    } else {
        if (pwInput) pwInput.classList.remove('error');
        if (pwErr) pwErr.style.display = 'none';
    }

    if (!valid) return;

    if (btn) { btn.textContent = 'Signing in…'; btn.disabled = true; }

    try {
        await window.Auth.login(email, password, tenantCode);
    } catch (err) {
        if (typeof showToast === 'function') {
            showToast(err.message || 'Login failed. Check your credentials.', 'error');
        } else {
            alert(err.message || 'Login failed. Check your credentials.');
        }
        if (btn) { btn.textContent = 'Sign In'; btn.disabled = false; }
    }
}

// ─── Sign Up Registration ─────────────────────────────────────────────────────
async function handleSignup(event) {
    if (event && event.preventDefault) event.preventDefault();
    const first_name = document.getElementById('firstName')?.value.trim();
    const last_name  = document.getElementById('lastName')?.value.trim();
    const email      = document.getElementById('email')?.value.trim();
    const password   = document.getElementById('password')?.value.trim();
    const role       = document.getElementById('role')?.value || 'student';
    const btn        = document.getElementById('signupBtn');
    if (!first_name || !email || !password) {
        alert('Please fill all required fields');
        return;
    }
    const username = first_name + (last_name ? ' ' + last_name : '');
    if (btn) { btn.textContent = 'Creating Account…'; btn.disabled = true; }
    try {
        const res = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, first_name, last_name, email, password, role })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Registration failed');
        alert('Account created! Please login.');
        window.location.href = 'login.html';
    } catch (err) {
        alert(err.message);
        if (btn) { btn.textContent = 'Create Account'; btn.disabled = false; }
    }
}

// ─── Role Selection (Login Page) ─────────────────────────────────────────────
function selectRole(role) {
    document.querySelectorAll('.role-option').forEach(el => el.classList.remove('active'));
    const opt = document.querySelector(`.role-option[data-role="${role}"]`);
    if (opt) opt.classList.add('active');

    // Update form header based on selected role
    const formTitle = document.getElementById('form-title-text');
    const formSubtitle = document.getElementById('form-subtitle-text');
    const emailInput = document.getElementById('email');

    const roleConfig = {
        student:               { title: 'Student Login',          subtitle: 'Access your academic progress, courses, fees and milestones', email: 'student@iiits.in' },
        faculty:               { title: 'Faculty Login',          subtitle: 'Mark attendance, enter grades and manage student progress', email: 'faculty@iiits.in' },
        head:                  { title: 'HOD / Academic Head',    subtitle: 'Manage department course allocations and review faculty reports', email: 'head@iiits.in' },
        INSTITUTE_SUPER_ADMIN: { title: 'Institute Director',    subtitle: 'Monitor institute performance, departments and academic outcomes', email: 'director@iiits.in' },
        superadmin:            { title: 'Institute Director',    subtitle: 'Monitor institute performance, departments and academic outcomes', email: 'director@iiits.in' },
        FINANCE_ADMIN:         { title: 'Finance Officer Login',  subtitle: 'Manage fee structures, dues, payment receipts and compliance', email: 'finance@iiits.in' },
        spoc:                  { title: 'Institution Partner Sign In', subtitle: "Manage your college's subscription and reach our team", email: 'spoc@example.com' }
    };

    const config = roleConfig[role] || roleConfig.student;
    if (formTitle) formTitle.textContent = config.title;
    if (formSubtitle) formSubtitle.textContent = config.subtitle;
    if (emailInput && config.email) emailInput.placeholder = config.email;
}
