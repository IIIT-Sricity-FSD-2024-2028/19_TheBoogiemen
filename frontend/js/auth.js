/**
 * auth.js - Authentication & Form Validation
 * Handles login validation, session creation, and role-based redirects
 * 
 * COMPREHENSIVE REGEX-BASED VALIDATION SYSTEM
 * All patterns are tested and handle edge cases for Indian educational context
 */

// ==========================================
// GLOBAL VALIDATOR OBJECT
// Can be used across all portals for consistent validation
// ==========================================
const Validator = {
  // Comprehensive regex patterns for all validation needs
  patterns: {
    // Email: Standard institutional email format
    email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    
    // Institutional emails (iiits.in domain specific)
    institutionalEmail: /^[a-zA-Z0-9._%+-]+@(iiits\.in|university\.edu|college\.edu)$/,
    
    // Student ID: S followed by 10 digits (e.g., S20240010146)
    studentId: /^S\d{10}$/,
    
    // Faculty ID: FAC_YYYY_XX format
    facultyId: /^FAC_\d{4}_\d{2}$/,
    
    // Admin ID: ADMIN_X#### format
    adminId: /^ADMIN_[A-Z]\d{4}$/,
    
    // Super User ID: USR-#### format
    superuserId: /^USR-\d{4}$/,
    
    // User ID generic: USR-#### or USR-#####
    userId: /^USR-\d{4,5}$/,
    
    // Strong password: 8+ chars with uppercase, lowercase, number, special char
    passwordStrong: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    
    // Simple password: 8+ characters (for demo)
    passwordSimple: /^.{8,}$/,
    
    // Password with moderate strength: 8+ chars with at least letter and number
    passwordModerate: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/,
    
    // Indian phone number: 10 digits starting with 6-9
    phoneIndian: /^[6-9]\d{9}$/,
    
    // Phone with optional +91 prefix
    phoneWithCode: /^(\+91)?[6-9]\d{9}$/,
    
    // Name: 3-50 alphabetic characters with spaces
    name: /^[a-zA-Z\s]{3,50}$/,
    
    // Name with hyphens and apostrophes (e.g., Mary-Jane O'Connor)
    nameExtended: /^[a-zA-Z\s'-]{2,60}$/,
    
    // Course code: 2-5 letters followed by 3 digits (e.g., CS301)
    courseCode: /^[A-Z]{2,5}\d{3}$/,
    
    // Subject code: 2-5 letters, 3 digits, optional letter suffix
    subjectCode: /^[A-Z]{2,5}\d{3}[A-Z]?$/,
    
    // Date: YYYY-MM-DD format
    dateISO: /^\d{4}-\d{2}-\d{2}$/,
    
    // Time: HH:MM format (24-hour)
    time24: /^([01]\d|2[0-3]):[0-5]\d$/,
    
    // Time: HH:MM AM/PM format (12-hour)
    time12: /^(0?[1-9]|1[0-2]):[0-5]\d\s?(AM|PM|am|pm)$/,
    
    // Percentage: 0-100
    percentage: /^(100|[1-9]?\d(\.\d{1,2})?)%?$/,
    
    // CGPA: 0.00-10.00
    cgpa: /^([0-9](\.\d{1,2})?|10(\.0{1,2})?)$/,
    
    // Amount: Positive number with optional 2 decimal places
    amount: /^\d+(\.\d{1,2})?$/,
    
    // Indian currency format (₹ or Rs)
    currencyINR: /^(₹|Rs\.?\s?)?\d{1,3}(,\d{3})*(\.\d{2})?$/,
    
    // URL: HTTP/HTTPS
    url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
    
    // File path (basic validation)
    filePath: /^[a-zA-Z0-9_\-\.\s\\/]+$/,
    
    // File name with extension
    fileName: /^[a-zA-Z0-9_\-\s]+\.[a-zA-Z]{2,4}$/,
    
    // PDF file
    pdfFile: /^[a-zA-Z0-9_\-\s]+\.pdf$/,
    
    // Text area: 10-1000 characters
    description: /^.{10,1000}$/,
    
    // Short text: 2-100 characters
    shortText: /^.{2,100}$/,
    
    // Title: 5-200 characters
    title: /^.{5,200}$/,
    
    // ID format: alphanumeric with hyphens (e.g., BUG-001, PROJ-001)
    resourceId: /^[A-Z]{2,5}-\d{3,5}$/,
    
    // Bug ID: BUG-### format
    bugId: /^BUG-\d{3}$/,
    
    // Leave ID: numeric
    leaveId: /^\d+$/,
    
    // Status values
    status: /^(active|inactive|pending|suspended|approved|rejected|open|closed|resolved|in-progress)$/,
    
    // Role values
    role: /^(student|faculty|head|admin|superuser)$/,
    
    // Department codes
    department: /^(CSE|ECE|ME|CE|EE|IT|EEE|Civil|Mechanical|Electrical|Electronics|Computer Science)$/
  },

  // Error messages for each validation type
  messages: {
    email: 'Invalid email format. Use: name@domain.com',
    institutionalEmail: 'Please use institutional email (@iiits.in, @university.edu)',
    studentId: 'Invalid Student ID. Format: S followed by 10 digits (e.g., S20240010146)',
    facultyId: 'Invalid Faculty ID. Format: FAC_YYYY_XX (e.g., FAC_2024_01)',
    adminId: 'Invalid Admin ID. Format: ADMIN_X#### (e.g., ADMIN_A1234)',
    superuserId: 'Invalid User ID. Format: USR-#### (e.g., USR-0001)',
    userId: 'Invalid User ID format',
    passwordStrong: 'Password must be 8+ chars with uppercase, lowercase, number, and special character',
    passwordSimple: 'Password must be at least 8 characters',
    passwordModerate: 'Password must be 8+ chars with at least one letter and one number',
    phoneIndian: 'Invalid phone number. Use: 10-digit Indian mobile (e.g., 9876543210)',
    phoneWithCode: 'Invalid phone. Use: +91XXXXXXXXXX or 10-digit mobile',
    name: 'Name must be 3-50 alphabetic characters',
    nameExtended: 'Name must be 2-60 characters (letters, spaces, hyphens, apostrophes)',
    courseCode: 'Invalid course code. Format: 2-5 letters + 3 digits (e.g., CS301)',
    subjectCode: 'Invalid subject code',
    dateISO: 'Invalid date. Format: YYYY-MM-DD (e.g., 2026-03-15)',
    time24: 'Invalid time. Format: HH:MM (24-hour, e.g., 14:30)',
    time12: 'Invalid time. Format: HH:MM AM/PM (e.g., 2:30 PM)',
    percentage: 'Invalid percentage. Must be 0-100',
    cgpa: 'Invalid CGPA. Must be 0.00-10.00',
    amount: 'Invalid amount. Use: positive number with max 2 decimals',
    currencyINR: 'Invalid currency format',
    url: 'Invalid URL. Must start with http:// or https://',
    filePath: 'Invalid file path',
    fileName: 'Invalid file name. Must have extension (e.g., document.pdf)',
    pdfFile: 'Invalid file. Must be a PDF',
    description: 'Description must be 10-1000 characters',
    shortText: 'Text must be 2-100 characters',
    title: 'Title must be 5-200 characters',
    resourceId: 'Invalid ID format. Use: XXX-### (e.g., BUG-001)',
    bugId: 'Invalid Bug ID. Format: BUG-###',
    leaveId: 'Invalid Leave ID',
    status: 'Invalid status value',
    role: 'Invalid role',
    department: 'Invalid department code'
  },

  /**
   * Validate a single field against a rule set
   * @param {string} value - The value to validate
   * @param {object} rules - Validation rules
   * @returns {object} { isValid: boolean, message: string }
   */
  validateField(value, rules = {}) {
    if (!value) value = '';
    const trimmed = value.trim();

    // Required check
    if (rules.required && !trimmed) {
      return { isValid: false, message: 'This field is required' };
    }

    // Skip further validation if empty and not required
    if (!trimmed && !rules.required) {
      return { isValid: true, message: '' };
    }

    // Pattern-based validation
    if (rules.pattern) {
      const pattern = typeof rules.pattern === 'string' 
        ? this.patterns[rules.pattern] 
        : rules.pattern;
      if (pattern && !pattern.test(trimmed)) {
        return { 
          isValid: false, 
          message: rules.message || this.messages[rules.pattern] || 'Invalid format' 
        };
      }
    }

    // Type-specific validations
    if (rules.type) {
      switch (rules.type) {
        case 'email':
          if (!this.patterns.email.test(trimmed)) {
            return { isValid: false, message: rules.message || this.messages.email };
          }
          break;
        case 'institutionalEmail':
          if (!this.patterns.institutionalEmail.test(trimmed)) {
            return { isValid: false, message: rules.message || this.messages.institutionalEmail };
          }
          break;
        case 'phone':
          if (!this.patterns.phoneIndian.test(trimmed)) {
            return { isValid: false, message: rules.message || this.messages.phoneIndian };
          }
          break;
        case 'date':
          if (!this.patterns.dateISO.test(trimmed)) {
            return { isValid: false, message: rules.message || this.messages.dateISO };
          }
          // Additional date logic check
          const date = new Date(trimmed);
          if (isNaN(date.getTime())) {
            return { isValid: false, message: 'Invalid date' };
          }
          break;
        case 'time':
          if (!this.patterns.time24.test(trimmed) && !this.patterns.time12.test(trimmed)) {
            return { isValid: false, message: rules.message || this.messages.time24 };
          }
          break;
        case 'url':
          if (!this.patterns.url.test(trimmed)) {
            return { isValid: false, message: rules.message || this.messages.url };
          }
          break;
        case 'amount':
          if (!this.patterns.amount.test(trimmed)) {
            return { isValid: false, message: rules.message || this.messages.amount };
          }
          break;
        case 'percentage':
          const pct = parseFloat(trimmed.replace('%', ''));
          if (isNaN(pct) || pct < 0 || pct > 100) {
            return { isValid: false, message: rules.message || this.messages.percentage };
          }
          break;
        case 'cgpa':
          const cgpa = parseFloat(trimmed);
          if (isNaN(cgpa) || cgpa < 0 || cgpa > 10) {
            return { isValid: false, message: rules.message || this.messages.cgpa };
          }
          break;
        case 'name':
          if (!this.patterns.nameExtended.test(trimmed)) {
            return { isValid: false, message: rules.message || this.messages.nameExtended };
          }
          break;
        case 'password':
          if (rules.strength === 'strong') {
            if (!this.patterns.passwordStrong.test(trimmed)) {
              return { isValid: false, message: rules.message || this.messages.passwordStrong };
            }
          } else if (rules.strength === 'moderate') {
            if (!this.patterns.passwordModerate.test(trimmed)) {
              return { isValid: false, message: rules.message || this.messages.passwordModerate };
            }
          } else {
            if (!this.patterns.passwordSimple.test(trimmed)) {
              return { isValid: false, message: rules.message || this.messages.passwordSimple };
            }
          }
          break;
      }
    }

    // Length validations
    if (rules.min && trimmed.length < rules.min) {
      return { isValid: false, message: `Minimum ${rules.min} characters required` };
    }
    if (rules.max && trimmed.length > rules.max) {
      return { isValid: false, message: `Maximum ${rules.max} characters allowed` };
    }

    // Numeric range validations
    if (rules.minValue !== undefined) {
      const num = parseFloat(trimmed);
      if (isNaN(num) || num < rules.minValue) {
        return { isValid: false, message: `Value must be at least ${rules.minValue}` };
      }
    }
    if (rules.maxValue !== undefined) {
      const num = parseFloat(trimmed);
      if (isNaN(num) || num > rules.maxValue) {
        return { isValid: false, message: `Value must not exceed ${rules.maxValue}` };
      }
    }

    // Date range validations
    if (rules.minDate) {
      const inputDate = new Date(trimmed);
      const minDate = new Date(rules.minDate);
      if (inputDate < minDate) {
        return { isValid: false, message: `Date must be on or after ${rules.minDate}` };
      }
    }
    if (rules.maxDate) {
      const inputDate = new Date(trimmed);
      const maxDate = new Date(rules.maxDate);
      if (inputDate > maxDate) {
        return { isValid: false, message: `Date must be on or before ${rules.maxDate}` };
      }
    }

    // Match field validation (for confirm password, etc.)
    if (rules.matchId) {
      const matchInput = document.getElementById(rules.matchId);
      if (matchInput && trimmed !== matchInput.value.trim()) {
        return { isValid: false, message: rules.message || 'Values do not match' };
      }
    }

    // Custom validator function
    if (typeof rules.validator === 'function') {
      const result = rules.validator(trimmed);
      if (result !== true) {
        return { isValid: false, message: result || 'Invalid value' };
      }
    }

    return { isValid: true, message: '' };
  },

  /**
   * Validate multiple fields at once
   * @param {Array} fields - Array of { id, rules } objects
   * @returns {object} { isValid: boolean, errors: Array }
   */
  validateFields(fields) {
    const errors = [];
    
    fields.forEach(field => {
      const input = document.getElementById(field.id);
      if (!input) {
        console.warn(`Validator: Element with id '${field.id}' not found`);
        return;
      }

      const value = input.value;
      const result = this.validateField(value, field.rules);

      if (!result.isValid) {
        errors.push({
          fieldId: field.id,
          fieldName: field.name || field.id,
          message: result.message
        });
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Display validation errors on the form
   * @param {Array} errors - Array of error objects
   */
  showErrors(errors) {
    errors.forEach(error => {
      const input = document.getElementById(error.fieldId);
      if (!input) return;

      const parent = input.closest('.form-field') || input.closest('.field');
      if (!parent) return;

      parent.classList.add('has-error');

      // Remove existing error
      const existing = parent.querySelector('.field-error');
      if (existing) existing.remove();

      // Add error message
      const errorSpan = document.createElement('span');
      errorSpan.className = 'field-error';
      errorSpan.textContent = error.message;
      parent.appendChild(errorSpan);
    });
  },

  /**
   * Clear all validation errors from a form/modal
   * @param {string} containerId - ID of the container (modal or form)
   */
  clearErrors(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.querySelectorAll('.has-error').forEach(el => {
      el.classList.remove('has-error');
    });
    container.querySelectorAll('.field-error').forEach(el => el.remove());
  },

  /**
   * Clear error from a specific field
   * @param {string} fieldId - ID of the field
   */
  clearFieldError(fieldId) {
    const input = document.getElementById(fieldId);
    if (!input) return;

    const parent = input.closest('.form-field') || input.closest('.field');
    if (!parent) return;

    parent.classList.remove('has-error');
    const existing = parent.querySelector('.field-error');
    if (existing) existing.remove();
  },

  /**
   * Enable real-time validation on input
   * @param {string} fieldId - ID of the input field
   * @param {object} rules - Validation rules
   */
  enableRealTimeValidation(fieldId, rules) {
    const input = document.getElementById(fieldId);
    if (!input) return;

    // Clear error on input
    input.addEventListener('input', () => {
      this.clearFieldError(fieldId);
    });

    // Validate on blur
    input.addEventListener('blur', () => {
      const value = input.value;
      const result = this.validateField(value, rules);
      
      if (!result.isValid) {
        const parent = input.closest('.form-field') || input.closest('.field');
        if (parent) {
          parent.classList.add('has-error');
          const errorSpan = document.createElement('span');
          errorSpan.className = 'field-error';
          errorSpan.textContent = result.message;
          parent.appendChild(errorSpan);
        }
      }
    });
  }
};

// Export Validator globally
window.Validator = Validator;

// ==========================================
// SESSION HELPERS
// ==========================================
function getCurrentUser() {
    const userStr = sessionStorage.getItem('currentUser');
    return userStr ? JSON.parse(userStr) : null;
}

function setCurrentUser(user) {
    sessionStorage.setItem('currentUser', JSON.stringify(user));
}

function clearCurrentUser() {
    sessionStorage.removeItem('currentUser');
}

window.getCurrentUser = getCurrentUser;
window.setCurrentUser = setCurrentUser;
window.clearCurrentUser = clearCurrentUser;

// ==========================================
// LEGACY AUTH OBJECT (for backward compatibility)
// ==========================================
const Auth = {
  // Regex patterns for validation (alias to Validator.patterns)
  patterns: Validator.patterns,

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

// ==========================================
// UNIVERSAL FORM VALIDATION HELPER
// This function is designed to work with all existing portal forms
// while adding comprehensive regex-based validation
// ==========================================

/**
 * Universal validateForm function for all portals
 * Maintains backward compatibility while adding regex validation
 * 
 * @param {string} modalId - ID of the modal/form container
 * @param {Array} config - Array of field configurations
 *   Each config: { id, required, type, min, max, pattern, message, minDate, maxDate }
 * @returns {boolean} - true if valid, false otherwise
 * 
 * Usage Examples:
 * 
 * // Basic validation (backward compatible)
 * validateForm('modalLeave', [
 *   { id: 'l-type', required: true },
 *   { id: 'l-start', required: true },
 *   { id: 'l-end', required: true },
 *   { id: 'l-reason', required: true, min: 10 }
 * ]);
 * 
 * // With type validation
 * validateForm('modalAddUser', [
 *   { id: 'u-name', required: true, min: 3, type: 'name' },
 *   { id: 'u-email', required: true, type: 'email' },
 *   { id: 'u-role', required: true }
 * ]);
 * 
 * // With date range validation
 * validateForm('modalLeave', [
 *   { id: 'l-start', required: true, type: 'date' },
 *   { id: 'l-end', required: true, type: 'date', minDate: document.getElementById('l-start').value }
 * ]);
 */
function validateForm(modalId, config) {
  // Clear previous errors
  Validator.clearErrors(modalId);
  
  let isValid = true;
  const errors = [];

  config.forEach(field => {
    const input = document.getElementById(field.id);
    if (!input) {
      console.warn(`validateForm: Element '${field.id}' not found`);
      return;
    }

    const value = input.value.trim();
    let errorMessage = '';

    // Build validation rules
    const rules = {
      required: field.required || false,
      min: field.min,
      max: field.max,
      message: field.message
    };

    // Add type-based validation
    if (field.type) {
      rules.type = field.type;
    }

    // Add pattern validation (string reference or regex)
    if (field.pattern) {
      rules.pattern = field.pattern;
    }

    // Add date range validation
    if (field.minDate) {
      rules.minDate = field.minDate;
    }
    if (field.maxDate) {
      rules.maxDate = field.maxDate;
    }

    // Add match validation (for confirm password)
    if (field.matchId) {
      rules.matchId = field.matchId;
    }

    // Add custom validator
    if (typeof field.validator === 'function') {
      rules.validator = field.validator;
    }

    // Validate the field
    const result = Validator.validateField(value, rules);

    if (!result.isValid) {
      isValid = false;
      errors.push({
        fieldId: field.id,
        message: result.message
      });
    }
  });

  // Display all errors
  if (errors.length > 0) {
    Validator.showErrors(errors);
  }

  return isValid;
}

// Export globally for all portals to use
window.validateForm = validateForm;