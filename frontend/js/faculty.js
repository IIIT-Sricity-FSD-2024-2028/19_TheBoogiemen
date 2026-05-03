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
    submissions: 'Assignment Submissions',
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

async function handleSchedule() {
  const meetingDate = document.getElementById('meet-date').value;
  const today = new Date().toISOString().split('T')[0];
  
  if (!validateForm('modalMeeting', [
    { id: 'meet-stu', required: true, message: 'Student name required' },
    { id: 'meet-date', required: true, type: 'date', minDate: today, message: 'Meeting date must be in the future' },
    { id: 'meet-time', required: true, type: 'time', message: 'Select a valid time' },
    { id: 'meet-agenda', required: false, min: 10, max: 500, message: 'Agenda must be 10-500 characters' }
  ])) return;

  const user = JSON.parse(sessionStorage.getItem('currentUser'));
  const result = await window.ApiAdapter.scheduleEvent({
    faculty_id: user.user_id,
    student_name: document.getElementById('meet-stu').value,
    start_time: new Date(document.getElementById('meet-date').value + 'T' + document.getElementById('meet-time').value).toISOString(),
    end_time: new Date(document.getElementById('meet-date').value + 'T' + document.getElementById('meet-time').value).toISOString(),
    agenda: document.getElementById('meet-agenda').value,
    event_type: 'intervention'
  });
  toast(result ? 'Intervention meeting registered' : 'Failed to register meeting');
  if (result) { closeModal('modalMeeting'); _refresh(); }
}

/* --- Assessment CRUD --- */
async function handleCreateAssessment() {
  if (!validateForm('modalNewAssess', [
    { id: 'a-name', required: true, min: 3 },
    { id: 'a-course', required: true },
    { id: 'a-marks', required: true }
  ])) return;

  const courseVal = document.getElementById('a-course').value;
  const typeVal = document.getElementById('a-type').value;
  const marksVal = parseInt(document.getElementById('a-marks').value) || 20;
  const dueVal = document.getElementById('a-due').value;

  const result = await window.ApiAdapter.createAssessment({
    course_id: courseVal,
    title: document.getElementById('a-name').value,
    type: typeVal,
    max_marks: marksVal,
    due_date: dueVal ? new Date(dueVal).toISOString() : null
  });
  toast(result ? 'Assessment created & visible to students' : 'Failed to create assessment');
  if (result) { closeModal('modalNewAssess'); _refresh(); }
}

function handleDeleteQuestion(qId) {
  toast('Question management: backend endpoint not yet wired.');
  renderAssessmentsList();
}
    id: Date.now(),
    metadata: {
      title: document.getElementById('a-name').value,
      course: courseVal,
      type: typeVal,
      totalMarks: marksVal
    },
    availableOutcomes: db.faculty.assessmentMapping.availableOutcomes,
    questions: []
  };

  // Store in assessment list — does NOT overwrite assessmentMapping
  if (!db.faculty.assessmentList) db.faculty.assessmentList = [];
  db.faculty.assessmentList.push(newAssess);

  // Sync: Create assignment in student courses for matching course
  let syncedToStudent = false;
  if (db.student && db.student.courses && db.student.courses.list) {
    const courseMap = { 'CS301': 'cs301', 'CS302': 'cs302', 'CS303': 'cs303', 'CS304': 'cs304', 'CS305': 'cs305' };
    const stuCourseId = courseMap[courseVal] || courseVal.toLowerCase();
    console.log('[Assessment Sync] Faculty selected:', courseVal, '→ Student course ID:', stuCourseId);
    console.log('[Assessment Sync] Student courses:', db.student.courses.list.map(c => c.id + '/' + c.code).join(', '));
    const ci = db.student.courses.list.findIndex(c => c.id === stuCourseId || c.code === courseVal);
    console.log('[Assessment Sync] Match index:', ci);
    if (ci !== -1) {
      if (!db.student.courses.list[ci].assessments) db.student.courses.list[ci].assessments = [];
      const exists = db.student.courses.list[ci].assessments.find(a => a.title === newAssess.metadata.title);
      console.log('[Assessment Sync] Exists check:', !!exists, 'Current assessments:', db.student.courses.list[ci].assessments.map(a => a.title).join(', '));
      if (!exists) {
        db.student.courses.list[ci].assessments.push({
          title: newAssess.metadata.title,
          due: dueVal || 'TBD',
          status: 'pending',
          max: marksVal,
          scored: null,
          facultyAssessmentId: newAssess.id
        });
        if (!db.student.courses.summary) db.student.courses.summary = { pendingAssignments: 0 };
        db.student.courses.summary.pendingAssignments = db.student.courses.list.reduce(
          (sum, c) => sum + (c.assessments || []).filter(a => a.status === 'pending').length, 0
        );
        syncedToStudent = true;
        console.log('[Assessment Sync] ✅ Pushed to student course:', db.student.courses.list[ci].id);
        console.log('[Assessment Sync] Updated assessments:', db.student.courses.list[ci].assessments.map(a => a.title + ' (' + a.status + ')').join(', '));
      } else {
        console.log('[Assessment Sync] ⚠️ Already exists, skipping');
      }
    }
  } else {
    console.log('[Assessment Sync] ❌ db.student.courses.list not found:', !!db.student, !!db.student?.courses, !!db.student?.courses?.list);
  }

  // Initialize faculty submissions tracker
  if (!db.faculty.submissions) db.faculty.submissions = [];

  console.log('[Assessment Sync] About to save DB. db.student.courses.list:', JSON.stringify(db.student.courses.list.map(c => ({ id: c.id, assessments: (c.assessments || []).map(a => a.title) }))));

  // [migrated: */
  toast(syncedToStudent ? 'Assessment created & pushed to students (they need to refresh to see it)' : 'Assessment created (no matching student course found)');
  closeModal('modalNewAssess');
  _refresh();
}

function handleDeleteQuestion(qId) {
  // Legacy: remove from assessmentMapping too for backward compat
  const db = (function(){
  return {
    faculty:{
      profile:{account:{name:'Faculty'}},
      dashboard:{interventionLog:[],stats:{atRiskStudents:[]}},
      forum:{threads:[],summary:{totalDiscussions:0,resolvedCount:0,needsResponseCount:0}},
      assessmentMapping:{availableOutcomes:{cos:[],pos:[]}},
      assessmentList:[],
      submissions:[],
      researchSupervision:{projects:[],summary:{totalProjects:0,inProgress:0}},
      attendanceMarking:{classes:[],history:[]},
      timetable:{schedule:[]},
      studentOverview:{students:[]},
      courseSummaries:[]
    },
    student:{
      profile:{personal:{fullName:''},academic:{studentId:''}},
      courses:{list:[],summary:{pendingAssignments:0}},
      forum:{threads:[],fullThreads:[]},
      research:{project:{},milestones:[],meetingRequests:[]}
    },
    superuser:{bugReports:[]}
  };
})();
  if (db.faculty.assessmentMapping && db.faculty.assessmentMapping.questions) {
    db.faculty.assessmentMapping.questions = db.faculty.assessmentMapping.questions.filter(q => q.id !== qId);
  }
  // [migrated: */
  toast('Question removed from mapping');
  renderAssessmentsList();
}

function handleSaveMapping() {
  toast('Outcome mapping saved.');
}

/* --- Add Question with CO/PO Mapping --- */
let _activeAssessId = null;

async function showAddQuestion(assessId) {
  const assessments = await window.ApiAdapter.fetchAssessments();
  const target = assessId ? assessments.find(a => a.assessment_id === assessId) : assessments[assessments.length - 1];
  const list = db.faculty.assessmentList || [];
  const target = assessId ? list.find(a => a.id === assessId) : list[list.length - 1];
  if (!target) { toast('Create an assessment first'); return; }
  _activeAssessId = target.id;
  const outcomes = target.availableOutcomes || db.faculty.assessmentMapping.availableOutcomes;

  const coEl = document.getElementById('q-co-checkboxes');
  coEl.innerHTML = (outcomes.cos || []).map(co =>
    `<label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer">
      <input type="checkbox" value="${co.id}" class="q-co-cb"/> ${co.id}
    </label>`
  ).join('');

  const poEl = document.getElementById('q-po-checkboxes');
  poEl.innerHTML = (outcomes.pos || []).map(po =>
    `<label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer">
      <input type="checkbox" value="${po.id}" class="q-po-cb"/> ${po.id}
    </label>`
  ).join('');

  document.getElementById('q-name').value = '';
  document.getElementById('q-marks').value = '10';
  document.getElementById('q-text').value = '';
  showModal('modalAddQuestion');
}

async function handleAddQuestion() {
  if (!validateForm('modalAddQuestion', [
    { id: 'q-name', required: true, min: 2 },
    { id: 'q-text', required: true, min: 5 },
    { id: 'q-marks', required: true }
  ])) return;

  const mappedCOs = Array.from(document.querySelectorAll('.q-co-cb:checked')).map(cb => cb.value);
  const mappedPOs = Array.from(document.querySelectorAll('.q-po-cb:checked')).map(cb => cb.value);

  if (mappedCOs.length === 0) { toast('Please select at least one Course Outcome (CO)'); return; }

  const result = await window.ApiAdapter.updateAssessment(_activeAssessId, {
    question: {
      name: document.getElementById('q-name').value,
      marks: parseInt(document.getElementById('q-marks').value) || 10,
      text: document.getElementById('q-text').value,
      mapped_cos: mappedCOs,
      mapped_pos: mappedPOs
    }
  });
  toast(result ? 'Question added with CO/PO mapping' : 'Failed to add question');
  if (result) { closeModal('modalAddQuestion'); renderAssessmentsList(); }
}

/* --- Render ALL assessments from assessmentList --- */
async function renderAssessmentsList() {
  const assessments = await window.ApiAdapter.fetchAssessments();
  const metaEl = document.getElementById('assessMeta');
  const qEl = document.getElementById('mappingQuestions');
  if (!metaEl || !qEl) return;

  const list = assessments || [];
  if (list.length === 0) {
    metaEl.innerHTML = `<div class="card-title">Outcome Mapping</div><div class="card-sub">Create your first assessment to get started</div>`;
    qEl.innerHTML = '<p style="color:var(--muted);font-size:13px;padding:12px 0">No assessments created yet.</p>';
    return;
  }

  // Render all assessments stacked
  qEl.innerHTML = list.map(a => {
    const qs = a.questions || [];
    return `
    <div style="border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:16px;background:var(--bg)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <div>
          <div style="font-weight:700;font-size:15px;color:var(--ink)">${a.metadata.title}</div>
          <div style="font-size:12px;color:var(--muted)">${a.metadata.course} · ${a.metadata.type || 'Assessment'} · ${a.metadata.totalMarks}M · ${qs.length} question(s)</div>
        </div>
        <button class="btn btn-blue btn-sm" onclick="showAddQuestion(${a.id})">+ Question</button>
      </div>
      ${qs.length ? qs.map(q => `
        <div style="border:1px solid var(--rule);border-radius:8px;padding:12px;margin-bottom:8px;background:var(--white)">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
            <div>
              <span style="font-weight:600;font-size:13px">${q.name}</span>
              <span style="font-size:12px;color:var(--muted);margin-left:8px">${q.marks} marks</span>
            </div>
            <button class="btn btn-red btn-sm" onclick="handleDeleteAssessQuestion(${a.id},${q.id})">Remove</button>
          </div>
          <div style="font-size:13px;color:var(--soft);margin-bottom:8px">${q.text}</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">
            <span style="font-size:11px;color:var(--muted);margin-right:4px">COs:</span>
            ${q.mappedCOs.map(co => `<span style="background:var(--accent-l,#eef2ff);color:var(--accent);font-size:11px;padding:2px 8px;border-radius:4px;font-weight:600">${co}</span>`).join('')}
            <span style="font-size:11px;color:var(--muted);margin-left:8px;margin-right:4px">POs:</span>
            ${q.mappedPOs.map(po => `<span style="background:var(--green-l,#dcfce7);color:var(--green,#16a34a);font-size:11px;padding:2px 8px;border-radius:4px;font-weight:600">${po}</span>`).join('')}
          </div>
        </div>
      `).join('') : '<p style="color:var(--muted);font-size:12px;padding:4px 0">No questions yet — click "+ Question" to add CO/PO mapped questions.</p>'}
    </div>`;
  }).join('');
}

async function handleDeleteAssessQuestion(assessId, qId) {
  const result = await window.ApiAdapter.deleteAssessment(assessId);
  toast(result ? 'Question removed' : 'Failed to remove question');
  renderAssessmentsList();
}

/* --- Forum CRUD --- */
let _activeFacultyThreadId = null;

async function openFacultyThread(threadId) {
  _activeFacultyThreadId = threadId;
  const thread = await window.ApiAdapter.fetchForumPost(threadId);
  if (!thread) { toast('Thread not found'); return; }

  const body = document.getElementById('fThreadViewBody');
  const commentsEl = document.getElementById('fThreadViewComments');
  if (!body || !commentsEl) return;

  body.innerHTML = `
    <div style="margin-bottom:14px">
      <div style="font-size:11px;color:var(--accent);font-weight:600;margin-bottom:6px">${thread.lecture}</div>
      <div style="font-size:15px;font-weight:600;color:var(--ink);margin-bottom:8px">${thread.title}</div>
      <div style="background:var(--bg);border-radius:10px;padding:14px;font-size:13px;color:var(--soft);line-height:1.6">
        ${thread.originalPost || thread.title}
      </div>
      <div style="margin-top:8px;font-size:11px;color:var(--muted)">By <strong>${thread.author}</strong> · ${thread.timeAgo}</div>
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
  `).join('') : '<p style="color:var(--muted);font-size:13px">No replies yet.</p>';

  document.getElementById('fThreadViewTitle').textContent = thread.title;
  document.getElementById('faculty-reply-text').value = '';
  showModal('modalFacultyThreadView');
}

async function handleFacultyReply() {
  if (!validateForm('modalFacultyThreadView', [
    { id: 'faculty-reply-text', required: true, min: 5 }
  ])) return;

  const user = JSON.parse(sessionStorage.getItem('currentUser'));
  const result = await window.ApiAdapter.replyToPost(_activeFacultyThreadId, {
    author_id: user.user_id,
    content: document.getElementById('faculty-reply-text').value,
    role: 'faculty'
  });
  if (result) {
    toast('Reply posted');
    document.getElementById('faculty-reply-text').value = '';
    openFacultyThread(_activeFacultyThreadId);
  } else { toast('Failed to post reply'); }
}

async function handleResolveThread(threadId) {
  const result = await window.ApiAdapter.patchForumPost(threadId, { status: 'resolved' });
  toast(result ? 'Thread marked as resolved' : 'Failed to resolve thread');
  if (result) _refresh();
}

async function handleDeleteThread(threadId) {
  const result = await window.ApiAdapter.deleteForumPost(threadId);
  toast(result ? 'Thread deleted' : 'Failed to delete thread');
  if (result) _refresh();
}

async function handleNewFacultyThread() {
  if (!validateForm('modalFacultyNewThread', [
    { id: 'ft-lecture', required: true, min: 3 },
    { id: 'ft-title', required: true, min: 5 },
    { id: 'ft-body', required: true, min: 10 }
  ])) return;

  const user = JSON.parse(sessionStorage.getItem('currentUser'));
  const result = await window.ApiAdapter.createForumPost({
    author_id: user.user_id,
    topic: document.getElementById('ft-lecture').value,
    title: document.getElementById('ft-title').value,
    content: document.getElementById('ft-body').value,
    role: 'faculty'
  });
  toast(result ? 'Thread posted' : 'Failed to post thread');
  if (result) { closeModal('modalFacultyNewThread'); _refresh(); }
}

/* --- Research: Meeting Approval --- */
async function handleApproveMeeting(projectId, requestId) {
  const result = await window.ApiAdapter.reviewMilestone(requestId, { status: 'approved', note: 'Approved. Check your calendar.' });
  toast(result ? 'Meeting request approved' : 'Failed to approve'); if (result) _refresh();
}

async function handleRejectMeeting(projectId, requestId) {
  const result = await window.ApiAdapter.reviewMilestone(requestId, { status: 'rejected', note: 'Not available. Please suggest a new slot.' });
  toast(result ? 'Meeting request rejected' : 'Failed to reject'); if (result) _refresh();
}

/* --- Research: Project CRUD --- */
async function handleAddProject() {
  if (!validateForm('modalNewProject', [
    { id: 'np-title', required: true, min: 5 },
    { id: 'np-student', required: true, min: 2 }
  ])) return;

  const user = JSON.parse(sessionStorage.getItem('currentUser'));
  const result = await window.ApiAdapter._post('/research', {
    faculty_id: user.user_id,
    title: document.getElementById('np-title').value,
    student_name: document.getElementById('np-student').value,
    status: 'in-progress'
  });
  toast(result ? 'Research project created' : 'Failed to create project');
  if (result) { closeModal('modalNewProject'); _refresh(); }
}

async function handleDeleteProject(projectId) {
  const result = await window.ApiAdapter.deleteResearchProject(projectId);
  toast(result ? 'Project removed' : 'Failed to remove project');
  if (result) _refresh();
}

/* --- Submissions & Grading --- */
let _gradingSubId = null;
let _gradingSubMax = 0;

async function renderSubmissions() {
  const assessments = await window.ApiAdapter.fetchAssessments();
  const statEl = document.getElementById('subStats');
  const listEl = document.getElementById('submissionsList');
  if (statEl) statEl.innerHTML = '<p style="color:var(--muted);font-size:13px">Submissions fetched from backend.</p>';
  if (listEl) listEl.innerHTML = assessments && assessments.length
    ? assessments.map(a => `<div style="border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:10px"><div style="font-weight:600">${a.title}</div><div style="font-size:12px;color:var(--muted)">${a.type} · ${a.max_marks}M · Due: ${a.due_date || 'TBD'}</div></div>`).join('')
    : '<p style="color:var(--muted);font-size:13px;padding:16px 0;text-align:center">No assessments yet.</p>';
}

async function openGradeSub(assessId) {
  _gradingSubId = assessId;
  const assess = await window.ApiAdapter.fetchAssessment(assessId);
  if (!assess) return;
  _gradingSubMax = assess.max_marks || 100;
  document.getElementById('gradeSubBody').innerHTML = `<div style="background:var(--bg);border-radius:8px;padding:12px"><div style="font-weight:600">${assess.title}</div><div style="font-size:13px;color:var(--ink)">Max Marks: <strong>${assess.max_marks}M</strong></div></div>`;
  document.getElementById('grade-marks').value = '';
  document.getElementById('grade-marks').max = assess.max_marks;
  document.getElementById('grade-max').value = assess.max_marks + 'M';
  document.getElementById('grade-feedback').value = '';
  showModal('modalGradeSub');
}

async function handleGradeSubmission() {
  const scored = parseInt(document.getElementById('grade-marks').value);
  if (isNaN(scored) || scored < 0 || scored > _gradingSubMax) { toast(`Marks must be between 0 and ${_gradingSubMax}`); return; }
  const result = await window.ApiAdapter.gradeAssessment({
    assessment_id: _gradingSubId,
    marks: scored,
    feedback: document.getElementById('grade-feedback').value.trim(),
    status: 'GRADED'
  });
  if (result) { closeModal('modalGradeSub'); toast(`Grade submitted: ${scored}/${_gradingSubMax}`); renderSubmissions(); }
  else toast('Failed to submit grade');
}

function _deadProject() {
    id: 'PROJ-' + String(db.faculty.researchSupervision.projects.length + 1).padStart(3, '0'),
    title: document.getElementById('np-title').value,
    studentName: document.getElementById('np-student').value,
    studentId: 'N/A',
    status: 'in-progress',
    grade: 'N/A',
    progress: 0,
    lastUpdate: new Date().toLocaleDateString(),
    submissionCount: 0,
    commentCount: 0,
    nextMeeting: 'Not scheduled',
    submissions: [],
    meetingRequests: []
  };
  db.faculty.researchSupervision.projects.push(newProj);
  db.faculty.researchSupervision.summary.totalProjects = db.faculty.researchSupervision.projects.length;
  db.faculty.researchSupervision.summary.inProgress = db.faculty.researchSupervision.projects.filter(p => p.status === 'in-progress').length;

  // Sync project to student research dashboard for cross-visibility
  if (db.student && db.student.research) {
    const targetStudent = db.student.profile && db.student.profile.personal
      ? db.student.profile.personal.fullName
      : '';
    // If the project was created for the current logged-in student, sync it
    if (newProj.studentName === targetStudent) {
      db.student.research.project = {
        title: newProj.title,
        type: "Bachelor's Thesis Project",
        guide: db.faculty.profile.account.name,
        stats: { documentsCount: 0, tasksCompleted: 0, totalTasks: 0, daysRemaining: 56 }
      };
      // Seed initial milestones if not already present
      if (!db.student.research.milestones || db.student.research.milestones.length === 0) {
        db.student.research.milestones = [
          { id: 1, title: 'Literature Review', status: 'upcoming', date: 'TBD', description: 'Complete literature review for the project', statusClass: 'badge4' },
          { id: 2, title: 'Proposal Submission', status: 'upcoming', date: 'TBD', description: 'Submit project proposal for approval', statusClass: 'badge5' },
          { id: 3, title: 'Mid-term Presentation', status: 'upcoming', date: 'TBD', description: 'Present mid-term progress', statusClass: 'badge4' },
          { id: 4, title: 'Final Submission', status: 'upcoming', date: 'TBD', description: 'Submit final thesis and documentation', statusClass: 'badge5' }
        ];
      }
      // Initialize meetingRequests if missing
      if (!db.student.research.meetingRequests) db.student.research.meetingRequests = [];
    }
  }

  // [migrated: */
  toast('Research project created');
  closeModal('modalNewProject');
  _refresh();
}

function handleDeleteProject(projectId) {
  const db = (function(){
  return {
    faculty:{
      profile:{account:{name:'Faculty'}},
      dashboard:{interventionLog:[],stats:{atRiskStudents:[]}},
      forum:{threads:[],summary:{totalDiscussions:0,resolvedCount:0,needsResponseCount:0}},
      assessmentMapping:{availableOutcomes:{cos:[],pos:[]}},
      assessmentList:[],
      submissions:[],
      researchSupervision:{projects:[],summary:{totalProjects:0,inProgress:0}},
      attendanceMarking:{classes:[],history:[]},
      timetable:{schedule:[]},
      studentOverview:{students:[]},
      courseSummaries:[]
    },
    student:{
      profile:{personal:{fullName:''},academic:{studentId:''}},
      courses:{list:[],summary:{pendingAssignments:0}},
      forum:{threads:[],fullThreads:[]},
      research:{project:{},milestones:[],meetingRequests:[]}
    },
    superuser:{bugReports:[]}
  };
})();
  const proj = db.faculty.researchSupervision.projects.find(p => p.id === projectId);
  db.faculty.researchSupervision.projects = db.faculty.researchSupervision.projects.filter(p => p.id !== projectId);
  db.faculty.researchSupervision.summary.totalProjects = db.faculty.researchSupervision.projects.length;
  db.faculty.researchSupervision.summary.inProgress = db.faculty.researchSupervision.projects.filter(p => p.status === 'in-progress').length;

  // Sync deletion to student research dashboard
  if (proj && db.student && db.student.research) {
    const targetStudent = db.student.profile && db.student.profile.personal
      ? db.student.profile.personal.fullName
      : '';
    if (proj.studentName === targetStudent) {
      db.student.research.project = {
        title: 'No Project Assigned',
        type: "Bachelor's Thesis Project",
        guide: 'N/A',
        stats: { documentsCount: 0, tasksCompleted: 0, totalTasks: 0, daysRemaining: 0 }
      };
    }
  }

  // [migrated: */
  toast('Project removed');
  _refresh();
}

/* --- Submissions & Grading --- */
let _gradingSubId = null;

function renderSubmissions() {
  const db = (function(){
  return {
    faculty:{
      profile:{account:{name:'Faculty'}},
      dashboard:{interventionLog:[],stats:{atRiskStudents:[]}},
      forum:{threads:[],summary:{totalDiscussions:0,resolvedCount:0,needsResponseCount:0}},
      assessmentMapping:{availableOutcomes:{cos:[],pos:[]}},
      assessmentList:[],
      submissions:[],
      researchSupervision:{projects:[],summary:{totalProjects:0,inProgress:0}},
      attendanceMarking:{classes:[],history:[]},
      timetable:{schedule:[]},
      studentOverview:{students:[]},
      courseSummaries:[]
    },
    student:{
      profile:{personal:{fullName:''},academic:{studentId:''}},
      courses:{list:[],summary:{pendingAssignments:0}},
      forum:{threads:[],fullThreads:[]},
      research:{project:{},milestones:[],meetingRequests:[]}
    },
    superuser:{bugReports:[]}
  };
})();
  const submissions = db.faculty.submissions || [];
  const pendingCount = submissions.filter(s => s.status === 'submitted').length;
  const gradedCount = submissions.filter(s => s.status === 'graded').length;

  const statsEl = document.getElementById('subStats');
  if (statsEl) {
    const avgScore = gradedCount > 0
      ? (submissions.filter(s => s.status === 'graded').reduce((sum, s) => sum + (s.scored || 0), 0) / gradedCount).toFixed(1)
      : '—';
    statsEl.innerHTML = `
      <div class="stat-card"><div class="sc-label">Total</div><div class="sc-val">${submissions.length}</div></div>
      <div class="stat-card"><div class="sc-label">Pending</div><div class="sc-val" style="color:var(--amber)">${pendingCount}</div></div>
      <div class="stat-card"><div class="sc-label">Graded</div><div class="sc-val" style="color:var(--green)">${gradedCount}</div></div>
      <div class="stat-card"><div class="sc-label">Avg Score</div><div class="sc-val">${avgScore}</div></div>
    `;
  }

  const listEl = document.getElementById('submissionsList');
  if (!listEl) return;
  if (submissions.length === 0) {
    listEl.innerHTML = '<p style="color:var(--muted);font-size:13px;padding:16px 0;text-align:center">No submissions yet. Create an assessment via "Create Assessment" to push assignments to students.</p>';
    return;
  }

  const sColor = { submitted: '#f59e0b', graded: '#22c55e' };
  const sLabel = { submitted: 'Pending Review', graded: 'Graded' };

  listEl.innerHTML = submissions.map(s => `
    <div style="border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px">
      <div style="flex:1;min-width:200px">
        <div style="font-weight:600;font-size:14px">${s.assignmentTitle}</div>
        <div style="font-size:12px;color:var(--muted);margin-top:3px">${s.studentName} · ${s.studentId} · ${s.course}</div>
        <div style="font-size:12px;color:var(--muted);margin-top:3px">Submitted: ${s.submittedOn}</div>
        ${s.notes ? `<div style="margin-top:6px;font-size:13px;color:var(--soft);background:var(--bg);border-radius:6px;padding:8px">📝 ${s.notes}</div>` : ''}
        ${s.status === 'graded' ? `<div style="margin-top:6px;font-size:12px"><strong style="color:var(--green)">Score: ${s.scored}/${s.max}</strong>${s.feedback ? ' · ' + s.feedback : ''}</div>` : ''}
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:11px;padding:3px 10px;border-radius:6px;font-weight:600;background:${sColor[s.status] || '#6366f1'}22;color:${sColor[s.status] || '#6366f1'}">${sLabel[s.status] || s.status}</span>
        ${s.status === 'submitted' ? `<button class="btn btn-green btn-sm" onclick="openGradeSub('${s.id}')">Grade</button>` : ''}
      </div>
    </div>
  `).join('');
}

function openGradeSub(id) {
  _gradingSubId = id;
  const db = (function(){
  return {
    faculty:{
      profile:{account:{name:'Faculty'}},
      dashboard:{interventionLog:[],stats:{atRiskStudents:[]}},
      forum:{threads:[],summary:{totalDiscussions:0,resolvedCount:0,needsResponseCount:0}},
      assessmentMapping:{availableOutcomes:{cos:[],pos:[]}},
      assessmentList:[],
      submissions:[],
      researchSupervision:{projects:[],summary:{totalProjects:0,inProgress:0}},
      attendanceMarking:{classes:[],history:[]},
      timetable:{schedule:[]},
      studentOverview:{students:[]},
      courseSummaries:[]
    },
    student:{
      profile:{personal:{fullName:''},academic:{studentId:''}},
      courses:{list:[],summary:{pendingAssignments:0}},
      forum:{threads:[],fullThreads:[]},
      research:{project:{},milestones:[],meetingRequests:[]}
    },
    superuser:{bugReports:[]}
  };
})();
  const sub = (db.faculty.submissions || []).find(s => s.id === id);
  if (!sub) return;
  document.getElementById('gradeSubBody').innerHTML = `
    <div style="background:var(--bg);border-radius:8px;padding:12px;margin-bottom:4px">
      <div style="font-weight:600;margin-bottom:4px">${sub.assignmentTitle}</div>
      <div style="font-size:13px;color:var(--ink)">Student: <strong>${sub.studentName}</strong> (${sub.studentId})</div>
      <div style="font-size:13px;color:var(--ink)">Course: ${sub.course} · Max Marks: <strong>${sub.max}M</strong></div>
      ${sub.notes ? `<div style="margin-top:6px;font-size:13px;color:var(--soft)">Submission: ${sub.notes}</div>` : ''}
    </div>`;
  document.getElementById('grade-marks').value = '';
  document.getElementById('grade-marks').max = sub.max;
  document.getElementById('grade-max').value = sub.max + 'M';
  document.getElementById('grade-feedback').value = '';
  showModal('modalGradeSub');
}

function handleGradeSubmission() {
  const db = (function(){
  return {
    faculty:{
      profile:{account:{name:'Faculty'}},
      dashboard:{interventionLog:[],stats:{atRiskStudents:[]}},
      forum:{threads:[],summary:{totalDiscussions:0,resolvedCount:0,needsResponseCount:0}},
      assessmentMapping:{availableOutcomes:{cos:[],pos:[]}},
      assessmentList:[],
      submissions:[],
      researchSupervision:{projects:[],summary:{totalProjects:0,inProgress:0}},
      attendanceMarking:{classes:[],history:[]},
      timetable:{schedule:[]},
      studentOverview:{students:[]},
      courseSummaries:[]
    },
    student:{
      profile:{personal:{fullName:''},academic:{studentId:''}},
      courses:{list:[],summary:{pendingAssignments:0}},
      forum:{threads:[],fullThreads:[]},
      research:{project:{},milestones:[],meetingRequests:[]}
    },
    superuser:{bugReports:[]}
  };
})();
  const si = (db.faculty.submissions || []).findIndex(s => s.id === _gradingSubId);
  if (si === -1) return;
  const scored = parseInt(document.getElementById('grade-marks').value);
  const sub = db.faculty.submissions[si];
  if (isNaN(scored) || scored < 0 || scored > sub.max) { toast(`Marks must be between 0 and ${sub.max}`); return; }
  const feedback = document.getElementById('grade-feedback').value.trim();

  db.faculty.submissions[si].scored = scored;
  db.faculty.submissions[si].feedback = feedback;
  db.faculty.submissions[si].status = 'graded';
  db.faculty.submissions[si].gradedOn = new Date().toLocaleDateString();
  db.faculty.submissions[si].gradedBy = db.faculty.profile.account.name;

  // Sync back to student's assessment
  if (db.student && db.student.courses && db.student.courses.list) {
    const stuCourse = db.student.courses.list.find(c => c.id === sub.studentCourseId || c.code === sub.courseCode);
    if (stuCourse && stuCourse.assessments) {
      const asn = stuCourse.assessments.find(a => a.title === sub.assignmentTitle);
      if (asn) { asn.status = 'graded'; asn.scored = scored; asn.feedback = feedback; }
    }
  }
  // [migrated: */
  closeModal('modalGradeSub');
  toast(`Grade submitted: ${scored}/${sub.max}`);
  renderSubmissions();
}

async function handleSaveAttendance() {
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

  const user = JSON.parse(sessionStorage.getItem('currentUser'));
  const promises = records.map(r => window.ApiAdapter.createAttendance({
    enrollment_id: r.id,
    date: new Date().toISOString(),
    status: r.isPresent ? 'PRESENT' : 'ABSENT',
    faculty_id: user.user_id,
    section_id: classId
  }));
  const results = await Promise.all(promises);
  const saved = results.filter(Boolean).length;
  toast(`Attendance committed: ${saved}/${records.length} records saved`);
  _refresh();
}

function handleBugSubmit() {
  if (!validateForm('panel-settings', [
    { id: 'bugTitle', required: true, min: 5, max: 200, message: 'Bug title must be 5-200 characters' },
    { id: 'bugDesc', required: true, min: 10, max: 1000, message: 'Description must be 10-1000 characters' }
  ])) return;
  toast('Bug report received — will be reviewed by the admin team.');
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

  const db = (function(){
  return {
    faculty:{
      profile:{account:{name:'Faculty'}},
      dashboard:{interventionLog:[],stats:{atRiskStudents:[]}},
      forum:{threads:[],summary:{totalDiscussions:0,resolvedCount:0,needsResponseCount:0}},
      assessmentMapping:{availableOutcomes:{cos:[],pos:[]}},
      assessmentList:[],
      submissions:[],
      researchSupervision:{projects:[],summary:{totalProjects:0,inProgress:0}},
      attendanceMarking:{classes:[],history:[]},
      timetable:{schedule:[]},
      studentOverview:{students:[]},
      courseSummaries:[]
    },
    student:{
      profile:{personal:{fullName:''},academic:{studentId:''}},
      courses:{list:[],summary:{pendingAssignments:0}},
      forum:{threads:[],fullThreads:[]},
      research:{project:{},milestones:[],meetingRequests:[]}
    },
    superuser:{bugReports:[]}
  };
})().faculty.attendanceMarking;
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
  const list = (function(){
  return {
    faculty:{
      profile:{account:{name:'Faculty'}},
      dashboard:{interventionLog:[],stats:{atRiskStudents:[]}},
      forum:{threads:[],summary:{totalDiscussions:0,resolvedCount:0,needsResponseCount:0}},
      assessmentMapping:{availableOutcomes:{cos:[],pos:[]}},
      assessmentList:[],
      submissions:[],
      researchSupervision:{projects:[],summary:{totalProjects:0,inProgress:0}},
      attendanceMarking:{classes:[],history:[]},
      timetable:{schedule:[]},
      studentOverview:{students:[]},
      courseSummaries:[]
    },
    student:{
      profile:{personal:{fullName:''},academic:{studentId:''}},
      courses:{list:[],summary:{pendingAssignments:0}},
      forum:{threads:[],fullThreads:[]},
      research:{project:{},milestones:[],meetingRequests:[]}
    },
    superuser:{bugReports:[]}
  };
})().faculty.studentOverview.students.filter(s =>
    s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q)
  );
  renderStuTable(list);
}

function viewStu(id) {
  const s = (function(){
  return {
    faculty:{
      profile:{account:{name:'Faculty'}},
      dashboard:{interventionLog:[],stats:{atRiskStudents:[]}},
      forum:{threads:[],summary:{totalDiscussions:0,resolvedCount:0,needsResponseCount:0}},
      assessmentMapping:{availableOutcomes:{cos:[],pos:[]}},
      assessmentList:[],
      submissions:[],
      researchSupervision:{projects:[],summary:{totalProjects:0,inProgress:0}},
      attendanceMarking:{classes:[],history:[]},
      timetable:{schedule:[]},
      studentOverview:{students:[]},
      courseSummaries:[]
    },
    student:{
      profile:{personal:{fullName:''},academic:{studentId:''}},
      courses:{list:[],summary:{pendingAssignments:0}},
      forum:{threads:[],fullThreads:[]},
      research:{project:{},milestones:[],meetingRequests:[]}
    },
    superuser:{bugReports:[]}
  };
})().faculty.studentOverview.students.find(x => x.id === id);
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
        <button class="btn btn-red btn-sm" onclick="handleDeleteQuestion(${q.id})">Remove</button>
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

async function initPage() {
  const user = JSON.parse(sessionStorage.getItem('currentUser'));
  if (!user) return;

  const profile = user.profile || {};

  document.getElementById('sbUname').textContent = user.name;
  document.getElementById('sbUrole').textContent = profile.designation || 'Faculty';
  document.getElementById('sbAvatar').textContent = user.name.charAt(0);

  document.getElementById('todayClasses').innerHTML = `<p style="color:var(--muted);text-align:center;padding:20px">Timetable fetched from backend.</p>`;
  document.getElementById('performanceList').innerHTML = `<p style="color:var(--muted);text-align:center;padding:20px">Performance data fetched from backend.</p>`;

  const ttGrid = document.getElementById('ttGrid');
  if (ttGrid) ttGrid.innerHTML = `<p style="color:var(--muted);text-align:center;padding:20px">Timetable fetched from backend.</p>`;
  
  const assessmentsList = document.getElementById('assessmentsList');
  if (assessmentsList) assessmentsList.innerHTML = `<p style="color:var(--muted);text-align:center;padding:20px">Assessments fetched from backend.</p>`;

  document.getElementById('stuSummary').innerHTML = `<p style="color:var(--muted);text-align:center;padding:20px">Student summary fetched from backend.</p>`;
  const stuTableBody = document.getElementById('stuTableBody');
  if (stuTableBody) stuTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--muted)">Student data fetched from backend module</td></tr>`;

  document.getElementById('forumStats').innerHTML = `<p style="color:var(--muted);text-align:center;padding:20px">Forum stats fetched from backend.</p>`;
  document.getElementById('forumThreads').innerHTML = `<p style="color:var(--muted);text-align:center;padding:20px">Forum threads fetched from backend.</p>`;

  document.getElementById('resStats').innerHTML = `<p style="color:var(--muted);text-align:center;padding:20px">Research stats fetched from backend.</p>`;
  document.getElementById('resProjects').innerHTML = `<p style="color:var(--muted);text-align:center;padding:20px">Research projects fetched from backend.</p>`;
}

// Initialize on page load and listen for changes
document.addEventListener('faculty:changed', initPage);
initPage();
