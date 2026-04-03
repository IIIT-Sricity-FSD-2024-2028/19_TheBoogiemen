/**
 * student.js - Student Portal Scripts
 * BarelyPassing - Academic Progress & Outcome Tracking
 */

// Check authentication on page load
(function checkAuth() {
  const currentUser = getCurrentUser();
  if (!currentUser || currentUser.role !== 'student') {
    window.location.href = 'login.html';
    return;
  }
})();

/* =====================================================
   UI CONTROLLERS
   ===================================================== */
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

function validateForm(mid, cfg) {
  clearErrors(mid);
  let ok = true;
  cfg.forEach(f => {
    const i = document.getElementById(f.id);
    const v = i.value.trim();
    let e = '';
    if (f.required && !v) e = 'Mandatory field';
    else if (f.min && v.length < f.min) e = `Min ${f.min} chars`;
    if (e) {
      ok = false;
      const p = i.closest('.form-field');
      p.classList.add('has-error');
      const s = document.createElement('span');
      s.className = 'field-error';
      s.textContent = e;
      p.appendChild(s);
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
   CRUD / INTEGRATION
   ===================================================== */
function _refresh() {
  document.dispatchEvent(new CustomEvent('student:changed'));
}

function handleLeave() {
  // Enhanced validation with date range check
  const startDate = document.getElementById('l-start').value;
  const endDate = document.getElementById('l-end').value;
  
  if (!validateForm('modalLeave', [
    { id: 'l-type', required: true, message: 'Please select leave type' },
    { id: 'l-start', required: true, type: 'date', message: 'Select start date' },
    { id: 'l-end', required: true, type: 'date', minDate: startDate, message: 'End date must be after start date' },
    { id: 'l-reason', required: true, min: 10, max: 500, message: 'Reason must be 10-500 characters' }
  ])) return;

  const db = getDB();
  const newLeave = {
    id: db.student.leaveManagement.applications.length + 1,
    type: document.getElementById('l-type').value,
    reason: document.getElementById('l-reason').value,
    startDate: document.getElementById('l-start').value,
    endDate: document.getElementById('l-end').value,
    status: 'Pending',
    duration: 'TBD',
    appliedOn: new Date().toLocaleDateString()
  };
  db.student.leaveManagement.applications.unshift(newLeave);
  saveDB(db);
  toast('Leave request submitted');
  closeModal('modalLeave');
  _refresh();
}

function handleThread() {
  if (!validateForm('modalThread', [
    { id: 't-tag', required: true, min: 3, max: 100, message: 'Lecture tag must be 3-100 characters' },
    { id: 't-title', required: true, min: 5, max: 200, message: 'Title must be 5-200 characters' },
    { id: 't-desc', required: true, min: 10, max: 1000, message: 'Description must be 10-1000 characters' }
  ])) return;

  const db = getDB();
  const newThread = {
    id: db.student.forum.threads.length + 1,
    lectureTag: document.getElementById('t-tag').value,
    title: document.getElementById('t-title').value,
    author: db.student.profile.personal.fullName,
    authorId: db.student.profile.academic.studentId,
    replies: 0,
    timestamp: 'Just now',
    tagClass: 'badge',
    body: document.getElementById('t-desc').value,
    comments: []
  };
  db.student.forum.threads.unshift(newThread);
  if (!db.student.forum.fullThreads) db.student.forum.fullThreads = [];
  db.student.forum.fullThreads.unshift({ ...newThread });

  // Also push to faculty forum for cross-visibility
  if (db.faculty && db.faculty.forum && db.faculty.forum.threads) {
    db.faculty.forum.threads.unshift({
      id: 'T' + String(db.faculty.forum.threads.length + 1).padStart(3, '0'),
      lecture: document.getElementById('t-tag').value,
      status: 'active',
      title: document.getElementById('t-title').value,
      author: db.student.profile.personal.fullName,
      studentId: db.student.profile.academic.studentId,
      replyCount: 0,
      timeAgo: 'Just now',
      originalPost: document.getElementById('t-desc').value,
      comments: []
    });
  }
  saveDB(db);
  toast('Question posted to forum');
  document.getElementById('t-tag').value = '';
  document.getElementById('t-title').value = '';
  document.getElementById('t-desc').value = '';
  closeModal('modalThread');
  _refresh();
}

function handleMilestone() {
  const targetDate = document.getElementById('m-date').value;
  const today = new Date().toISOString().split('T')[0];
  
  if (!validateForm('modalMilestone', [
    { id: 'm-title', required: true, min: 5, max: 200, message: 'Title must be 5-200 characters' },
    { id: 'm-date', required: true, type: 'date', minDate: today, message: 'Target date must be in the future' },
    { id: 'm-desc', required: false, min: 10, max: 500, message: 'Description must be 10-500 characters' }
  ])) return;

  const db = getDB();
  db.student.research.milestones.push({
    id: db.student.research.milestones.length + 1,
    title: document.getElementById('m-title').value,
    date: document.getElementById('m-date').value,
    description: document.getElementById('m-desc').value,
    status: 'upcoming',
    statusClass: 'badge4'
  });
  saveDB(db);
  toast('Milestone declared');
  closeModal('modalMilestone');
  _refresh();
}

function handleBug() {
  if (!validateForm('panel-settings', [
    { id: 'bugTitle', required: true, min: 5, max: 200, message: 'Bug title must be 5-200 characters' },
    { id: 'bugDesc', required: true, min: 10, max: 1000, message: 'Description must be 10-1000 characters' }
  ])) return;

  const db = getDB();
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
  saveDB(db);
  toast('Bug reported');
  document.getElementById('bugTitle').value = '';
  document.getElementById('bugDesc').value = '';
}

/* --- Attendance Correction --- */
function handleAttendanceCorrection() {
  if (!validateForm('modalCorrection', [
    { id: 'c-course', required: true },
    { id: 'c-date', required: true },
    { id: 'c-reason', required: true, min: 10 }
  ])) return;

  const db = getDB();
  const student = db.student.profile;
  const corrId = 'CR' + Date.now();
  const correction = {
    id: corrId,
    studentName: student.personal.fullName,
    studentId: student.academic.studentId,
    course: document.getElementById('c-course').value,
    courseCode: document.getElementById('c-course').value.split(' - ')[0] || 'N/A',
    date: document.getElementById('c-date').value,
    reason: document.getElementById('c-reason').value,
    status: 'pending',
    submittedOn: new Date().toLocaleDateString()
  };

  // Save to student tracker
  if (!db.student.attendanceTracker.correctionRequests) db.student.attendanceTracker.correctionRequests = [];
  db.student.attendanceTracker.correctionRequests.unshift(correction);

  // Also push to admin pending corrections
  if (!db.admin.attendanceOverride.correctionRequests) db.admin.attendanceOverride.correctionRequests = [];
  db.admin.attendanceOverride.correctionRequests.unshift({ ...correction });

  saveDB(db);
  toast('Correction request submitted — pending head approval');
  closeModal('modalCorrection');
  _refresh();
}

/* --- Assignment Submission --- */
let _activeAssignCourse = null;
let _activeAssignTitle = null;

function openSubmitAssignment(courseId, assignmentTitle) {
  _activeAssignCourse = courseId;
  _activeAssignTitle = assignmentTitle;
  document.getElementById('assign-course-label').textContent = assignmentTitle;
  document.getElementById('assign-notes').value = '';
  showModal('modalSubmitAssignment');
}

function handleSubmitAssignment() {
  if (!validateForm('modalSubmitAssignment', [
    { id: 'assign-notes', required: true, min: 5 }
  ])) return;

  const db = getDB();
  const courseList = db.student.courses.list;
  const ci = courseList.findIndex(c => c.id === _activeAssignCourse);
  if (ci !== -1 && courseList[ci].assessments) {
    const ai = courseList[ci].assessments.findIndex(a => a.title === _activeAssignTitle);
    if (ai !== -1) {
      courseList[ci].assessments[ai].status = 'submitted';
      courseList[ci].assessments[ai].submittedOn = new Date().toLocaleDateString();
      courseList[ci].assessments[ai].notes = document.getElementById('assign-notes').value;
    }
  }
  saveDB(db);
  toast('Assignment submitted successfully!');
  closeModal('modalSubmitAssignment');
  _refresh();
}

/* --- Forum: View & Reply --- */
let _activeThreadId = null;

function openThread(threadId) {
  _activeThreadId = threadId;
  const db = getDB();
  const threads = db.student.forum.fullThreads || db.student.forum.threads;
  const thread = threads.find(t => t.id === threadId);
  if (!thread) return;

  const body = document.getElementById('threadViewBody');
  const commentsEl = document.getElementById('threadViewComments');
  body.innerHTML = `
    <div style="margin-bottom:14px">
      <div style="font-size:11px;color:var(--accent);font-weight:600;margin-bottom:6px">${thread.lectureTag}</div>
      <div style="font-size:15px;font-weight:600;color:var(--ink);margin-bottom:8px">${thread.title}</div>
      <div style="background:var(--bg);border-radius:10px;padding:14px;font-size:13px;color:var(--soft);line-height:1.6">
        ${thread.body || thread.title}
      </div>
      <div style="margin-top:8px;font-size:11px;color:var(--muted)">By <strong>${thread.author}</strong> · ${thread.timestamp}</div>
    </div>
  `;

  const comments = thread.comments || [];
  commentsEl.innerHTML = comments.length ? comments.map(c => `
    <div style="display:flex;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
      <div style="width:32px;height:32px;border-radius:50%;background:${c.role === 'faculty' ? 'var(--accent)' : 'var(--green,#22c55e)'};display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:13px;flex-shrink:0">${c.initial || c.author.charAt(0)}</div>
      <div style="flex:1">
        <div style="font-size:12px;font-weight:600;color:var(--ink)">${c.author} ${c.role === 'faculty' ? '<span style="font-size:10px;color:var(--accent);background:var(--accent-l,#eef2ff);padding:1px 6px;border-radius:4px;margin-left:4px">Faculty</span>' : ''}</div>
        <div style="font-size:13px;color:var(--soft);margin-top:3px;line-height:1.5">${c.text}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:4px">${c.time}</div>
      </div>
    </div>
  `).join('') : '<p style="color:var(--muted);font-size:13px">No replies yet. Be the first to reply!</p>';

  document.getElementById('threadViewTitle').textContent = thread.title;
  showModal('modalThreadView');
}

function handleReply() {
  if (!validateForm('modalThreadView', [
    { id: 'reply-text', required: true, min: 5 }
  ])) return;

  const db = getDB();
  const threads = db.student.forum.fullThreads;
  if (!threads) return;
  const ti = threads.findIndex(t => t.id === _activeThreadId);
  if (ti === -1) return;

  const newReply = {
    id: (threads[ti].comments || []).length + 1,
    author: db.student.profile.personal.fullName,
    role: 'student',
    initial: db.student.profile.personal.fullName.charAt(0),
    text: document.getElementById('reply-text').value,
    time: 'Just now'
  };
  if (!threads[ti].comments) threads[ti].comments = [];
  threads[ti].comments.push(newReply);
  threads[ti].replies = (threads[ti].replies || 0) + 1;

  // Also update the shortform threads list
  const si = db.student.forum.threads.findIndex(t => t.id === _activeThreadId);
  if (si !== -1) db.student.forum.threads[si].replies = threads[ti].replies;

  // Sync reply to faculty forum for cross-visibility
  if (db.faculty && db.faculty.forum && db.faculty.forum.threads) {
    const fi = db.faculty.forum.threads.findIndex(t => t.id === _activeThreadId || t.title === threads[ti].title);
    if (fi !== -1) {
      if (!db.faculty.forum.threads[fi].comments) db.faculty.forum.threads[fi].comments = [];
      db.faculty.forum.threads[fi].comments.push(newReply);
      db.faculty.forum.threads[fi].replyCount = (db.faculty.forum.threads[fi].replyCount || 0) + 1;
    }
  }

  saveDB(db);
  toast('Reply posted!');
  document.getElementById('reply-text').value = '';
  openThread(_activeThreadId); // refresh modal display
}

/* --- Research: Request Meeting --- */
function handleRequestMeeting() {
  if (!validateForm('modalRequestMeeting', [
    { id: 'rm-date', required: true },
    { id: 'rm-time', required: true },
    { id: 'rm-agenda', required: true, min: 10 }
  ])) return;

  const db = getDB();
  const newReq = {
    id: 'MR' + Date.now(),
    proposedDate: document.getElementById('rm-date').value,
    proposedTime: document.getElementById('rm-time').value,
    agenda: document.getElementById('rm-agenda').value,
    status: 'pending',
    requestedOn: new Date().toLocaleDateString(),
    facultyNote: ''
  };

  if (!db.student.research.meetingRequests) db.student.research.meetingRequests = [];
  db.student.research.meetingRequests.unshift(newReq);

  // Also push to the faculty's research supervision for the student's project
  const proj = db.faculty.researchSupervision.projects.find(p => p.studentName === db.student.profile.personal.fullName);
  if (proj) {
    if (!proj.meetingRequests) proj.meetingRequests = [];
    proj.meetingRequests.unshift({
      ...newReq,
      studentName: db.student.profile.personal.fullName
    });
  }

  saveDB(db);
  toast('Meeting request sent to faculty');
  closeModal('modalRequestMeeting');
  _refresh();
}

/* =====================================================
   RENDER HELPERS
   ===================================================== */

function renderDashboardAnalytics(db) {
  const analytics = db.analytics;

  // Syllabus Completion
  const syllabusEl = document.getElementById('syllabusProg');
  if (syllabusEl && analytics && analytics.modules) {
    syllabusEl.innerHTML = analytics.modules.map(m => `
      <div style="margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
          <span>${m.name} &middot; ${m.completedTopics}/${m.totalTopics} topics</span>
          <span>${m.percentage}%</span>
        </div>
        <div style="height:6px;border-radius:4px;background:var(--border);overflow:hidden">
          <div style="width:${m.percentage}%;height:100%;border-radius:4px;background:${m.percentage === 100 ? 'var(--green,#22c55e)' : 'var(--accent,#6366f1)'}"></div>
        </div>
      </div>
    `).join('');
    syllabusEl.insertAdjacentHTML('beforeend', `<div style="margin-top:12px;font-size:12px;color:var(--muted)">
      Overall: <strong>${analytics.student.overallCompletion}%</strong> &nbsp;&middot;&nbsp; Predicted Grade: <strong style="color:var(--accent)">${analytics.student.predictedGrade}</strong>
    </div>`);
  }

  // Assignment Queue
  const assignEl = document.getElementById('assignmentQueue');
  if (assignEl && analytics && analytics.assessments) {
    if (analytics.assessments.length === 0) {
      assignEl.innerHTML = '<p style="color:var(--muted);font-size:13px">No pending assignments.</p>';
      return;
    }
    assignEl.innerHTML = analytics.assessments.map(a => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">
        <div>
          <div style="font-size:13px;font-weight:500">${a.qId} <span style="color:var(--muted);font-size:12px">${a.co}</span></div>
          <div style="font-size:12px;color:var(--muted)">Score: ${a.marks}/${a.max}</div>
        </div>
        ${a.alert ? '<span class="sc-badge" style="background:var(--red-l,#fee2e2);color:var(--red,#ef4444);font-size:11px">Low Score</span>' : '<span class="sc-badge" style="background:var(--green-l,#dcfce7);color:var(--green,#22c55e);font-size:11px">OK</span>'}
      </div>
    `).join('');
  }
}

function renderHeatmap(elId, weeks) {
  const el = document.getElementById(elId);
  if (!el || !weeks) return;
  const days = ['mon', 'tue', 'wed', 'thu', 'fri'];
  const baseStyle = 'width:28px;height:28px;border-radius:5px;margin:2px;display:inline-block;cursor:default';
  const presentStyle = `${baseStyle};background:#22c55e`;
  const absentStyle = `${baseStyle};background:#ef4444;opacity:0.7`;
  el.style.cssText = 'display:flex;flex-wrap:wrap;gap:0;margin-top:12px';
  el.innerHTML = `
    <div style="width:100%;display:flex;gap:0;margin-bottom:2px">
      ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(d => `<div style="width:32px;font-size:10px;color:var(--muted);text-align:center">${d}</div>`).join('')}
    </div>
    ${weeks.map(w => `
      <div style="display:flex;gap:0;width:100%">
        ${days.map(d => `<div style="${w[d] ? presentStyle : absentStyle}" title="Week ${w.week} ${d.toUpperCase()}: ${w[d] ? 'Present' : 'Absent'}"></div>`).join('')}
      </div>`).join('')}
    <div style="margin-top:8px;font-size:11px;color:var(--muted);display:flex;gap:12px">
      <span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#22c55e;margin-right:4px"></span>Present</span>
      <span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#ef4444;opacity:0.7;margin-right:4px"></span>Absent</span>
    </div>
  `;
}

function renderTimetable(elId, schedule, isFaculty = false) {
  const el = document.getElementById(elId);
  if (!el) return;
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

  let html = `<table style="width:100%;border-collapse:collapse;font-size:12px">
    <thead><tr>
      <th style="padding:8px 12px;text-align:left;color:var(--muted);font-weight:500;white-space:nowrap">Time</th>
      ${dayLabels.map(d => `<th style="padding:8px 12px;text-align:left;color:var(--muted);font-weight:500">${d}</th>`).join('')}
    </tr></thead><tbody>`;

  schedule.forEach(row => {
    if (row.isBreak) {
      html += `<tr><td colspan="6" style="padding:4px 12px;text-align:center;color:var(--muted);font-size:11px;background:var(--bg)">${row.label}</td></tr>`;
      return;
    }
    html += `<tr>`;
    html += `<td style="padding:8px 12px;color:var(--muted);font-size:11px;white-space:nowrap;border-top:1px solid var(--border)">${row.time}</td>`;
    days.forEach(day => {
      const cell = row.days ? row.days[day] : null;
      if (!cell || row.isFree) {
        html += `<td style="padding:8px 12px;border-top:1px solid var(--border)"><span style="color:var(--muted);font-size:11px">—</span></td>`;
        return;
      }
      if (cell.type === 'Free' || cell.isFree) {
        html += `<td style="padding:8px 12px;border-top:1px solid var(--border)"><span style="color:var(--muted);font-size:11px">Free</span></td>`;
        return;
      }
      const accent = { Lab: '#6366f1', Lecture: '#22c55e', Tutorial: '#f59e0b', Meeting: '#ef4444', OfficeHours: '#8b5cf6' };
      const bg = accent[cell.type] || '#6366f1';
      const extra = isFaculty && cell.target ? `<div style="color:var(--muted);font-size:10px;margin-top:2px">${cell.target}</div>` : '';
      html += `<td style="padding:6px 12px;border-top:1px solid var(--border)">
        <div style="background:${bg}18;border-left:3px solid ${bg};border-radius:4px;padding:4px 6px">
          <div style="font-weight:600;color:${bg};font-size:11px">${cell.code || ''}</div>
          <div style="font-size:11px;color:var(--ink)">${cell.name || cell.label || ''}</div>
          ${extra}
          <div style="color:var(--muted);font-size:10px;margin-top:1px">${cell.type} · ${cell.location || ''}</div>
        </div>
      </td>`;
    });
    html += `</tr>`;
  });

  html += `</tbody></table>`;
  el.innerHTML = html;
}

/* =====================================================
   INITIALIZATION
   ===================================================== */
function initPage() {
  const db = getDB().student;

  // Sidebar & Topbar
  document.getElementById('sbUname').textContent = db.profile.personal.fullName;
  document.getElementById('sbUrole').textContent = `${db.profile.academic.year} · ${db.profile.academic.branch}`;
  document.getElementById('topSem').textContent = db.profile.academic.semester;
  document.getElementById('sbAvatar').textContent = db.profile.personal.fullName.charAt(0);

  // ── DASHBOARD ──────────────────────────────────────
  const a = db.profile.academic;
  document.getElementById('dashStats').innerHTML = `
    <div class="stat-card"><div class="sc-label">Current CGPA</div><div class="sc-val">${a.cgpa}</div></div>
    <div class="stat-card"><div class="sc-label">Attendance</div><div class="sc-val">${a.attendance}%</div></div>
    <div class="stat-card"><div class="sc-label">Enrolled Courses</div><div class="sc-val">${db.courses.summary.enrolledCount}</div></div>
    <div class="stat-card"><div class="sc-label">Pending Tasks</div><div class="sc-val">${db.courses.summary.pendingAssignments}</div></div>
  `;

  renderDashboardAnalytics(db);

  document.getElementById('perfTable').innerHTML = a.currentCourses.map(c => `
    <tr>
      <td><strong>${c.course}</strong><span class="course-code">${c.id}</span></td>
      <td>${c.instructor}</td><td><strong>${c.grade}</strong></td><td>${c.attendance}%</td>
      <td><div class="prog-bar-small prog-bar"><div class="prog-fill blue" style="width:${c.progress}%"></div></div></td>
      <td><span class="sc-badge blue">${c.status}</span></td>
    </tr>
  `).join('');

  // ── PROFILE ────────────────────────────────────────
  const p = db.profile.personal;
  const ec = db.profile.emergencyContact;
  document.getElementById('profileCardHead').innerHTML = `
    <div class="cgpa-ring"><div class="cgpa-center"><span class="cgpa-num">${a.cgpa}</span><span class="cgpa-denom">CGPA</span></div></div>
    <div class="profile-name">${p.fullName}</div>
    <div class="profile-info">${a.studentId} · ${a.branch}</div>
  `;
  document.getElementById('profileAcademic').innerHTML = `
    <div class="pf-item"><div class="pf-key">UID</div><div class="pf-val">${a.studentId}</div></div>
    <div class="pf-item"><div class="pf-key">Batch</div><div class="pf-val">${a.batch}</div></div>
    <div class="pf-item"><div class="pf-key">Year</div><div class="pf-val">${a.academicYear}</div></div>
    <div class="pf-item"><div class="pf-key">Section</div><div class="pf-val">${a.section}</div></div>
    <div class="pf-item"><div class="pf-key">Department</div><div class="pf-val">${a.department}</div></div>
    <div class="pf-item"><div class="pf-key">School</div><div class="pf-val">${a.school}</div></div>
    <div class="pf-item"><div class="pf-key">Semester</div><div class="pf-val">${a.semester}</div></div>
    <div class="pf-item"><div class="pf-key">Term</div><div class="pf-val">${a.term}</div></div>
  `;
  document.getElementById('semHistory').innerHTML = `
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:8px">
      ${a.currentCourses.map(c => `
        <div style="flex:1;min-width:120px;border:1px solid var(--border);border-radius:8px;padding:10px">
          <div style="font-size:11px;color:var(--muted)">${c.id}</div>
          <div style="font-size:15px;font-weight:700;color:var(--accent)">${c.grade}</div>
          <div style="font-size:11px;color:var(--muted)">${c.attendance}% att.</div>
        </div>`).join('')}
    </div>
  `;
  document.getElementById('profilePersonal').innerHTML = `
    <div class="pf-item"><div class="pf-key">Full Name</div><div class="pf-val">${p.fullName}</div></div>
    <div class="pf-item"><div class="pf-key">Email</div><div class="pf-val">${p.email}</div></div>
    <div class="pf-item"><div class="pf-key">Phone</div><div class="pf-val">${p.phone}</div></div>
    <div class="pf-item"><div class="pf-key">DOB</div><div class="pf-val">${p.dob}</div></div>
    <div class="pf-item"><div class="pf-key">Gender</div><div class="pf-val">${p.gender}</div></div>
    <div class="pf-item"><div class="pf-key">Blood Group</div><div class="pf-val">${p.bloodGroup}</div></div>
    <div class="pf-item"><div class="pf-key">Nationality</div><div class="pf-val">${p.nationality}</div></div>
  `;
  document.getElementById('profileEmergency').innerHTML = `
    <div class="pf-item"><div class="pf-key">Contact Person</div><div class="pf-val">${ec.contactPerson}</div></div>
    <div class="pf-item"><div class="pf-key">Relationship</div><div class="pf-val">${ec.relationship}</div></div>
    <div class="pf-item"><div class="pf-key">Phone</div><div class="pf-val">${ec.number}</div></div>
    <div class="pf-item"><div class="pf-key">Email</div><div class="pf-val">${ec.email}</div></div>
  `;

  // ── TIMETABLE ──────────────────────────────────────
  renderTimetable('ttGrid', db.timetable.schedule, false);

  // ── COURSES ── (with Assignments sub-view) ─────────
  const richCourses = db.courses.list;
  document.getElementById('coursesList').innerHTML = richCourses.map(c => {
    const assignments = c.assessments || [];
    const pendingCount = assignments.filter(a => a.status === 'pending').length;
    const statusColor = { pending: '#f59e0b', submitted: '#6366f1', graded: '#22c55e' };
    const statusLabel = { pending: 'Pending', submitted: 'Submitted', graded: 'Graded' };

    const assignHtml = assignments.length ? `
      <div style="margin-top:12px;border-top:1px solid var(--border);padding-top:10px">
        <div style="font-size:12px;font-weight:600;color:var(--muted);margin-bottom:6px">📋 Assignments</div>
        ${assignments.map(asn => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--border)">
            <div>
              <div style="font-size:13px;font-weight:500;color:var(--ink)">${asn.title}</div>
              <div style="font-size:11px;color:var(--muted)">Due: ${asn.due} · Max: ${asn.max}M${asn.scored !== null && asn.scored !== undefined ? ' · Scored: <strong style="color:var(--accent)">' + asn.scored + 'M</strong>' : ''}</div>
            </div>
            <div style="display:flex;align-items:center;gap:8px">
              <span style="font-size:11px;padding:2px 8px;border-radius:6px;font-weight:600;background:${statusColor[asn.status] || '#6366f1'}22;color:${statusColor[asn.status] || '#6366f1'}">${statusLabel[asn.status] || asn.status}</span>
              ${asn.status === 'pending' ? `<button class="btn btn-primary" style="font-size:11px;padding:4px 10px" onclick="openSubmitAssignment('${c.id}','${asn.title.replace(/'/g, "\\'")}')">Submit</button>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    ` : '';

    return `
      <div class="course-card">
        <div class="cc-head">
          <div class="cc-info">
            <div class="cc-code">${c.code}</div>
            <div class="cc-name">${c.title}</div>
            <div class="cc-inst">${c.instructor}</div>
          </div>
          <div class="grade-pill">${c.grade}</div>
        </div>
        <div class="cc-meta">
          <div>Credits: ${c.credits}</div>
          <div>Att: ${c.attendance.percent}% (${c.attendance.attended}/${c.attendance.total})</div>
          <div>Progress: ${c.progress}%</div>
          <div>Next: ${c.nextClass}</div>
        </div>
        ${c.currentModule ? `<div style="margin-top:8px;font-size:12px;color:var(--muted)">📖 ${c.currentModule}</div>` : ''}
        ${pendingCount > 0 ? `<div style="margin-top:4px;font-size:12px;color:var(--accent)">${pendingCount} assignment(s) pending</div>` : ''}
        <div style="margin-top:10px">
          <div style="height:5px;border-radius:4px;background:var(--border)">
            <div style="width:${c.progress}%;height:100%;background:var(--accent);border-radius:4px"></div>
          </div>
        </div>
        ${assignHtml}
      </div>
    `;
  }).join('');

  // ── ATTENDANCE ─────────────────────────────────────
  const att = db.attendanceTracker;
  document.getElementById('attStats').innerHTML = att.allSubjects.map(s => `
    <div class="stat-card">
      <div class="sc-label">${s.code}</div>
      <div class="sc-val ${s.percent < 75 ? 'red' : ''}">${s.percent}%</div>
      <div style="font-size:11px;color:var(--muted)">${s.ratio}</div>
    </div>
  `).join('');

  renderHeatmap('heat1', att.activeSubject.weeks);
  renderHeatmap('heat2', att.activeSubject.weeks);

  // Show correction requests history
  const corrEl = document.getElementById('correctionHistory');
  if (corrEl) {
    const corrections = att.correctionRequests || [];
    corrEl.innerHTML = corrections.length ? corrections.map(cr => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;margin-top:8px;background:var(--bg);border-radius:8px;border:1px solid var(--border)">
        <div>
          <div style="font-size:13px;font-weight:600">${cr.course}</div>
          <div style="font-size:11px;color:var(--muted)">${cr.date} · ${cr.reason}</div>
        </div>
        <span class="status-pill ${cr.status === 'approved' ? 'approved' : cr.status === 'rejected' ? 'rejected' : 'pending'}">${cr.status}</span>
      </div>
    `).join('') : '<p style="color:var(--muted);font-size:13px;margin-top:8px">No correction requests submitted yet.</p>';
  }

  // ── LEAVE ──────────────────────────────────────────
  document.getElementById('leaveHistory').innerHTML = db.leaveManagement.applications.map(l => `
    <div class="leave-card">
      <div class="lc-info">
        <div class="lc-type">${l.type}</div>
        <div class="lc-reason">${l.reason}</div>
        <div class="lc-meta">${l.startDate} – ${l.endDate} · Applied: ${l.appliedOn}</div>
      </div>
      <span class="status-pill ${l.status.toLowerCase()}">${l.status}</span>
    </div>
  `).join('');

  // ── FORUM ──────────────────────────────────────────
  const fullThreads = db.forum.fullThreads || db.forum.threads;
  document.getElementById('forumThreads').innerHTML = fullThreads.map(t => `
    <div class="forum-thread" style="cursor:pointer" onclick="openThread(${t.id})">
      <div class="ft-lecture">${t.lectureTag}</div>
      <div class="ft-title">${t.title}</div>
      <div class="ft-meta">
        <span>by ${t.author}</span>
        <span>${t.replies || 0} replies</span>
        <span>${t.timestamp}</span>
        <button class="btn btn-blue btn-sm" style="margin-left:auto" onclick="event.stopPropagation();openThread(${t.id})">View &amp; Reply</button>
      </div>
    </div>
  `).join('');

  // ── RESEARCH ───────────────────────────────────────
  const proj = db.research.project;
  const meetingRequests = db.research.meetingRequests || [];

  const meetingStatusColor = { pending: '#f59e0b', approved: '#22c55e', rejected: '#ef4444' };

  document.getElementById('milestones').innerHTML = `
    <div style="margin-bottom:16px;padding:12px;background:var(--bg);border-radius:8px;border:1px solid var(--border)">
      <div style="font-weight:600">${proj.title}</div>
      <div style="font-size:12px;color:var(--muted);margin-top:4px">${proj.type} · Guide: ${proj.guide}</div>
      <div style="display:flex;gap:16px;margin-top:8px;flex-wrap:wrap">
        <div style="font-size:12px"><strong>${proj.stats.tasksCompleted}/${proj.stats.totalTasks}</strong> tasks</div>
        <div style="font-size:12px"><strong>${proj.stats.daysRemaining}</strong> days left</div>
        <div style="font-size:12px"><strong>${proj.stats.documentsCount}</strong> documents</div>
      </div>
    </div>
  ` + db.research.milestones.map(m => `
    <div class="milestone-item ${m.status === 'completed' ? 'done' : m.status === 'in-progress' ? 'progress' : ''}">
      <div class="mi-label">${m.status.toUpperCase()}</div>
      <div class="mi-title">${m.title}</div>
      <div class="mi-desc">${m.description} · ${m.date}</div>
    </div>
  `).join('') + (meetingRequests.length ? `
    <div style="margin-top:16px;border-top:1px solid var(--border);padding-top:12px">
      <div style="font-size:13px;font-weight:600;color:var(--muted);margin-bottom:8px">📅 Meeting Requests</div>
      ${meetingRequests.map(mr => `
        <div style="padding:10px 12px;background:var(--bg);border-radius:8px;border:1px solid var(--border);margin-bottom:8px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start">
            <div>
              <div style="font-size:13px;font-weight:600">${mr.proposedDate} at ${mr.proposedTime}</div>
              <div style="font-size:12px;color:var(--muted);margin-top:3px">${mr.agenda}</div>
              ${mr.facultyNote ? `<div style="margin-top:5px;font-size:12px;color:var(--accent)">Faculty note: ${mr.facultyNote}</div>` : ''}
              <div style="font-size:11px;color:var(--muted);margin-top:3px">Requested: ${mr.requestedOn}</div>
            </div>
            <span style="font-size:11px;padding:3px 8px;border-radius:6px;font-weight:600;background:${(meetingStatusColor[mr.status] || '#6366f1')}22;color:${meetingStatusColor[mr.status] || '#6366f1'};white-space:nowrap">${mr.status}</span>
          </div>
        </div>
      `).join('')}
    </div>
  ` : '');
}

// Initialize on page load and listen for changes
document.addEventListener('student:changed', initPage);
initPage();
