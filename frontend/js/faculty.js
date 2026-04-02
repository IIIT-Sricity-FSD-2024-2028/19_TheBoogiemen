/**
 * faculty.js - Faculty Portal Scripts
 * BarelyPassing - Academic Progress & Outcome Tracking
 */

// Check authentication on page load
(function checkAuth() {
  const currentUser = getCurrentUser();
  if (!currentUser || (currentUser.role !== 'faculty' && currentUser.role !== 'superuser')) {
    window.location.href = 'login.html';
    return;
  }
})();

/* =====================================================
   CONTROLLERS
   ===================================================== */
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
  toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
}

/* =====================================================
   VALIDATION
   ===================================================== */
function validateForm(mid, cfg) {
  // Use the enhanced global validateForm from auth.js
  // This maintains backward compatibility with existing calls
  clearErrors(mid);
  let ok = true;
  cfg.forEach(f => {
    const inp = document.getElementById(f.id);
    const val = inp.value.trim();
    let err = '';
    if (f.required && !val) err = 'Mandatory field';
    else if (f.min && val.length < f.min) err = `Min ${f.min} chars`;
    if (err) {
      ok = false;
      const parent = inp.closest('.form-field');
      parent.classList.add('has-error');
      const span = document.createElement('span');
      span.className = 'field-error';
      span.textContent = err;
      parent.appendChild(span);
    }
  });
  return ok;
}

function clearErrors(id) {
  const m = document.getElementById(id);
  if (!m) return;
  m.querySelectorAll('.form-field').forEach(f => f.classList.remove('has-error'));
  m.querySelectorAll('.field-error').forEach(e => e.remove());
}

/* =====================================================
   CRUD / LOGIC
   ===================================================== */
function _refresh() {
  document.dispatchEvent(new CustomEvent('faculty:changed'));
}

function handleSchedule() {
  const meetingDate = document.getElementById('meet-date').value;
  const today = new Date().toISOString().split('T')[0];
  
  if (!validateForm('modalMeeting', [
    { id: 'meet-stu', required: true, message: 'Student name required' },
    { id: 'meet-date', required: true, type: 'date', minDate: today, message: 'Meeting date must be in the future' },
    { id: 'meet-time', required: true, type: 'time', message: 'Select a valid time' },
    { id: 'meet-agenda', required: false, min: 10, max: 500, message: 'Agenda must be 10-500 characters' }
  ])) return;

  const db = getDB();
  const meeting = {
    id: Date.now(),
    studentName: document.getElementById('meet-stu').value,
    date: document.getElementById('meet-date').value,
    time: document.getElementById('meet-time').value,
    agenda: document.getElementById('meet-agenda').value,
    status: 'scheduled',
    createdAt: new Date().toLocaleDateString()
  };
  if (!db.faculty.dashboard.interventionLog) db.faculty.dashboard.interventionLog = [];
  db.faculty.dashboard.interventionLog.push(meeting);
  saveDB(db);
  toast('Intervention meeting registered');
  closeModal('modalMeeting');
  _refresh();
}

function handleSaveAttendance() {
  const classId = document.getElementById('classSelect').value;
  if (!classId) { 
    toast('Please select a class first'); 
    return; 
  }

  const records = [];
  document.querySelectorAll('.att-student-row').forEach(row => {
    const id = row.dataset.id;
    const isPresent = row.querySelector('.present').classList.contains('active');
    records.push({ id, isPresent });
  });

  const db = getDB();
  const attendanceRecord = {
    classId,
    date: new Date().toLocaleDateString(),
    timestamp: new Date().toISOString(),
    records,
    presentCount: records.filter(r => r.isPresent).length,
    totalStudents: records.length
  };
  if (!db.faculty.attendanceMarking.history) db.faculty.attendanceMarking.history = [];
  db.faculty.attendanceMarking.history.unshift(attendanceRecord);
  saveDB(db);
  toast('Attendance committed successfully');
  _refresh();
}

function handleBugSubmit() {
  if (!validateForm('panel-settings', [
    { id: 'bugTitle', required: true, min: 5, max: 200, message: 'Bug title must be 5-200 characters' },
    { id: 'bugDesc', required: true, min: 10, max: 1000, message: 'Description must be 10-1000 characters' }
  ])) return;

  const db = getDB();
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
  saveDB(db);
  toast('Bug report filed with IT Ops');
  document.getElementById('bugTitle').value = '';
  document.getElementById('bugDesc').value = '';
}

function toggleAtt(btn) {
  const row = btn.closest('.att-toggle');
  row.querySelectorAll('.att-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  updateCount();
}

function markAll(p) {
  document.querySelectorAll('.att-toggle').forEach(row => {
    row.querySelectorAll('.att-btn').forEach(b => b.classList.remove('active'));
    row.querySelector('.' + (p ? 'present' : 'absent')).classList.add('active');
  });
  updateCount();
}

function updateCount() {
  const c = document.querySelectorAll('.present.active').length;
  document.getElementById('presentCount').textContent = c;
}

/* =====================================================
   DATA INJECTION
   ===================================================== */
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

  const db = getDB().faculty.attendanceMarking;
  const cls = db.classes.find(c => c.id === classId);
  document.getElementById('attHeader').textContent = cls ? cls.name : classId;
  document.getElementById('totalInRoster').textContent = db.students.length;

  document.getElementById('attendanceList').innerHTML = db.students.map(s => `
    <div class="att-student-row" data-id="${s.id}">
      <div>
        <div class="ast-name">${s.name}</div>
        <div class="ast-id">${s.id} · Overall: ${s.overallAttendance}%${s.alert ? ' ⚠️' : ''}</div>
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

function renderStuTable(list) {
  document.getElementById('studentTableBody').innerHTML = list.map(s => `
    <tr>
      <td><strong>${s.name}</strong></td>
      <td class="font-fm text-12">${s.id}</td>
      <td class="${s.attendance < 75 ? 'text-red' : ''}">${s.attendance}%</td>
      <td>${s.avgScore}%</td>
      <td><span class="status-pill ${s.status.toLowerCase().replace(' ', '-')}">${s.status}</span></td>
      <td><button class="btn btn-blue btn-sm" onclick="viewStu('${s.id}')">Info</button></td>
    </tr>
  `).join('');
}

function filterStudents() {
  const q = document.getElementById('stuSearch').value.toLowerCase();
  const list = getDB().faculty.studentOverview.students.filter(s =>
    s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q)
  );
  renderStuTable(list);
}

function viewStu(id) {
  const s = getDB().faculty.studentOverview.students.find(x => x.id === id);
  document.getElementById('stuDetailBody').innerHTML = `
    <div class="stu-detail-grid">
      <div class="sd-item"><div class="sd-key">Name</div><div class="sd-val">${s.name}</div></div>
      <div class="sd-item"><div class="sd-key">ID</div><div class="sd-val">${s.id} (${s.fullId})</div></div>
      <div class="sd-item"><div class="sd-key">Attendance</div><div class="sd-val ${s.attendance < 75 ? 'text-red' : ''}">${s.attendance}%</div></div>
      <div class="sd-item"><div class="sd-key">Avg Score</div><div class="sd-val">${s.avgScore}%</div></div>
      <div class="sd-item"><div class="sd-key">Status</div><div class="sd-val"><span class="status-pill ${s.status.toLowerCase().replace(' ', '-')}">${s.status}</span></div></div>
      <div class="sd-item"><div class="sd-key">Progress</div><div class="sd-val">${s.progress}%</div></div>
    </div>
    ${s.activities && s.activities.length ? `
      <div style="margin-top:12px">
        <div style="font-size:12px;font-weight:600;color:var(--muted);margin-bottom:6px">Recent Activity</div>
        ${s.activities.map(a => `<div style="font-size:12px;padding:4px 0;border-bottom:1px solid var(--border);color:var(--soft)">${a}</div>`).join('')}
      </div>` : ''}
  `;
  showModal('modalStudentDetail');
}

function showMeeting(name) {
  document.getElementById('meet-stu').value = name;
  showModal('modalMeeting');
}

/** Render the full timetable grid for faculty */
function renderTimetableGrid(schedule) {
  const el = document.getElementById('timetableGrid');
  if (!el) return;
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const accent = { Lab: '#6366f1', Lecture: '#22c55e', Tutorial: '#f59e0b', Meeting: '#ef4444', OfficeHours: '#8b5cf6', Free: '#94a3b8' };

  let html = `<table style="width:100%;border-collapse:collapse;font-size:12px">
    <thead><tr>
      <th style="padding:8px 12px;text-align:left;color:var(--muted);font-weight:500;min-width:90px">Time</th>
      ${dayLabels.map(d => `<th style="padding:8px 12px;text-align:left;color:var(--muted);font-weight:500;min-width:130px">${d}</th>`).join('')}
    </tr></thead><tbody>`;

  schedule.forEach(row => {
    if (row.isBreak) {
      html += `<tr><td colspan="6" style="padding:6px 12px;text-align:center;color:var(--muted);font-size:11px;background:var(--bg);font-style:italic">${row.label}</td></tr>`;
      return;
    }
    html += '<tr>';
    html += `<td style="padding:8px 12px;color:var(--muted);font-size:11px;border-top:1px solid var(--border);white-space:nowrap">${row.time}</td>`;
    days.forEach(day => {
      const cell = row.days ? row.days[day] : null;
      if (!cell || row.isFree) {
        html += `<td style="padding:8px 12px;border-top:1px solid var(--border)"><span style="color:var(--muted);font-size:11px">—</span></td>`;
        return;
      }
      if (cell.isFree || cell.type === 'Free') {
        html += `<td style="padding:8px 12px;border-top:1px solid var(--border)"><span style="color:var(--muted);font-size:11px">Free Period</span></td>`;
        return;
      }
      const bg = accent[cell.type] || '#6366f1';
      const countBadge = cell.count ? `<span style="font-size:10px;color:${bg}"> · ${cell.count} stu</span>` : '';
      html += `<td style="padding:6px 8px;border-top:1px solid var(--border)">
        <div style="background:${bg}18;border-left:3px solid ${bg};border-radius:4px;padding:5px 7px">
          <div style="font-weight:700;color:${bg};font-size:11px">${cell.code || ''}</div>
          <div style="font-size:11px;color:var(--ink)">${cell.name || cell.label || ''}</div>
          <div style="color:var(--muted);font-size:10px">${cell.type}${countBadge}</div>
          ${cell.target ? `<div style="color:var(--muted);font-size:10px">${cell.target}</div>` : ''}
          <div style="color:var(--muted);font-size:10px">${cell.location || ''}</div>
        </div>
      </td>`;
    });
    html += '</tr>';
  });

  html += '</tbody></table>';
  el.innerHTML = html;
}

/** Render assessment mapping questions with CO/PO tags */
function renderAssessmentMapping(assessmentData) {
  const metaEl = document.getElementById('assessMeta');
  const qEl = document.getElementById('mappingQuestions');
  if (!metaEl || !qEl) return;

  const m = assessmentData.metadata;
  metaEl.innerHTML = `
    <div class="card-title">${m.title}</div>
    <div class="card-sub">${m.course} · Total: ${m.totalMarks}M</div>
  `;

  const cos = assessmentData.availableOutcomes.cos;
  const pos = assessmentData.availableOutcomes.pos;

  qEl.innerHTML = assessmentData.questions.map(q => `
    <div style="border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
        <div>
          <span style="font-weight:600;font-size:13px">${q.name}</span>
          <span style="font-size:12px;color:var(--muted);margin-left:8px">${q.marks} marks</span>
        </div>
      </div>
      <div style="font-size:13px;color:var(--soft);margin-bottom:10px">${q.text}</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">
        <span style="font-size:11px;color:var(--muted);margin-right:4px">COs:</span>
        ${q.mappedCOs.map(co => `<span style="background:var(--accent-l,#eef2ff);color:var(--accent);font-size:11px;padding:2px 8px;border-radius:4px;font-weight:600">${co}</span>`).join('')}
        <span style="font-size:11px;color:var(--muted);margin-left:8px;margin-right:4px">POs:</span>
        ${q.mappedPOs.map(po => `<span style="background:var(--green-l,#dcfce7);color:var(--green,#16a34a);font-size:11px;padding:2px 8px;border-radius:4px;font-weight:600">${po}</span>`).join('')}
      </div>
    </div>
  `).join('');
}

function initPage() {
  const db = getDB().faculty;

  // Sidebar
  document.getElementById('sbUname').textContent = db.profile.account.name;
  document.getElementById('sbUrole').textContent = `${db.profile.account.role} · ${db.profile.account.dept}`;
  document.getElementById('sbAvatar').textContent = db.profile.account.name.charAt(0);

  // Topbar
  document.getElementById('activeSemester').textContent = 'Spring 2026';
  document.getElementById('topAtRisk').textContent = `${db.dashboard.stats.atRiskCount} At-Risk`;

  // ── DASHBOARD ──────────────────────────────────────
  const dash = db.dashboard;
  document.getElementById('dashStats').innerHTML = `
    <div class="stat-card"><div class="sc-label">Student Population</div><div class="sc-val">${dash.stats.totalStudents}</div></div>
    <div class="stat-card"><div class="sc-label">Low Attendance</div><div class="sc-val">${dash.stats.lowAttendanceCount}</div></div>
    <div class="stat-card"><div class="sc-label">Risk Escalation</div><div class="sc-val red">${dash.stats.atRiskCount}</div></div>
    <div class="stat-card"><div class="sc-label">Workload (Hrs/Wk)</div><div class="sc-val">${dash.stats.classesThisWeek}</div></div>
  `;

  document.getElementById('atRiskList').innerHTML = dash.atRiskStudents.map(s => `
    <div class="alert-card">
      <div class="ac-info">
        <div class="ac-name">${s.name} <span class="student-id-small">${s.id}</span></div>
        <div class="ac-meta">Att: ${s.attendance}% · Score: ${s.avgScore}% · ${s.riskLevel} Risk</div>
      </div>
      <div class="ac-actions">
        <button class="btn btn-red btn-sm" onclick="toast('Alert broadcasted to ${s.name}')">Escalate</button>
        <button class="btn btn-outline btn-sm" onclick="showMeeting('${s.name}')">Meet</button>
      </div>
    </div>
  `).join('');

  // Today's Lectures — use Thursday as "today" per mock schedule context
  const todayDayKey = 'thursday';
  const dayName = 'Thursday, March 6, 2026';
  document.getElementById('todayDate').textContent = dayName;
  const todaySlots = db.timetable.schedule
    .filter(row => row.days && row.days[todayDayKey] && !row.isBreak)
    .map(row => ({ time: row.time, ...row.days[todayDayKey] }))
    .filter(c => c.type && c.type !== 'Free' && !c.isFree);

  document.getElementById('todayClasses').innerHTML = todaySlots.length ? todaySlots.map(c => `
    <div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid var(--border)">
      <div style="min-width:80px;font-size:11px;color:var(--muted)">${c.time}</div>
      <div style="flex:1">
        <div style="font-weight:600;font-size:13px">${c.name || c.label || ''} <span style="font-size:11px;color:var(--muted)">${c.type}</span></div>
        <div style="font-size:11px;color:var(--muted)">${c.target || ''} · ${c.location || ''}</div>
      </div>
    </div>
  `).join('') : '<p style="color:var(--muted);font-size:13px">No classes scheduled today.</p>';

  // Subject Performance from courseSummaries
  document.getElementById('performanceList').innerHTML = db.timetable.courseSummaries.map(c => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">
      <div>
        <div style="font-weight:600;font-size:13px">${c.code} <span style="font-size:12px;color:var(--muted);font-weight:400">${c.title}</span></div>
        <div style="font-size:11px;color:var(--muted);margin-top:2px">${c.years} · ${c.breakdown}</div>
      </div>
      <div style="text-align:right;font-size:12px;color:var(--muted)">${c.hours}</div>
    </div>
  `).join('');

  // ── TIMETABLE ──────────────────────────────────────
  renderTimetableGrid(db.timetable.schedule);

  // ── ASSESSMENT MAPPING ─────────────────────────────
  renderAssessmentMapping(db.assessmentMapping);

  // ── ATTENDANCE CLASS SELECTOR ──────────────────────
  const att = db.attendanceMarking;
  const classSel = document.getElementById('classSelect');
  const curVal = classSel.value;
  classSel.innerHTML = '<option value="">Choose class...</option>' +
    att.classes.map(c => `<option value="${c.id}">${c.fullLabel || c.name}</option>`).join('');
  classSel.value = curVal;

  // ── STUDENT DIRECTORY ──────────────────────────────
  const stu = db.studentOverview;
  document.getElementById('stuSummary').innerHTML = `
    <div class="stat-card"><div class="sc-label">Total Handled</div><div class="sc-val">${stu.students.length}</div></div>
    <div class="stat-card"><div class="sc-label">On Track</div><div class="sc-val">${stu.students.filter(x => x.status === 'On Track').length}</div></div>
    <div class="stat-card"><div class="sc-label">At Risk</div><div class="sc-val red">${stu.students.filter(x => x.status === 'At Risk').length}</div></div>
  `;
  renderStuTable(stu.students);

  // ── FORUM ──────────────────────────────────────────
  document.getElementById('forumStats').innerHTML = `
    <div class="stat-card"><div class="sc-label">Total Threads</div><div class="sc-val">${db.forum.threads.length}</div></div>
    <div class="stat-card"><div class="sc-label">Needs Response</div><div class="sc-val">${db.forum.summary.needsResponseCount}</div></div>
    <div class="stat-card"><div class="sc-label">Resolved</div><div class="sc-val">${db.forum.summary.resolvedCount}</div></div>
  `;
  document.getElementById('forumThreads').innerHTML = db.forum.threads.map(t => `
    <div class="forum-thread">
      <div class="ft-lecture">
        <span>${t.lecture}</span>
        <span class="status-pill ${t.status === 'resolved' ? 'approved' : 'pending'}">${t.status}</span>
      </div>
      <div class="ft-title">${t.title}</div>
      <div class="ft-meta">
        <span>by <strong>${t.author}</strong></span>
        <span>${t.replyCount} replies</span>
        <span>${t.timeAgo}</span>
      </div>
      <div class="ft-actions">
        <button class="btn btn-blue btn-sm" onclick="toast('Opening thread...')">View</button>
        ${t.status !== 'resolved' ? `<button class="btn btn-green btn-sm" onclick="toast('Thread resolved')">Resolve</button>` : ''}
      </div>
    </div>
  `).join('');

  // ── RESEARCH PROJECTS ──────────────────────────────
  const res = db.researchSupervision;
  document.getElementById('resStats').innerHTML = `
    <div class="stat-card"><div class="sc-label">Total Projects</div><div class="sc-val">${res.summary.totalProjects}</div></div>
    <div class="stat-card"><div class="sc-label">In Progress</div><div class="sc-val">${res.summary.inProgress}</div></div>
    <div class="stat-card"><div class="sc-label">Under Review</div><div class="sc-val">${res.summary.underReview}</div></div>
    <div class="stat-card"><div class="sc-label">Avg Progress</div><div class="sc-val">${res.summary.avgProgress}%</div></div>
  `;
  document.getElementById('resProjects').innerHTML = res.projects.map(p => `
    <div class="research-project">
      <div class="rp-head">
        <div>
          <div class="rp-title">${p.title}</div>
          <div class="rp-meta">
            ${p.studentName} · ${p.studentId} · 
            <span class="status-pill ${p.status === 'review' ? 'pending' : 'approved'}">${p.status}</span>
            · Next: ${p.nextMeeting}
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-size:18px;font-weight:700;color:var(--accent)">${p.grade}</div>
          <div style="font-size:11px;color:var(--muted)">${p.progress}%</div>
        </div>
      </div>
      <div class="rp-prog">
        <div class="prog-bar">
          <div class="prog-fill blue" style="width:${p.progress}%"></div>
        </div>
      </div>
      ${p.submissions && p.submissions.length ? `
        <div style="margin-top:10px">
          ${p.submissions.map(s => `
            <div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0;border-bottom:1px solid var(--border)">
              <span>${s.title}</span>
              <span style="color:var(--muted)">${s.date} · <em>${s.status}</em></span>
            </div>`).join('')}
        </div>` : ''}
    </div>
  `).join('');
}

// Initialize on page load and listen for changes
document.addEventListener('faculty:changed', initPage);
initPage();
