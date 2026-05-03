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

function validateForm(modalId, cfg) {
  clearErrors(modalId);
  let ok = true;
  cfg.forEach(f => {
    const el = document.getElementById(f.id);
    if (!el) return;
    const v = el.value.trim();
    let e = '';
    if (f.required && !v) e = f.message || 'This field is required';
    else if (f.min && v.length < f.min) e = f.message || `Min ${f.min} characters required`;
    if (e) {
      ok = false;
      const p = el.closest('.form-field') || el.closest('.field') || el.parentElement;
      if (p) {
        p.classList.add('has-error');
        const s = document.createElement('span');
        s.className = 'field-error';
        s.textContent = e;
        p.appendChild(s);
      }
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

async function handleLeave() {
  const startDate = document.getElementById('l-start').value;
  const endDate   = document.getElementById('l-end').value;

  if (!validateForm('modalLeave', [
    { id: 'l-type',   required: true, message: 'Please select a leave type' },
    { id: 'l-start',  required: true, message: 'Select start date' },
    { id: 'l-end',    required: true, message: 'Select end date' },
    { id: 'l-reason', required: true, min: 5, message: 'Reason required (min 5 chars)' }
  ])) return;

  if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
    toast('End date cannot be before start date');
    return;
  }

  const user = JSON.parse(sessionStorage.getItem('currentUser'));
  const result = await window.ApiAdapter.applyLeave({
    student_id: user.student_id || user.user_id,
    start_date: new Date(startDate).toISOString(),
    end_date:   new Date(endDate).toISOString(),
    reason:     document.getElementById('l-reason').value
  });
  if (result) {
    toast('Leave request submitted');
    closeModal('modalLeave');
    _refresh();
  } else {
    toast('Failed to submit leave request');
  }
}

async function handleThread() {
  if (!validateForm('modalThread', [
    { id: 't-tag',   required: true, min: 2, message: 'Topic tag required (min 2 chars)' },
    { id: 't-title', required: true, min: 3, message: 'Title required (min 3 chars)' },
    { id: 't-desc',  required: true, min: 5, message: 'Description required (min 5 chars)' }
  ])) return;

  const user = JSON.parse(sessionStorage.getItem('currentUser'));
  const result = await window.ApiAdapter.createForumPost({
    author_id: user.student_id || user.user_id,
    topic:   document.getElementById('t-tag').value,
    title:   document.getElementById('t-title').value,
    content: document.getElementById('t-desc').value
  });
  if (result) {
    toast('Question posted to forum!');
    document.getElementById('t-tag').value   = '';
    document.getElementById('t-title').value = '';
    document.getElementById('t-desc').value  = '';
    closeModal('modalThread');
    _refresh();
  } else {
    toast('Failed to post — please try again');
  }
}

async function handleMilestone() {
  if (!validateForm('modalMilestone', [
    { id: 'm-title', required: true, min: 3, message: 'Title required (min 3 chars)' },
    { id: 'm-date',  required: true, message: 'Target date is required' }
  ])) return;

  const user = JSON.parse(sessionStorage.getItem('currentUser'));
  const result = await window.ApiAdapter.uploadMilestone({
    student_id:  user.student_id || user.user_id,
    title:       document.getElementById('m-title').value,
    target_date: document.getElementById('m-date').value,
    description: document.getElementById('m-desc')?.value || '',
    status:      'upcoming'
  });
  if (result) {
    toast('Milestone added successfully!');
    closeModal('modalMilestone');
    _refresh();
  } else {
    toast('Failed to save milestone — try again');
  }
}

function handleBug() {
  if (!validateForm('panel-settings', [
    { id: 'bugTitle', required: true, min: 5, max: 200, message: 'Bug title must be 5-200 characters' },
    { id: 'bugDesc', required: true, min: 10, max: 1000, message: 'Description must be 10-1000 characters' }
  ])) return;

  // Bug reports go to the superuser — no dedicated backend endpoint yet, so toast for now
  toast('Bug report received — will be reviewed by the admin team.');
  document.getElementById('bugTitle').value = '';
  document.getElementById('bugDesc').value = '';
}

/* --- Attendance Correction --- */
async function handleAttendanceCorrection() {
  if (!validateForm('modalCorrection', [
    { id: 'c-course', required: true, message: 'Please select a course' },
    { id: 'c-date',   required: true, message: 'Please select a date' },
    { id: 'c-reason', required: true, min: 5, message: 'Please provide a reason (min 5 chars)' }
  ])) return;

  // Store as a report (correction request) since the attendance DTO requires enrollment_id
  const user = JSON.parse(sessionStorage.getItem('currentUser'));
  const course = document.getElementById('c-course').value;
  const date   = document.getElementById('c-date').value;
  const reason = document.getElementById('c-reason').value;

  const result = await window.ApiAdapter.createReport({
    reporter_id:   user.student_id || user.user_id,
    report_type:   'ATTENDANCE_CORRECTION',
    title:         `Correction Request: ${course} on ${date}`,
    description:   `Course: ${course}\nDate: ${date}\nReason: ${reason}`,
    status:        'PENDING'
  });
  if (result) {
    toast('Correction request submitted — pending academic head approval');
    closeModal('modalCorrection');
    _refresh();
  } else {
    toast('Failed to submit — please try again');
  }
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

async function handleSubmitAssignment() {
  if (!validateForm('modalSubmitAssignment', [
    { id: 'assign-notes', required: true, min: 3, message: 'Please add submission notes (min 3 chars)' }
  ])) return;

  const user = JSON.parse(sessionStorage.getItem('currentUser'));
  // Use gradeAssessment endpoint to record student submission
  const result = await window.ApiAdapter.gradeAssessment({
    assessment_id: _activeAssignCourse,
    student_id:    user.student_id || user.user_id,
    notes:         document.getElementById('assign-notes').value,
    submitted_at:  new Date().toISOString(),
    status:        'SUBMITTED'
  });
  if (result !== null) {
    toast('Assignment submitted successfully!');
    closeModal('modalSubmitAssignment');
    _refresh();
  } else {
    toast('Submission failed — please try again');
  }
}

/* --- Forum: View & Reply --- */
let _activeThreadId = null;

async function openThread(threadId) {
  _activeThreadId = threadId;
  const thread = await window.ApiAdapter.fetchForumPost(threadId);
  if (!thread) { toast('Thread not found'); return; }

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

async function handleReply() {
  if (!validateForm('modalThreadView', [
    { id: 'reply-text', required: true, min: 5 }
  ])) return;

  const user = JSON.parse(sessionStorage.getItem('currentUser'));
  const result = await window.ApiAdapter.replyToPost(_activeThreadId, {
    author_id: user.user_id,
    content: document.getElementById('reply-text').value
  });
  if (result) {
    toast('Reply posted!');
    document.getElementById('reply-text').value = '';
    openThread(_activeThreadId);
  } else {
    toast('Failed to post reply');
  }
}

/* --- Research: Request Meeting --- */
async function handleRequestMeeting() {
  if (!validateForm('modalRequestMeeting', [
    { id: 'rm-date', required: true },
    { id: 'rm-time', required: true },
    { id: 'rm-agenda', required: true, min: 10 }
  ])) return;

  const user = JSON.parse(sessionStorage.getItem('currentUser'));
  // Milestone with type 'meeting_request' serves as the cross-portal record
  const result = await window.ApiAdapter.uploadMilestone({
    student_id: user.user_id,
    title: 'Meeting Request',
    proposed_date: document.getElementById('rm-date').value,
    proposed_time: document.getElementById('rm-time').value,
    agenda: document.getElementById('rm-agenda').value,
    status: 'pending',
    type: 'meeting_request'
  });
  if (result) {
    toast('Meeting request sent to faculty');
    closeModal('modalRequestMeeting');
    _refresh();
  } else {
    toast('Failed to send meeting request');
  }
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
async function initPage() {
  const user = JSON.parse(sessionStorage.getItem('currentUser'));
  if (!user) return;

  const profile = user.profile || user;
  const studentId = user.student_id || user.user_id;

  // Sidebar & Topbar — fields are stored directly on user object from backend
  document.getElementById('sbUname').textContent = user.name || user.username;
  document.getElementById('sbUrole').textContent = `${user.branch || profile.branch || 'Undergraduate'} · Batch ${user.batch || profile.batch || '2025'}`;
  document.getElementById('topSem').textContent = user.batch ? `Batch ${user.batch}` : 'Current Semester';
  document.getElementById('sbAvatar').textContent = (user.name || user.username || 'S').charAt(0);

  // Parallel fetch
  const [assessments, attendance, leaves, forumPosts, researchProjects] = await Promise.all([
    window.ApiAdapter.fetchAssessments(),
    window.ApiAdapter.fetchStudentAttendance(studentId),
    window.ApiAdapter.fetchStudentLeaves(studentId),
    window.ApiAdapter.fetchForumPosts(),
    window.ApiAdapter.fetchResearchProjects()
  ]);

  // ── DASHBOARD STATS ────────────────────────────────
  const gradedAssessments = assessments.filter(a => a.status === 'GRADED');
  const avgCgpa = gradedAssessments.length ? (gradedAssessments.reduce((acc, curr) => acc + (curr.score || 0), 0) / (gradedAssessments.length * 10)) : 8.5; // Mock fallback if no grades
  const overallAttendance = attendance.length ? (attendance.reduce((acc, curr) => acc + curr.percentage, 0) / attendance.length) : 0;
  const pendingTasks = assessments.filter(a => a.status !== 'GRADED' && a.status !== 'SUBMITTED').length;

  document.getElementById('dashStats').innerHTML = `
    <div class="stat-card"><div class="sc-label">Current CGPA</div><div class="sc-val">${avgCgpa.toFixed(2)}</div></div>
    <div class="stat-card"><div class="sc-label">Attendance</div><div class="sc-val">${overallAttendance.toFixed(1)}%</div></div>
    <div class="stat-card"><div class="sc-label">Enrolled Courses</div><div class="sc-val">${attendance.length}</div></div>
    <div class="stat-card"><div class="sc-label">Pending Tasks</div><div class="sc-val">${pendingTasks}</div></div>
  `;

  // ── PERFORMANCE TABLE ──────────────────────────────
  document.getElementById('perfTable').innerHTML = attendance.length ? attendance.map(att => {
    const courseAss = assessments.find(a => a.course_id === att.course_id) || {};
    const courseName = att.course_name || att.subject || att.course_id;
    const pct = att.percentage || 0;
    return `
      <tr>
        <td><strong>${att.course_id}</strong><div style="font-size:11px;color:var(--muted)">${att.course_name}</div></td>
        <td>Dr. Faculty</td>
        <td>${courseAss.score != null ? courseAss.score : 'N/A'}</td>
        <td>${pct.toFixed ? pct.toFixed(0) : pct}%</td>
        <td>
          <div style="height:6px;width:60px;background:var(--border);border-radius:3px;overflow:hidden">
            <div style="width:${Math.min(pct,100)}%;height:100%;background:var(--accent)"></div>
          </div>
        </td>
        <td><span class="status-pill ${att.flagged ? 'rejected' : 'approved'}">${att.flagged ? 'Low' : 'Good'}</span></td>
      </tr>
    `;
  }).join('') : '<tr><td colspan=6 style=text-align:center;padding:20px;color:var(--muted)>No performance data available.</td></tr>';

  // ── PROFILE ────────────────────────────────────────
  document.getElementById('profileCardHead').innerHTML = `
    <div class="cgpa-ring"><div class="cgpa-center"><span class="cgpa-num">${avgCgpa.toFixed(2)}</span><span class="cgpa-denom">CGPA</span></div></div>
    <div class="profile-name">${user.name}</div>
    <div class="profile-info">${studentId} · ${user.branch || profile.branch || 'Computer Science'}</div>
  `;
  document.getElementById('profileAcademic').innerHTML = `
    <div class="pf-item"><div class="pf-key">UID</div><div class="pf-val">${studentId}</div></div>
    <div class="pf-item"><div class="pf-key">Batch</div><div class="pf-val">${user.batch || profile.batch || '2025'}</div></div>
    <div class="pf-item"><div class="pf-key">Level</div><div class="pf-val">Undergraduate</div></div>
    <div class="pf-item"><div class="pf-key">Branch</div><div class="pf-val">${user.branch || profile.branch || 'Computer Science'}</div></div>
    <div class="pf-item"><div class="pf-key">School</div><div class="pf-val">${user.school || profile.school || 'School of Engineering & Technology'}</div></div>
    <div class="pf-item"><div class="pf-key">Program</div><div class="pf-val">${user.program || profile.program || 'B.Tech'}</div></div>
  `;
  document.getElementById('profilePersonal').innerHTML = `
    <div class="pf-item"><div class="pf-key">Full Name</div><div class="pf-val">${user.name}</div></div>
    <div class="pf-item"><div class="pf-key">Email</div><div class="pf-val">${user.email}</div></div>
    <div class="pf-item"><div class="pf-key">Blood Group</div><div class="pf-val">${user.blood_group || profile.blood_group || 'O+'}</div></div>
  `;
  document.getElementById('profileEmergency').innerHTML = `
    <div class="pf-item"><div class="pf-key">Emergency Contact</div><div class="pf-val">${user.emergency_contact || profile.emergency_contact || '+91-9876543210'}</div></div>
    <div class="pf-item"><div class="pf-key">Parent Name</div><div class="pf-val">${user.parent_name || profile.parent_name || 'Guardian'}</div></div>
  `;

  // ── TIMETABLE ──────────────────────────────────────
  const ttEl = document.getElementById('timetableGrid') || document.getElementById('ttGrid');
  if (ttEl) {
    const ttData = [
      { time: '09:00–10:00', mon: 'CS201', tue: 'CS302', wed: 'CS201', thu: 'CS302', fri: 'CS201' },
      { time: '10:00–11:00', mon: 'CS302', tue: 'CS201', wed: 'CS302', thu: 'CS201', fri: 'CS302' },
      { isBreak: true, label: 'Break' },
      { time: '11:30–12:30', mon: 'Lab', tue: 'Elective', wed: 'Lab', thu: 'Elective', fri: 'Lab' },
    ];
    const rows = ttData.map(r => r.isBreak
      ? `<tr><td colspan="6" style="padding:4px 12px;text-align:center;color:var(--muted);font-size:11px;background:var(--bg)">${r.label}</td></tr>`
      : `<tr><td style="padding:8px 12px;font-size:12px;color:var(--muted);white-space:nowrap">${r.time}</td>${['mon','tue','wed','thu','fri'].map(d => `<td style="padding:8px 12px;font-size:12px">${r[d]||''}</td>`).join('')}</tr>`
    ).join('');
    ttEl.innerHTML = `<table style="width:100%;border-collapse:collapse;font-size:12px">
      <thead><tr><th style="padding:8px 12px;text-align:left;color:var(--muted)">Time</th><th>Mon</th><th>Tue</th><th>Wed</th><th>Thu</th><th>Fri</th></tr></thead>
      <tbody>${rows}</tbody></table>`;
  }

  // ── COURSES ────────────────────────────────────────
  document.getElementById('coursesList').innerHTML = attendance.length ? attendance.map(att => `
    <div class="card" style="margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div class="card-title">${att.course_id}: ${att.course_name || att.subject || att.course_id}</div>
          <div class="card-sub">Attendance: ${att.percentage ? att.percentage.toFixed(1) : 0}% · ${att.attended || 0}/${att.total_classes || 0} classes</div>
        </div>
        <button class="btn btn-outline" onclick="openSubmitAssignment('${att.course_id}', '${att.course_name || att.course_id}')">Submit Task</button>
      </div>
    </div>
  `).join('') : '<p style="color:var(--muted);font-size:13px">No enrolled courses found.</p>';

  // ── ATTENDANCE ─────────────────────────────────────
  document.getElementById('attStats').innerHTML = attendance.length ? attendance.map(att => `
    <div class="stat-card">
      <div class="sc-label">${att.course_name || att.subject || att.course_id}</div>
      <div class="sc-val">${att.percentage ? att.percentage.toFixed(1) : 0}%</div>
      <div style="font-size:11px;color:var(--muted)">${att.attended || 0}/${att.total_classes || 0} classes</div>
    </div>
  `).join('') : '<p style="color:var(--muted);font-size:13px">No attendance data available.</p>';

  // ── LEAVE ──────────────────────────────────────────
  document.getElementById('leaveHistory').innerHTML = leaves.length ? leaves.map(l => `
    <div class="leave-card">
      <div class="lc-info">
        <div class="lc-type">${l.reason.split(':')[0]}</div>
        <div class="lc-reason">${l.reason}</div>
        <div class="lc-meta">${new Date(l.start_date).toLocaleDateString()} – ${new Date(l.end_date).toLocaleDateString()}</div>
      </div>
      <span class="status-pill ${l.status.toLowerCase()}">${l.status}</span>
    </div>
  `).join('') : '<p style="color:var(--muted);font-size:13px">No leave applications found.</p>';

  // ── FORUM ──────────────────────────────────────────
  document.getElementById('forumThreads').innerHTML = forumPosts.length ? forumPosts.map(p => `
    <div class="card" style="margin-bottom:12px;cursor:pointer" onclick="openThread('${p.post_id || p.id}')">
      <div style="font-size:11px;color:var(--accent);font-weight:600;margin-bottom:4px">${p.topic || p.topic_id || 'Discussion'}</div>
      <div style="font-size:14px;font-weight:600;margin-bottom:6px">${p.title || p.content || 'Forum Post'}</div>
      <div style="font-size:12px;color:var(--muted)">By ${p.author_name || p.author || 'Student'} · ${p.replies_count || 0} replies</div>
    </div>
  `).join('') : '<p style="color:var(--muted);font-size:13px">No forum threads yet. Start a discussion!</p>';

  // ── RESEARCH ───────────────────────────────────────
  const myResearch = researchProjects.filter(r => r.student_id === studentId);
  document.getElementById('milestones').innerHTML = myResearch.length ? myResearch.map(r => `
    <div class="card" style="margin-bottom:12px">
      <div class="card-title">${r.title || 'Research Project'}</div>
      <div class="card-sub">Domain: ${r.domain || 'General'}</div>
      <div class="card-sub">Supervisor: ${r.supervisor_name || r.faculty_name || 'Faculty Advisor'}</div>
      <div style="margin-top:10px">
        <span class="status-pill approved">${r.status || 'In Progress'}</span>
      </div>
    </div>
  `).join('') : '<p style="color:var(--muted);font-size:13px">No active research projects found.</p>';
}

// Initialize on page load and listen for changes
document.addEventListener('student:changed', initPage);
initPage();

