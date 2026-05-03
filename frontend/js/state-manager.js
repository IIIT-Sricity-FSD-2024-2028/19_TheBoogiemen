/**
 * state-manager.js - Centralized State Management
 * Adapted for API-based backend. No more localStorage for data persistence.
 * Only localStorage keys allowed: __session_role, __session_user_id (via api-client.js).
 */

const StateManager = {
  // Event listeners for state changes
  listeners: {},

  // Subscribe to state changes
  subscribe(key, callback) {
    if (!this.listeners[key]) {
      this.listeners[key] = [];
    }
    this.listeners[key].push(callback);
  },

  // Dispatch state change events
  dispatchChange(key, value) {
    if (this.listeners[key]) {
      this.listeners[key].forEach(callback => callback(value));
    }
    document.dispatchEvent(new CustomEvent(`state:${key}`, { detail: value }));
  },

  // Check session validity using api-client session keys
  validateSession() {
    const role = localStorage.getItem('__session_role');
    const userId = localStorage.getItem('__session_user_id');
    return !!(role && userId);
  },

  // Clear session
  clearSession() {
    if (window.API_CLIENT) {
      window.API_CLIENT.clearSession();
    } else {
      localStorage.removeItem('__session_role');
      localStorage.removeItem('__session_user_id');
    }
  },

  // Get current user role (returns the API role string)
  getCurrentRole() {
    return localStorage.getItem('__session_role');
  },

  // Get current user data from mockdata.js in-memory DB
  getCurrentUserData() {
    return typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  },

  // Protected route check
  protectRoute(requiredRoles = []) {
    if (!this.validateSession()) {
      window.location.href = 'login.html';
      return false;
    }

    const currentRole = this.getCurrentRole();
    // Map API roles to frontend roles for role checks
    const roleMap = { student: 'student', faculty: 'faculty', academic_head: 'head', admin: 'superuser' };
    const frontendRole = roleMap[currentRole] || currentRole;

    if (requiredRoles.length > 0 && !requiredRoles.includes(frontendRole) && !requiredRoles.includes(currentRole)) {
      const roleRedirects = {
        student: 'student.html',
        faculty: 'faculty.html',
        academic_head: 'head.html',
        admin: 'superuser.html',
      };
      window.location.href = roleRedirects[currentRole] || 'login.html';
      return false;
    }

    return true;
  },

  // Get database (delegates to mockdata.js getDB)
  getDB() {
    return typeof getDB === 'function' ? getDB() : null;
  },

  // Save database (delegates to mockdata.js saveDB)
  saveDB(data) {
    if (typeof saveDB === 'function') saveDB(data);
    this.dispatchChange('db', data);
  },

  // Check role permissions
  hasPermission(requiredRole) {
    const currentRole = this.getCurrentRole();
    const roleHierarchy = {
      superuser: 4, admin: 4,
      academic_head: 3, head: 3,
      faculty: 2,
      student: 1,
    };
    return (roleHierarchy[currentRole] || 0) >= (roleHierarchy[requiredRole] || 0);
  },

  // Render UI based on role
  renderByRole(roleConfigs) {
    const currentRole = this.getCurrentRole();
    Object.keys(roleConfigs).forEach(selector => {
      const element = document.querySelector(selector);
      if (!element) return;
      const config = roleConfigs[selector];
      element.style.display = config.roles.includes(currentRole) ? '' : 'none';
    });
  },

  // Update UI elements with user data
  updateUserInfo() {
    const userData = this.getCurrentUserData();
    if (!userData) return;

    document.querySelectorAll('.user-name, .sb-uname, #sbUname, #sb-name').forEach(el => {
      el.textContent = userData.name || 'User';
    });

    document.querySelectorAll('.user-role, .sb-urole, #sbUrole, #sb-role').forEach(el => {
      el.textContent = userData.role || 'User';
    });

    document.querySelectorAll('.user-avatar, .sb-avatar, #sbAvatar, #sb-initial, #topAvatar').forEach(el => {
      el.textContent = (userData.name || 'U').charAt(0).toUpperCase();
    });
  }
};

// Export for use
window.StateManager = StateManager;