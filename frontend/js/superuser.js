/**
 * superuser.js - Super User / IT Operations Portal Scripts
 * BarelyPassing - Academic Progress & Outcome Tracking
 */

// Check authentication on page load
(function checkAuth() {
  const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
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
   CRUD OPERATIONS
   ===================================================== */
function _suRefresh(section) {
  document.dispatchEvent(new CustomEvent('superuser:changed', { detail: { section } }));
}

// NOTE: handleAddUser, filterTable, renderTable, etc. still use getDB() as they are
// action/CRUD functions. These will be migrated to backend API calls in a subsequent sprint.

async function handleAddUser() {
  const cfg = [
    { id: 'u-name',   required: true, min: 3 },
    { id: 'u-email',  required: true, type: 'email' },
    { id: 'u-role',   required: true },
    { id: 'u-status', required: true }
  ];
  if (!validateForm('modalAddUser', cfg)) return;
  const result = await window.ApiAdapter.createUser({
    username: document.getElementById('u-name').value,
    email:    document.getElementById('u-email').value,
    role:     document.getElementById('u-role').value,
    password_hash: 'Default@123'
  });
  if (result) {
    toast('User created successfully!');
    closeModal('modalAddUser');
    initPage();
  } else {
    toast('Failed to create user.');
  }
}

function filterTable() {
  const q = (document.getElementById('userSearch')?.value || '').toLowerCase();
  document.querySelectorAll('#userTableBody tr').forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}

function renderTable(data) {
  const tbody = document.getElementById('userTableBody');
  if (!tbody) return;
  if (!data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:16px;color:var(--muted)">No users found.</td></tr>';
    return;
  }
  const rmap = { student: 'Student', faculty: 'Faculty', head: 'Acad Head', admin: 'Admin', superuser: 'Superuser' };
  tbody.innerHTML = data.map(u => `
    <tr>
      <td class="td-id">${u.id || u.user_id}</td>
      <td class="td-name">${u.name || (u.first_name + ' ' + u.last_name)}</td>
      <td class="td-email">${u.email || 'N/A'}</td>
      <td><span class="role-badge ${u.role}">${rmap[u.role] || u.role}</span></td>
      <td><span class="status-pill ${u.status || 'active'}">${u.status || 'active'}</span></td>
      <td class="action-cell">
        <button class="btn btn-blue btn-sm" onclick="openEditModal('${u.id || u.user_id}')">Edit</button>
        <button class="btn btn-red btn-sm" onclick="openDeleteModal('${u.id || u.user_id}')">Delete</button>
      </td>
    </tr>
  `).join('');
  const countEl = document.getElementById('tableCount');
  if (countEl) countEl.textContent = `Showing ${data.length} users`;
}

let _deletingId = null;

function openDeleteModal(id) {
  _deletingId = id;
  const el = document.getElementById('deleteTargetId');
  if (el) el.textContent = id;
  showModal('modalConfirmDelete');
}

async function performDelete() {
  if (!_deletingId) return;
  const result = await window.ApiAdapter.deleteUser(_deletingId);
  if (result !== null) {
    toast('User deleted successfully.');
  } else {
    toast('Delete failed — try again.');
  }
  closeModal('modalConfirmDelete');
  _deletingId = null;
  initPage();
}

async function openEditModal(id) {
  const users = await window.ApiAdapter.fetchAllUsers();
  const u = users.find(u => u.user_id === id);
  if (!u) { toast('User not found'); return; }
  const nameEl  = document.getElementById('eu-name');
  const emailEl = document.getElementById('eu-email');
  const roleEl  = document.getElementById('eu-role');
  if (nameEl)  nameEl.value  = u.name || u.username || '';
  if (emailEl) emailEl.value = u.email || '';
  if (roleEl)  roleEl.value  = u.role  || 'student';
  document.getElementById('eu-target-id').textContent = id;
  window._editingUserId = id;
  showModal('modalEditUser');
}

async function handleUpdateUser() {
  const cfg = [
    { id: 'eu-name',  required: true, min: 3 },
    { id: 'eu-email', required: true, type: 'email' },
    { id: 'eu-role',  required: true }
  ];
  if (!validateForm('modalEditUser', cfg)) return;
  const result = await window.ApiAdapter.updateUser(window._editingUserId, {
    username: document.getElementById('eu-name').value,
    email:    document.getElementById('eu-email').value,
    role:     document.getElementById('eu-role').value
  });
  if (result) {
    toast('User updated successfully.');
    closeModal('modalEditUser');
    initPage();
  } else {
    toast('Update failed.');
  }
}

// In-memory log store (session only)
let _systemLogs = [
  { time: new Date().toLocaleTimeString(), level: 'INFO',    msg: 'System initialized successfully' },
  { time: new Date().toLocaleTimeString(), level: 'INFO',    msg: 'Backend API connected on port 3001' },
  { time: new Date().toLocaleTimeString(), level: 'INFO',    msg: 'Mock data seeded into memory store' },
];

function renderLogs() {
  const list = document.getElementById('log-entries');
  if (!list) return;
  if (_systemLogs.length === 0) {
    list.innerHTML = '<div style="text-align:center;padding:24px;color:var(--muted)">No logs available.</div>';
    return;
  }
  const colorMap = { INFO: 'var(--accent)', WARN: 'var(--amber,#f59e0b)', ERROR: 'var(--red,#ef4444)', DEBUG: 'var(--muted)' };
  list.innerHTML = _systemLogs.slice().reverse().map(l => `
    <div style="display:flex;gap:12px;padding:8px 0;border-bottom:1px solid var(--border);font-family:monospace;font-size:12px">
      <span style="color:var(--muted);white-space:nowrap">${l.time}</span>
      <span style="color:${colorMap[l.level]||'var(--ink)'};font-weight:600;min-width:48px">${l.level}</span>
      <span style="color:var(--soft)">${l.msg}</span>
    </div>
  `).join('');
}

function addLog(level, msg) {
  _systemLogs.push({ time: new Date().toLocaleTimeString(), level, msg });
  renderLogs();
}

function handleClearLogs() {
  _systemLogs = [{ time: new Date().toLocaleTimeString(), level: 'INFO', msg: 'Logs purged by administrator' }];
  renderLogs();
  toast('System logs cleared.');
}

function handleSaveConfig() {
  addLog('INFO', 'System configuration saved by admin');
  toast('Configuration saved.');
}

function approveUser(id) {
  toast('User approved.');
  addLog('INFO', `User ${id} approved by admin`);
}

/* =====================================================
   INITIALIZATION
   ===================================================== */
async function initPage() {
  const user = JSON.parse(sessionStorage.getItem('currentUser'));
  if (!user) return;

  // Branding
  document.getElementById('sbAvatar').textContent = user.name.charAt(0).toUpperCase();
  document.getElementById('sbUname').textContent = user.name;
  const topAvatar = document.getElementById('topAvatar');
  if (topAvatar) topAvatar.textContent = user.name.charAt(0).toUpperCase();

  // Fetch all users
  const allUsers = await window.ApiAdapter.fetchAllUsers();

  // Metrics
  const statRow = document.getElementById('su-stat-row');
  if (statRow) {
    const activeSessions = Math.floor(allUsers.length * 0.7); // Mocked session count
    statRow.innerHTML = `
      <div class="stat-card"><div class="sc-label">Total End-Users</div><div class="sc-val">${allUsers.length}</div></div>
      <div class="stat-card"><div class="sc-label">Active Auth-Sessions</div><div class="sc-val">${activeSessions}</div></div>
      <div class="stat-card"><div class="sc-label">System Deficiencies</div><div class="sc-val red">0</div></div>
      <div class="stat-card"><div class="sc-label">Core Uptime</div><div class="sc-val">99.9%</div></div>
    `;
  }

  // Table
  renderTable(allUsers);

  // Directory Stats
  const roles = allUsers.reduce((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {});

  const statMap = {
    'stat-stu': roles.student || 0,
    'stat-fac': roles.faculty || 0,
    'stat-head': roles.head || roles.academic_head || 0,
    'stat-adm': (roles.admin || 0) + (roles.superuser || 0)
  };

  Object.entries(statMap).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  });

  // Bug Reports from backend
  const bugReports = await window.ApiAdapter.fetchReports().catch(() => []);
  const list = document.getElementById('bug-reports-list');
  if (list) {
    list.innerHTML = (bugReports && bugReports.length) ? bugReports.map(r => `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:12px;border:1px solid var(--border);border-radius:8px;margin-bottom:8px">
        <div style="flex:1">
          <div style="font-weight:600;font-size:13px">${r.title || 'Bug Report'}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:3px">${r.description || ''}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:3px">Reporter: ${r.reporter_id || 'Unknown'}</div>
        </div>
        <span class="status-pill ${(r.status||'pending').toLowerCase()}">${r.status || 'PENDING'}</span>
      </div>
    `).join('') : '<div style="text-align:center;padding:24px;color:var(--muted)">No bug reports yet.</div>';
  }

  // Logs
  addLog('INFO', `Page refreshed — ${allUsers.length} users loaded`);
  renderLogs();
}

// Initialize on page load and listen for changes
document.addEventListener('superuser:changed', initPage);
initPage();
