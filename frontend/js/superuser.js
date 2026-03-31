/**
 * superuser.js - Super User Portal Controller
 * Handles system administration, user management, and CRUD operations
 */

document.addEventListener('DOMContentLoaded', () => {
  // Protect route - only superuser/admin access
  if (!StateManager.protectRoute(['admin', 'superuser'])) {
    return;
  }
  
  initPage();
  document.addEventListener('superuser:changed', initPage);
});

function initPage() {
  const db = StateManager.getDB();
  if (!db || !db.superuser) return;
  
  const data = db.superuser;
  
  // Render metrics
  renderMetrics(data);
  renderUserTable(data);
  renderLogs(data);
  renderBugReports(data);
  renderSettings(data);
}

function renderMetrics(data) {
  const m = data.metrics;
  document.getElementById('su-stat-row').innerHTML = `
    <div class="stat-card"><div class="sc-label">Total End-Users</div><div class="sc-val">${m.totalUsers}</div></div>
    <div class="stat-card"><div class="sc-label">Active Auth-Sessions</div><div class="sc-val">${m.activeSessions}</div></div>
    <div class="stat-card"><div class="sc-label">System Deficiencies</div><div class="sc-val red">${m.openBugs}</div></div>
    <div class="stat-card"><div class="sc-label">Core Uptime</div><div class="sc-val">${m.serverUptime}</div></div>
  `;
  
  document.getElementById('errCount').textContent = data.systemLogs.filter(l => l.level === 'error').length;
  document.getElementById('warnCount').textContent = data.systemLogs.filter(l => l.level === 'warn').length;
  document.getElementById('bugCount').textContent = data.bugReports.length;
  document.getElementById('resCount').textContent = data.bugReports.filter(r => r.status === 'resolved').length;
}

function renderUserTable(data) {
  const tbody = document.getElementById('userTableBody');
  const rmap = { 
    student: 'Student', 
    faculty: 'Faculty', 
    head: 'Acad Head', 
    admin: 'Admin', 
    superuser: 'Superuser' 
  };
  
  tbody.innerHTML = data.users.map(u => `
    <tr>
      <td class="td-id">${u.id}</td>
      <td class="td-name">${u.name}</td>
      <td class="td-email">${u.email}</td>
      <td><span class="role-badge ${u.role}">${rmap[u.role] || u.role}</span></td>
      <td><span class="status-pill ${u.status}">${u.status}</span></td>
      <td class="action-cell">
        <button class="btn btn-blue btn-sm" onclick="openEditModal('${u.id}')">Edit</button>
        <button class="btn btn-red btn-sm" onclick="openDeleteModal('${u.id}')">Delete</button>
      </td>
    </tr>
  `).join('');
  
  document.getElementById('tableCount').textContent = `Showing ${data.users.length} users`;
}

function renderLogs(data) {
  const level = document.getElementById('logLevelFilter').value;
  const logs = level ? data.systemLogs.filter(l => l.level === level) : data.systemLogs;
  
  document.getElementById('log-entries').innerHTML = logs.map(l => `
    <div class="log-entry">
      <div class="log-entry-head">
        <span class="log-level ${l.level}">${l.level.toUpperCase()}</span>
        <span class="log-entry-title">${l.title}</span>
        <span class="log-entry-time">${l.time}</span>
      </div>
      <div class="log-entry-meta">${l.meta}</div>
    </div>
  `).join('');
}

function renderBugReports(data) {
  const status = document.getElementById('bugStatusFilter').value;
  let reports = status ? data.bugReports.filter(r => r.status === status) : data.bugReports;
  
  const list = document.getElementById('bug-reports-list');
  if (reports.length === 0) {
    list.innerHTML = `<div style="text-align:center;padding:24px;color:var(--muted)">Queue empty. No active defects.</div>`;
    return;
  }
  
  list.innerHTML = reports.map(r => `
    <div class="log-entry">
      <div class="log-entry-head" style="margin-bottom:8px">
        <span class="log-level ${r.severity.toLowerCase()}">${r.severity}</span>
        <span class="log-entry-title">${r.title}</span>
        <span class="status-pill minimal">${r.status}</span>
      </div>
      <p style="font-size:13px;color:var(--soft);margin-bottom:12px">${r.description.substring(0, 120)}...</p>
      <div class="action-cell">
        <button class="btn btn-outline btn-sm" onclick="viewBug('${r.id}')">Review</button>
        ${r.status !== 'resolved' ? `<button class="btn btn-blue btn-sm" onclick="setBugStatus('${r.id}', 'resolved')">Resolve</button>` : ''}
      </div>
    </div>
  `).join('');
}

function renderSettings(data) {
  const cfg = data.globalSettings;
  document.getElementById('cfg-platform').value = cfg.platformName;
  document.getElementById('cfg-institution').value = cfg.institutionName;
  document.getElementById('cfg-semester').value = cfg.activeSemester;
  document.getElementById('cfg-year').value = cfg.academicYear;
}

function switchPanel(name, el) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sb-nav a').forEach(a => a.classList.remove('active'));
  document.getElementById('panel-' + name).classList.add('active');
  if (el) el.classList.add('active');
  
  const titles = {
    overview: 'System Hub',
    directory: 'User Directory',
    logs: 'Maintenance Center',
    settings: 'Ops Governance'
  };
  document.getElementById('topbarTitle').textContent = titles[name] || 'Ops Center';
  
  if (window.innerWidth < 768) closeSidebar();
}

function showModal(id) {
  document.getElementById(id).classList.add('show');
  Auth.clearAllErrors(id);
}

function closeModal(id) {
  document.getElementById(id).classList.remove('show');
  Auth.clearAllErrors(id);
}

function closeModalBg(e, id) {
  if (e.target.id === id) closeModal(id);
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('overlaySb').classList.toggle('show');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlaySb').classList.remove('show');
}

let toastTimer;
function toast(msg) {
  const el = document.getElementById('toastEl');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}

function validateForm(modalId, config) {
  Auth.clearAllErrors(modalId);
  const modal = document.getElementById(modalId);
  let isValid = true;
  
  config.forEach(f => {
    const input = document.getElementById(f.id);
    const val = input.value.trim();
    let error = '';
    
    if (f.required && !val) {
      error = 'This field is mandatory.';
    } else if (f.type === 'email' && val && !Auth.patterns.email.test(val)) {
      error = 'Invalid email address.';
    } else if (f.min && val.length < f.min) {
      error = `Minimum ${f.min} characters required.`;
    }
    
    if (error) {
      isValid = false;
      const parent = input.closest('.form-field');
      parent.classList.add('has-error');
      
      const errEl = document.createElement('span');
      errEl.className = 'field-error';
      errEl.textContent = error;
      parent.appendChild(errEl);
    }
  });
  
  return isValid;
}

function _suRefresh(section) {
  document.dispatchEvent(new CustomEvent('superuser:changed', { detail: { section } }));
}

function handleAddUser() {
  if (!validateForm('modalAddUser', [
    { id: 'u-name', required: true, min: 3 },
    { id: 'u-email', required: true, type: 'email' },
    { id: 'u-role', required: true }
  ])) return;
  
  const db = StateManager.getDB();
  const nextId = 'USR-' + String(db.superuser.users.length + 1000);
  
  const user = {
    id: nextId,
    name: document.getElementById('u-name').value,
    email: document.getElementById('u-email').value,
    role: document.getElementById('u-role').value,
    status: document.getElementById('u-status').value
  };
  
  db.superuser.users.unshift(user);
  db.superuser.metrics.totalUsers = db.superuser.users.length;
  
  db.superuser.systemLogs.unshift({
    level: 'info',
    title: `Provisioned ${user.role}: ${user.name}`,
    meta: `Operation by Superuser at ${new Date().toISOString()}`,
    time: new Date().toLocaleTimeString('en-GB')
  });
  
  StateManager.saveDB(db);
  closeModal('modalAddUser');
  toast('Account provisioned successfully');
  _suRefresh('overview');
}

function filterTable() {
  const q = document.getElementById('userSearchInput').value.toLowerCase();
  const roleF = document.getElementById('roleFilter').value;
  const statusF = document.getElementById('statusFilter').value;
  const users = StateManager.getDB().superuser.users;
  
  const filtered = users.filter(u => {
    const matchQ = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.id.toLowerCase().includes(q);
    const matchRole = !roleF || u.role === roleF;
    const matchStatus = !statusF || u.status === statusF;
    return matchQ && matchRole && matchStatus;
  });
  
  renderUserTable({ users: filtered });
}

let _deletingId = null;

function openDeleteModal(id) {
  _deletingId = id;
  document.getElementById('deleteTargetId').textContent = id;
  showModal('modalConfirmDelete');
}

function performDelete() {
  const db = StateManager.getDB();
  db.superuser.users = db.superuser.users.filter(u => u.id !== _deletingId);
  db.superuser.metrics.totalUsers = db.superuser.users.length;
  StateManager.saveDB(db);
  closeModal('modalConfirmDelete');
  toast('User purged');
  _suRefresh('overview');
}

function openEditModal(id) {
  const u = StateManager.getDB().superuser.users.find(x => x.id === id);
  if (!u) return;
  
  document.getElementById('edit-id').value = u.id;
  document.getElementById('edit-name').value = u.name;
  document.getElementById('edit-email').value = u.email;
  document.getElementById('edit-role').value = u.role;
  document.getElementById('edit-status').value = u.status;
  showModal('modalEditUser');
}

function handleUpdateUser() {
  const id = document.getElementById('edit-id').value;
  const db = StateManager.getDB();
  const idx = db.superuser.users.findIndex(u => u.id === id);
  if (idx === -1) return;
  
  db.superuser.users[idx] = {
    ...db.superuser.users[idx],
    name: document.getElementById('edit-name').value,
    email: document.getElementById('edit-email').value,
    role: document.getElementById('edit-role').value,
    status: document.getElementById('edit-status').value
  };
  
  StateManager.saveDB(db);
  closeModal('modalEditUser');
  toast('Record synchronized');
  _suRefresh('overview');
}

function handleClearLogs() {
  const db = StateManager.getDB();
  db.superuser.systemLogs = [];
  StateManager.saveDB(db);
  toast('Audit log purged');
  _suRefresh('logs');
}

function viewBug(id) {
  const r = StateManager.getDB().superuser.bugReports.find(x => x.id === id);
  if (!r) return;
  
  document.getElementById('bugDetailTitle').textContent = `Review: ${r.id}`;
  document.getElementById('bugDetailBody').innerHTML = `
    <div class="form-field"><label>Title</label><div class="dir-stat-label" style="text-transform:none;font-size:14px;color:var(--ink)">${r.title}</div></div>
    <div class="modal-grid-2">
      <div class="form-field"><label>Submitted By</label><div>${r.submitter} (${r.submittedBy})</div></div>
      <div class="form-field"><label>Date</label><div>${r.submittedAt}</div></div>
    </div>
    <div class="form-field"><label>Technical Description</label><div class="settings-box" style="font-family:var(--fm);font-size:12px">${r.description}</div></div>
  `;
  
  const actions = document.getElementById('bugActionRow');
  actions.innerHTML = `
    <button class="btn btn-blue" onclick="assignBug('${r.id}')">Assign to Dev</button>
    <button class="btn btn-outline" onclick="closeModal('modalBugDetail')">Dismiss</button>
  `;
  showModal('modalBugDetail');
}

function setBugStatus(id, s) {
  const db = StateManager.getDB();
  const idx = db.superuser.bugReports.findIndex(r => r.id === id);
  if (idx !== -1) {
    db.superuser.bugReports[idx].status = s;
    StateManager.saveDB(db);
  }
  toast(`Bug ${s}`);
  _suRefresh('logs');
}

function assignBug(id) {
  const db = StateManager.getDB();
  const idx = db.superuser.bugReports.findIndex(r => r.id === id);
  if (idx !== -1) {
    db.superuser.bugReports[idx].assignedTo = 'Platform Dev Team';
    db.superuser.bugReports[idx].status = 'in-progress';
    StateManager.saveDB(db);
  }
  closeModal('modalBugDetail');
  toast('Assigned to Dev Team');
  _suRefresh('logs');
}

function handleSaveConfig() {
  const db = StateManager.getDB();
  db.superuser.globalSettings = {
    platformName: document.getElementById('cfg-platform').value,
    institutionName: document.getElementById('cfg-institution').value,
    activeSemester: document.getElementById('cfg-semester').value,
    academicYear: document.getElementById('cfg-year').value
  };
  StateManager.saveDB(db);
  toast('Environment synchronized');
}

// Make functions globally available
window.switchPanel = switchPanel;
window.showModal = showModal;
window.closeModal = closeModal;
window.closeModalBg = closeModalBg;
window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;
window.toast = toast;
window.handleAddUser = handleAddUser;
window.filterTable = filterTable;
window.openDeleteModal = openDeleteModal;
window.performDelete = performDelete;
window.openEditModal = openEditModal;
window.handleUpdateUser = handleUpdateUser;
window.handleClearLogs = handleClearLogs;
window.viewBug = viewBug;
window.setBugStatus = setBugStatus;
window.assignBug = assignBug;
window.handleSaveConfig = handleSaveConfig;