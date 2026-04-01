/**
 * login.js - Login Page Scripts
 * BarelyPassing - Academic Progress & Outcome Tracking
 */

document.addEventListener('DOMContentLoaded', function() {
  const roleData = {
    student: {
      title: 'Student Login',
      subtitle: 'Access your academic progress & courses',
      icon: '<svg viewBox="0 0 24 24"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>',
      placeholder: 'student@iiits.in',
      redirect: 'student.html'
    },
    faculty: {
      title: 'Faculty Login',
      subtitle: 'Manage courses, assessments & students',
      icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>',
      placeholder: 'faculty@iiits.in',
      redirect: 'faculty.html'
    },
    head: {
      title: 'Academic Head Login',
      subtitle: 'View institutional reports & manage resources',
      icon: '<svg viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>',
      placeholder: 'head@iiits.in',
      redirect: 'head.html'
    },
    admin: {
      title: 'Super Admin Login',
      subtitle: 'System administration & access control',
      icon: '<svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
      placeholder: 'admin@iiits.in',
      redirect: 'superuser.html'
    }
  };

  function switchForm(role) {
    const data = roleData[role];
    if (!data) return;

    // Update form content
    document.getElementById('formTitle').textContent = data.title;
    document.getElementById('formSub').textContent = data.subtitle;
    document.getElementById('formIcon').innerHTML = data.icon;
    document.getElementById('email').placeholder = data.placeholder;

    // Store redirect target
    document.getElementById('loginForm').dataset.redirect = data.redirect;
    document.getElementById('loginForm').dataset.role = role;

    // Update active card
    document.querySelectorAll('.rs-card').forEach(c => c.classList.remove('active'));
    const activeCard = document.querySelector('.rs-label[for="r-' + role + '"] .rs-card');
    if (activeCard) activeCard.classList.add('active');
  }

  function validateForm(cfg) {
    document.querySelectorAll('.field').forEach(f => f.classList.remove('has-error'));
    document.querySelectorAll('.field-error').forEach(e => e.remove());
    let ok = true;
    cfg.forEach(f => {
      const inp = document.getElementById(f.id);
      const val = inp.value.trim();
      let err = '';
      if(f.required && !val) err = 'This field is required';
      else if(f.type === 'email' && val && !/^\S+@\S+\.\S+$/.test(val)) err = 'Invalid email format';
      if(err) {
        ok = false;
        const parent = inp.closest('.field');
        parent.classList.add('has-error');
        const span = document.createElement('span');
        span.className = 'field-error';
        span.textContent = err;
        parent.appendChild(span);
      }
    });
    return ok;
  }

  function handleLogin(event) {
    event.preventDefault();
    const ok = validateForm([
      { id: 'email', required: true, type: 'email' },
      { id: 'password', required: true }
    ]);
    if (!ok) return;

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const selectedRole = document.getElementById('loginForm').dataset.role || 'student';

    // Authenticate user
    const user = authenticateUser(email, password);
    
    if (!user) {
      // Show error
      const passwordField = document.getElementById('password').closest('.field');
      passwordField.classList.add('has-error');
      const span = document.createElement('span');
      span.className = 'field-error';
      span.textContent = 'Invalid email or password';
      passwordField.appendChild(span);
      return;
    }

    // Check if role matches
    if (user.role !== selectedRole && !(selectedRole === 'admin' && user.role === 'superuser')) {
      const emailField = document.getElementById('email').closest('.field');
      emailField.classList.add('has-error');
      const span = document.createElement('span');
      span.className = 'field-error';
      span.textContent = `This account is for ${user.role}, not ${selectedRole}`;
      emailField.appendChild(span);
      return;
    }

    // Store user session
    setCurrentUser(user);

    // Redirect to appropriate portal
    const redirect = getRedirectForRole(user.role);
    window.location.href = redirect;
  }

  // Add event listeners
  document.querySelector('.rs-label[for="r-student"]').addEventListener('click', () => switchForm('student'));
  document.querySelector('.rs-label[for="r-faculty"]').addEventListener('click', () => switchForm('faculty'));
  document.querySelector('.rs-label[for="r-head"]').addEventListener('click', () => switchForm('head'));
  document.querySelector('.rs-label[for="r-admin"]').addEventListener('click', () => switchForm('admin'));

  // Set default
  document.getElementById('r-student').checked = true;
  switchForm('student');

  // Make handleLogin available globally
  window.handleLogin = handleLogin;
});
