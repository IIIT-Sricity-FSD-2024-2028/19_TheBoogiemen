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

// API shortcut
const _api = () => window.API_CLIENT?.api;

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

/* =====================================================
   CRUD OPERATIONS (Integrated)
   ===================================================== */
function _headRefresh(section) {
  document.dispatchEvent(new CustomEvent('head:changed', { detail: { section } }));
}

function _nextId(arr) {
  if (!arr || arr.length === 0) return 1;
  return Math.max(...arr.map(x => Number(x.id) || 0)) + 1;
}

// Dashboard
function renderStats() {
  const db = getDB().admin.dashboard.institutionalStats;
  const row = document.getElementById('head-stat-row');
  row.innerHTML = `
    <div class="stat-card"><div class="sc-label">Total Students</div><div class="sc-val">${db.totalStudents}</div></div>
    <div class="stat-card"><div class="sc-label">Faculty Members</div><div class="sc-val">${db.facultyMembers}</div></div>
    <div class="stat-card"><div class="sc-label">Active Courses</div><div class="sc-val">${db.activeCourses}</div></div>
    <div class="stat-card"><div class="sc-label">Avg Attainment</div><div class="sc-val">${db.avgAttainment}</div></div>
  `;
}

// Reports — populate all four category tabs
function renderReports() {
  const cats = getDB().admin.reports.categories;
  const tabMap = {
    'Academic Performance': 'report-items-performance',
    'Attendance': 'rcat-attendance',
    'Outcomes Assessment': 'rcat-outcomes',
    'Resource Allocation': 'rcat-resource'
  };

  // Wrap bare category divs (attendance/outcomes/resource) in a report-category container if not already done
  ['rcat-attendance', 'rcat-outcomes', 'rcat-resource'].forEach(id => {
    const el = document.getElementById(id);
    if (el && !el.querySelector('.report-category')) {
      const titleMap = {
        'rcat-attendance': 'Attendance Reports',
        'rcat-outcomes': 'Outcomes Assessment Reports',
        'rcat-resource': 'Resource Allocation Reports'
      };
      el.innerHTML = `
        <div class="report-category">
          <div class="report-cat-title">${titleMap[id]}</div>
          <div class="report-cat-sub">Download or generate reports for this category</div>
          <div id="report-items-${id.replace('rcat-', '')}"></div>
        </div>`;
    }
  });

  Object.entries(cats).forEach(([catName, items]) => {
    const elId = tabMap[catName];
    // Inline performance target, use dynamic id for others
    const targetEl = catName === 'Academic Performance'
      ? document.getElementById('report-items-performance')
      : document.getElementById('report-items-' + elId.replace('rcat-', ''));
    if (!targetEl) return;    targetEl.innerHTML = items.map(r => `
      <div class="report-card" style="display:flex;justify-content:space-between;align-items:flex-start;padding:14px;border:1px solid var(--border);border-radius:10px;margin-bottom:10px">
        <div style="flex:1">
          <div style="font-weight:600;font-size:14px">${r.title}</div>
          <div style="font-size:12px;color:var(--muted);margin-top:3px">${r.description}</div>
          <div style="margin-top:6px;display:flex;gap:8px;flex-wrap:wrap">
            <span style="font-size:11px;background:var(--bg);border:1px solid var(--border);padding:2px 8px;border-radius:4px">${r.period}</span>
            <span style="font-size:11px;background:var(--bg);border:1px solid var(--border);padding:2px 8px;border-radius:4px">${r.fileSize}</span>
            <span style="font-size:11px;background:var(--bg);border:1px solid var(--border);padding:2px 8px;border-radius:4px">${r.id}</span>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;margin-left:16px">
          <div style="display:flex;gap:6px">
            <button class="btn btn-outline btn-sm" onclick="toast('Previewing ${r.id}\u2026')">Preview</button>
            <button class="btn btn-primary btn-sm" onclick="toast('Downloading ${r.id}\u2026')">Download</button>
          </div>
          <div style="display:flex;gap:6px">
            <button class="btn btn-blue btn-sm" onclick="openEditReport('${r.id}','${catName}')">Edit</button>
            <button class="btn btn-red btn-sm" onclick="handleDeleteReport('${r.id}','${catName}')">Delete</button>
          </div>
        </div>
      </div>
    `).join('');
  });
}


// Events
async function handleAddEvent() {
  const eventDate = document.getElementById('ev-date').value;
  const today = new Date().toISOString().split('T')[0];
  
  const config = [
    { id: 'ev-title', required: true, min: 5, max: 200, message: 'Event title must be 5-200 characters' },
    { id: 'ev-date', required: true, type: 'date', minDate: today, message: 'Event date must be in the future' },
    { id: 'ev-time', required: true, type: 'time', message: 'Select a valid time' },
    { id: 'ev-venue', required: true, min: 3, max: 100, message: 'Venue must be 3-100 characters' },
    { id: 'ev-desc', required: false, min: 10, max: 500, message: 'Description must be 10-500 characters' }
  ];
  if (!validateForm('modalAddEvent', config)) return;

  // 1. Always update local DB first
  const db = getDB();
  const newEv = {
    id: _nextId(db.admin.eventScheduler.events),
    title: document.getElementById('ev-title').value,
    type: document.getElementById('ev-type').value,
    dateTime: `${document.getElementById('ev-date').value} at ${document.getElementById('ev-time').value}`,
    venue: document.getElementById('ev-venue').value,
    description: document.getElementById('ev-desc').value
  };
  db.admin.eventScheduler.events.push(newEv);
  saveDB(db);

  // 2. Fire API in background
  const api = _api();
  if (api) {
    try {
      await api.post('/resources/events', {
        resource_id: '158ec2d8-2b81-4b77-aa97-15ea2fb54611',
        start_time: document.getElementById('ev-date').value + 'T' + document.getElementById('ev-time').value + ':00Z',
        end_time: document.getElementById('ev-date').value + 'T' + document.getElementById('ev-time').value + ':00Z',
        event_type: 'seminar'
      });
    } catch (err) {
      console.error('[API] Event sync failed:', err.message);
    }
  }

  toast('Event scheduled successfully');
  closeModal('modalAddEvent');
  _headRefresh('events');
}

function renderEvents() {
  const events = getDB().admin.eventScheduler.events;
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
  const db = getDB();
  db.admin.eventScheduler.events = db.admin.eventScheduler.events.filter(e => e.id !== id);
  saveDB(db);
  _headRefresh('events');
  toast('Event deleted');
}

// Resources
async function handleAddResource() {
  const config = [
    { id: 'res-name', required: true, min: 3, max: 100, message: 'Resource name must be 3-100 characters' },
    { id: 'res-type', required: true, message: 'Please select resource type' },
    { id: 'res-cap', required: true, type: 'amount', minValue: 1, maxValue: 10000, message: 'Capacity must be 1-10000' }
  ];
  if (!validateForm('modalAddResource', config)) return;

  // 1. Always update local DB first
  const db = getDB();
  const res = {
    id: 'RES-' + Math.floor(Math.random() * 1000),
    name: document.getElementById('res-name').value,
    type: document.getElementById('res-type').value,
    capacity: document.getElementById('res-cap').value,
    status: 'available',
    nextScheduled: 'Not scheduled'
  };
  db.admin.resources.facilities.push(res);
  saveDB(db);

  // 2. Fire API in background
  const api = _api();
  if (api) {
    try {
      await api.post('/resources', {
        name: document.getElementById('res-name').value,
        type: document.getElementById('res-type').value,
        capacity: parseInt(document.getElementById('res-cap').value) || 0
      });
    } catch (err) {
      console.error('[API] Resource sync failed:', err.message);
    }
  }

  toast('Resource added');
  closeModal('modalAddResource');
  _headRefresh('resources');
}

function renderResources() {
  const facilities = getDB().admin.resources.facilities;
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

async function handleDeleteResource(id) {
  const db = getDB();
  db.admin.resources.facilities = db.admin.resources.facilities.filter(f => f.id !== id);
  saveDB(db);

  // Send to backend
  const api = _api();
  if (api) {
    try {
      await api.delete('/resources/' + id);
    } catch (err) {
      console.error('[API] Resource deletion sync failed:', err.message);
    }
  }

  _headRefresh('resources');
  toast('Resource removed');
}

// Fees
async function handleFeeReminder() {
  const api = _api();
  if (api) {
    try {
      await api.post('/fee/reminders', { type: 'bulk' });
    } catch (err) {
      console.error('[API] Fee reminder sync failed:', err.message);
    }
  }
  toast('Bulk reminders sent');
}
function renderFees() {
  const db = getDB().admin.feeCompliance;
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
async function handleAddUser() {
  const config = [
    { id: 'u-name', required: true, min: 3, max: 100, type: 'name', message: 'Name must be 3-100 characters' },
    { id: 'u-email', required: true, type: 'email', message: 'Please enter a valid institutional email' },
    { id: 'u-role', required: true, message: 'Please select a role' }
  ];
  if (!validateForm('modalAddUser', config)) return;

  // 1. Always update local DB first
  const db = getDB();
  const user = {
    id: 'U-' + Math.floor(Math.random() * 1000),
    name: document.getElementById('u-name').value,
    email: document.getElementById('u-email').value,
    role: document.getElementById('u-role').value,
    status: 'active'
  };
  db.admin.userManagement.users.push(user);
  saveDB(db);

  // 2. Fire API in background
  const api = _api();
  if (api) {
    try {
      // Map frontend role to backend enum
      const roleMap = { 'Student': 'student', 'Faculty': 'faculty', 'Admin': 'academic_head' };
      const backendRole = roleMap[document.getElementById('u-role').value] || 'student';
      await api.post('/users', {
        username: document.getElementById('u-name').value,
        email: document.getElementById('u-email').value,
        role: backendRole
      });
    } catch (err) {
      console.error('[API] User sync failed:', err.message);
    }
  }

  toast('User account created');
  closeModal('modalAddUser');
  _headRefresh('users');
  renderUserStats();
}

function renderUsers() {
  const users = getDB().admin.userManagement.users;
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

async function handleDeleteUser(id) {
  const db = getDB();
  db.admin.userManagement.users = db.admin.userManagement.users.filter(u => u.id !== id);
  saveDB(db);

  // Send to backend
  const api = _api();
  if (api) {
    try {
      // Map old 'USR-' ID to a valid UUID
      const targetUuid = (id === 'USR-0002') ? '123e4567-e89b-12d3-a456-426614174004' : '123e4567-e89b-12d3-a456-426614174005';
      await api.delete('/users/' + targetUuid);
    } catch (err) {
      console.error('[API] User deletion sync failed:', err.message);
    }
  }

  _headRefresh('users');
  toast('User deleted');
}

function renderUserStats() {
  const users = getDB().admin.userManagement.users;
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

  const db = getDB();
  const rec = {
    id: 'O' + Math.floor(Math.random() * 100),
    name: document.getElementById('ao-name').value,
    roll: document.getElementById('ao-roll').value,
    date: document.getElementById('ao-date').value,
    status: document.getElementById('ao-status').value,
    reason: document.getElementById('ao-reason').value
  };
  db.admin.attendanceOverride.records.push(rec);
  saveDB(db);
  closeModal('modalAddOverride');
  toast('Override applied');
  _headRefresh('attendance');
}

function renderOverrides() {
  const records = getDB().admin.attendanceOverride.records;
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
  const db = getDB();
  db.admin.attendanceOverride.records = db.admin.attendanceOverride.records.filter(r => r.id !== id);
  saveDB(db);
  _headRefresh('attendance');
  toast('Override reverted');
}

/* --- Correction Requests (from Students) --- */
let _activeCorrId = null;

function renderCorrectionRequests() {
  const db = getDB();
  const requests = (db.admin.attendanceOverride.correctionRequests || []);
  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const countEl = document.getElementById('pendingCorrCount');
  if (countEl) countEl.textContent = `${pendingCount} Pending`;

  const tbody = document.getElementById('correction-requests-tbody');
  if (!tbody) return;
  tbody.innerHTML = requests.length ? requests.map(r => `
    <tr>
      <td><strong>${r.studentName}</strong><br><span style="font-size:11px;color:var(--muted)">${r.studentId}</span></td>
      <td>${r.course}</td>
      <td>${r.date}</td>
      <td style="max-width:200px;font-size:12px">${r.reason}</td>
      <td><span class="status-pill ${r.status === 'approved' ? 'approved' : r.status === 'rejected' ? 'rejected' : 'pending'}">${r.status}</span></td>
      <td>
        ${r.status === 'pending' ? `<button class="btn btn-blue btn-sm" onclick="openCorrectionDecision('${r.id}')">Review</button>` : '<span style="font-size:12px;color:var(--muted)">Decided</span>'}
      </td>
    </tr>
  `).join('') : '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:16px">No correction requests submitted yet.</td></tr>';
}

function openCorrectionDecision(id) {
  _activeCorrId = id;
  const db = getDB();
  const req = (db.admin.attendanceOverride.correctionRequests || []).find(r => r.id === id);
  if (!req) return;
  document.getElementById('corrDecisionBody').innerHTML = `
    <div style="background:var(--bg);border-radius:8px;padding:12px;margin-bottom:4px">
      <div style="font-weight:600;margin-bottom:4px">${req.studentName} <span style="font-size:12px;color:var(--muted)">(${req.studentId})</span></div>
      <div style="font-size:13px;color:var(--ink)"><strong>Course:</strong> ${req.course} (${req.courseCode || ''})</div>
      <div style="font-size:13px;color:var(--ink)"><strong>Date:</strong> ${req.date}</div>
      <div style="font-size:13px;color:var(--ink);margin-top:6px"><strong>Reason:</strong> ${req.reason}</div>
      <div style="font-size:11px;color:var(--muted);margin-top:4px">Submitted: ${req.submittedOn}</div>
    </div>
  `;
  document.getElementById('corr-note').value = '';
  showModal('modalDecideCorrection');
}

function handleDecideCorrection(decision) {
  const db = getDB();
  const reqs = db.admin.attendanceOverride.correctionRequests || [];
  const ri = reqs.findIndex(r => r.id === _activeCorrId);
  if (ri === -1) return;
  reqs[ri].status = decision;
  reqs[ri].decidedOn = new Date().toLocaleDateString();
  reqs[ri].note = document.getElementById('corr-note').value;

  // Also update student's own correctionRequests if it matches
  const stuReqs = db.student.attendanceTracker.correctionRequests || [];
  const si = stuReqs.findIndex(r => r.id === _activeCorrId);
  if (si !== -1) { stuReqs[si].status = decision; }

  saveDB(db);
  closeModal('modalDecideCorrection');
  _headRefresh('attendance');
  toast(`Correction request ${decision}`);
}

/* --- Leave Management CRUD --- */
let _activeLeaveId = null;

function renderLeaves() {
  const db = getDB();
  const leaves = (db.admin.attendanceOverride && db.admin.attendanceOverride.leaveApplications) || [];
  const pendingCount = leaves.filter(l => l.status === 'pending').length;
  const countEl = document.getElementById('pendingLeaveCount');
  if (countEl) countEl.textContent = `${pendingCount} Pending`;

  // Stats row
  const statsEl = document.getElementById('leave-stats');
  if (statsEl) {
    const approved = leaves.filter(l => l.status === 'Approved').length;
    const rejected = leaves.filter(l => l.status === 'Rejected').length;
    statsEl.innerHTML = `
      <div class="stat-card"><div class="sc-label">Total Applications</div><div class="sc-val">${leaves.length}</div></div>
      <div class="stat-card"><div class="sc-label">Pending</div><div class="sc-val" style="color:var(--amber)">${pendingCount}</div></div>
      <div class="stat-card"><div class="sc-label">Approved</div><div class="sc-val" style="color:var(--green)">${approved}</div></div>
      <div class="stat-card"><div class="sc-label">Rejected</div><div class="sc-val" style="color:var(--red)">${rejected}</div></div>
    `;
  }

  const tbody = document.getElementById('leave-tbody');
  if (!tbody) return;
  tbody.innerHTML = leaves.length ? leaves.map(l => `
    <tr>
      <td style="font-family:var(--fm);font-size:12px">${l.id}</td>
      <td><strong>${l.studentName}</strong><br><span style="font-size:11px;color:var(--muted)">${l.studentId}</span></td>
      <td>${l.type}</td>
      <td>${l.startDate}</td>
      <td>${l.endDate}</td>
      <td style="max-width:200px;font-size:12px">${l.reason}</td>
      <td><span class="status-pill ${l.status === 'Approved' ? 'approved' : l.status === 'Rejected' ? 'rejected' : 'pending'}">${l.status}</span></td>
      <td>
        ${l.status === 'pending' ? `<button class="btn btn-blue btn-sm" onclick="openLeaveDecision('${l.id}')">Review</button>` : '<span style="font-size:12px;color:var(--muted)">Decided</span>'}
      </td>
    </tr>
  `).join('') : '<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:16px">No leave applications submitted yet.</td></tr>';
}

function openLeaveDecision(id) {
  _activeLeaveId = id;
  const db = getDB();
  const leaves = (db.admin.attendanceOverride && db.admin.attendanceOverride.leaveApplications) || [];
  const req = leaves.find(r => r.id === id);
  if (!req) return;
  document.getElementById('leaveDecisionBody').innerHTML = `
    <div style="background:var(--bg);border-radius:8px;padding:12px;margin-bottom:4px">
      <div style="font-weight:600;margin-bottom:4px">${req.studentName} <span style="font-size:12px;color:var(--muted)">(${req.studentId})</span></div>
      <div style="font-size:13px;color:var(--ink)"><strong>Type:</strong> ${req.type}</div>
      <div style="font-size:13px;color:var(--ink)"><strong>Duration:</strong> ${req.startDate} to ${req.endDate}</div>
      <div style="font-size:13px;color:var(--ink);margin-top:6px"><strong>Reason:</strong> ${req.reason}</div>
      <div style="font-size:11px;color:var(--muted);margin-top:4px">Applied: ${req.appliedOn}</div>
    </div>
  `;
  document.getElementById('leave-note').value = '';
  showModal('modalDecideLeave');
}

function handleDecideLeave(decision) {
  const db = getDB();
  const leaves = db.admin.attendanceOverride.leaveApplications || [];
  const li = leaves.findIndex(r => r.id === _activeLeaveId);
  if (li === -1) return;

  const note = document.getElementById('leave-note').value.trim();

  // Validate rejection reason
  if (decision === 'Rejected' && !note) {
    const noteEl = document.getElementById('leave-note');
    const parent = noteEl.closest('.form-field');
    parent.classList.add('has-error');
    const existing = parent.querySelector('.field-error');
    if (existing) existing.remove();
    const errEl = document.createElement('span');
    errEl.className = 'field-error';
    errEl.textContent = 'Rejection reason is required';
    parent.appendChild(errEl);
    return;
  }

  leaves[li].status = decision;
  leaves[li].decidedOn = new Date().toLocaleDateString();
  leaves[li].rejectionReason = decision === 'Rejected' ? note : null;

  // Sync status back to student's leave applications
  if (db.student && db.student.leaveManagement && db.student.leaveManagement.applications) {
    const stuLeave = db.student.leaveManagement.applications.find(
      s => s.id === leaves[li].studentLeaveId
    );
    if (stuLeave) {
      stuLeave.status = decision;
      stuLeave.rejectionReason = decision === 'Rejected' ? note : null;
    }
  }

  saveDB(db);
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

  const db = getDB();
  const cat = document.getElementById('rep-cat').value;
  if (!db.admin.reports.categories[cat]) db.admin.reports.categories[cat] = [];
  const newReport = {
    id: 'RP-' + Date.now(),
    title: document.getElementById('rep-title').value,
    description: document.getElementById('rep-desc').value,
    period: document.getElementById('rep-period').value,
    fileSize: document.getElementById('rep-size').value || '— MB',
    badgeClass: 'badge'
  };
  db.admin.reports.categories[cat].push(newReport);
  saveDB(db);
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
  const db = getDB();
  const cats = db.admin.reports.categories;
  const report = (cats[cat] || []).find(r => r.id === id);
  if (!report) return;
  document.getElementById('edit-rep-id').value = id;
  document.getElementById('edit-rep-cat').value = cat;
  document.getElementById('edit-rep-title').value = report.title;
  document.getElementById('edit-rep-desc').value = report.description;
  document.getElementById('edit-rep-period').value = report.period;
  showModal('modalEditReport');
}

function handleEditReport() {
  const config = [
    { id: 'edit-rep-title', required: true, min: 5 },
    { id: 'edit-rep-desc', required: true, min: 10 },
    { id: 'edit-rep-period', required: true, min: 3 }
  ];
  if (!validateForm('modalEditReport', config)) return;

  const db = getDB();
  const id = document.getElementById('edit-rep-id').value;
  const cat = document.getElementById('edit-rep-cat').value;
  const cats = db.admin.reports.categories;
  const ri = (cats[cat] || []).findIndex(r => r.id === id);
  if (ri === -1) return;
  cats[cat][ri].title = document.getElementById('edit-rep-title').value;
  cats[cat][ri].description = document.getElementById('edit-rep-desc').value;
  cats[cat][ri].period = document.getElementById('edit-rep-period').value;
  saveDB(db);
  closeModal('modalEditReport');
  toast('Report updated');
  renderReports();
}

function handleDeleteReport(id, cat) {
  const db = getDB();
  if (!db.admin.reports.categories[cat]) return;
  db.admin.reports.categories[cat] = db.admin.reports.categories[cat].filter(r => r.id !== id);
  saveDB(db);
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

  const db = getDB();
  const report = {
    title: document.getElementById('bug-title').value,
    category: document.getElementById('bug-cat').value,
    severity: document.getElementById('bug-sev').value,
    description: document.getElementById('bug-desc').value,
    portalName: 'Academic Head Portal',
    submitterName: db.admin.settings.account.userId
  };
  submitBugReport(report);
  closeModal('modalReportBug');
  toast('Bug report submitted');
}

/* =====================================================
   INITIALIZATION & EVENTS
   ===================================================== */
function initPage() {
  const db = getDB().admin;

  console.log('=== Academic Head Portal Init ===');
  console.log('Current User:', getCurrentUser());
  console.log('Admin DB:', db);
  console.log('Settings:', db.settings);
  console.log('Dashboard Stats:', db.dashboard.institutionalStats);
  console.log('=====================================');

  // Account
  if (!db.settings || !db.settings.account) {
    console.error('Missing settings.account in admin database!');
    console.log('Full admin DB:', db);
    return;
  }

  const currentUser = getCurrentUser();
  const displayName = currentUser ? currentUser.name : db.settings.account.userId;
  document.getElementById('sb-initial').textContent = displayName.charAt(0).toUpperCase();
  document.getElementById('sb-name').textContent = displayName;
  document.getElementById('account-email').textContent = db.settings.account.email;
  document.getElementById('account-id').textContent = db.settings.account.userId;

  renderStats();
  renderReports();
  renderEvents();
  renderResources();
  renderFees();
  renderUsers();
  renderOverrides();
  renderCorrectionRequests();
  renderLeaves();
  renderUserStats();

  // Bar Chart Injection
  const depts = db.dashboard.departments;
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

  // Notifications Toggle List
  const n = db.settings.notifications;
  const nList = document.getElementById('notification-settings-list');
  nList.innerHTML = Object.keys(n.types).map(t => `
    <div class="toggle-row">
      <div class="toggle-info">
         <div class="toggle-title">${t.replace(/([A-Z])/g, ' $1')}</div>
         <div class="toggle-desc">Receive updates for this category</div>
      </div>
      <label class="toggle-switch">
         <input type="checkbox" ${n.types[t] ? 'checked' : ''} />
         <span class="toggle-slider"></span>
      </label>
    </div>
  `).join('');
}

document.addEventListener('head:changed', (e) => {
  const s = e.detail.section;
  if (s === 'events') renderEvents();
  else if (s === 'resources') renderResources();
  else if (s === 'fees') renderFees();
  else if (s === 'users') { renderUsers(); renderUserStats(); }
  else if (s === 'attendance') { renderOverrides(); renderCorrectionRequests(); }
  else if (s === 'leaves') renderLeaves();
  else initPage();
});

initPage();
