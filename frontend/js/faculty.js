/**
 * faculty.js - Faculty Portal Controller
 * Handles course management, attendance, assessments, and student mentoring
 */

document.addEventListener('DOMContentLoaded', () => {
  // Protect route
  if (!StateManager.protectRoute(['faculty', 'head', 'admin', 'superuser'])) {
    return;
  }
  
  initPage();
  document.addEventListener('faculty:changed', initPage);
});

function initPage() {
  const db = StateManager.getDB();
  if (!db || !db.faculty) return;
  
  const data = db.faculty;
  
  // Sidebar
  document.getElementById('sbUname').textContent = data.profile.account.name;
  document.getElementById('sbUrole').textContent = `${data.profile.account.role} · ${data.profile.account.dept}`;
  document.getElementById('sbAvatar').textContent = data.profile.account.name.charAt(0);
  
  // Topbar
  document.getElementById('activeSemester').textContent = 'Spring 2026';
  document.getElementById('topAtRisk').textContent = `${data.dashboard.stats.atRiskCount} At-Risk`;
  
  // Dashboard
  renderDashboard(data);
  renderAttendance(data);
  renderStudents(data);
  renderForum(data);
  renderResearch(data);
}

function renderDashboard(data) {
  const dash = data.dashboard;
  document.getElementById('dashStats').innerHTML = `
    <div class="stat-card"><div class="sc-label">Student Population</div><div class="sc-val">${dash.stats.totalStudents}</div></div>
    <div class="stat-card"><div class="sc-label">Low Attendance</div><div class="sc-val">${dash.stats.lowAttendanceCount}</div></div>
    <div class="stat-card"><div class="sc-label">Risk Escalation</div><div class="sc-val red">${dash.stats.atRiskCount}</div></div>
    <div class="stat-card"><div class="sc-label">Workload (Hrs)</div><div class="sc-val">${dash.stats.classesThisWeek}</div></div>
  `;
  
  document.getElementById('atRiskList').innerHTML = dash.atRiskStudents.map(s => `
    <div class="alert-card">
      <div class="ac-info">
        <div class="ac-name">${s.name} <span class="student-id-small">${s.id}</span></div>
        <div class="ac-meta">Att: ${s.attendance}% · Score: ${s.avgScore}% · ${s.riskLevel} Risk</div>
      </div>
      <div class="ac-actions">
        <button class="btn btn-red btn-sm" onclick="toast('Alert broadcasted')">Escalate</button>
        <button class="btn btn-outline btn-sm" onclick="showMeeting('${s.name}')">Meet</button>
      </div>
    </div>
  `).join('');
}

function renderAttendance(data) {
  const att = data.attendanceMarking;
  const classSel = document.getElementById('classSelect');
  if (!classSel) return;
  
  const curVal = classSel.value;
  classSel.innerHTML = '<option value="">Choose class...</option>' + att.classes.map(c => 
    `<option value="${c.id}">${c.name}</option>`
  ).join('');
  classSel.value = curVal;
}

function renderStudents(data) {
  const stu = data.studentOverview;
  document.getElementById('stuSummary').innerHTML = `
    <div class="stat-card"><div class="sc-label">Total Handled</div><div class="sc-val">${stu.students.length}</div></div>
    <div class="stat-card"><div class="sc-label">Satisfactory</div><div class="sc-val">${stu.students.filter(x=>x.status==='On Track').length}</div></div>
    <div class="stat-card"><div class="sc-label">Critical</div><div class="sc-val red">${stu.students.filter(x=>x.status==='At Risk').length}</div></div>
  `;
  renderStuTable(stu.students);
}

function renderStuTable(list) {
  document.getElementById('studentTableBody').innerHTML = list.map(s => `
    <tr>
      <td><strong>${s.name}</strong></td>
      <td class="font-fm text-12">${s.id}</td>
      <td class="${s.attendance < 75 ? 'text-red':''}">${s.attendance}%</td>
      <td>${s.avgScore}%</td>
      <td><span class="status-pill ${s.status.toLowerCase().replace(' ','-')}">${s.status}</span></td>
      <td><button class="btn btn-blue btn-sm" onclick="viewStu('${s.id}')">Info</button></td>
    </tr>
  `).join('');
}

function renderForum(data) {
  document.getElementById('forumStats').innerHTML = `
    <div class="stat-card"><div class="sc-label">Thread Count</div><div class="sc-val">${data.forum.threads.length}</div></div>
  `;
  
  document.getElementById('forumThreads').innerHTML = data.forum.threads.map(t => `
    <div class="forum-thread">
      <div class="ft-lecture"><span>${t.lecture}</span><span class="status-pill active">${t.status}</span></div>
      <div class="ft-title">${t.title}</div>
      <div class="ft-meta">
        <span>by <strong>${t.author}</strong></span>
        <span>${t.replyCount} replies</span>
        <span>${t.timeAgo}</span>
      </div>
      <div class="ft-actions">
        <button class="btn btn-blue btn-sm" onclick="toast('Loading thread...')">Visualize</button>
        <button class="btn btn-green btn-sm" onclick="toast('Case resolved')">Resolve</button>
      </div>
    </div>
  `).join('');
}

function renderResearch(data) {
  const res = data.researchSupervision;
  document.getElementById('resStats').innerHTML = `
    <div class="stat-card"><div class="sc-label">Projects</div><div class="sc-val">${res.summary.totalProjects}</div></div>
    <div class="stat-card"><div class="sc-label">Active</div><div class="sc-val">${res.summary.inProgress}</div></div>
  `;
  
  document.getElementById('resProjects').innerHTML = res.projects.map(p => `
    <div class="rp-card">
      <div class="rp-head">
        <div>
          <div class="rp-title">${p.title}</div>
          <div class="rp-meta">${p.studentName} · ${p.studentId} · Meeting: ${p.nextMeeting}</div>
        </div>
      </div>
      <div class="rp-prog">
        <div class="prog-bar"><div class="prog-fill blue" style="width:${p.progress}%"></div></div>
      </div>
    </div>
  `).join('');
}

function switchPanel(name, el) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sb-nav a, .sb-footer a').forEach(a => a.classList.remove('active'));
  document.getElementById('panel-' + name).classList.add('active');
  if (el) el.classList.add('active');
  
  const titles = {
    dashboard: 'Faculty Dashboard',
    timetable: 'Teaching Schedule',
    assessment: 'Outcome Mapping',
    attendance: 'Attendance Marking',
    students: 'Student Directory',
    forum: 'Research Forum',
    research: 'Supervision Projects',
    settings: 'Portal Settings'
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
  toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}

function validateForm(mid, cfg) {
  Auth.clearAllErrors(mid);
  let ok = true;
  
  cfg.forEach(f => {
    const inp = document.getElementById(f.id);
    const val = inp.value.trim();
    let err = '';
    
    if (f.required && !val) err = 'Mandatory field';
    else if (f.min && val.length < f.min) err = `Min ${f.min} chars`;
    
    if (err) {
      ok = false;
      Auth.showFieldError(f.id, err);
    }
  });
  
  return ok;
}

function _refresh() {
  document.dispatchEvent(new CustomEvent('faculty:changed'));
}

function handleSchedule() {
  if (!validateForm('modalMeeting', [
    {id:'meet-date', required:true}, 
    {id:'meet-time', required:true}
  ])) return;
  toast('Intervention meeting registered');
  closeModal('modalMeeting');
}

function handleSaveAttendance() {
  const classId = document.getElementById('classSelect').value;
  const records = [];
  document.querySelectorAll('.att-student-row').forEach(row => {
    const id = row.dataset.id;
    const isPresent = row.querySelector('.present').classList.contains('active');
    records.push({ id, isPresent });
  });
  toast('Session records synchronized');
  _refresh();
}

function handleBugSubmit() {
  if (!validateForm('panel-settings', [
    {id:'bugTitle', required:true, min:5}, 
    {id:'bugDesc', required:true, min:15}
  ])) return;
  
  const db = StateManager.getDB();
  const bug = {
    id: 'BUG-' + (db.superuser.bugReports.length + 1),
    title: document.getElementById('bugTitle').value,
    description: document.getElementById('bugDesc').value,
    severity: document.getElementById('bugSev').value,
    submittedBy: 'Faculty Portal',
    submitter: db.faculty.profile.account.name,
    status: 'open',
    submittedAt: new Date().toLocaleDateString(),
    category: 'Portal Interface'
  };
  
  db.superuser.bugReports.unshift(bug);
  StateManager.saveDB(db);
  toast('Bug report filed with IT Ops');
  document.getElementById('bugTitle').value = '';
  document.getElementById('bugDesc').value = '';
}

function toggleAtt(btn, type) {
  const row = btn.closest('.att-toggle');
  row.querySelectorAll('.att-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  updateCount();
}

function markAll(p) {
  document.querySelectorAll('.att-toggle').forEach(row => {
    row.querySelectorAll('.att-btn').forEach(b => b.classList.remove('active'));
    row.querySelector('.' + (p?'present':'absent')).classList.add('active');
  });
  updateCount();
}

function updateCount() {
  const c = document.querySelectorAll('.present.active').length;
  document.getElementById('presentCount').textContent = c;
}

function loadRoster() {
  const classId = document.getElementById('classSelect').value;
  if (!classId) {
    document.getElementById('attendanceList').innerHTML = '';
    document.getElementById('attActions').style.display = 'none';
    document.getElementById('attCountInfo').style.display = 'none';
    document.getElementById('attFooterActions').style.display = 'none';
    document.getElementById('attHeader').textContent = 'Select a class to begin';
    return;
  }
  
  const db = StateManager.getDB().faculty.attendanceMarking;
  const cls = db.classes.find(c => c.id === classId);
  
  document.getElementById('attHeader').textContent = cls.name;
  document.getElementById('totalInRoster').textContent = db.students.length;
  document.getElementById('attendanceList').innerHTML = db.students.map(s => `
    <div class="att-student-row" data-id="${s.id}">
      <div>
        <div class="ast-name">${s.name}</div>
        <div class="ast-id">${s.id}</div>
      </div>
      <div class="att-toggle">
        <button class="att-btn present" onclick="toggleAtt(this)">Present</button>
        <button class="att-btn absent" onclick="toggleAtt(this)">Absent</button>
      </div>
    </div>
  `).join('');
  
  document.getElementById('attActions').style.display = 'flex';
  document.getElementById('attCountInfo').style.display = 'block';
  document.getElementById('attFooterActions').style.display = 'block';
  updateCount();
}

function filterStudents() {
  const q = document.getElementById('stuSearch').value.toLowerCase();
  const list = StateManager.getDB().faculty.studentOverview.students.filter(s => 
    s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q)
  );
  renderStuTable(list);
}

function viewStu(id) {
  const s = StateManager.getDB().faculty.studentOverview.students.find(x => x.id === id);
  document.getElementById('stuDetailBody').innerHTML = `
    <div class="stu-detail-grid">
      <div class="sd-item"><div class="sd-key">Name</div><div class="sd-val">${s.name}</div></div>
      <div class="sd-item"><div class="sd-key">ID</div><div class="sd-val">${s.id}</div></div>
      <div class="sd-item"><div class="sd-key">Att.</div><div class="sd-val">${s.attendance}%</div></div>
      <div class="sd-item"><div class="sd-key">Avg.</div><div class="sd-val">${s.avgScore}%</div></div>
    </div>
  `;
  showModal('modalStudentDetail');
}

function showMeeting(name) {
  document.getElementById('meet-stu').value = name;
  showModal('modalMeeting');
}

// Make functions globally available
window.switchPanel = switchPanel;
window.showModal = showModal;
window.closeModal = closeModal;
window.closeModalBg = closeModalBg;
window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;
window.toast = toast;
window.handleSchedule = handleSchedule;
window.handleSaveAttendance = handleSaveAttendance;
window.handleBugSubmit = handleBugSubmit;
window.toggleAtt = toggleAtt;
window.markAll = markAll;
window.loadRoster = loadRoster;
window.filterStudents = filterStudents;
window.viewStu = viewStu;
window.showMeeting = showMeeting;