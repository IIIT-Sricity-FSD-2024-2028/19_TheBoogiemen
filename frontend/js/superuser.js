/**
 * superuser.js - Super User / IT Operations Portal Scripts
 * BarelyPassing - Academic Progress & Outcome Tracking
 */

// Check authentication on page load
(function checkAuth() {
  const currentUser = getCurrentUser();
  if (!currentUser || (currentUser.role !== 'superuser' && currentUser.role !== 'admin')) {
    window.location.href = 'login.html';
    return;
  }
})();

/* =====================================================
   ARCHITECTURE: UI CONTROLLERS
   ===================================================== */
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

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('overlaySb').classList.toggle('show');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlaySb').classList.remove('show');
}

function showModal(id) {
  document.getElementById(id).classList.add('show');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('show');
  clearErrors(id);
}

function closeModalBg(e, id) {
  if (e.target.id === id) closeModal(id);
}

let toastTimer;
function toast(msg) {
  const el = document.getElementById('toastEl');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}

/* =====================================================
   CORE LOGIC: VALIDATION
   ===================================================== */
function validateForm(modalId, config) {
  clearErrors(modalId);
  const modal = document.getElementById(modalId);
  let isValid = true;

  config.forEach(f => {
    const input = document.getElementById(f.id);
    const val = input.value.trim();
    let error = '';

    if (f.required && !val) error = 'This field is mandatory.';
    else if (f.type === 'email' && val && !/^\S+@\S+\.\S+$/.test(val)) error = 'Invalid email address.';
    else if (f.min && val.length < f.min) error = `Minimum ${f.min} characters required.`;

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

function clearErrors(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.querySelectorAll('.form-field').forEach(f => f.classList.remove('has-error'));
  modal.querySelectorAll('.field-error').forEach(e => e.remove());
}

/* =====================================================
   CRUD OPERATIONS (Integrated su-crud logic)
   ===================================================== */
function _suRefresh(section) {
  document.dispatchEvent(new CustomEvent('superuser:changed', { detail: { section } }));
}

function _nextId(arr) {
  if (!arr || arr.length === 0) return 1;
  return Math.max(...arr.map(x => Number(x.id.replace(/\D/g, '')) || 0)) + 1;
}

// Provisioning
function handleAddUser() {
  // Comprehensive validation with regex
  if (!Validator.validateForm('modalAddUser', [
    { id: 'u-name', type: 'name' },
    { id: 'u-email', type: 'email' },
    { id: 'u-role', type: 'required', label: 'Role' }
  ])) return;

  // Check for duplicate email
  const db = getDB();
  const existingEmails = db.superuser.users.map(u => u.email);
  const emailCheck = Validator.rules.emailUnique(
    document.getElementById('u-email').value,
    existingEmails
  );
  if (!emailCheck.isValid) {
    Validator.showError('u-email', emailCheck.message);
    return;
  }

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

  // Log it
  db.superuser.systemLogs.unshift({
    level: 'info',
    title: `Provisioned ${user.role}: ${user.name}`,
    meta: `Operation by Superuser at ${new Date().toISOString()}`,
    time: new Date().toLocaleTimeString('en-GB')
  });

  saveDB(db);
  closeModal('modalAddUser');
  toast('Account provisioned successfully');
  _suRefresh('overview');
}

function filterTable() {
  const q = document.getElementById('userSearchInput').value.toLowerCase();
  const roleF = document.getElementById('roleFilter').value;
  const statusF = document.getElementById('statusFilter').value;

  const users = getDB().superuser.users;
  const filtered = users.filter(u => {
    const matchQ = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.id.toLowerCase().includes(q);
    const matchRole = !roleF || u.role === roleF;
    const matchStatus = !statusF || u.status === statusF;
    return matchQ && matchRole && matchStatus;
  });

  renderTable(filtered);
}

function renderTable(data) {
  const tbody = document.getElementById('userTableBody');
  const rmap = { student: 'Student', faculty: 'Faculty', head: 'Acad Head', admin: 'Admin', superuser: 'Superuser' };

  tbody.innerHTML = data.map(u => `
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
  document.getElementById('tableCount').textContent = `Showing ${data.length} users`;
}

let _deletingId = null;

function openDeleteModal(id) {
  _deletingId = id;
  document.getElementById('deleteTargetId').textContent = id;
  showModal('modalConfirmDelete');
}

function performDelete() {
  const db = getDB();
  db.superuser.users = db.superuser.users.filter(u => u.id !== _deletingId);
  db.superuser.metrics.totalUsers = db.superuser.users.length;
  saveDB(db);
  closeModal('modalConfirmDelete');
  toast('User purged');
  _suRefresh('overview');
}

function openEditModal(id) {
  const u = getDB().superuser.users.find(x => x.id === id);
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
  
  // Comprehensive validation with regex
  if (!Validator.validateForm('modalEditUser', [
    { id: 'edit-name', type: 'name' },
    { id: 'edit-email', type: 'email' }
  ])) return;

  // Check for duplicate email (excluding current user's email)
  const db = getDB();
  const currentUser = db.superuser.users.find(u => u.id === id);
  const existingEmails = db.superuser.users.map(u => u.email);
  const emailCheck = Validator.rules.emailUnique(
    document.getElementById('edit-email').value,
    existingEmails,
    currentUser ? currentUser.email : ''
  );
  if (!emailCheck.isValid) {
    Validator.showError('edit-email', emailCheck.message);
    return;
  }

  const idx = db.superuser.users.findIndex(u => u.id === id);
  if (idx === -1) return;

  db.superuser.users[idx] = {
    ...db.superuser.users[idx],
    name: document.getElementById('edit-name').value,
    email: document.getElementById('edit-email').value,
    role: document.getElementById('edit-role').value,
    status: document.getElementById('edit-status').value
  };
  saveDB(db);
  closeModal('modalEditUser');
  toast('Record synchronized');
  _suRefresh('overview');
}

// Maintenance
function renderLogs() {
  const level = document.getElementById('logLevelFilter').value;
  const logs = getDB().superuser.systemLogs;
  const list = level ? logs.filter(l => l.level === level) : logs;

  document.getElementById('log-entries').innerHTML = list.map(l => `
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

function handleClearLogs() {
  const db = getDB();
  db.superuser.systemLogs = [];
  saveDB(db);
  toast('Audit log purged');
  _suRefresh('logs');
}

// Bug Reports
function renderBugReports() {
  const status = document.getElementById('bugStatusFilter').value;
  let reports = getBugReports();
  if (status) reports = reports.filter(r => r.status === status);

  const list = document.getElementById('bug-reports-list');
  if (reports.length === 0) {
    list.innerHTML = `<div style="text-align:center;padding:24px;color:var(--muted)">Queue empty. No active defects.</div>`;
    return;
  }

  list.innerHTML = reports.map(r => `
    <div class="log-entry">
      <div class="log-entry-head" style="margin-bottom:8px">
        <span class="log-level ${r.severity.toLowerCase() === 'critical' ? 'error' : r.severity.toLowerCase() === 'high' ? 'error' : 'warn'}">${r.severity}</span>
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

function viewBug(id) {
  const r = getBugReports().find(x => x.id === id);
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
  updateBugReport(id, { status: s });
  toast(`Bug ${s}`);
  _suRefresh('logs');
}

function assignBug(id) {
  updateBugReport(id, { assignedTo: 'Platform Dev Team', status: 'in-progress' });
  closeModal('modalBugDetail');
  toast('Assigned to Dev Team');
  _suRefresh('logs');
}

// Config
function handleSaveConfig() {
  const db = getDB();
  db.superuser.globalSettings = {
    platformName: document.getElementById('cfg-platform').value,
    institutionName: document.getElementById('cfg-institution').value,
    activeSemester: document.getElementById('cfg-semester').value,
    academicYear: document.getElementById('cfg-year').value
  };
  saveDB(db);
  toast('Environment synchronized');
}

/* =====================================================
   INITIALIZATION
   ===================================================== */
function approveUser(id) {
  const db = getDB();
  const idx = db.superuser.users.findIndex(u => u.id === id);
  if (idx === -1) return;
  db.superuser.users[idx].status = 'active';
  db.superuser.metrics.totalUsers = db.superuser.users.length;
  db.superuser.systemLogs.unshift({
    level: 'info',
    title: `Account approved: ${db.superuser.users[idx].name} (${id})`,
    meta: `Operation by Superuser at ${new Date().toISOString()}`,
    time: new Date().toLocaleTimeString('en-GB')
  });
  saveDB(db);
  toast('Account approved successfully');
  _suRefresh('overview');
}

function initPage() {
  const db = getDB().superuser;
  const currentUser = getCurrentUser();

  // Branding
  document.getElementById('sbAvatar').textContent = currentUser ? currentUser.name.charAt(0).toUpperCase() : 'S';
  document.getElementById('sbUname').textContent = currentUser ? currentUser.name : 'Superuser';
  document.getElementById('topAvatar').textContent = currentUser ? currentUser.name.charAt(0).toUpperCase() : 'S';

  // Metrics
  const m = db.metrics;
  document.getElementById('su-stat-row').innerHTML = `
    <div class="stat-card"><div class="sc-label">Total End-Users</div><div class="sc-val">${m.totalUsers}</div></div>
    <div class="stat-card"><div class="sc-label">Active Auth-Sessions</div><div class="sc-val">${m.activeSessions}</div></div>
    <div class="stat-card"><div class="sc-label">System Deficiencies</div><div class="sc-val red">${m.openBugs}</div></div>
    <div class="stat-card"><div class="sc-label">Core Uptime</div><div class="sc-val">${m.serverUptime}</div></div>
  `;

  // Counters
  document.getElementById('errCount').textContent = db.systemLogs.filter(l => l.level === 'error').length;
  document.getElementById('warnCount').textContent = db.systemLogs.filter(l => l.level === 'warn').length;
  document.getElementById('bugCount').textContent = getBugReports().length;
  document.getElementById('resCount').textContent = getBugReports().filter(r => r.status === 'resolved').length;

  // Table & Logs
  renderTable(db.users);
  renderLogs();
  renderBugReports();

  // Directory Stats
  const roles = ['superuser', 'head', 'faculty', 'student', 'admin'];
  const stats = document.querySelectorAll('.dir-stat-val');
  roles.forEach((r, i) => {
    const count = db.users.filter(u => u.role === r).length;
    if (stats[i]) stats[i].textContent = count;
  });

  // Settings
  const cfg = db.globalSettings;
  document.getElementById('cfg-platform').value = cfg.platformName;
  document.getElementById('cfg-institution').value = cfg.institutionName;
  document.getElementById('cfg-semester').value = cfg.activeSemester;
  document.getElementById('cfg-year').value = cfg.academicYear;

  // Pending Approvals
  const pending = db.users.filter(u => u.status === 'pending');
  document.getElementById('pendingUsersBody').innerHTML = pending.length ? pending.map(u => `
    <tr>
      <td>${u.id}</td>
      <td><strong>${u.name}</strong></td>
      <td>${u.role}</td>
      <td>12 Mar 2026</td>
      <td class="action-cell">
         <button class="btn btn-green btn-sm" onclick="approveUser('${u.id}')">Approve</button>
         <button class="btn btn-red btn-sm" onclick="openDeleteModal('${u.id}')">Reject</button>
      </td>
    </tr>
  `).join('') : '<tr><td colspan="5" style="text-align:center;padding:16px;color:var(--muted)">No pending accounts.</td></tr>';
}

document.addEventListener('superuser:changed', (e) => {
  initPage();
});

initPage();
