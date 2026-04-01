/**
 * auth.js - Authentication & Form Validation
 * Handles login validation, session creation, and role-based redirects
 */

const Auth = {
  // Regex patterns for validation
  patterns: {
    email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    studentId: /^S\d{10}$/,
    facultyId: /^FAC_\d{4}_\d{2}$/,
    adminId: /^ADMIN_[A-Z]\d{4}$/,
    superuserId: /^USR-\d{4}$/,
    password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    passwordSimple: /^.{8,}$/,
    phone: /^[6-9]\d{9}$/,
    name: /^[a-zA-Z\s]{3,50}$/
  },

  // Role configurations
  roleConfig: {
    student: {
      title: 'Student Login',
      subtitle: 'Access your academic progress & courses',
      placeholder: 'student@iiits.in',
      redirect: 'student.html',
      icon: '<svg viewBox="0 0 24 24"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>'
    },
    faculty: {
      title: 'Faculty Login',
      subtitle: 'Manage courses, assessments & students',
      placeholder: 'faculty@iiits.in',
      redirect: 'faculty.html',
      icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>'
    },
    head: {
      title: 'Academic Head Login',
      subtitle: 'View institutional reports & manage resources',
      placeholder: 'head@iiits.in',
      redirect: 'head.html',
      icon: '<svg viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>'
    },
    admin: {
      title: 'Super Admin Login',
      subtitle: 'System administration & access control',
      placeholder: 'admin@iiits.in',
      redirect: 'superuser.html',
      icon: '<svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>'
    }
  },

  // Validate form fields with regex
  validateForm(formData) {
    const errors = [];
    
    // Email validation
    if (!formData.email || !this.patterns.email.test(formData.email)) {
      errors.push({ 
        field: 'email', 
        message: 'Invalid email format. Use: name@domain.com' 
      });
    }

    // Password validation
    if (!formData.password || formData.password.length < 8) {
      errors.push({ 
        field: 'password', 
        message: 'Password must be at least 8 characters' 
      });
    }

    // Name validation (for registration forms)
    if (formData.name && !this.patterns.name.test(formData.name)) {
      errors.push({ 
        field: 'name', 
        message: 'Name must be 3-50 alphabetic characters' 
      });
    }

    // Phone validation
    if (formData.phone && !this.patterns.phone.test(formData.phone)) {
      errors.push({ 
        field: 'phone', 
        message: 'Invalid phone number. Use: 10-digit Indian mobile' 
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  // Validate field individually
  validateField(fieldId, rules) {
    const input = document.getElementById(fieldId);
    if (!input) return { isValid: true, message: '' };
    
    const value = input.value.trim();
    
    if (rules.required && !value) {
      return { isValid: false, message: 'This field is required' };
    }
    
    if (rules.type === 'email' && value && !this.patterns.email.test(value)) {
      return { isValid: false, message: 'Invalid email format' };
    }
    
    if (rules.type === 'password' && value && value.length < 8) {
      return { isValid: false, message: 'Minimum 8 characters required' };
    }
    
    if (rules.min && value.length < rules.min) {
      return { isValid: false, message: `Minimum ${rules.min} characters required` };
    }
    
    if (rules.pattern && !rules.pattern.test(value)) {
      return { isValid: false, message: rules.message || 'Invalid format' };
    }
    
    if (rules.matchId) {
      const matchInput = document.getElementById(rules.matchId);
      if (matchInput && value !== matchInput.value.trim()) {
        return { isValid: false, message: 'Values do not match' };
      }
    }
    
    return { isValid: true, message: '' };
  },

  // Create session in localStorage
  createSession(role, userData) {
    const session = {
      role: role,
      userId: userData.email,
      userName: userData.name || userData.email.split('@')[0],
      loginTime: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };
    
    localStorage.setItem('bp_session', JSON.stringify(session));
    localStorage.setItem('bp_user_role', role);
    localStorage.setItem('bp_user_data', JSON.stringify(userData));
    
    return session;
  },

  // Get current session
  getSession() {
    const session = localStorage.getItem('bp_session');
    return session ? JSON.parse(session) : null;
  },

  // Check if user is logged in
  isAuthenticated() {
    const session = this.getSession();
    if (!session) return false;
    
    // Check expiration
    if (new Date(session.expiresAt) < new Date()) {
      this.logout();
      return false;
    }
    return true;
  },

  // Get user role
  getUserRole() {
    return localStorage.getItem('bp_user_role');
  },

  // Get user data
  getUserData() {
    const data = localStorage.getItem('bp_user_data');
    return data ? JSON.parse(data) : null;
  },

  // Logout
  logout() {
    localStorage.removeItem('bp_session');
    localStorage.removeItem('bp_user_role');
    localStorage.removeItem('bp_user_data');
    window.location.href = 'login.html';
  },

  // Redirect based on role
  redirectByRole(role) {
    const config = this.roleConfig[role];
    if (config) {
      window.location.href = config.redirect;
    }
  },

  // Initialize login page
  initLoginPage() {
    const roleRadios = document.querySelectorAll('input[name="role"]');
    const formTitle = document.getElementById('formTitle');
    const formSub = document.getElementById('formSub');
    const formIcon = document.getElementById('formIcon');
    const emailInput = document.getElementById('email');
    const loginForm = document.getElementById('loginForm');

    roleRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        const role = e.target.id.replace('r-', '');
        const config = this.roleConfig[role];
        
        if (config) {
          formTitle.textContent = config.title;
          formSub.textContent = config.subtitle;
          formIcon.innerHTML = config.icon;
          emailInput.placeholder = config.placeholder;
          loginForm.dataset.redirect = config.redirect;
          loginForm.dataset.role = role;
        }
      });
    });
  },

  // Show field error
  showFieldError(fieldId, message) {
    const input = document.getElementById(fieldId);
    if (!input) return;
    
    const parent = input.closest('.field') || input.closest('.form-field');
    if (!parent) return;
    
    parent.classList.add('has-error');
    
    // Remove existing error
    const existing = parent.querySelector('.field-error');
    if (existing) existing.remove();
    
    // Add error message
    const errorSpan = document.createElement('span');
    errorSpan.className = 'field-error';
    errorSpan.textContent = message;
    parent.appendChild(errorSpan);
  },

  // Clear field error
  clearFieldError(fieldId) {
    const input = document.getElementById(fieldId);
    if (!input) return;
    
    const parent = input.closest('.field') || input.closest('.form-field');
    if (!parent) return;
    
    parent.classList.remove('has-error');
    const existing = parent.querySelector('.field-error');
    if (existing) existing.remove();
  },

  // Clear all errors in form
  clearAllErrors(formId) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    form.querySelectorAll('.has-error').forEach(el => {
      el.classList.remove('has-error');
    });
    form.querySelectorAll('.field-error').forEach(el => el.remove());
  }
};

// Export for use in other files
window.Auth = Auth;