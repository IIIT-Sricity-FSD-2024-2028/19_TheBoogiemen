/**
 * validation.js - Centralized Form Validation with Regex Patterns
 * BarelyPassing - Academic Progress & Outcome Tracking
 * 
 * Provides comprehensive regex-based validation for all forms across all portals.
 * All validation functions return { isValid: boolean, message: string }
 */

const Validator = {
  // =====================================================
  // REGEX PATTERNS
  // =====================================================
  patterns: {
    // Email: standard format with domain validation
    email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    
    // Phone: Indian 10-digit mobile number (starts with 6-9)
    phone: /^[6-9]\d{9}$/,
    
    // Phone with country code
    phoneWithCode: /^(\+91)?[6-9]\d{9}$/,
    
    // Name: 2-50 characters, letters and spaces only (no numbers/special chars)
    name: /^[a-zA-Z\s]{2,50}$/,
    
    // Name with apostrophes and hyphens (e.g., "Mary-Jane O'Connor")
    nameExtended: /^[a-zA-Z\s'\-]{2,60}$/,
    
    // Password: min 8 chars, at least 1 uppercase, 1 lowercase, 1 number, 1 special char
    password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    
    // Password simple: min 8 chars (for basic validation)
    passwordSimple: /^.{8,}$/,
    
    // Date: YYYY-MM-DD format
    date: /^\d{4}-\d{2}-\d{2}$/,
    
    // Date with slashes: DD/MM/YYYY or MM/DD/YYYY
    dateSlash: /^\d{1,2}\/\d{1,2}\/\d{4}$/,
    
    // Time: HH:MM format (24-hour)
    time: /^([01]\d|2[0-3]):[0-5]\d$/,
    
    // Time with seconds: HH:MM:SS
    timeSeconds: /^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/,
    
    // Student ID: S followed by 10 digits (e.g., S2024001014)
    studentId: /^S\d{10}$/,
    
    // Faculty ID: FAC_YYYY_NN format
    facultyId: /^FAC_\d{4}_\d{2}$/,
    
    // Admin ID: ADMIN_XNNNN format
    adminId: /^ADMIN_[A-Z]\d{4}$/,
    
    // Superuser ID: USR-NNNN format
    superuserId: /^USR-\d{4}$/,
    
    // Course Code: 2-5 letters followed by 3 digits (e.g., CS301)
    courseCode: /^[A-Z]{2,5}\d{3}$/,
    
    // Roll Number: alphanumeric, 5-15 characters
    rollNumber: /^[A-Z0-9]{5,15}$/,
    
    // Title: 3-100 characters, letters, numbers, spaces, basic punctuation
    title: /^[a-zA-Z0-9\s\-_.,'"]{3,100}$/,
    
    // Description: min 10 characters, allows most printable chars
    description: /^[\s\S]{10,2000}$/,
    
    // Reason/Justification: min 15 characters
    reason: /^[\s\S]{15,500}$/,
    
    // URL: http/https links
    url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
    
    // File path (basic)
    filePath: /^[a-zA-Z0-9_\-\.\s\\/]+$/,
    
    // Amount: positive number (for fees)
    amount: /^\d+$/,
    
    // Percentage: 0-100
    percentage: /^([0-9]|[1-9][0-9]|100)$/,
    
    // Venue name: letters, numbers, spaces
    venue: /^[a-zA-Z0-9\s\-]{3,50}$/,
    
    // Event type: letters only
    eventType: /^[a-zA-Z]{3,20}$/,
    
    // Resource capacity: positive integer
    capacity: /^[1-9]\d*$/,
    
    // Bug severity
    severity: /^(Low|Medium|High|Critical)$/,
    
    // Status values
    status: /^(active|inactive|pending|suspended|available|occupied|maintenance)$/,
    
    // Role values
    role: /^(student|faculty|head|admin|superuser)$/
  },

  // =====================================================
  // VALIDATION RULES
  // =====================================================
  rules: {
    // Email validation
    email(value) {
      if (!value) return { isValid: false, message: 'Email is required' };
      if (!this.patterns.email.test(value)) return { isValid: false, message: 'Invalid email format (e.g., name@domain.com)' };
      return { isValid: true, message: '' };
    },

    // Password strength validation
    password(value) {
      if (!value) return { isValid: false, message: 'Password is required' };
      if (value.length < 8) return { isValid: false, message: 'Password must be at least 8 characters' };
      if (!/(?=.*[a-z])/.test(value)) return { isValid: false, message: 'Password must contain at least one lowercase letter' };
      if (!/(?=.*[A-Z])/.test(value)) return { isValid: false, message: 'Password must contain at least one uppercase letter' };
      if (!/(?=.*\d)/.test(value)) return { isValid: false, message: 'Password must contain at least one number' };
      if (!/(?=.*[@$!%*?&])/.test(value)) return { isValid: false, message: 'Password must contain at least one special character (@$!%*?&)' };
      return { isValid: true, message: '' };
    },

    // Simple password (length only)
    passwordSimple(value, minLength = 8) {
      if (!value) return { isValid: false, message: 'Password is required' };
      if (value.length < minLength) return { isValid: false, message: `Password must be at least ${minLength} characters` };
      return { isValid: true, message: '' };
    },

    // Name validation (letters and spaces only)
    name(value) {
      if (!value) return { isValid: false, message: 'Name is required' };
      if (value.trim().length < 2) return { isValid: false, message: 'Name must be at least 2 characters' };
      if (!this.patterns.nameExtended.test(value)) return { isValid: false, message: 'Name can only contain letters, spaces, apostrophes, and hyphens' };
      return { isValid: true, message: '' };
    },

    // Phone number validation (Indian mobile)
    phone(value) {
      if (!value) return { isValid: false, message: 'Phone number is required' };
      const cleanValue = value.replace(/[\s\-\+]/g, '');
      if (!this.patterns.phone.test(cleanValue) && !this.patterns.phoneWithCode.test(value)) {
        return { isValid: false, message: 'Invalid phone number (10-digit Indian mobile required)' };
      }
      return { isValid: true, message: '' };
    },

    // Date validation (YYYY-MM-DD)
    date(value) {
      if (!value) return { isValid: false, message: 'Date is required' };
      if (!this.patterns.date.test(value)) return { isValid: false, message: 'Invalid date format (use YYYY-MM-DD)' };
      
      // Check if date is valid (e.g., not 2024-99-99)
      const dateObj = new Date(value);
      if (isNaN(dateObj.getTime())) return { isValid: false, message: 'Invalid date' };
      
      return { isValid: true, message: '' };
    },

    // Date in future validation
    dateInFuture(value, fieldName = 'Date') {
      const result = this.date(value);
      if (!result.isValid) return result;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const inputDate = new Date(value);
      
      if (inputDate < today) return { isValid: false, message: `${fieldName} must be in the future` };
      return { isValid: true, message: '' };
    },

    // Date range validation (end date must be after start date)
    dateRange(startDate, endDate) {
      if (!startDate || !endDate) return { isValid: false, message: 'Both dates are required' };
      
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return { isValid: false, message: 'Invalid date format' };
      }
      
      if (end < start) return { isValid: false, message: 'End date must be after start date' };
      
      // Optional: limit range to 30 days for leave
      const diffDays = (end - start) / (1000 * 60 * 60 * 24);
      if (diffDays > 30) return { isValid: false, message: 'Leave duration cannot exceed 30 days' };
      
      return { isValid: true, message: '' };
    },

    // Time validation (HH:MM)
    time(value) {
      if (!value) return { isValid: false, message: 'Time is required' };
      if (!this.patterns.time.test(value)) return { isValid: false, message: 'Invalid time format (use HH:MM, 24-hour)' };
      return { isValid: true, message: '' };
    },

    // Required field with optional min length
    required(value, fieldName = 'This field', minLength = 0) {
      if (!value || value.trim() === '') return { isValid: false, message: `${fieldName} is required` };
      if (minLength > 0 && value.trim().length < minLength) {
        return { isValid: false, message: `${fieldName} must be at least ${minLength} characters` };
      }
      return { isValid: true, message: '' };
    },

    // Title validation
    title(value) {
      if (!value) return { isValid: false, message: 'Title is required' };
      if (value.trim().length < 3) return { isValid: false, message: 'Title must be at least 3 characters' };
      if (value.trim().length > 100) return { isValid: false, message: 'Title cannot exceed 100 characters' };
      if (!this.patterns.title.test(value)) return { isValid: false, message: 'Title contains invalid characters' };
      return { isValid: true, message: '' };
    },

    // Description validation
    description(value, minChars = 10, maxChars = 2000) {
      if (!value) return { isValid: false, message: 'Description is required' };
      if (value.trim().length < minChars) return { isValid: false, message: `Description must be at least ${minChars} characters` };
      if (value.trim().length > maxChars) return { isValid: false, message: `Description cannot exceed ${maxChars} characters` };
      return { isValid: true, message: '' };
    },

    // Reason/Justification validation
    reason(value) {
      if (!value) return { isValid: false, message: 'Reason is required' };
      if (value.trim().length < 15) return { isValid: false, message: 'Please provide a detailed reason (minimum 15 characters)' };
      if (value.trim().length > 500) return { isValid: false, message: 'Reason cannot exceed 500 characters' };
      return { isValid: true, message: '' };
    },

    // Amount validation (positive number)
    amount(value) {
      if (!value) return { isValid: false, message: 'Amount is required' };
      if (!this.patterns.amount.test(value.toString())) return { isValid: false, message: 'Amount must be a positive number' };
      const num = parseInt(value, 10);
      if (num <= 0) return { isValid: false, message: 'Amount must be greater than zero' };
      return { isValid: true, message: '' };
    },

    // Capacity validation
    capacity(value) {
      if (!value) return { isValid: false, message: 'Capacity is required' };
      if (!this.patterns.capacity.test(value.toString())) return { isValid: false, message: 'Capacity must be a positive number' };
      const num = parseInt(value, 10);
      if (num < 1) return { isValid: false, message: 'Capacity must be at least 1' };
      if (num > 10000) return { isValid: false, message: 'Capacity cannot exceed 10000' };
      return { isValid: true, message: '' };
    },

    // Percentage validation (0-100)
    percentage(value) {
      if (!value) return { isValid: false, message: 'Percentage is required' };
      if (!this.patterns.percentage.test(value.toString())) return { isValid: false, message: 'Percentage must be between 0 and 100' };
      return { isValid: true, message: '' };
    },

    // URL validation
    url(value) {
      if (!value) return { isValid: false, message: 'URL is required' };
      if (!this.patterns.url.test(value)) return { isValid: false, message: 'Invalid URL format (must start with http:// or https://)' };
      return { isValid: true, message: '' };
    },

    // Student ID validation
    studentId(value) {
      if (!value) return { isValid: false, message: 'Student ID is required' };
      if (!this.patterns.studentId.test(value)) return { isValid: false, message: 'Invalid Student ID format (e.g., S2024001014)' };
      return { isValid: true, message: '' };
    },

    // Faculty ID validation
    facultyId(value) {
      if (!value) return { isValid: false, message: 'Faculty ID is required' };
      if (!this.patterns.facultyId.test(value)) return { isValid: false, message: 'Invalid Faculty ID format (e.g., FAC_2024_01)' };
      return { isValid: true, message: '' };
    },

    // Course code validation
    courseCode(value) {
      if (!value) return { isValid: false, message: 'Course code is required' };
      if (!this.patterns.courseCode.test(value)) return { isValid: false, message: 'Invalid course code format (e.g., CS301)' };
      return { isValid: true, message: '' };
    },

    // Roll number validation
    rollNumber(value) {
      if (!value) return { isValid: false, message: 'Roll number is required' };
      if (!this.patterns.rollNumber.test(value.toUpperCase())) return { isValid: false, message: 'Invalid roll number format (5-15 alphanumeric characters)' };
      return { isValid: true, message: '' };
    },

    // Venue validation
    venue(value) {
      if (!value) return { isValid: false, message: 'Venue is required' };
      if (value.trim().length < 3) return { isValid: false, message: 'Venue must be at least 3 characters' };
      if (!this.patterns.venue.test(value)) return { isValid: false, message: 'Venue contains invalid characters' };
      return { isValid: true, message: '' };
    },

    // Event type validation
    eventType(value) {
      if (!value) return { isValid: false, message: 'Event type is required' };
      if (!this.patterns.eventType.test(value)) return { isValid: false, message: 'Invalid event type' };
      return { isValid: true, message: '' };
    },

    // Password match validation
    passwordMatch(password, confirmPassword) {
      if (!confirmPassword) return { isValid: false, message: 'Please confirm your password' };
      if (password !== confirmPassword) return { isValid: false, message: 'Passwords do not match' };
      return { isValid: true, message: '' };
    },

    // Email uniqueness check (against array of existing emails)
    emailUnique(value, existingEmails, excludeEmail = '') {
      if (!value) return { isValid: false, message: 'Email is required' };
      const lowerValue = value.toLowerCase();
      const excludeLower = excludeEmail ? excludeEmail.toLowerCase() : '';
      
      if (lowerValue !== excludeLower && existingEmails.some(e => e.toLowerCase() === lowerValue)) {
        return { isValid: false, message: 'This email is already registered' };
      }
      return { isValid: true, message: '' };
    },

    // Numeric validation
    numeric(value, min = null, max = null) {
      if (!value) return { isValid: false, message: 'This field is required' };
      if (isNaN(value)) return { isValid: false, message: 'Must be a valid number' };
      const num = parseFloat(value);
      if (min !== null && num < min) return { isValid: false, message: `Minimum value is ${min}` };
      if (max !== null && num > max) return { isValid: false, message: `Maximum value is ${max}` };
      return { isValid: true, message: '' };
    },

    // Integer validation
    integer(value, min = null, max = null) {
      if (!value) return { isValid: false, message: 'This field is required' };
      if (!/^\d+$/.test(value)) return { isValid: false, message: 'Must be a valid integer' };
      const num = parseInt(value, 10);
      if (min !== null && num < min) return { isValid: false, message: `Minimum value is ${min}` };
      if (max !== null && num > max) return { isValid: false, message: `Maximum value is ${max}` };
      return { isValid: true, message: '' };
    }
  },

  // =====================================================
  // FORM VALIDATION HELPER
  // =====================================================
  /**
   * Validate a form field based on configuration
   * @param {string} fieldId - ID of the input element
   * @param {object} config - Validation configuration
   * @returns {object} { isValid: boolean, message: string }
   */
  validateField(fieldId, config) {
    const input = document.getElementById(fieldId);
    if (!input) return { isValid: true, message: '' };
    
    const value = input.value.trim();
    const type = config.type || 'required';
    
    // Skip validation if field is empty and not required
    if (!value && !config.required) {
      return { isValid: true, message: '' };
    }
    
    let result;
    
    switch (type) {
      case 'email':
        result = this.rules.email(value);
        break;
      case 'password':
        result = config.strict ? this.rules.password(value) : this.rules.passwordSimple(value, config.min || 8);
        break;
      case 'passwordMatch':
        result = this.rules.passwordMatch(document.getElementById(config.matchId)?.value, value);
        break;
      case 'name':
        result = this.rules.name(value);
        break;
      case 'phone':
        result = this.rules.phone(value);
        break;
      case 'date':
        result = config.future ? this.rules.dateInFuture(value, config.label || 'Date') : this.rules.date(value);
        break;
      case 'dateRange':
        const startDate = document.getElementById(config.startDateId)?.value;
        const endDate = document.getElementById(config.endDateId)?.value;
        result = this.rules.dateRange(startDate, endDate);
        break;
      case 'time':
        result = this.rules.time(value);
        break;
      case 'title':
        result = this.rules.title(value);
        break;
      case 'description':
        result = this.rules.description(value, config.min || 10, config.max || 2000);
        break;
      case 'reason':
        result = this.rules.reason(value);
        break;
      case 'amount':
        result = this.rules.amount(value);
        break;
      case 'capacity':
        result = this.rules.capacity(value);
        break;
      case 'percentage':
        result = this.rules.percentage(value);
        break;
      case 'url':
        result = this.rules.url(value);
        break;
      case 'studentId':
        result = this.rules.studentId(value);
        break;
      case 'facultyId':
        result = this.rules.facultyId(value);
        break;
      case 'courseCode':
        result = this.rules.courseCode(value);
        break;
      case 'rollNumber':
        result = this.rules.rollNumber(value);
        break;
      case 'venue':
        result = this.rules.venue(value);
        break;
      case 'numeric':
        result = this.rules.numeric(value, config.min, config.max);
        break;
      case 'integer':
        result = this.rules.integer(value, config.min, config.max);
        break;
      case 'required':
      default:
        result = this.rules.required(value, config.label || 'This field', config.min || 0);
    }
    
    return result;
  },

  // =====================================================
  // FORM VALIDATION WITH ERROR DISPLAY
  // =====================================================
  /**
   * Validate multiple form fields and display errors
   * @param {string} formId - ID of the form/modal container
   * @param {array} fields - Array of field configurations
   * @returns {boolean} true if all fields are valid
   */
  validateForm(formId, fields) {
    // Clear previous errors
    this.clearErrors(formId);
    
    let isValid = true;
    let firstErrorField = null;
    
    fields.forEach(field => {
      const result = this.validateField(field.id, field);
      
      if (!result.isValid) {
        isValid = false;
        this.showError(field.id, result.message);
        if (!firstErrorField) firstErrorField = field.id;
      }
    });
    
    // Focus on first error field
    if (firstErrorField) {
      const input = document.getElementById(firstErrorField);
      if (input) input.focus();
    }
    
    return isValid;
  },

  // =====================================================
  // ERROR DISPLAY HELPERS
  // =====================================================
  /**
   * Show error message for a field
   */
  showError(fieldId, message) {
    const input = document.getElementById(fieldId);
    if (!input) return;
    
    const parent = input.closest('.form-field') || input.closest('.field');
    if (!parent) return;
    
    parent.classList.add('has-error');
    
    // Remove existing error message
    const existing = parent.querySelector('.field-error');
    if (existing) existing.remove();
    
    // Add new error message
    const errorSpan = document.createElement('span');
    errorSpan.className = 'field-error';
    errorSpan.textContent = message;
    parent.appendChild(errorSpan);
  },

  /**
   * Clear error message for a field
   */
  clearError(fieldId) {
    const input = document.getElementById(fieldId);
    if (!input) return;
    
    const parent = input.closest('.form-field') || input.closest('.field');
    if (!parent) return;
    
    parent.classList.remove('has-error');
    const existing = parent.querySelector('.field-error');
    if (existing) existing.remove();
  },

  /**
   * Clear all errors in a form
   */
  clearErrors(formId) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    form.querySelectorAll('.has-error').forEach(el => {
      el.classList.remove('has-error');
    });
    form.querySelectorAll('.field-error').forEach(el => el.remove());
  },

  /**
   * Clear error on input (for real-time validation)
   */
  clearErrorOnInput(fieldId) {
    const input = document.getElementById(fieldId);
    if (!input) return;
    
    input.addEventListener('input', () => this.clearError(fieldId));
    input.addEventListener('change', () => this.clearError(fieldId));
  }
};

// Export for use in other files
window.Validator = Validator;
