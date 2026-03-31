/**
 * student.js - Student Portal Controller
 * Handles dashboard rendering, CRUD operations, and UI interactions
 */

document.addEventListener('DOMContentLoaded', () => {
  // Protect route
  if (!StateManager.protectRoute(['student'])) {
    return;
  }
  
  // Initialize page
  initPage();
  
  // Listen for data changes
  document.addEventListener('student:changed', initPage);
});

function initPage() {
  const db = StateManager.getDB();
  if (!db || !db.student) return;
  
  const data = db.student;
  
  // Update sidebar
  document.getElementById('sbUname').textContent = data.profile.personal.fullName;
  document.getElementById('sbUrole').textContent = `${data.profile.academic.year} · ${data.profile.academic.branch}`;
  document.getElementById('sbAvatar').textContent = data.profile.personal.fullName.charAt(0);
  
  // Render dashboard stats
  renderDashboard(data);
  renderProfile(data);
  renderCourses(data);
  renderLeaveHistory(data);
  renderForum(data);
  renderResearch(data);
}

function renderDashboard(data) {
  const a = data.profile.academic;
  document.getElementById('dashStats').innerHTML = `
    <div class="stat-card"><div class="sc-label">Current CGPA</div><div class="sc-val">${a.cgpa}</div></div>
    <div class="stat-card"><div class="sc-label">Attendance</div><div class="sc-val">${a.attendance}%</div></div>
  `;
  
  document.getElementById('perfTable').innerHTML = a.currentCourses.map(c => `
    <tr>
      <td><strong>${c.course}</strong><span class="course-code">${c.id}</span></td>
      <td>${c.instructor}</td>
      <td><strong>${c.grade}</strong></td>
      <td>${c.attendance}%</td>
      <td><div class="prog-bar-small"><div class="prog-fill blue" style="width:${c.progress}%"></div></div></td>
      <td><span class="sc-badge blue">${c.status}</span></td>
    </tr>
  `).join('');
}

function renderProfile(data) {
  const p = data.profile.personal;
  const a = data.profile.academic;
  
  document.getElementById('profileCardHead').innerHTML = `
    <div class="cgpa-ring"><div class="cgpa-center"><span class="cgpa-num">${a.cgpa}</span><span class="cgpa-denom">CGPA</span></div></div>
    <div class="profile-name">${p.fullName}</div><div class="profile-info">${a.studentId} · ${a.branch}</div>
  `;
  
  document.getElementById('profileAcademic').innerHTML = `
    <div class="pf-item"><div class="pf-key">UID</div><div class="pf-val">${a.studentId}</div></div>
    <div class="pf-item"><div class="pf-key">Batch</div><div class="pf-val">${a.batch}</div></div>
  `;
  
  document.getElementById('profilePersonal').innerHTML = `
    <div class="pf-item"><div class="pf-key">DOB</div><div class="pf-val">${p.dob}</div></div>
  `;
  
  document.getElementById('profileEmergency').innerHTML = `
    <div class="pf-item"><div class="pf-key">Contact</div><div class="pf-val">${data.profile.emergencyContact.contactPerson}</div></div>
  `;
}

function renderCourses(data) {
  const a = data.profile.academic;
  document.getElementById('coursesList').innerHTML = a.currentCourses.map(c => `
    <div class="course-card">
      <div class="cc-head">
        <div class="cc-info">
          <div class="cc-code">${c.id}</div>
          <div class="cc-name">${c.course}</div>
          <div class="cc-inst">${c.instructor}</div>
        </div>
        <div class="grade-pill">${c.grade}</div>
      </div>
      <div class="cc-meta">
        <div>Att: ${c.attendance}%</div>
        <div>Prog: ${c.progress}%</div>
      </div>
    </div>
  `).join('');
}

function renderLeaveHistory(data) {
  document.getElementById('leaveHistory').innerHTML = data.leaveManagement.applications.map(l => `
    <div class="leave-card">
      <div class="lc-info">
        <div class="lc-type">${l.type}</div>
        <div class="lc-reason">${l.reason}</div>
        <div class="lc-meta">${l.startDate} - ${l.endDate}</div>
      </div>
      <span class="status-pill ${l.status.toLowerCase()}">${l.status}</span>
    </div>
  `).join('');
}

function renderForum(data) {
  document.getElementById('forumThreads').innerHTML = data.forum.threads.map(t => `
    <div class="forum-thread">
      <div class="ft-lecture">${t.lectureTag}</div>
      <div class="ft-title">${t.title}</div>
      <div class="ft-meta">
        <span>by ${t.author}</span>
        <span>${t.replies} replies</span>
      </div>
    </div>
  `).join('');
}

function renderResearch(data) {
  document.getElementById('milestones').innerHTML = data.research.milestones.map(m => `
    <div class="milestone-item ${m.status==='completed'?'done':'progress'}">
      <div class="mi-label">${m.status.toUpperCase()}</div>
      <div class="mi-title">${m.title}</div>
      <div class="mi-desc">${m.description}</div>
    </div>
  `).join('');
}

function switchPanel(name, el) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sb-nav a, .sb-footer a').forEach(a => a.classList.remove('active'));
  document.getElementById('panel-' + name).classList.add('active');
  if (el) el.classList.add('active');
  
  const titles = {
    dashboard: 'Dashboard',
    profile: 'Academic Identity',
    timetable: 'Teaching Grid',
    courses: 'Curriculum',
    attendance: 'Attendance Hub',
    leave: 'Leave Center',
    forum: 'Peer Exchange',
    research: 'Research Track',
    settings: 'Portal Configuration'
  };
  document.getElementById('topbarTitle').textContent = titles[name] || name;
  
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
  let ok = true;
  
  config.forEach(f => {
    const input = document.getElementById(f.id);
    const val = input.value.trim();
    let err = '';
    
    if (f.required && !val) {
      err = 'This field is required';
    } else if (f.min && val.length < f.min) {
      err = `Minimum ${f.min} characters required`;
    } else if (f.type === 'email' && val && !Auth.patterns.email.test(val)) {
      err = 'Invalid email format';
    }
    
    if (err) {
      ok = false;
      Auth.showFieldError(f.id, err);
    }
  });
  
  return ok;
}

function _refresh() {
  document.dispatchEvent(new CustomEvent('student:changed'));
}

function handleLeave() {
  if (!validateForm('modalLeave', [
    {id:'l-type', required:true},
    {id:'l-start', required:true},
    {id:'l-end', required:true},
    {id:'l-reason', required:true, min:10}
  ])) return;
  
  const db = StateManager.getDB();
  db.student.leaveManagement.applications.unshift({
    id: db.student.leaveManagement.applications.length + 1,
    type: document.getElementById('l-type').value,
    reason: document.getElementById('l-reason').value,
    startDate: document.getElementById('l-start').value,
    endDate: document.getElementById('l-end').value,
    status: 'Pending',
    duration: 'TBD',
    appliedOn: new Date().toLocaleDateString()
  });
  
  StateManager.saveDB(db);
  toast('Leave request submitted');
  closeModal('modalLeave');
  _refresh();
}

function handleThread() {
  if (!validateForm('modalThread', [
    {id:'t-tag', required:true},
    {id:'t-title', required:true},
    {id:'t-desc', required:true, min:10}
  ])) return;
  
  const db = StateManager.getDB();
  db.student.forum.threads.unshift({
    id: db.student.forum.threads.length + 1,
    lectureTag: document.getElementById('t-tag').value,
    title: document.getElementById('t-title').value,
    author: db.student.profile.personal.fullName,
    replies: 0,
    timestamp: 'Just now',
    tagClass: 'badge'
  });
  
  StateManager.saveDB(db);
  toast('Inquiry posted');
  closeModal('modalThread');
  _refresh();
}

function handleMilestone() {
  if (!validateForm('modalMilestone', [
    {id:'m-title', required:true},
    {id:'m-date', required:true}
  ])) return;
  
  const db = StateManager.getDB();
  db.student.research.milestones.push({
    id: db.student.research.milestones.length + 1,
    title: document.getElementById('m-title').value,
    date: document.getElementById('m-date').value,
    description: document.getElementById('m-desc').value,
    status: 'upcoming',
    statusClass: 'badge4'
  });
  
  StateManager.saveDB(db);
  toast('Milestone declared');
  closeModal('modalMilestone');
  _refresh();
}

function handleBug() {
  if (!validateForm('panel-settings', [
    {id:'bugTitle', required:true, min:5},
    {id:'bugDesc', required:true, min:15}
  ])) return;
  
  const db = StateManager.getDB();
  db.superuser.bugReports.unshift({
    id: 'BUG-S' + (db.superuser.bugReports.length + 1),
    title: document.getElementById('bugTitle').value,
    description: document.getElementById('bugDesc').value,
    severity: document.getElementById('bugSev').value,
    submittedBy: 'Student Portal',
    submitter: db.student.profile.personal.fullName,
    status: 'open',
    submittedAt: new Date().toLocaleDateString(),
    category: 'Infrastructure'
  });
  
  StateManager.saveDB(db);
  toast('Bug reported');
  document.getElementById('bugTitle').value = '';
  document.getElementById('bugDesc').value = '';
}

// Make functions globally available
window.switchPanel = switchPanel;
window.showModal = showModal;
window.closeModal = closeModal;
window.closeModalBg = closeModalBg;
window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;
window.toast = toast;
window.handleLeave = handleLeave;
window.handleThread = handleThread;
window.handleMilestone = handleMilestone;
window.handleBug = handleBug;