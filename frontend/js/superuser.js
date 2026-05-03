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

function handleAddUser() {
  const cfg = [
    { id: 'u-name', required: true, min: 3 },
    { id: 'u-email', required: true, type: 'email' },
    { id: 'u-role', required: true },
    { id: 'u-status', required: true }
  ];
  if (!validateForm('modalAddUser', cfg)) return;
  toast('Backend API call for user provisioning not yet wired.');
  closeModal('modalAddUser');
}

function filterTable() {
  toast('User filter: backend API not yet wired.');
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

function performDelete() {
  toast('Backend API call for user deletion not yet wired.');
  closeModal('modalConfirmDelete');
}

function openEditModal(id) {
  toast('Backend API call for user edit not yet wired.');
}

function handleUpdateUser() {
  toast('Backend API call for user update not yet wired.');
  closeModal('modalEditUser');
}

function renderLogs() {
  const list = document.getElementById('log-entries');
  if (list) list.innerHTML = '<div style="text-align:center;padding:24px;color:var(--muted)">Logs fetched from backend.</div>';
}

function handleClearLogs() {
  toast('Backend API call for log clearing not yet wired.');
}

function renderBugReports() {
  const list = document.getElementById('bug-reports-list');
  if (list) list.innerHTML = '<div style="text-align:center;padding:24px;color:var(--muted)">Bug reports fetched from backend.</div>';
}

function viewBug(id) {
  toast('Backend API call for bug detail not yet wired.');
}

function setBugStatus(id, s) {
  toast(`Bug status update: backend API not yet wired.`);
}

function assignBug(id) {
  closeModal('modalBugDetail');
  toast('Assigned to Dev Team');
}

function handleSaveConfig() {
  toast('Backend API call for config save not yet wired.');
}

function approveUser(id) {
  toast('Backend API call for user approval not yet wired.');
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

  // Metrics — placeholders until backend endpoint is wired
  const statRow = document.getElementById('su-stat-row');
  if (statRow) statRow.innerHTML = `
    <div class="stat-card"><div class="sc-label">Total End-Users</div><div class="sc-val">TBD</div></div>
    <div class="stat-card"><div class="sc-label">Active Auth-Sessions</div><div class="sc-val">TBD</div></div>
    <div class="stat-card"><div class="sc-label">System Deficiencies</div><div class="sc-val red">TBD</div></div>
    <div class="stat-card"><div class="sc-label">Core Uptime</div><div class="sc-val">TBD</div></div>
  `;

  // Counters
  ['errCount','warnCount','bugCount','resCount'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '0';
  });

  // Table & Logs
  renderTable([]);
  renderLogs();
  renderBugReports();

  // Directory Stats
  document.querySelectorAll('.dir-stat-val').forEach(s => s.textContent = '0');

  // Pending Approvals
  const pendingBody = document.getElementById('pendingUsersBody');
  if (pendingBody) pendingBody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:16px;color:var(--muted)">Pending users fetched from backend.</td></tr>';
}

// Initialize on page load and listen for changes
document.addEventListener('superuser:changed', initPage);
initPage();
