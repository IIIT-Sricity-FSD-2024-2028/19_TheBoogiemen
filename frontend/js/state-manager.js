/**
 * state-manager.js - Centralized State Management
 * Handles localStorage persistence, state changes, and UI updates
 */

const StateManager = {
  // State storage keys
  keys: {
    session: 'bp_session',
    role: 'bp_user_role',
    userData: 'bp_user_data',
    db: 'ffsd',
    dbVersion: 'ffsd_v'
  },

  // Get state from localStorage
  getState(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  },

  // Set state in localStorage
  setState(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
    this.dispatchChange(key, value);
  },

  // Remove state from localStorage
  removeState(key) {
    localStorage.removeItem(key);
    this.dispatchChange(key, null);
  },

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
    // Dispatch custom event for DOM listeners
    document.dispatchEvent(new CustomEvent(`state:${key}`, { detail: value }));
  },

  // Check session validity
  validateSession() {
    const session = this.getState(this.keys.session);
    if (!session) return false;
    
    const expiry = new Date(session.expiresAt);
    if (expiry < new Date()) {
      this.clearSession();
      return false;
    }
    return true;
  },

  // Clear session
  clearSession() {
    this.removeState(this.keys.session);
    this.removeState(this.keys.role);
    this.removeState(this.keys.userData);
  },

  // Get current user role
  getCurrentRole() {
    return this.getState(this.keys.role);
  },

  // Get current user data
  getCurrentUserData() {
    return this.getState(this.keys.userData);
  },

  // Protected route check
  protectRoute(requiredRoles = []) {
    if (!this.validateSession()) {
      window.location.href = 'login.html';
      return false;
    }
    
    const currentRole = this.getCurrentRole();
    if (requiredRoles.length > 0 && !requiredRoles.includes(currentRole)) {
      // Redirect to appropriate portal based on role
      const roleRedirects = {
        student: 'student.html',
        faculty: 'faculty.html',
        head: 'head.html',
        admin: 'superuser.html',
        superuser: 'superuser.html'
      };
      window.location.href = roleRedirects[currentRole] || 'login.html';
      return false;
    }
    
    return true;
  },

  // Initialize database if needed
  initDatabase() {
    const existing = localStorage.getItem(this.keys.db);
    const version = localStorage.getItem(this.keys.dbVersion);
    
    if (!existing || version !== '1') {
      console.log('Database initialized');
      // Trigger database seed from mockdata.js
      if (typeof initDatabase === 'function') {
        initDatabase();
      }
    }
  },

  // Get database
  getDB() {
    return this.getState(this.keys.db);
  },

  // Save database
  saveDB(data) {
    this.setState(this.keys.db, data);
  },

  // Check role permissions
  hasPermission(requiredRole) {
    const currentRole = this.getCurrentRole();
    const roleHierarchy = {
      superuser: 4,
      admin: 4,
      head: 3,
      faculty: 2,
      student: 1
    };
    
    const requiredLevel = roleHierarchy[requiredRole] || 0;
    const currentLevel = roleHierarchy[currentRole] || 0;
    
    return currentLevel >= requiredLevel;
  },

  // Render UI based on role
  renderByRole(roleConfigs) {
    const currentRole = this.getCurrentRole();
    
    Object.keys(roleConfigs).forEach(selector => {
      const element = document.querySelector(selector);
      if (!element) return;
      
      const config = roleConfigs[selector];
      const isVisible = config.roles.includes(currentRole);
      
      element.style.display = isVisible ? '' : 'none';
    });
  },

  // Update UI elements with user data
  updateUserInfo() {
    const userData = this.getCurrentUserData();
    const session = this.getSession();
    
    if (!userData || !session) return;
    
    // Update common elements
    const nameElements = document.querySelectorAll('.user-name, .sb-uname, #sbUname, #sb-name');
    nameElements.forEach(el => {
      el.textContent = userData.name || userData.userName || session.userId;
    });
    
    const roleElements = document.querySelectorAll('.user-role, .sb-urole, #sbUrole, #sb-role');
    roleElements.forEach(el => {
      el.textContent = session.role || 'User';
    });
    
    const avatarElements = document.querySelectorAll('.user-avatar, .sb-avatar, #sbAvatar, #sb-initial, #topAvatar');
    avatarElements.forEach(el => {
      const name = userData.name || userData.userName || session.userId;
      el.textContent = name.charAt(0).toUpperCase();
    });
  }
};

// Export for use
window.StateManager = StateManager;