/**
 * login.js - Login Page Controller
 * Handles form submission, validation, and session creation
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize auth
  Auth.initLoginPage();
  
  // Check if already logged in
  if (StateManager.validateSession()) {
    const role = StateManager.getCurrentRole();
    Auth.redirectByRole(role);
    return;
  }
  
  // Form submission handler
  const loginForm = document.getElementById('loginForm');
  
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const role = loginForm.dataset.role || 'student';
    
    // Validate
    const validation = Auth.validateForm({ email, password });
    
    if (!validation.isValid) {
      validation.errors.forEach(err => {
        Auth.showFieldError(err.field, err.message);
      });
      return;
    }
    
    // Clear errors
    Auth.clearAllErrors('loginForm');
    
    // Create session
    Auth.createSession(role, { email, name: email.split('@')[0] });
    
    // Show success feedback
    const submitBtn = loginForm.querySelector('.btn-submit');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Signing In...';
    submitBtn.disabled = true;
    
    // Simulate network delay
    setTimeout(() => {
      // Redirect
      const redirect = loginForm.dataset.redirect || 'student.html';
      window.location.href = redirect;
    }, 800);
  });
  
  // Real-time validation on input
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  
  emailInput.addEventListener('blur', () => {
    const result = Auth.validateField('email', { required: true, type: 'email' });
    if (!result.isValid) {
      Auth.showFieldError('email', result.message);
    } else {
      Auth.clearFieldError('email');
    }
  });
  
  passwordInput.addEventListener('blur', () => {
    const result = Auth.validateField('password', { required: true, type: 'password' });
    if (!result.isValid) {
      Auth.showFieldError('password', result.message);
    } else {
      Auth.clearFieldError('password');
    }
  });
  
  // Clear errors on input
  emailInput.addEventListener('input', () => Auth.clearFieldError('email'));
  passwordInput.addEventListener('input', () => Auth.clearFieldError('password'));
});