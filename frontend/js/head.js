/**
 * head.js - Academic Head Portal Scripts
 * BarelyPassing - Academic Progress & Outcome Tracking
 */

// Check authentication on page load
(function checkAuth() {
  const currentUser = getCurrentUser();
  if (!currentUser || (currentUser.role !== 'head' && currentUser.role !== 'admin' && currentUser.role !== 'superuser')) {
    window.location.href = 'login.html';
    return;
  }
})();

/* =====================================================
   CORE UI LOGIC
   ===================================================== */
function switchPanel(name, el) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sb-nav a, .sb-footer a').forEach(a => a.classList.remove('active'));
  document.getElementById('panel-' + name).classList.add('active');
  if (el) el.classList.add('active');
  const titles = {
    dashboard: 'Academic Head Dashboard',
    reports: 'Institutional Reports',
    events: 'Event Scheduler',
    resources: 'Facility Management',
    fees: 'Fee Compliance',
    users: 'User Directory',
    attendance: 'Attendance Overrides',
    leaves: 'Leave Management',
    settings: 'Portal Settings'
  };
  document.getElementById('topbarTitle').textContent = titles[name] || 'Academic Head';
  if (window.innerWidth < 768) closeSidebar();
}

function switchReportTab(el, catId) {
  document.querySelectorAll('.report-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  ['rcat-performance', 'rcat-attendance', 'rcat-outcomes', 'rcat-resource'].forEach(id => {
    const target = document.getElementById(id);
    if (target) target.style.display = id === catId ? 'block' : 'none';
  });
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

/* =====================================================
   VALIDATION ENGINE
   ===================================================== */
function validateForm(modalId, fields) {
  clearErrors(modalId);
  let isValid = true;
  const modal = document.getElementById(modalId);

  fields.forEach(f => {
    const input = document.getElementById(f.id);
    const val = input.value.trim();
    let error = '';

    if (f.required && !val) {
      error = 'This field is required.';
    } else if (f.min && val.length < f.min) {
      error = `Minimum ${f.min} characters required.`;
    } else if (f.type === 'email' && val && !/^\S+@\S+\.\S+$/.test(val)) {
      error = 'Invalid email format.';
    } else if (f.matchId) {
      if (val !== document.getElementById(f.matchId).value.trim()) {
        error = 'Passwords do not match.';
      }
    } else if (f.numeric && val && isNaN(val)) {
      error = 'Must be a number.';
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

function clearErrors(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.querySelectorAll('.form-field').forEach(f => f.classList.remove('has-error'));
  modal.querySelectorAll('.field-error').forEach(e => e.remove());
}

function _headRefresh(section) {
  document.dispatchEvent(new CustomEvent('head:changed', { detail: { section } }));
}

// Dashboard stats and reports handled by initPage()
function renderStats() { }
function renderReports() {
  const el = document.getElementById('report-items-performance');
  if (el && el.innerHTML.trim() === '') {
    el.innerHTML = '<p style=color:var(--muted);font-size:13px>Reports generated from assessment data.</p>';
  }
}

function handleAddEvent() {
  const today =  = new Date().toISOString().split('T')[0];
  
  const config = [
    { id: 'ev-title', required: true, min: 5, max: 200, message: 'Event title must be 5-200 characters' },
    { id: 'ev-date', required: true, type: 'date', minDate: today, message: 'Event date must be in the future' },
    { id: 'ev-time', required: true, type: 'time', message: 'Select a valid time' },
    { id: 'ev-venue', required: true, min: 3, max: 100, message: 'Venue must be 3-100 characters' },
    { id: 'ev-desc', required: false, min: 10, max: 500, message: 'Description must be 10-500 characters' }
  ];
  if (!validateForm('modalAddEvent', config)) return;

  const db = 
  // [migrated: */
  closeModal('modalAddEvent');
  toast('Event scheduled successfully');
  _headRefresh('events');
}

function renderEvents() {
  const events = window._headEvents || [];
  const list = document.getElementById('events-list');
  const colors = { training: 'blue', meeting: 'green', review: 'amber', event: 'violet' };
  list.innerHTML = events.map(e => `
    <div class="event-card">
      <div class="event-info">
         <div class="event-title">${e.title} <span class="event-type-badge ${colors[e.type] || 'blue'}">${e.type}</span></div>
         <div class="event-meta">${e.dateTime} · ${e.venue}</div>
         <p class="event-desc">${e.description || 'No description provided.'}</p>
      </div>
      <button class="btn btn-red btn-sm" onclick="handleDeleteEvent(${e.id})">Delete</button>
    </div>
  `).join('');
}

function handleDeleteEvent(id) {
  const db = 
  // [migrated: */
  _headRefresh('events');
  toast('Event deleted');
}

// Resources
function handleAddResource() {
  const config = [
    { id: 'res-name', required: true, min: 3, max: 100, message: 'Resource name must be 3-100 characters' },
    { id: 'res-type', required: true, message: 'Please select resource type' },
    { id: 'res-cap', required: true, type: 'amount', minValue: 1, maxValue: 10000, message: 'Capacity must be 1-10000' }
  ];
  if (!validateForm('modalAddResource', config)) return;

  const db = 
  // [migrated: */
  closeModal('modalAddResource');
  toast('Resource added');
  _headRefresh('resources');
}

function renderResources() {
  const facilities = window._headResources || [];
  const tbody = document.getElementById('resources-tbody');
  tbody.innerHTML = facilities.map(f => `
    <tr>
      <td>${f.id}</td>
      <td><strong>${f.name}</strong></td>
      <td>${f.type}</td>
      <td>${f.capacity}</td>
      <td><span class="resource-badge ${f.status}">${f.status}</span></td>
      <td>${f.nextScheduled}</td>
      <td class="action-cell">
         <button class="btn btn-outline btn-sm" onclick="handleDeleteResource('${f.id}')">Remove</button>
      </td>
    </tr>
  `).join('');
}

function handleDeleteResource(id) {
  const db = 
  // [migrated: */
  _headRefresh('resources');
  toast('Resource removed');
}

// Fees
function renderFees() {
  const db = { defaulters: window._headFees || [] };
  const search = document.getElementById('feeSearch').value.toLowerCase();
  const dept = document.getElementById('feeDeptFilter').value;

  const list = db.defaulters.filter(d => {
    const matchSearch = d.name.toLowerCase().includes(search) || d.rollNumber.toLowerCase().includes(search);
    const matchDept = dept === 'All' || d.department === dept;
    return matchSearch && matchDept;
  });

  document.getElementById('fee-tbody').innerHTML = list.map(d => `
    <tr>
      <td>${d.rollNumber}</td>
      <td><strong>${d.name}</strong></td>
      <td>${d.department}</td>
      <td>Sem ${d.semester}</td>
      <td style="color:var(--red);font-weight:600">₹${d.dueAmount}</td>
      <td><span class="status-pill minimal">${d.daysOverdue} days</span></td>
      <td>${d.lastReminder}</td>
      <td><button class="btn btn-blue btn-sm" onclick="toast('Reminder sent to ${d.name}')">Remind</button></td>
    </tr>
  `).join('');

  // Stats
  const s = db.summary;
  document.getElementById('fee-stats').innerHTML = `
    <div class="stat-card"><div class="sc-label">Total Outstanding</div><div class="sc-val">${s.totalOutstanding}</div></div>
    <div class="stat-card"><div class="sc-label">Defaulters</div><div class="sc-val">${s.totalDefaulters}</div></div>
    <div class="stat-card"><div class="sc-label">Reminders Sent</div><div class="sc-val">${s.remindersSent}</div></div>
    <div class="stat-card"><div class="sc-label">Resolved</div><div class="sc-val">${s.monthPaidCount}</div></div>
  `;
}

// Users
function handleAddUser() {
  const config = [
    { id: 'u-name', required: true, min: 3, max: 100, type: 'name', message: 'Name must be 3-100 characters' },
    { id: 'u-email', required: true, type: 'email', message: 'Please enter a valid institutional email' },
    { id: 'u-role', required: true, message: 'Please select a role' }
  ];
  if (!validateForm('modalAddUser', config)) return;

  const db = 
  // [migrated: */
  closeModal('modalAddUser');
  toast('User account created');
  _headRefresh('users');
  renderUserStats();
}

function renderUsers() {
  const users = .admin.userManagement.users;
  document.getElementById('users-tbody').innerHTML = users.map(u => `
    <tr>
      <td>${u.id}</td>
      <td><strong>${u.name}</strong></td>
      <td>${u.email}</td>
      <td>${u.role}</td>
      <td><span class="status-pill available">${u.status}</span></td>
      <td><button class="btn btn-outline btn-sm" onclick="handleDeleteUser('${u.id}')">Delete</button></td>
    </tr>
  `).join('');
}

function handleDeleteUser(id) {
  const db = 
  // [migrated: */
  _headRefresh('users');
  toast('User deleted');
}

function renderUserStats() {
  const users = .admin.userManagement.users;
  const total = users.length;
  const active = users.filter(u => u.status === 'active').length;
  const pending = users.filter(u => u.status === 'pending').length;
  const totalEl = document.getElementById('statTotalUsers');
  const activeEl = document.getElementById('statActiveUsers');
  const pendingEl = document.getElementById('statPendingReviews');
  if (totalEl) totalEl.textContent = total;
  if (activeEl) activeEl.textContent = active;
  if (pendingEl) pendingEl.textContent = pending;
}

// Attendance Overrides
function handleAddOverride() {
  const config = [
    { id: 'ao-name', required: true },
    { id: 'ao-roll', required: true },
    { id: 'ao-date', required: true },
    { id: 'ao-reason', required: true, min: 10 }
  ];
  if (!validateForm('modalAddOverride', config)) return;

  const db = 
  // [migrated: */
  closeModal('modalAddOverride');
  toast('Override applied');
  _headRefresh('attendance');
}

function renderOverrides() {
  const records = .admin.attendanceOverride.records;
  document.getElementById('override-tbody').innerHTML = records.map(r => `
    <tr>
      <td>${r.id}</td>
      <td><strong>${r.name}</strong></td>
      <td>${r.roll}</td>
      <td>${r.date}</td>
      <td><span class="status-pill minimal">${r.status}</span></td>
      <td>${r.reason}</td>
      <td><button class="btn btn-red btn-sm" onclick="handleDeleteOverride('${r.id}')">Undo</button></td>
    </tr>
  `).join('');
}

function handleDeleteOverride(id) {
  const db = 
  // [migrated: */
  _headRefresh('attendance');
  toast('Override reverted');
}

/* --- Correction Requests (from Students) --- */
let _activeCorrId = null;

function renderCorrectionRequests() {
  const db = 
}

function openCorrectionDecision(id) {
  _activeCorrId = id;
  const db = 
}

function handleDecideCorrection(decision) {
  const db = 

  // [migrated: */
  closeModal('modalDecideCorrection');
  _headRefresh('attendance');
  toast(`Correction request ${decision}`);
}

/* --- Leave Management CRUD --- */
let _activeLeaveId = null;

function renderLeaves() {
  const db = 
}

function openLeaveDecision(id) {
  _activeLeaveId = id;
  const db = 
}

function handleDecideLeave(decision) {
  const db = 

  // [migrated: */
  closeModal('modalDecideLeave');
  _headRefresh('leaves');
  toast(`Leave application ${decision.toLowerCase()}`);
}

/* --- Reports CRUD --- */
function handleAddReport() {
  const config = [
    { id: 'rep-title', required: true, min: 5 },
    { id: 'rep-desc', required: true, min: 10 },
    { id: 'rep-period', required: true, min: 3 }
  ];
  if (!validateForm('modalAddReport', config)) return;

  const db = 
  // [migrated: */
  closeModal('modalAddReport');
  toast('Report added');
  document.getElementById('rep-title').value = '';
  document.getElementById('rep-desc').value = '';
  document.getElementById('rep-period').value = '';
  document.getElementById('rep-size').value = '';
  renderReports();
}

let _editRepCat = null;
function openEditReport(id, cat) {
  _editRepCat = cat;
  const db = 
}

function handleEditReport() {
  const config = [
    { id: 'edit-rep-title', required: true, min: 5 },
    { id: 'edit-rep-desc', required: true, min: 10 },
    { id: 'edit-rep-period', required: true, min: 3 }
  ];
  if (!validateForm('modalEditReport', config)) return;

  const db = 
  // [migrated: */
  closeModal('modalEditReport');
  toast('Report updated');
  renderReports();
}

function handleDeleteReport(id, cat) {
  const db = 
  // [migrated: */
  toast('Report deleted');
  renderReports();
}

// Settings
function handleUpdatePassword() {
  const config = [
    { id: 'p-curr', required: true },
    { id: 'p-new', required: true, min: 8 },
    { id: 'p-conf', required: true, matchId: 'p-new' }
  ];
  if (!validateForm('panel-settings', config)) return;
  toast('Password changed successfully');
  document.getElementById('p-curr').value = '';
  document.getElementById('p-new').value = '';
  document.getElementById('p-conf').value = '';
}

function handleSubmitBug() {
  const config = [
    { id: 'bug-title', required: true, min: 5 },
    { id: 'bug-desc', required: true, min: 15 }
  ];
  if (!validateForm('modalReportBug', config)) return;

  const db = 
  closeModal('modalReportBug');
  toast('Bug report submitted');
}

/* =====================================================
   INITIALIZATION & EVENTS
   ===================================================== */
async function initPage() {
  const user = JSON.parse(sessionStorage.getItem('currentUser'));
  if (!user) return;

  const displayName = user.name || 'Academic Head';
  document.getElementById('sb-initial').textContent = displayName.charAt(0).toUpperCase();
  document.getElementById('sb-name').textContent = displayName;
  const accEmail = document.getElementById('account-email');
  if (accEmail) accEmail.textContent = user.email || 'head@example.com';
  const accId = document.getElementById('account-id');
  if (accId) accId.textContent = user.user_id || 'HEAD01';

  // Fetch all data in parallel
  const [users, leaves, events, resources, payments, reports, assessments] = await Promise.all([
    window.ApiAdapter.fetchAllUsers(),
    window.ApiAdapter.fetchLeaves(),
    window.ApiAdapter.fetchEvents(),
    window.ApiAdapter.fetchResources(),
    window.ApiAdapter.fetchFeePayments(),
    window.ApiAdapter.fetchReports(),
    window.ApiAdapter.fetchAssessments()
  ]);

  const students = (users || []).filter(u => u.role === 'student');
  const faculty  = (users || []).filter(u => u.role === 'faculty');
  const pendingLeaves = (leaves || []).filter(l => l.status === 'PENDING').length;

  // Dashboard stats
  const statsEl = document.getElementById('stats-grid');
  if (statsEl) statsEl.innerHTML = `
    <div class="stat-card"><div class="sc-label">Total Students</div><div class="sc-val">${students.length}</div></div>
    <div class="stat-card"><div class="sc-label">Faculty Members</div><div class="sc-val">${faculty.length}</div></div>
    <div class="stat-card"><div class="sc-label">Active Courses</div><div class="sc-val">${(assessments||[]).length}</div></div>
    <div class="stat-card"><div class="sc-label">Pending Leaves</div><div class="sc-val" style="color:var(--amber)">${pendingLeaves}</div></div>
  `;

  // Users table
  const tbody = document.getElementById('users-tbody');
  if (tbody) tbody.innerHTML = (users||[]).length
    ? (users||[]).map(u => `<tr><td>${u.user_id.slice(0,8)}…</td><td><strong>${u.username||u.email}</strong></td><td>${u.email}</td><td>${u.role}</td><td><span class="status-pill available">active</span></td><td><button class="btn btn-outline btn-sm" onclick="handleDeleteUser('${u.user_id}')">Delete</button></td></tr>`).join('')
    : '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:16px">No users found.</td></tr>';
  const totalEl = document.getElementById('statTotalUsers');
  const activeEl = document.getElementById('statActiveUsers');
  const pendingEl = document.getElementById('statPendingReviews');
  if (totalEl) totalEl.textContent = (users||[]).length;
  if (activeEl) activeEl.textContent = (users||[]).length;
  if (pendingEl) pendingEl.textContent = pendingLeaves;

  // Events
  renderEvents();

  // Resources
  renderResources();

  // Leaves
  renderLeaves();

  // Fees
  renderFees();

  // Reports
  renderReports();

  // Attendance
  renderOverrides();
  renderCorrectionRequests();
}

// Initialize on page load and listen for changes
document.addEventListener('head:changed', (e) => {
  const s = e.detail?.section;
  if (s === 'events') renderEvents();
  else if (s === 'resources') renderResources();
  else if (s === 'fees') renderFees();
  else if (s === 'users') initPage();
  else if (s === 'attendance') { renderOverrides(); renderCorrectionRequests(); }
  else if (s === 'leaves') renderLeaves();
  else initPage();
});

initPage();
