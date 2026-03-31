/**
 * head.js - Academic Head Portal Controller
 * Handles institutional reports, resource management, and user administration
 */

document.addEventListener('DOMContentLoaded', () => {
  // Protect route
  if (!StateManager.protectRoute(['head', 'admin', 'superuser'])) {
    return;
  }
  
  initPage();
  document.addEventListener('head:changed', initPage);
});

function initPage() {
  const db = StateManager.getDB();
  if (!db || !db.admin) return;
  
  const data = db.admin;
  
  // Update sidebar
  document.getElementById('sb-initial').textContent = data.settings.account.userId[0].toUpperCase();
  document.getElementById('sb-name').textContent = data.settings.account.userId;
  document.getElementById('account-email').textContent = data.settings.account.email;
  document.getElementById('account-id').textContent = data.settings.account.userId;
  
  renderStats(data);
  renderEvents(data);
  renderResources(data);
  renderFees(data);
  renderUsers(data);
  renderOverrides(data);
  renderDepartmentChart(data);
}

function renderStats(data) {
  const s = data.dashboard.institutionalStats;
  document.getElementById('head-stat-row').innerHTML = `
    <div class="stat-card"><div class="sc-label">Total Students</div><div class="sc-val">${s.totalStudents}</div></div>
    <div class="stat-card"><div class="sc-label">Faculty Members</div><div class="sc-val">${s.facultyMembers}</div></div>
    <div class="stat-card"><div class="sc-label">Active Courses</div><div class="sc-val">${s.activeCourses}</div></div>
    <div class="stat-card"><div class="sc-label">Avg Attainment</div><div class="sc-val">${s.avgAttainment}</div></div>
  `;
}

function renderDepartmentChart(data) {
  const depts = data.dashboard.departments;
  document.getElementById('dept-bar-chart').innerHTML = depts.map(d => `
    <div class="bar-col">
      <div class="bar-val">${d.passRate}%</div>
      <div class="bar-fill" style="height:${d.passRate}%"></div>
      <div class="bar-label">${d.id}</div>
    </div>
  `).join('');
  
  document.getElementById('dept-stats').innerHTML = depts.map(d => `
    <div class="dept-stat">
      <div class="dept-stat-name">${d.id}</div>
      <div class="dept-stat-val">${d.students}</div>
      <div class="dept-stat-sub">Students</div>
    </div>
  `).join('');
}

function renderEvents(data) {
  const events = data.eventScheduler.events;
  const colors = { training: 'blue', meeting: 'green', review: 'amber', event: 'violet' };
  
  document.getElementById('events-list').innerHTML = events.map(e => `
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

function renderResources(data) {
  const facilities = data.resources.facilities;
  document.getElementById('resources-tbody').innerHTML = facilities.map(f => `
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

function renderFees(data) {
  const search = document.getElementById('feeSearch')?.value.toLowerCase() || '';
  const dept = document.getElementById('feeDeptFilter')?.value || 'All';
  
  const list = data.feeCompliance.defaulters.filter(d => {
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
  
  const s = data.feeCompliance.summary;
  document.getElementById('fee-stats').innerHTML = `
    <div class="stat-card"><div class="sc-label">Total Outstanding</div><div class="sc-val">${s.totalOutstanding}</div></div>
    <div class="stat-card"><div class="sc-label">Defaulters</div><div class="sc-val">${s.totalDefaulters}</div></div>
    <div class="stat-card"><div class="sc-label">Reminders Sent</div><div class="sc-val">${s.remindersSent}</div></div>
    <div class="stat-card"><div class="sc-label">Resolved</div><div class="sc-val">${s.monthPaidCount}</div></div>
  `;
}

function renderUsers(data) {
  const users = data.userManagement.users;
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

function renderOverrides(data) {
  const records = data.attendanceOverride.records;
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

function validateForm(modalId, fields) {
  Auth.clearAllErrors(modalId);
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
    } else if (f.type === 'email' && val && !Auth.patterns.email.test(val)) {
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

function _headRefresh(section) {
  document.dispatchEvent(new CustomEvent('head:changed', { detail: { section } }));
}

function _nextId(arr) {
  if (!arr || arr.length === 0) return 1;
  return Math.max(...arr.map(x => Number(x.id) || 0)) + 1;
}

function handleAddEvent() {
  if (!validateForm('modalAddEvent', [
    { id: 'ev-title', required: true, min: 5 },
    { id: 'ev-date', required: true },
    { id: 'ev-time', required: true },
    { id: 'ev-venue', required: true }
  ])) return;
  
  const db = StateManager.getDB();
  const newEv = {
    id: _nextId(db.admin.eventScheduler.events),
    title: document.getElementById('ev-title').value,
    type: document.getElementById('ev-type').value,
    dateTime: `${document.getElementById('ev-date').value} at ${document.getElementById('ev-time').value}`,
    venue: document.getElementById('ev-venue').value,
    description: document.getElementById('ev-desc').value
  };
  
  db.admin.eventScheduler.events.push(newEv);
  StateManager.saveDB(db);
  closeModal('modalAddEvent');
  toast('Event scheduled successfully');
  _headRefresh('events');
}

function handleDeleteEvent(id) {
  const db = StateManager.getDB();
  db.admin.eventScheduler.events = db.admin.eventScheduler.events.filter(e => e.id !== id);
  StateManager.saveDB(db);
  _headRefresh('events');
  toast('Event deleted');
}

function handleAddResource() {
  if (!validateForm('modalAddResource', [
    { id: 'res-name', required: true },
    { id: 'res-type', required: true },
    { id: 'res-cap', required: true, numeric: true }
  ])) return;
  
  const db = StateManager.getDB();
  const res = {
    id: 'RES-' + Math.floor(Math.random()*1000),
    name: document.getElementById('res-name').value,
    type: document.getElementById('res-type').value,
    capacity: document.getElementById('res-cap').value,
    status: 'available',
    nextScheduled: 'Not scheduled'
  };
  
  db.admin.resources.facilities.push(res);
  StateManager.saveDB(db);
  closeModal('modalAddResource');
  toast('Resource added');
  _headRefresh('resources');
}

function handleDeleteResource(id) {
  const db = StateManager.getDB();
  db.admin.resources.facilities = db.admin.resources.facilities.filter(f => f.id !== id);
  StateManager.saveDB(db);
  _headRefresh('resources');
  toast('Resource removed');
}

function handleAddUser() {
  if (!validateForm('modalAddUser', [
    { id: 'u-name', required: true, min: 3 },
    { id: 'u-email', required: true, type: 'email' }
  ])) return;
  
  const db = StateManager.getDB();
  const user = {
    id: 'U-' + Math.floor(Math.random()*1000),
    name: document.getElementById('u-name').value,
    email: document.getElementById('u-email').value,
    role: document.getElementById('u-role').value,
    status: 'active'
  };
  
  db.admin.userManagement.users.push(user);
  StateManager.saveDB(db);
  closeModal('modalAddUser');
  toast('User account created');
  _headRefresh('users');
}

function handleDeleteUser(id) {
  const db = StateManager.getDB();
  db.admin.userManagement.users = db.admin.userManagement.users.filter(u => u.id !== id);
  StateManager.saveDB(db);
  _headRefresh('users');
  toast('User deleted');
}

function handleAddOverride() {
  if (!validateForm('modalAddOverride', [
    { id: 'ao-name', required: true },
    { id: 'ao-roll', required: true },
    { id: 'ao-date', required: true },
    { id: 'ao-reason', required: true, min: 10 }
  ])) return;
  
  const db = StateManager.getDB();
  const rec = {
    id: 'O' + Math.floor(Math.random()*100),
    name: document.getElementById('ao-name').value,
    roll: document.getElementById('ao-roll').value,
    date: document.getElementById('ao-date').value,
    status: document.getElementById('ao-status').value,
    reason: document.getElementById('ao-reason').value
  };
  
  db.admin.attendanceOverride.records.push(rec);
  StateManager.saveDB(db);
  closeModal('modalAddOverride');
  toast('Override applied');
  _headRefresh('attendance');
}

function handleDeleteOverride(id) {
  const db = StateManager.getDB();
  db.admin.attendanceOverride.records = db.admin.attendanceOverride.records.filter(r => r.id !== id);
  StateManager.saveDB(db);
  _headRefresh('attendance');
  toast('Override reverted');
}

function handleUpdatePassword() {
  if (!validateForm('panel-settings', [
    { id: 'p-curr', required: true },
    { id: 'p-new', required: true, min: 8 },
    { id: 'p-conf', required: true, matchId: 'p-new' }
  ])) return;
  
  toast('Password changed successfully');
  document.getElementById('p-curr').value = '';
  document.getElementById('p-new').value = '';
  document.getElementById('p-conf').value = '';
}

function handleSubmitBug() {
  if (!validateForm('modalReportBug', [
    { id: 'bug-title', required: true, min: 5 },
    { id: 'bug-desc', required: true, min: 15 }
  ])) return;
  
  const db = StateManager.getDB();
  const report = {
    title: document.getElementById('bug-title').value,
    category: document.getElementById('bug-cat').value,
    severity: document.getElementById('bug-sev').value,
    description: document.getElementById('bug-desc').value,
    portalName: 'Academic Head Portal',
    submitterName: db.admin.settings.account.userId
  };
  
  if (typeof submitBugReport === 'function') {
    submitBugReport(report);
  }
  
  closeModal('modalReportBug');
  toast('Bug report submitted');
}

// Make functions globally available
window.switchPanel = switchPanel;
window.switchReportTab = switchReportTab;
window.showModal = showModal;
window.closeModal = closeModal;
window.closeModalBg = closeModalBg;
window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;
window.toast = toast;
window.handleAddEvent = handleAddEvent;
window.handleDeleteEvent = handleDeleteEvent;
window.handleAddResource = handleAddResource;
window.handleDeleteResource = handleDeleteResource;
window.handleAddUser = handleAddUser;
window.handleDeleteUser = handleDeleteUser;
window.handleAddOverride = handleAddOverride;
window.handleDeleteOverride = handleDeleteOverride;
window.handleUpdatePassword = handleUpdatePassword;
window.handleSubmitBug = handleSubmitBug;