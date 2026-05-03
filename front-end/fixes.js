/**
 * BarelyPassing – fixes.js  (Part 1: Core Navigation + Student Functions)
 * Load AFTER state.js and script.js
 */

const api = window.Auth.apiFetch.bind(window.Auth);

// ── Utilities ────────────────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
    const existing = document.getElementById('bp-toast');
    if (existing) existing.remove();
    const t = document.createElement('div');
    t.id = 'bp-toast';
    t.style.cssText = `position:fixed;bottom:24px;right:24px;z-index:9999;padding:12px 20px;border-radius:8px;font-size:14px;font-weight:600;color:#fff;background:${type==='error'?'#ef4444':type==='warning'?'#f59e0b':'#16a34a'};box-shadow:0 4px 20px rgba(0,0,0,.25)`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3500);
}

function openModal(id) { const m = document.getElementById(id); if (m) m.style.display = 'flex'; }
function closeModal(id) { const m = document.getElementById(id); if (m) m.style.display = 'none'; }

function restrictDateToFuture(inputId) {
    const el = document.getElementById(inputId);
    if (el) el.min = new Date().toISOString().split('T')[0];
}

// ── Fixed switchView ─────────────────────────────────────────────────────────
const VIEW_TITLES = {
    'dashboard-view': 'Dashboard',
    'my-profile-view': 'My Profile',
    'time-table-view': 'My Timetable',
    'my-courses-view': 'My Courses',
    'attendance-view': 'Attendance',
    'leave-management-view': 'Leave Management',
    'discussion-forum-view': 'Discussion Forum',
    'research-projects-view': 'Research Projects',
    'mark-attendance-view': 'Mark Attendance',
    'student-overview-view': 'Student Overview',
    'assessment-mapping-view': 'Assessment Mapping',
    'event-scheduler-view': 'Event Scheduler',
    'resource-management-view': 'Resource Management',
    'fee-compliance-view': 'Fee Compliance',
    'user-management-view': 'User Management',
    'institutional-reports-view': 'Institutional Reports',
    'attendance-override-view': 'Attendance Override',
    'settings-view': 'Settings',
};

window.switchView = function(viewId, clickedEl) {
    document.querySelectorAll('.view-section').forEach(el => {
        el.classList.remove('active');
        el.style.display = 'none';
    });
    const target = document.getElementById(viewId);
    if (target) { target.classList.add('active'); target.style.display = 'block'; }
    if (clickedEl) {
        document.querySelectorAll('.sidebar-nav .nav-item').forEach(el => el.classList.remove('active'));
        clickedEl.classList.add('active');
    }
    const titleEl = document.getElementById('page-title');
    if (titleEl && VIEW_TITLES[viewId]) titleEl.textContent = VIEW_TITLES[viewId];
    setTimeout(() => triggerViewRender(viewId), 80);
};

function triggerViewRender(viewId) {
    // Detect current role from Auth state so we only call role-appropriate renderers
    const role = (window.Auth && window.Auth.getUser && window.Auth.getUser())
        ? (window.Auth.getUser().role || '')
        : (localStorage.getItem('bp_role') || '');
    const isStudent = role === 'student';
    const isFaculty = role === 'faculty';
    const isAdmin   = ['admin','head','superadmin'].includes(role);

    const renders = {
        'settings-view':              () => renderSettings(),
        'my-profile-view':            () => renderStudentProfile(),
        'time-table-view':            () => isStudent ? renderStudentTimetable() : renderFacultyTimetable(),
        'my-courses-view':            () => renderStudentCourses(),
        'attendance-view':            () => renderStudentAttendance(),
        'leave-management-view':      () => isStudent ? renderStudentLeave()
                                                : isFaculty ? renderFacultyLeaveList()
                                                : renderLeaveManagement(),
        'discussion-forum-view':      () => renderDiscussions(),
        'research-projects-view':     () => isStudent ? renderStudentResearch() : renderFacultyResearch(),
        'mark-attendance-view':       () => renderMarkAttendanceTable(),
        'student-overview-view':      () => renderFacultyStudents(),
        'assessment-mapping-view':    () => renderAssessmentList(),
        'event-scheduler-view':       () => renderEventsTable(),
        'resource-management-view':   () => renderResourceManagement(),
        'fee-compliance-view':        () => renderFeeCompliance(),
        'user-management-view':       () => renderUsersTable(),
        'institutional-reports-view': () => renderInstitutionalReports(),
        'attendance-override-view':   () => renderAttendanceOverride(),
        'dashboard-view':             () => { if (isAdmin) renderReports(); if (isFaculty) renderFacultyDashboard(); if (isStudent) { window.renderStudentMeetings?.(); window.renderPendingSubmissions?.(); } },
    };
    try { if (renders[viewId]) renders[viewId](); } catch(e) { console.error('Render error:', e); }
}

// ── Student: Profile ─────────────────────────────────────────────────────────
window.renderStudentProfile = async function() {
    const el = document.getElementById('profile-details-body');
    if (!el) return;
    try {
        const s = await api('/students/me');
        el.innerHTML = `
            <div style="display:flex;align-items:center;gap:20px;margin-bottom:24px;">
                <div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;color:#fff;">${(s.first_name||'S')[0]}</div>
                <div><h3 style="margin:0;font-size:20px;">${s.first_name} ${s.last_name||''}</h3><p style="margin:4px 0 0;color:#64748b;font-size:13px;">${s.branch||'CSE'} · Batch ${s.batch||'2024-2028'} · Section ${s.section||'A'}</p></div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:14px;">
                <div><span style="color:#64748b;">Student ID</span><div style="font-weight:600;">${s.user_id}</div></div>
                <div><span style="color:#64748b;">Email</span><div style="font-weight:600;">${s.email}</div></div>
                <div><span style="color:#64748b;">CGPA</span><div style="font-weight:700;color:#6366f1;font-size:20px;">${s.cgpa||'N/A'}</div></div>
                <div><span style="color:#64748b;">Phone</span><div style="font-weight:600;">${s.phone||'Not set'}</div></div>
                <div><span style="color:#64748b;">Date of Birth</span><div style="font-weight:600;">${s.dob||'N/A'}</div></div>
                <div><span style="color:#64748b;">Join Date</span><div style="font-weight:600;">${s.join_date||'N/A'}</div></div>
            </div>`;
    } catch(e) { el.innerHTML = `<p style="color:#ef4444">Failed to load profile: ${e.message}</p>`; }
};

// ── Student: Attendance ──────────────────────────────────────────────────────
window.renderStudentAttendance = async function() {
    const el = document.getElementById('attendance-overview-body');
    if (!el) return;
    try {
        const data = await api('/students/me/attendance');
        const { totalPresent=0, totalAbsent=0, overallPct=0, summary=[] } = data;
        let html = `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:24px;">
            <div style="text-align:center;padding:16px;background:#f0fdf4;border-radius:8px;"><div style="font-size:12px;color:#64748b;margin-bottom:4px;">PRESENT</div><div style="font-size:32px;font-weight:700;color:#16a34a;">${totalPresent}</div></div>
            <div style="text-align:center;padding:16px;background:#fef2f2;border-radius:8px;"><div style="font-size:12px;color:#64748b;margin-bottom:4px;">ABSENT</div><div style="font-size:32px;font-weight:700;color:#ef4444;">${totalAbsent}</div></div>
            <div style="text-align:center;padding:16px;background:#eff6ff;border-radius:8px;"><div style="font-size:12px;color:#64748b;margin-bottom:4px;">OVERALL %</div><div style="font-size:32px;font-weight:700;color:#2563eb;">${overallPct}%</div></div>
        </div>`;
        if (summary.length) {
            html += '<h4 style="font-size:13px;font-weight:600;margin-bottom:12px;color:#64748b;">PER COURSE</h4>';
            summary.forEach(s => {
                const pct = s.percentage || 0;
                const color = pct >= 75 ? '#16a34a' : '#ef4444';
                html += `<div style="margin-bottom:12px;"><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px;"><span>${s.course_code} – ${s.course_name}</span><span style="font-weight:700;color:${color};">${pct}%</span></div><div style="height:6px;background:#e2e8f0;border-radius:3px;overflow:hidden;"><div style="height:100%;background:${color};width:${pct}%;"></div></div></div>`;
            });
        }
        el.innerHTML = html;
    } catch(e) { el.innerHTML = `<p style="color:#ef4444">Failed to load attendance: ${e.message}</p>`; }
};

// ── Student: Courses ─────────────────────────────────────────────────────────
window.renderStudentCourses = async function() {
    const el = document.getElementById('my-courses-list');
    if (!el) return;
    try {
        const courses = await api('/students/me/courses');
        if (!courses.length) { el.innerHTML = '<p style="color:#64748b;text-align:center;padding:20px;">No courses enrolled. Click "+ Enroll in Course" to get started.</p>'; return; }
        el.innerHTML = courses.map(c => `
            <div style="padding:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;display:flex;justify-content:space-between;align-items:center;">
                <div><div style="font-weight:700;font-size:15px;">${c.course_code}</div><div style="font-size:13px;color:#64748b;margin-top:2px;">${c.course_name}</div><div style="font-size:12px;color:#94a3b8;margin-top:4px;">${c.credits} Credits · Sem ${c.semester} · ${c.faculty_name||'Faculty'}</div></div>
                <span style="padding:4px 10px;border-radius:20px;font-size:11px;font-weight:600;background:${c.enrollment_status==='active'?'#dcfce7':'#fef9c3'};color:${c.enrollment_status==='active'?'#166534':'#713f12'};">${c.enrollment_status||'active'}</span>
            </div>`).join('');
    } catch(e) { el.innerHTML = `<p style="color:#ef4444">Failed to load courses: ${e.message}</p>`; }
};

// ── Student: Timetable ───────────────────────────────────────────────────────
window.renderStudentTimetable = async function() {
    const el = document.getElementById('timetable-grid');
    if (!el) return;
    try {
        // Use enrollment-based timetable (only shows enrolled courses)
        const data = await api('/student-timetable');
        el.innerHTML = renderTimetableGrid(data);
    } catch(e) { el.innerHTML = `<p style="color:#ef4444">Failed to load timetable: ${e.message}</p>`; }
};

function renderTimetableGrid(data) {
    if (!data || !data.grid) return '<p style="color:#64748b;text-align:center;">No timetable data</p>';
    const days  = data.days  || ['MON','TUE','WED','THU','FRI'];
    const times = data.times || ['09:00','10:00','11:00','12:00','13:00','14:00','15:00'];
    const dayLabels = { MON:'Mon', TUE:'Tue', WED:'Wed', THU:'Thu', FRI:'Fri' };
    const typeColors = {
        lab:     { bg:'#fef3c7', border:'#f59e0b', text:'#92400e' },
        lecture: { bg:'#eff6ff', border:'#6366f1', text:'#1e40af' },
        tutorial:{ bg:'#f0fdf4', border:'#22c55e', text:'#166534' },
    };
    // Build a per-day list of ALL slots (allowing same day multiple times)
    // grid[day][time] can be an array of slots or a single slot
    let html = `<div style="overflow-x:auto;">
    <table style="width:100%;border-collapse:separate;border-spacing:4px;font-size:12px;min-width:600px;">
    <thead><tr>
        <th style="width:70px;padding:8px;background:#f1f5f9;border-radius:6px;color:#64748b;font-size:11px;font-weight:700;text-align:center;">Time</th>
        ${days.map(d => `<th style="padding:8px;background:#6366f1;border-radius:6px;color:#fff;font-size:11px;font-weight:700;text-align:center;">${dayLabels[d]||d}</th>`).join('')}
    </tr></thead>
    <tbody>`;
    times.forEach(t => {
        html += `<tr><td style="padding:6px 8px;font-size:10px;color:#64748b;font-weight:700;text-align:center;vertical-align:top;white-space:nowrap;">${t}</td>`;
        days.forEach(d => {
            const cell = data.grid[d] && data.grid[d][t];
            if (!cell) { html += `<td style="padding:4px;"><div style="min-height:52px;"></div></td>`; return; }
            // Support both array of slots and single slot for same time slot
            const slots = Array.isArray(cell) ? cell : [cell];
            html += `<td style="padding:4px;vertical-align:top;">`;
            slots.forEach(slot => {
                const c = typeColors[slot.type] || typeColors.lecture;
                html += `<div style="padding:7px 8px;background:${c.bg};border-radius:6px;border-left:3px solid ${c.border};margin-bottom:3px;">
                    <div style="font-weight:700;color:${c.text};font-size:11px;">${slot.course_code||''}</div>
                    ${slot.course_name ? `<div style="font-size:10px;color:#64748b;margin-top:1px;">${slot.course_name}</div>` : ''}
                    ${slot.room ? `<div style="font-size:10px;color:#94a3b8;">📍 ${slot.room}</div>` : ''}
                    ${slot.type ? `<div style="font-size:9px;background:${c.border}22;color:${c.text};padding:1px 5px;border-radius:10px;display:inline-block;margin-top:2px;font-weight:600;">${slot.type}</div>` : ''}
                </div>`;
            });
            html += `</td>`;
        });
        html += `</tr>`;
    });
    html += `</tbody></table></div>`;
    return html;
}

// ── Student: Leave ───────────────────────────────────────────────────────────
window.renderStudentLeave = async function() {
    const el = document.getElementById('leaveListBody');
    const totalEl = document.getElementById('leaveTotalCount');
    const rejEl = document.getElementById('leaveRejectedCount');
    if (!el) return;
    try {
        const leaves = await api('/leave');
        if (totalEl) totalEl.textContent = leaves.length;
        if (rejEl) rejEl.textContent = leaves.filter(l=>l.status==='rejected').length;
        if (!leaves.length) { el.innerHTML = '<div style="padding:20px;text-align:center;color:#64748b;">No leave applications yet.</div>'; return; }
        el.innerHTML = leaves.map(l => {
            const statusColors = { approved:'#dcfce7,#166534', pending:'#fef9c3,#713f12', rejected:'#fef2f2,#991b1b' };
            const [bg,fg] = (statusColors[l.status]||'#f1f5f9,#475569').split(',');
            return `<div style="padding:14px 16px;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:center;">
                <div><div style="font-weight:600;font-size:14px;">${l.leave_type||l.type||'Leave'}</div><div style="font-size:12px;color:#64748b;margin-top:2px;">${l.start_date||l.from_date||''} → ${l.end_date||l.to_date||''}</div><div style="font-size:12px;color:#94a3b8;margin-top:2px;">${l.reason||''}</div></div>
                <span style="padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;background:${bg};color:${fg};">${l.status}</span>
            </div>`;
        }).join('');
    } catch(e) { el.innerHTML = `<p style="color:#ef4444;padding:16px;">Failed to load leaves: ${e.message}</p>`; }
};

// ── Student: Research ────────────────────────────────────────────────────────
window.renderStudentResearch = async function() {
    const el = document.getElementById('research-projects-body');
    if (!el) return;
    try {
        const projects = await api('/research');
        if (!projects.length) { el.innerHTML = '<div style="padding:32px;text-align:center;color:#64748b;"><div style="font-size:40px;margin-bottom:12px;">📋</div><div style="font-weight:600;font-size:15px;">No BTP projects assigned yet</div><div style="font-size:13px;margin-top:6px;color:#94a3b8;">Your faculty will assign a BTP project to you.</div></div>'; return; }
        el.innerHTML = projects.map(p => {
            const supName = p.supervisor_name || 'Faculty';
            return `
            <div style="padding:20px;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:16px;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.05);">
                <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                    <h4 style="margin:0;font-size:15px;font-weight:700;">${p.title||'Untitled'}</h4>
                    <span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;background:#eff6ff;color:#1e40af;">${p.status||'pending'}</span>
                </div>
                <div style="font-size:12px;color:#64748b;margin-bottom:8px;">👨‍🏫 Supervisor: <strong>${supName}</strong></div>
                <p style="margin:0 0 10px;font-size:13px;color:#64748b;">${p.abstract||''}</p>
                <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
                    <span style="font-size:12px;color:#64748b;">Progress: <strong>${p.progress||0}%</strong></span>
                    <div style="flex:1;height:6px;background:#e2e8f0;border-radius:3px;overflow:hidden;"><div style="height:100%;background:#6366f1;width:${p.progress||0}%;"></div></div>
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    <button class="btp-upload-btn" data-id="${p.project_id}" data-progress="${p.progress||0}" data-title="${(p.title||'').replace(/"/g, '&quot;')}" style="padding:8px 16px;background:#6366f1;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600;">\ud83d\udce4 Upload Work / Update Progress</button>
                    ${p.submission_notes ? `<span style="padding:8px 12px;background:#f0fdf4;color:#16a34a;border-radius:8px;font-size:12px;font-weight:600;">\u2713 Work submitted</span>` : ''}
                </div>
                ${p.submission_notes ? `<div style="margin-top:10px;padding:10px;background:#f8fafc;border-radius:6px;font-size:12px;color:#64748b;"><strong>Last submission:</strong> ${p.submission_notes}</div>` : ''}
            </div>`;
        }).join('');
        // Event delegation for upload buttons (avoids inline onclick quoting issues)
        el.querySelectorAll('.btp-upload-btn').forEach((btn, i) => {
            btn.addEventListener('click', () => {
                const p = projects[i];
                openBTPUploadModal(btn.dataset.id, btn.dataset.progress, btn.dataset.title || (p ? p.title : ''));
            });
        });
    } catch(e) { el.innerHTML = `<p style="color:#ef4444;padding:16px;">Failed to load research: ${e.message}</p>`; }
};

window.openBTPUploadModal = function(projectId, progress, title) {
    const idEl = document.getElementById('researchProgressId');
    if (idEl) idEl.value = projectId;
    // Student does NOT set progress - clear any legacy field safely
    const progEl = document.getElementById('researchProgressValue');
    if (progEl) progEl.value = progress || 0;
    const titleEl = document.getElementById('btpProjectTitle');
    if (titleEl) titleEl.textContent = title || 'BTP Project';
    // Reset form fields
    const notesEl = document.getElementById('btpSubmissionNotes');
    if (notesEl) { notesEl.value = ''; notesEl.style.borderColor = ''; }
    const notesErr = document.getElementById('btpNotesError');
    if (notesErr) notesErr.style.display = 'none';
    const fileEl = document.getElementById('btpFileInput');
    if (fileEl) fileEl.value = '';
    const fileNameEl = document.getElementById('btpFileName');
    if (fileNameEl) fileNameEl.textContent = 'No file chosen';
    const fileIconEl = document.getElementById('btpFileIcon');
    if (fileIconEl) fileIconEl.textContent = '\uD83D\uDCC4';
    const fileErrEl = document.getElementById('btpFileError');
    if (fileErrEl) fileErrEl.style.display = 'none';
    const dz = document.getElementById('btpDropZone');
    if (dz) { dz.style.background = '#fafafa'; dz.style.borderColor = '#6366f1'; }
    openModal('updateProgressModal');
};

// ── Student: Discussions ─────────────────────────────────────────────────────
window.renderDiscussions = async function() {
    const el = document.getElementById('discussion-threads-body') || document.getElementById('f-discussion-threads-body') || document.getElementById('discussions-list');
    if (!el) return;
    try {
        const posts = await api('/discussions');
        if (!posts.length) { el.innerHTML = '<div style="padding:20px;text-align:center;color:#64748b;">No discussions yet. Start one!</div>'; return; }
        el.innerHTML = posts.map(p => {
            const date = p.created_at ? new Date(p.created_at).toLocaleDateString() : '';
            return `<div onclick="openThreadDetail('${p.post_id}')" style="padding:16px;border-bottom:1px solid #f1f5f9;cursor:pointer;transition:background .15s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
                <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                    <h4 style="margin:0;font-size:14px;font-weight:700;">${p.title||'Untitled'}</h4>
                    <span style="font-size:11px;padding:3px 8px;background:#f1f5f9;border-radius:4px;color:#64748b;">${p.tag||'general'}</span>
                </div>
                <p style="margin:0 0 6px;font-size:13px;color:#64748b;">${(p.content||'').substring(0,100)}${(p.content||'').length>100?'...':''}</p>
                <small style="color:#94a3b8;">${p.author_name||'Anonymous'} • ${date} • ${p.reply_count||0} replies</small>
            </div>`;
        }).join('');
    } catch(e) { el.innerHTML = `<p style="color:#ef4444;padding:16px;">Failed to load discussions: ${e.message}</p>`; }
};

async function openThreadDetail(postId) {
    try {
        const post = await api(`/discussions/${postId}`);
        document.getElementById('threadDetailTitle').textContent = post.title || 'Thread';
        document.getElementById('threadDetailAuthor').textContent = `By ${post.author_name} • ${new Date(post.created_at).toLocaleString()}`;
        document.getElementById('threadDetailContent').textContent = post.content || '';
        document.getElementById('threadReplyPostId').value = postId;
        const repliesEl = document.getElementById('threadDetailReplies');
        repliesEl.innerHTML = (post.replies||[]).map(r => `<div style="padding:10px;background:#f8fafc;border-radius:6px;margin-bottom:8px;"><strong style="font-size:12px;">${r.author_name}</strong><p style="margin:4px 0 0;font-size:13px;">${r.content}</p></div>`).join('') || '<p style="color:#64748b;font-size:13px;">No replies yet.</p>';
        document.getElementById('threadReplyContent').value = '';
        openModal('threadDetailModal');
    } catch(e) { showToast('Failed to load thread: ' + e.message, 'error'); }
}

async function submitThreadReply() {
    const postId = document.getElementById('threadReplyPostId').value;
    const content = document.getElementById('threadReplyContent').value.trim();
    if (!content) { showToast('Please write a reply', 'warning'); return; }
    try {
        await api(`/discussions/${postId}/replies`, { method:'POST', body: JSON.stringify({ content }) });
        showToast('Reply posted!', 'success');
        closeModal('threadDetailModal');
        renderDiscussions();
    } catch(e) { showToast('Failed: ' + e.message, 'error'); }
}

async function submitNewDiscussion() {
    const title    = document.getElementById('discTitle')?.value.trim();
    const content  = document.getElementById('discContent')?.value.trim();
    const tag      = document.getElementById('discTag')?.value || 'general';
    const course_id = document.getElementById('discCourse')?.value.trim();
    if (!title || title.length < 3)    { showToast('Title must be at least 3 characters', 'warning'); return; }
    if (!content || content.length < 10) { showToast('Content must be at least 10 characters', 'warning'); return; }
    try {
        await api('/discussions', { method:'POST', body: JSON.stringify({ title, content, tag, course_id }) });
        showToast('Discussion posted!', 'success');
        closeModal('newThreadModal');
        document.getElementById('discTitle').value = '';
        document.getElementById('discContent').value = '';
        renderDiscussions();
    } catch(e) { showToast('Failed: ' + e.message, 'error'); }
}


async function submitLeaveApplication() {
    const leave_type = document.getElementById('leaveType')?.value;
    const start_date = document.getElementById('leaveStart')?.value;
    const end_date   = document.getElementById('leaveEnd')?.value;
    const reason     = document.getElementById('leaveReason')?.value.trim();
    if (!leave_type)              { showToast('Please select a leave type', 'warning'); return; }
    if (!start_date)              { showToast('Start date is required', 'warning'); return; }
    if (!end_date)                { showToast('End date is required', 'warning'); return; }
    if (end_date < start_date)    { showToast('End date cannot be before start date', 'warning'); return; }
    if (!reason || reason.length < 10) { showToast('Please provide a reason (at least 10 characters)', 'warning'); return; }
    try {
        await api('/leave', { method:'POST', body: JSON.stringify({ leave_type, start_date, end_date, reason }) });
        showToast('Leave application submitted!', 'success');
        closeModal('leaveModal');
        renderStudentLeave();
    } catch(e) { showToast('Failed: ' + e.message, 'error'); }
}


async function populateEnrollmentDropdown() {
    const sel = document.getElementById('enrollCourseId');
    if (!sel) return;
    try {
        const all = await api('/courses');
        const enrolled = await api('/students/me/courses');
        const enrolledIds = enrolled.map(c => c.course_id);
        const available = all.filter(c => !enrolledIds.includes(c.course_id));
        sel.innerHTML = available.length
            ? `<option value="">Select a course</option>${available.map(c=>`<option value="${c.course_id}">${c.course_code} – ${c.course_name}</option>`).join('')}`
            : '<option value="">All courses enrolled</option>';
    } catch(e) { sel.innerHTML = '<option>Error loading</option>'; }
}

async function submitCourseEnrollment() {
    const course_id = document.getElementById('enrollCourseId')?.value;
    if (!course_id) { showToast('Please select a course', 'warning'); return; }
    try {
        await api('/students/enroll', { method:'POST', body: JSON.stringify({ course_id }) });
        showToast('Enrolled successfully!', 'success');
        closeModal('enrollCourseModal');
        renderStudentCourses();
    } catch(e) { showToast('Failed: ' + e.message, 'error'); }
}

async function submitResearchProgress() {
    const id    = document.getElementById('researchProgressId')?.value;
    const notes = document.getElementById('btpSubmissionNotes')?.value?.trim() || '';
    const fileInput = document.getElementById('btpFileInput');
    const notesErr  = document.getElementById('btpNotesError');
    const fileErr   = document.getElementById('btpFileError');
    // Reset errors
    if (notesErr) { notesErr.style.display = 'none'; notesErr.textContent = ''; }
    if (fileErr)  { fileErr.style.display  = 'none'; }
    const notesEl = document.getElementById('btpSubmissionNotes');
    if (notesEl) notesEl.style.borderColor = '';
    let valid = true;
    if (!notes || notes.length < 10) {
        if (notesErr) { notesErr.textContent = 'Please describe your work (at least 10 characters).'; notesErr.style.display = 'block'; }
        if (notesEl) notesEl.style.borderColor = '#ef4444';
        valid = false;
    }
    const file = fileInput?.files?.[0];
    if (!file) {
        if (fileErr) fileErr.style.display = 'block';
        const dz = document.getElementById('btpDropZone');
        if (dz) dz.style.borderColor = '#ef4444';
        valid = false;
    }
    if (!valid) { showToast('Please fill all required fields.', 'warning'); return; }
    if (file.size > 10 * 1024 * 1024) { showToast('File must be under 10MB', 'warning'); return; }
    const submission_notes = `${notes} [File: ${file.name}]`;
    try {
        await api(`/research/${id}/progress`, { method:'PATCH', body: JSON.stringify({ submission_notes }) });
        // Notify ALL faculty that a student submitted work
        const user = window.Auth?.getUser?.();
        const studentName = user ? `${user.first_name||''} ${user.last_name||''}`.trim() : 'A student';
        const projectTitle = document.getElementById('btpProjectTitle')?.textContent || 'BTP Project';
        window.Notifications?.broadcast('faculty', studentName,
            `📤 ${studentName} has submitted work for BTP project "${projectTitle}". File: ${file.name}. Please review and give feedback.`, 'info');
        showToast('Work submitted to faculty! Faculty has been notified. ✅', 'success');
        closeModal('updateProgressModal');
        renderStudentResearch();
    } catch(e) { showToast('Failed: ' + e.message, 'error'); }
}

// ── Settings ─────────────────────────────────────────────────────────────────
window.renderSettings = function() {
    const el = document.getElementById('settings-view');
    if (!el) return;
    const user = window.Auth.getUser();
    if (!user) return;
    el.innerHTML = `<div class="stats-card"><div class="stats-card-header"><h3>Account Settings</h3></div><div class="stats-card-body" style="padding:24px;">
        <div style="margin-bottom:24px;padding:20px;background:#f8fafc;border-radius:8px;">
            <h4 style="margin:0 0 12px;font-size:14px;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Profile</h4>
            <p style="margin:4px 0;"><strong>Name:</strong> ${user.first_name||''} ${user.last_name||user.username}</p>
            <p style="margin:4px 0;"><strong>Email:</strong> ${user.email}</p>
            <p style="margin:4px 0;"><strong>Role:</strong> ${user.role}</p>
            <p style="margin:4px 0;"><strong>ID:</strong> ${user.user_id}</p>
        </div>
        <div style="padding:20px;background:#f8fafc;border-radius:8px;">
            <h4 style="margin:0 0 16px;font-size:14px;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Change Password</h4>
            <input type="password" id="currentPass" placeholder="Current password" style="width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:6px;margin-bottom:10px;box-sizing:border-box;font-size:14px;">
            <input type="password" id="newPass" placeholder="New password (min 6 chars)" style="width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:6px;margin-bottom:16px;box-sizing:border-box;font-size:14px;">
            <button onclick="changePassword()" style="width:100%;padding:12px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;">Update Password</button>
        </div>
    </div></div>`;
};

window.changePassword = async function() {
    const current = document.getElementById('currentPass')?.value;
    const newPass = document.getElementById('newPass')?.value;
    if (!current || !newPass) { showToast('Fill both fields', 'warning'); return; }
    if (newPass.length < 6) { showToast('New password too short', 'warning'); return; }
    try {
        await api('/auth/change-password', { method:'POST', body: JSON.stringify({ current_password: current, new_password: newPass }) });
        showToast('Password updated!', 'success');
        document.getElementById('currentPass').value = '';
        document.getElementById('newPass').value = '';
    } catch(e) { showToast(e.message || 'Failed to change password', 'error'); }
};
// ── Faculty: Timetable ───────────────────────────────────────────────────────
window.renderFacultyTimetable = async function() {
    const el = document.getElementById('f-timetable-grid');
    if (!el) return;
    try {
        const data = await api('/faculty/me/timetable');
        el.innerHTML = renderTimetableGrid(data);
    } catch(e) { el.innerHTML = `<p style="color:#ef4444">Failed to load timetable: ${e.message}</p>`; }
};

// ── Faculty: Students ────────────────────────────────────────────────────────
window.renderFacultyStudents = async function() {
    const el = document.getElementById('student-overview-list');
    if (!el) return;
    try {
        const [allUsers, profileStudents] = await Promise.all([
            api('/admin/users').catch(() => []),
            api('/faculty/me/students').catch(() => [])
        ]);
        const profileMap = {};
        (profileStudents||[]).forEach(s => { profileMap[s.user_id] = s; });
        const studentUsers = (allUsers||[]).filter(u => u.role === 'student');
        const students = studentUsers.map(u => {
            const p = profileMap[u.user_id] || {};
            return {
                user_id: u.user_id,
                first_name: p.first_name || u.first_name || u.username || 'Student',
                last_name: p.last_name || u.last_name || '',
                email: p.email || u.email || '',
                cgpa: p.cgpa || null,
                branch: p.branch || p.department || '',
                batch: p.batch || '',
                section: p.section || '',
                attendance_pct: p.attendance_pct || 0,
                is_at_risk: p.is_at_risk || (p.cgpa && p.cgpa < 6.5),
            };
        });
        if (!students.length) { el.innerHTML = '<div style="padding:20px;text-align:center;color:#64748b;">No students found.</div>'; return; }
        window._facultyStudents = students;
        renderStudentCards(students);
    } catch(e) { el.innerHTML = `<p style="color:#ef4444;padding:16px;">Failed to load students: ${e.message}</p>`; }
};

function renderStudentCards(students) {
    const el = document.getElementById('student-overview-list');
    if (!el) return;
    el.style.maxWidth = '100%';
    el.style.overflow = 'hidden';
    el.innerHTML = students.map(s => {
        const fullName = `${s.first_name||''} ${s.last_name||''}`.trim();
        const initials = ((s.first_name||'?')[0] + (s.last_name||'?')[0]).toUpperCase();
        const riskColor = s.is_at_risk ? '#ef4444' : (s.cgpa && s.cgpa < 7 ? '#d97706' : '#16a34a');
        const riskBg    = s.is_at_risk ? '#fef2f2' : (s.cgpa && s.cgpa < 7 ? '#fef9c3' : '#dcfce7');
        const riskLabel = s.is_at_risk ? 'AT RISK'  : (s.cgpa && s.cgpa < 7 ? 'LOW CGPA' : 'GOOD');
        const cgpaColor = (s.cgpa && s.cgpa < 6) ? '#dc2626' : (s.cgpa && s.cgpa < 7) ? '#d97706' : '#16a34a';
        const attColor  = (s.attendance_pct||0) < 75 ? '#ef4444' : '#16a34a';
        const sid = s.user_id;
        const fname = (s.first_name||'').replace(/'/g, '');
        const safeFullName = fullName.replace(/'/g, '');
        return `
        <div style="padding:16px;margin-bottom:12px;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;box-sizing:border-box;box-shadow:0 1px 4px rgba(0,0,0,.05);">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
                <div style="width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;color:#fff;flex-shrink:0;">${initials}</div>
                <div style="flex:1;min-width:0;">
                    <div style="font-size:14px;font-weight:700;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${fullName}</div>
                    <div style="font-size:11px;color:#64748b;margin-top:1px;">ID: ${sid}${s.branch ? ' · ' + s.branch : ''}</div>
                </div>
                <span style="padding:3px 9px;border-radius:20px;font-size:10px;font-weight:700;background:${riskBg};color:${riskColor};white-space:nowrap;flex-shrink:0;">${riskLabel}</span>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;padding:10px;background:#f8fafc;border-radius:8px;">
                <div style="text-align:center;">
                    <div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.5px;">CGPA</div>
                    <div style="font-size:18px;font-weight:800;color:${cgpaColor};">${s.cgpa||'N/A'}</div>
                </div>
                <div style="text-align:center;">
                    <div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.5px;">Attendance</div>
                    <div style="font-size:18px;font-weight:800;color:${attColor};">${s.attendance_pct||0}%</div>
                </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                <button onclick="openAlertModal('${sid}', '${safeFullName}')"
                    style="padding:8px;background:#fef2f2;color:#dc2626;border:1px solid #fecaca;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700;">
                    ⚠ Send Alert
                </button>
                <button onclick="openMeetingModal('${sid}', '${fname}')"
                    style="padding:8px;background:#eff6ff;color:#1e40af;border:1px solid #bfdbfe;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600;">
                    📅 Meeting
                </button>
            </div>
        </div>`;
    }).join('');
}


// Open the custom alert modal for a specific student
window.openAlertModal = function(studentId, studentName) {
    document.getElementById('alertStudentId').value  = studentId;
    document.getElementById('alertStudentName').value = studentName;
    document.getElementById('alertStudentLabel').textContent = studentName;
    document.getElementById('alertMessage').value = '';
    openModal('sendAlertModal');
};

// Send the custom alert notification to the student
window.sendCustomAlert = function() {
    const studentId   = document.getElementById('alertStudentId')?.value;
    const studentName = document.getElementById('alertStudentName')?.value;
    const message     = document.getElementById('alertMessage')?.value.trim();
    if (!message || message.length < 5) {
        showToast('Please enter a message (at least 5 characters)', 'warning');
        return;
    }
    const user = window.Auth?.getUser?.();
    const from = user ? (user.first_name || user.username || 'Your Faculty') : 'Your Faculty';
    window.Notifications.send(studentId, from, `⚠ ${message}`, 'alert');
    showToast(`Alert sent to ${studentName}!`, 'success');
    closeModal('sendAlertModal');
};

// Broadcast an alert to ALL students enrolled under this faculty
window.sendFacultyBroadcast = async function() {
    const msg = document.getElementById('facultyBroadcastMsg')?.value.trim();
    if (!msg || msg.length < 5) { showToast('Please enter a message (min 5 characters)', 'warning'); return; }
    const user = window.Auth?.getUser?.();
    const from = user ? (user.first_name || user.username || 'Faculty') : 'Faculty';
    // Broadcast to all students via the role channel
    window.Notifications.broadcast('student', from, `📢 ${msg}`, 'info');
    showToast('Message broadcast to all your students!', 'success');
    document.getElementById('facultyBroadcastMsg').value = '';
};


window.filterStudentOverview = function() {
    const term = (document.getElementById('student-search-input')?.value || '').toLowerCase();
    const students = window._facultyStudents || [];
    const filtered = students.filter(s => 
        (s.first_name||'').toLowerCase().includes(term) || 
        (s.last_name||'').toLowerCase().includes(term) || 
        (s.user_id||'').toLowerCase().includes(term)
    );
    renderStudentCards(filtered);
};

// ── Faculty: Attendance ──────────────────────────────────────────────────────
window.renderMarkAttendanceTable = async function() {
    const sel     = document.getElementById('attendance-course-select');
    const el      = document.getElementById('attendance-student-list');
    const counter = document.getElementById('attendance-present-count');
    if (!sel || !el) return;
    const courseId = sel.value;
    if (!courseId) {
        el.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:24px;color:#64748b;">Select a course above to load students</td></tr>';
        if (counter) counter.style.display = 'none';
        return;
    }
    el.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:24px;color:#64748b;">Loading students...</td></tr>';
    try {
        const data = await api(`/faculty/attendance/today/${courseId}`);
        if (!data.students || !data.students.length) {
            el.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:24px;color:#64748b;">No students enrolled in this course</td></tr>';
            if (counter) counter.style.display = 'none';
            return;
        }
        const total = data.students.length;
        const updateCounter = () => {
            const n = document.querySelectorAll('[id^="att_"]')
                .length ? [...document.querySelectorAll('[id^="att_"]')].filter(i => i.value === 'present').length : 0;
            if (counter) {
                counter.textContent = `${n} of ${total} present`;
                counter.style.display = 'block';
                counter.style.background = n === total ? '#dcfce7' : n > 0 ? '#f0fdf4' : '#fef2f2';
                counter.style.color = n === total ? '#166534' : n > 0 ? '#16a34a' : '#991b1b';
            }
        };
        el.innerHTML = data.students.map((s, i) => {
            // Default to 'present' — faculty marks who is absent
            const isP = s.today_status !== 'absent';
            return `<tr id="att-row-${s.user_id}">
                <td style="color:#94a3b8;font-size:13px;font-weight:600;">${i+1}</td>
                <td><div style="font-weight:600;font-size:14px;">${s.first_name} ${s.last_name||''}</div></td>
                <td style="font-size:12px;color:#64748b;">${s.user_id}</td>
                <td style="text-align:center;">
                    <div style="display:inline-flex;border-radius:10px;overflow:hidden;border:2px solid #e2e8f0;">
                        <button type="button" class="att-btn" data-uid="${s.user_id}" data-val="present"
                            style="padding:8px 20px;border:none;cursor:pointer;font-size:13px;font-weight:700;transition:all .15s;background:${isP?'#16a34a':'#f8fafc'};color:${isP?'#fff':'#94a3b8'};border-right:2px solid #e2e8f0;">
                            ✓ Present
                        </button>
                        <button type="button" class="att-btn" data-uid="${s.user_id}" data-val="absent"
                            style="padding:8px 20px;border:none;cursor:pointer;font-size:13px;font-weight:700;transition:all .15s;background:${!isP?'#ef4444':'#f8fafc'};color:${!isP?'#fff':'#94a3b8'};">
                            ✗ Absent
                        </button>
                    </div>
                    <input type="hidden" name="att_${s.user_id}" id="att_${s.user_id}" value="${isP ? 'present' : 'absent'}">
                </td>
            </tr>`;
        }).join('');
        el.addEventListener('click', function handler(e) {
            const btn = e.target.closest('.att-btn');
            if (!btn) return;
            const uid = btn.dataset.uid;
            const val = btn.dataset.val;
            const row = document.getElementById(`att-row-${uid}`);
            if (!row) return;
            row.querySelectorAll('.att-btn').forEach(b => { b.style.background = '#f8fafc'; b.style.color = '#94a3b8'; });
            btn.style.background = val === 'present' ? '#16a34a' : '#ef4444';
            btn.style.color = '#fff';
            const hidden = document.getElementById(`att_${uid}`);
            if (hidden) hidden.value = val;
            updateCounter();
        });
        updateCounter();
    } catch(e) { el.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:24px;color:#ef4444;">Failed: ${e.message}</td></tr>`; }
};

// Mark all students present or absent at once
window.markAllAttendance = function(status) {
    const rows = document.querySelectorAll('[id^="att-row-"]');
    if (!rows.length) { showToast('Load students first by selecting a course', 'warning'); return; }
    rows.forEach(row => {
        const uid = row.id.replace('att-row-', '');
        row.querySelectorAll('.att-btn').forEach(b => { b.style.background = '#f8fafc'; b.style.color = '#94a3b8'; });
        const activeBtn = row.querySelector(`.att-btn[data-val="${status}"]`);
        if (activeBtn) { activeBtn.style.background = status === 'present' ? '#16a34a' : '#ef4444'; activeBtn.style.color = '#fff'; }
        const hidden = document.getElementById(`att_${uid}`);
        if (hidden) hidden.value = status;
    });
    const counter = document.getElementById('attendance-present-count');
    const n = status === 'present' ? rows.length : 0;
    if (counter) { counter.textContent = `${n} of ${rows.length} present`; counter.style.display = 'block'; }
    showToast(`All students marked as ${status}`, 'success');
};


window.submitAttendance = async function() {
    const course_id = document.getElementById('attendance-course-select')?.value;
    const today = new Date().toISOString().split('T')[0];
    const dateEl = document.getElementById('attendance-date');
    const date = dateEl?.value || today;

    // ── Form Validation: block past dates ─────────────────────────
    if (!course_id) { showToast('Select a course first', 'warning'); return; }
    if (!date) {
        if (dateEl) dateEl.style.borderColor = '#ef4444';
        showToast('Please select a date for attendance', 'warning'); return;
    }
    if (date > today) {
        if (dateEl) dateEl.style.borderColor = '#ef4444';
        showToast('Cannot mark attendance for future dates', 'warning'); return;
    }
    if (date < today) {
        if (dateEl) dateEl.style.borderColor = '#ef4444';
        showToast('Faculty cannot mark attendance for past dates. Use today\'s date only.', 'error'); return;
    }
    if (dateEl) dateEl.style.borderColor = '';
    // ──────────────────────────────────────────────────────────────
    const records = [];
    document.querySelectorAll('[id^="att_"]').forEach(inp => {
        const student_id = inp.id.replace('att_', '');
        if (inp.value) records.push({ student_id, status: inp.value });
    });
    if (!records.length) { showToast('Please mark attendance for at least one student', 'warning'); return; }
    try {
        await api('/faculty/attendance', { method:'POST', body: JSON.stringify({ course_id, date: today, records }) });
        showToast(`Attendance saved for ${records.length} students! (Date: ${today})`, 'success');
    } catch(e) { showToast('Failed: ' + e.message, 'error'); }
};

// ── Faculty: Assessments ─────────────────────────────────────────────────────
window.renderAssessmentList = async function(userId) {
    const el = document.getElementById('assessmentListContainer');
    if (!el) return;
    if (!userId) userId = window.Auth.getUser()?.user_id;
    // Populate the assessment course dropdown dynamically
    const assSel = document.getElementById('assessCourse');
    if (assSel) {
        try {
            const courses = await api('/faculty/me/courses');
            assSel.innerHTML = '<option value="">Select course</option>' +
                courses.map(c => `<option value="${c.course_id}">${c.course_code} – ${c.course_name}</option>`).join('');
        } catch(e) { assSel.innerHTML = '<option value="">Error loading courses</option>'; }
    }
    try {
        const assessments = await api(`/assessments?faculty_id=${userId}`);

        if (!assessments.length) {
            el.innerHTML = '<div style="text-align:center;padding:40px;color:#64748b;"><div style="font-size:40px;margin-bottom:12px;">📋</div><div style="font-weight:600;">No assessments yet</div><div style="font-size:13px;margin-top:4px;">Click "+ Create Assessment" to add one</div></div>';
            return;
        }
        // Store map for safe onclick access
        window._assessMap = {};
        assessments.forEach(a => { window._assessMap[a.assessment_id] = a; });
        el.innerHTML = assessments.map(a => `
            <div style="padding:20px;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:12px;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.04);">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
                    <div>
                        <h4 style="margin:0;font-size:16px;font-weight:700;">${a.name}</h4>
                        <div style="font-size:12px;color:#64748b;margin-top:3px;">${a.type||'theory'} &nbsp;·&nbsp; ${a.date||'N/A'}</div>
                    </div>
                    <div style="display:flex;gap:6px;align-items:center;">
                        <span style="font-size:10px;font-weight:700;padding:3px 8px;background:${(a.exam_mode==='online')?'#eff6ff':'#f1f5f9'};color:${(a.exam_mode==='online')?'#2563eb':'#64748b'};border-radius:4px;">${(a.exam_mode||'offline').toUpperCase()}</span>
                        <span style="font-size:11px;font-weight:700;padding:4px 10px;background:#e0e7ff;color:#4338ca;border-radius:6px;">${a.course_code||a.course_id||''}</span>
                    </div>
                </div>
                <div style="display:flex;align-items:center;justify-content:space-between;">
                    <div style="font-size:13px;color:#64748b;">Max Marks: <strong>${a.max_marks||100}</strong></div>
                    <button data-assessment-id="${a.assessment_id}" class="enter-marks-btn" style="padding:8px 16px;background:#6366f1;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;letter-spacing:.2px;">✎ Enter Marks</button>
                </div>
            </div>`).join('');
        // Use event delegation — avoids all string interpolation issues
        el.querySelectorAll('.enter-marks-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.dataset.assessmentId;
                const a  = window._assessMap[id];
                if (a) openMarksModal(a.assessment_id, a.max_marks||100, a.name, a.exam_mode || 'offline');
            });
        });

    } catch(e) { el.innerHTML = `<p style="color:#ef4444">Failed: ${e.message}</p>`; }
};

window.submitCreateAssessment = async function() {
    const name      = document.getElementById('assessName')?.value.trim();
    const type      = document.getElementById('assessType')?.value;
    const date      = document.getElementById('assessDate')?.value;
    const max_marks = document.getElementById('assessMarks')?.value;
    const course_id = document.getElementById('assessCourse')?.value;
    const exam_mode = document.getElementById('assessMode')?.value || 'offline';
    if (!name || name.length < 3)  { showToast('Assessment name must be at least 3 characters', 'warning'); return; }
    if (!type)                      { showToast('Please select assessment type', 'warning'); return; }
    if (!date)                      { showToast('Date is required', 'warning'); return; }
    if (!course_id)                 { showToast('Please select a course', 'warning'); return; }
    if (!max_marks || Number(max_marks) < 1)   { showToast('Enter valid max marks (min 1)', 'warning'); return; }
    if (Number(max_marks) > 1000)              { showToast('Max marks cannot exceed 1000', 'warning'); return; }
    try {
        await api('/assessments', { method:'POST', body: JSON.stringify({ name, type, date, max_marks: Number(max_marks), course_id, exam_mode }) });
        showToast('Assessment created!', 'success');
        closeModal('assessmentModal');
        document.getElementById('createAssessForm')?.reset();
        renderAssessmentList();
    } catch(e) { showToast('Failed: ' + e.message, 'error'); }
};


// ── Faculty: Create Course ────────────────────────────────────────────────────
window.submitCreateCourse = async function() {
    const name     = document.getElementById('newCourseName')?.value.trim();
    const code     = document.getElementById('newCourseCode')?.value.trim().toUpperCase();
    const credits  = Number(document.getElementById('newCourseCredits')?.value);
    const semester = Number(document.getElementById('newCourseSemester')?.value);
    if (!name)               { showToast('Course name is required', 'warning'); return; }
    if (!code)               { showToast('Course code is required', 'warning'); return; }
    if (!/^[A-Z]{2,4}\d{3,4}$/.test(code)) { showToast('Code format must be like CS301 or AIDS401', 'warning'); return; }
    if (!credits || credits < 1 || credits > 5)   { showToast('Credits must be between 1 and 5', 'warning'); return; }
    if (!semester || semester < 1 || semester > 8) { showToast('Semester must be between 1 and 8', 'warning'); return; }
    try {
        await api('/courses', { method:'POST', body: JSON.stringify({ course_name: name, course_code: code, credits, semester }) });
        showToast('Course created successfully!', 'success');
        closeModal('createCourseModal');
        document.getElementById('createCourseForm')?.reset();
        // Refresh all dependent dropdowns so the new course is immediately usable
        await refreshCoursesDropdowns();
        renderAssessmentList();
    } catch(e) { showToast('Failed: ' + e.message, 'error'); }
};

// Refresh attendance & assessment course dropdowns after any course change
async function refreshCoursesDropdowns() {
    try {
        const courses = await api('/faculty/me/courses');
        const attSel = document.getElementById('attendance-course-select');
        if (attSel) {
            const cur = attSel.value;
            attSel.innerHTML = '<option value="">— Select Course —</option>' +
                courses.map(c => `<option value="${c.course_id}">${c.course_code} - ${c.course_name}</option>`).join('');
            if (cur) attSel.value = cur;
        }
        const assSel = document.getElementById('assessCourse');
        if (assSel) {
            const cur = assSel.value;
            assSel.innerHTML = '<option value="">Select course</option>' +
                courses.map(c => `<option value="${c.course_id}">${c.course_code} – ${c.course_name}</option>`).join('');
            if (cur) assSel.value = cur;
        }
        const enrollSel = document.getElementById('enrollCourseId');
        if (enrollSel) await populateEnrollmentDropdown();
    } catch(e) { console.error('refreshCoursesDropdowns:', e); }
}


// ── Faculty: Dashboard (dynamic) ──────────────────────────────────────────────
window.renderFacultyDashboard = async function() {
    const totalEl   = document.getElementById('f-total-students');
    const classesEl = document.getElementById('f-classes-week');
    const bodyEl    = document.getElementById('f-intervention-body');
    try {
        // Student count
        const allUsers = await api('/admin/users');
            const students = allUsers.filter(u => u.role === 'student');
        if (totalEl) totalEl.textContent = students.length;
        // Timetable slot count
        api('/faculty/me/timetable').then(tt => {
            if (!classesEl || !tt || !tt.grid) return;
            let slots = 0;
            Object.values(tt.grid).forEach(day => { slots += Object.keys(day).length; });
            classesEl.textContent = slots;
        }).catch(() => { if (classesEl) classesEl.textContent = '—'; });
        // At-risk students (CGPA < 7 or low attendance)
        if (bodyEl) {
            const atRisk = students.filter(s => (s.cgpa && s.cgpa < 7) || s.is_at_risk);
            if (!atRisk.length) {
                bodyEl.innerHTML = '<div style="text-align:center;padding:24px;color:#16a34a;font-weight:600;">✓ No students currently flagged for intervention</div>';
            } else {
                bodyEl.innerHTML = atRisk.map(s => `
                    <div class="intervention-row" style="display:flex;justify-content:space-between;align-items:center;padding:14px 0;border-bottom:1px solid #f1f5f9;">
                        <div>
                            <div style="font-weight:700;color:${(s.cgpa&&s.cgpa<6)?'#dc2626':'#d97706'};">${s.first_name} ${s.last_name||''}</div>
                            <div style="font-size:12px;color:#64748b;margin-top:2px;">ID: ${s.user_id} &nbsp;·&nbsp; CGPA: ${s.cgpa||'N/A'}</div>
                        </div>
                        <div style="display:flex;gap:8px;">
                            <button class="alert-btn" data-uid="${s.user_id}" data-name="${s.first_name}" style="padding:6px 12px;background:#ef4444;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;">Send Alert</button>
                            <button class="meeting-btn" data-uid="${s.user_id}" data-name="${s.first_name} ${s.last_name||''}" style="padding:6px 12px;background:#6366f1;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;">Schedule Meeting</button>
                        </div>
                    </div>`).join('');

                // Delegated listeners (alert & meeting buttons)
                bodyEl.addEventListener('click', function(e) {
                    const ab = e.target.closest('.alert-btn');
                    const mb = e.target.closest('.meeting-btn');
                    if (ab) openAlertModal(ab.dataset.uid, ab.dataset.name);
                    if (mb) {
                        switchView('student-overview-view', document.querySelector('.nav-item[onclick*=student-overview-view]'));
                        setTimeout(() => openMeetingModal(mb.dataset.uid, mb.dataset.name), 300);
                    }
                }, { once: true });
            }
        }
    } catch(e) {
        if (totalEl) totalEl.textContent = '—';
        if (bodyEl) bodyEl.innerHTML = `<p style="color:#ef4444;padding:16px;">Failed to load: ${e.message}</p>`;
    }
};

// ── Faculty: Marks Entry ──────────────────────────────────────────────────────
window.openMarksModal = async function(assessmentId, maxMarks, name, examMode) {
    document.getElementById('marksAssessmentId').value  = assessmentId;
    document.getElementById('marksMaxVal').value        = maxMarks;
    document.getElementById('marksMaxDisplay').textContent = maxMarks;
    document.getElementById('marksAssessmentLabel').textContent = name;
    const list = document.getElementById('marksEntryList');
    list.innerHTML = '<p style="color:#64748b;">Loading students...</p>';
    openModal('marksEntryModal');
    try {
        const [students, submissions] = await Promise.all([
            api('/faculty/me/students'),
            examMode === 'online' ? api('/submissions').catch(() => []) : Promise.resolve([])
        ]);
        const isOnline = examMode === 'online';
        if (isOnline) {
            // Show submission status + file name badge; lock input for unsubmitted students
            list.innerHTML = `<div style="font-size:12px;color:#6366f1;background:#eff6ff;padding:8px 12px;border-radius:6px;margin-bottom:12px;">🌐 Online Assessment — only students who submitted their work can be graded.</div>` +
            students.map(s => {
                const sub = submissions.find(x => x.student_id === s.user_id && x.assessment_id === assessmentId);
                const submitted = !!sub;
                // Extract file name from notes if present
                let fileTag = '';
                if (submitted && sub.notes) {
                    const fm = sub.notes.match(/\[Attached:\s*([^\]]+)\]/);
                    if (fm) fileTag = `<span style="font-size:10px;background:#f0fdf4;color:#16a34a;padding:2px 7px;border-radius:10px;font-weight:700;margin-left:6px;">📎 ${fm[1].trim()}</span>`;
                }
                return `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f1f5f9;">
                    <div>
                        <div style="font-weight:600;font-size:14px;">${s.first_name} ${s.last_name||''}</div>
                        <div style="font-size:11px;margin-top:2px;display:flex;align-items:center;flex-wrap:wrap;gap:4px;">
                            ${submitted ? `<span style="color:#16a34a;font-weight:700;">✓ Submitted</span><span style="color:#94a3b8;">· ${sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString() : ''}</span>${fileTag}` : '<span style="color:#ef4444;font-weight:700;">✗ Not submitted yet</span>'}
                        </div>
                    </div>
                    <input type="number" id="marks_${s.user_id}" min="0" max="${maxMarks}" placeholder="/ ${maxMarks}"
                        ${!submitted ? 'disabled title="Student has not submitted yet"' : ''}
                        style="width:90px;padding:8px;border:1px solid ${submitted ? '#e2e8f0' : '#fecaca'};border-radius:6px;font-size:14px;text-align:center;background:${submitted ? '#fff' : '#fef2f2'};">
                </div>`;
            }).join('');
        } else {
            list.innerHTML = students.map(s => `
                <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f1f5f9;">
                    <div>
                        <div style="font-weight:600;font-size:14px;">${s.first_name} ${s.last_name||''}</div>
                        <div style="font-size:12px;color:#64748b;">${s.user_id}</div>
                    </div>
                    <input type="number" id="marks_${s.user_id}" min="0" max="${maxMarks}" placeholder="/ ${maxMarks}"
                        style="width:90px;padding:8px;border:1px solid #e2e8f0;border-radius:6px;font-size:14px;text-align:center;">
                </div>`).join('');
        }
    } catch(e) { list.innerHTML = `<p style="color:#ef4444;">Failed to load students: ${e.message}</p>`; }
};

window.submitMarksEntry = async function() {
    const assessmentId = document.getElementById('marksAssessmentId')?.value;
    const assessName   = document.getElementById('marksAssessmentLabel')?.textContent || 'Assessment';
    const maxMarks     = Number(document.getElementById('marksMaxVal')?.value) || 100;
    const inputs       = document.querySelectorAll('#marksEntryList input[type="number"]:not([disabled])');
    const records      = [];
    let hasError = false;
    inputs.forEach(inp => {
        const student_id = inp.id.replace('marks_', '');
        const val = Number(inp.value);
        if (inp.value !== '' && !isNaN(val)) {
            if (val < 0 || val > maxMarks) { inp.style.border = '2px solid #ef4444'; hasError = true; return; }
            inp.style.border = '1px solid #e2e8f0';
            records.push({ student_id, assessment_id: assessmentId, marks_obtained: val, max_marks: maxMarks });
        }
    });
    if (hasError) { showToast(`Marks must be between 0 and ${maxMarks}`, 'warning'); return; }
    if (!records.length) { showToast('Enter at least one student mark', 'warning'); return; }
    let saved = 0, locked = 0;
    const user = window.Auth?.getUser?.();
    const from = user ? (user.first_name || 'Faculty') : 'Faculty';
    try {
        for (const r of records) {
            try {
                await api('/marks', { method:'POST', body: JSON.stringify(r) });
                saved++;
                // Notify student immediately
                window.Notifications?.send(r.student_id, from,
                    `📊 Your marks for "${assessName}" have been posted: ${r.marks_obtained}/${maxMarks}. These marks are now locked and final.`, 'marks');
            } catch(err) {
                if (err.message && err.message.includes('locked')) { locked++; }
                else throw err;
            }
        }
        let msg = `Marks saved for ${saved} student(s)!`;
        if (locked > 0) msg += ` (${locked} already locked — skipped)`;
        showToast(msg + ' Students notified. ✅', 'success');
        closeModal('marksEntryModal');
        renderAssessmentList();
    } catch(e) { showToast('Failed: ' + e.message, 'error'); }
};

// ── Student: Online Submissions ──────────────────────────────────────────────
window.openSubmitWorkModal = function(assessmentId, assessName) {
    document.getElementById('submissionAssessmentId').value = assessmentId;
    const lbl = document.getElementById('submissionAssessLabel');
    if (lbl) lbl.textContent = assessName;
    const notes = document.getElementById('submissionNotes');
    if (notes) notes.value = '';
    openModal('submitWorkModal');
};

window.submitOnlineWork = async function() {
    const assessmentId = document.getElementById('submissionAssessmentId')?.value;
    const notes = document.getElementById('submissionNotes')?.value.trim();
    const fileInput = document.getElementById('submissionFileInput');
    if (!notes || notes.length < 5) { showToast('Please describe your submission (min 5 characters)', 'warning'); return; }
    let fileInfo = '';
    if (fileInput && fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        if (file.size > 15 * 1024 * 1024) { showToast('File must be under 15MB', 'warning'); return; }
        fileInfo = ` [Attached: ${file.name} (${(file.size/1024).toFixed(1)}KB)]`;
    }
    try {
        await api('/submissions', { method:'POST', body: JSON.stringify({ assessment_id: assessmentId, notes: notes + fileInfo }) });
        showToast('Work submitted successfully! Faculty can now grade you. ✅', 'success');
        closeModal('submitWorkModal');
        renderPendingSubmissions();
    } catch(e) { showToast('Failed: ' + e.message, 'error'); }
};

window.renderPendingSubmissions = async function() {
    const card = document.getElementById('pending-submissions-card');
    const list = document.getElementById('pending-submissions-list');
    const cnt  = document.getElementById('pending-sub-count');
    if (!card || !list) return;
    try {
        const [assessments, submissions] = await Promise.all([
            api('/assessments'),
            api('/submissions').catch(() => [])
        ]);
        const onlineAssessments = assessments.filter(a => a.exam_mode === 'online');
        const pending = onlineAssessments.filter(a => !submissions.find(s => s.assessment_id === a.assessment_id));
        if (!pending.length) { card.style.display = 'none'; return; }
        card.style.display = 'block';
        if (cnt) cnt.textContent = `${pending.length} Pending`;
        list.innerHTML = pending.map(a => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f1f5f9;">
                <div>
                    <div style="font-weight:600;">${a.name}</div>
                    <div style="font-size:12px;color:#64748b;">${a.course_code||a.course_id} &nbsp;·&nbsp; Due: ${a.date} &nbsp;·&nbsp; Max: ${a.max_marks} marks</div>
                </div>
                <button onclick="openSubmitWorkModal('${a.assessment_id}', '${a.name.replace(/'/g,'\\&apos;')}')"
                    style="padding:8px 16px;background:#6366f1;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600;">
                    📤 Submit Work
                </button>
            </div>`).join('');
    } catch(e) { card.style.display = 'none'; }
};


// ── Faculty: Events, Leave, Research ─────────────────────────────────────────
window.renderFacultyEventsTable = async function() {
    const el = document.getElementById('fEventsTableBody');
    if (!el) return;
    try {
        const events = await api('/events');
        if (!events.length) { el.innerHTML = '<tr><td colspan="4" style="text-align:center;">No events</td></tr>'; return; }
        el.innerHTML = events.map(e => `
            <tr>
                <td><span style="padding:4px;background:#e2e8f0;border-radius:4px;">🗓️</span></td>
                <td><div style="font-weight:600;">${e.event_name}</div></td>
                <td>${e.date} at ${e.venue}</td>
                <td></td>
            </tr>`).join('');
    } catch(e) { el.innerHTML = `<tr><td colspan="4" style="color:#ef4444">Failed: ${e.message}</td></tr>`; }
};

window.renderFacultyLeaveList = async function() {
    const el = document.getElementById('fLeaveListBody');
    if (!el) return;
    try {
        const leaves = await api('/leave');
        const totalEl = document.getElementById('fLeaveTotalCount');
        const rejEl = document.getElementById('fLeaveRejectedCount');
        if (totalEl) totalEl.textContent = leaves.length;
        if (rejEl) rejEl.textContent = leaves.filter(l=>l.status==='rejected').length;
        
        if (!leaves.length) { el.innerHTML = '<tr><td colspan="5" style="text-align:center;">No leave applications</td></tr>'; return; }
        el.innerHTML = leaves.map(l => {
            const statusColors = { approved:'#dcfce7,#166534', pending:'#fef9c3,#713f12', rejected:'#fef2f2,#991b1b' };
            const [bg,fg] = (statusColors[l.status]||'#f1f5f9,#475569').split(',');
            return `<tr>
                <td>${l.leave_type||'Leave'}</td>
                <td>${l.start_date||''}</td>
                <td>${l.end_date||''}</td>
                <td>${l.reason||''}</td>
                <td><span style="padding:4px 8px;border-radius:12px;font-size:11px;font-weight:700;background:${bg};color:${fg};">${l.status}</span></td>
            </tr>`;
        }).join('');
    } catch(e) { el.innerHTML = `<tr><td colspan="5" style="color:#ef4444">Failed: ${e.message}</td></tr>`; }
};

window.submitFacultyLeave = async function() {
    const leave_type = document.getElementById('fLeaveType')?.value;
    const start_date = document.getElementById('fLeaveStart')?.value;
    const end_date   = document.getElementById('fLeaveEnd')?.value;
    const reason     = document.getElementById('fLeaveReason')?.value.trim();
    if (!leave_type)           { showToast('Please select a leave type', 'warning'); return; }
    if (!start_date)           { showToast('Start date is required', 'warning'); return; }
    if (!end_date)             { showToast('End date is required', 'warning'); return; }
    if (end_date < start_date) { showToast('End date cannot be before start date', 'warning'); return; }
    if (!reason || reason.length < 10) { showToast('Reason must be at least 10 characters', 'warning'); return; }
    try {
        await api('/leave', { method:'POST', body: JSON.stringify({ leave_type, start_date, end_date, reason }) });
        showToast('Leave applied!', 'success');
        closeModal('fLeaveModal');
        renderFacultyLeaveList();
    } catch(e) { showToast('Failed: ' + e.message, 'error'); }
};

window.renderFacultyResearch = async function() {
    const el = document.getElementById('f-research-projects-body');
    if (!el) return;
    try {
        const projects = await api('/research');
        if (!projects.length) { el.innerHTML = '<p style="color:#64748b;text-align:center;">No research projects.</p>'; return; }
        el.innerHTML = projects.map(p => `
            <div style="padding:16px;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:12px;">
                <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                    <h4 style="margin:0;">${p.title}</h4>
                    <span style="padding:3px 8px;border-radius:4px;font-size:11px;background:#e2e8f0;">${p.status}</span>
                </div>
                <p style="font-size:13px;color:#64748b;">${p.abstract||''}</p>
                <div style="margin-top:12px;">
                    <div style="font-size:12px;margin-bottom:4px;">Progress: ${p.progress||0}%</div>
                    <div style="height:6px;background:#e2e8f0;border-radius:3px;overflow:hidden;"><div style="height:100%;background:#6366f1;width:${p.progress||0}%;"></div></div>
                </div>
            </div>`).join('');
    } catch(e) { el.innerHTML = `<p style="color:#ef4444">Failed: ${e.message}</p>`; }
};

window.openMeetingModal = async function(studentId, name) {
    const sel = document.getElementById('meetingStudent');
    if (sel) {
        if (studentId) {
            sel.innerHTML = `<option value="${studentId}">${name || studentId} (${studentId})</option>`;
        } else {
            sel.innerHTML = '<option value="">Loading students…</option>';
            try {
                const students = await api('/faculty/me/students');
                sel.innerHTML = '<option value="">— Select Student —</option>' +
                    students.map(s => `<option value="${s.user_id}">${s.first_name} ${s.last_name||''} (${s.user_id})</option>`).join('');
            } catch(e) { sel.innerHTML = '<option value="">Error loading students</option>'; }
        }
    }
    const dateEl = document.getElementById('meetingDate');
    if (dateEl) dateEl.min = new Date().toISOString().split('T')[0];
    openModal('meetingModal');
};

window.submitScheduleMeeting = async function() {
    const sel         = document.getElementById('meetingStudent');
    const studentId   = sel?.value;
    const studentName = sel?.selectedOptions?.[0]?.text || '';
    const date        = document.getElementById('meetingDate')?.value;
    const hour        = document.getElementById('meetingHour')?.value;
    const minute      = document.getElementById('meetingMinute')?.value;
    const period      = document.getElementById('meetingPeriod')?.value || 'AM';
    const mode        = document.getElementById('meetingMode')?.value;
    const agenda      = document.getElementById('meetingAgenda')?.value?.trim();

    // Compute 24h time string from dropdowns
    let time = '';
    if (hour && minute) {
        let h = parseInt(hour, 10);
        if (period === 'PM' && h !== 12) h += 12;
        if (period === 'AM' && h === 12) h = 0;
        time = `${String(h).padStart(2,'0')}:${minute}`;
    }
    const timeDisplay = hour && minute ? `${hour}:${minute} ${period}` : '';

    if (!studentId)  { showToast('Please select a student', 'warning'); return; }
    if (!date)       { showToast('Meeting date is required', 'warning'); return; }
    if (date < new Date().toISOString().split('T')[0]) { showToast('Meeting date cannot be in the past', 'warning'); return; }
    if (!hour || !minute) { showToast('Please select meeting time (hour and minute)', 'warning'); return; }
    if (!mode)       { showToast('Please select a meeting type', 'warning'); return; }
    if (!agenda || agenda.length < 5) { showToast('Please enter a meeting agenda (at least 5 characters)', 'warning'); return; }
    try {
        await api('/meetings', { method:'POST', body: JSON.stringify({ student_id: studentId, date, time, agenda, mode }) });
        const user = window.Auth?.getUser?.();
        const from = user ? (user.first_name || 'Faculty') : 'Faculty';
        const modeLabel = mode === 'online' ? 'Online (Google Meet)' : 'In-Person (Faculty Cabin)';
        window.Notifications?.send(studentId, from,
            `\uD83D\uDCC5 Meeting scheduled: ${date} at ${timeDisplay} \u2014 ${modeLabel}. Agenda: ${agenda}`, 'meeting');
        showToast('Meeting scheduled! Student has been notified. \u2705', 'success');
        closeModal('meetingModal');
        document.getElementById('meetingForm')?.reset();
    } catch(e) { showToast('Failed: ' + e.message, 'error'); }
};


// ── Admin: Reports & Overview ────────────────────────────────────────────────
window.renderReports = async function() {
    const el = document.getElementById('report-dashboard-metrics');
    if (!el) return;
    try {
        const data = await api('/reports/overview');
        const s = data.summary;
        const ts = document.getElementById('total-students'); if (ts) ts.textContent = s.total_students;
        const tf = document.getElementById('total-faculty'); if (tf) tf.textContent = s.total_faculty;
        const tc = document.getElementById('total-courses'); if (tc) tc.textContent = s.total_courses;
        
        el.innerHTML = `
            <div style="padding:16px;background:#f8fafc;border-radius:8px;"><div style="font-size:12px;color:#64748b;">Total Students</div><div style="font-size:24px;font-weight:700;">${s.total_students}</div></div>
            <div style="padding:16px;background:#f8fafc;border-radius:8px;"><div style="font-size:12px;color:#64748b;">Total Faculty</div><div style="font-size:24px;font-weight:700;">${s.total_faculty}</div></div>
            <div style="padding:16px;background:#f8fafc;border-radius:8px;"><div style="font-size:12px;color:#64748b;">Total Courses</div><div style="font-size:24px;font-weight:700;">${s.total_courses}</div></div>
            <div style="padding:16px;background:#f8fafc;border-radius:8px;"><div style="font-size:12px;color:#64748b;">Active Research</div><div style="font-size:24px;font-weight:700;">${s.active_research}</div></div>
            <div style="padding:16px;background:#f8fafc;border-radius:8px;"><div style="font-size:12px;color:#64748b;">Overall Attendance</div><div style="font-size:24px;font-weight:700;color:#16a34a;">${s.overall_attendance}</div></div>
            <div style="padding:16px;background:#f8fafc;border-radius:8px;"><div style="font-size:12px;color:#64748b;">Fee Compliance</div><div style="font-size:24px;font-weight:700;color:#2563eb;">${s.fee_compliance}</div></div>
        `;
    } catch(e) { el.innerHTML = `<p style="color:#ef4444;grid-column:1/-1;">Failed: ${e.message}</p>`; }
};

window.renderInstitutionalReports = async function() {
    renderReports();
    const container = document.getElementById('institutional-reports-view');
    if (!container) return;
    // Wire up export buttons
    const genBtn = container.querySelector('.submit-btn');
    const cohortBtn = container.querySelector('.btn-cancel');
    let atRisk = [];
    let allStudents = [];
    try {
        [atRisk, allStudents] = await Promise.all([
            api('/reports/at-risk'),
            api('/admin/users').catch(() => [])
        ]);
        window._atRisk = atRisk;
        window._allStudents = allStudents;
    } catch(e) {}
    if (genBtn) {
        genBtn.textContent = '⬇ Export NBA/NAAC Report (CSV)';
        genBtn.onclick = function() {
            const lines = ['Student Name,ID,CGPA,Attendance %,Status'];
            (window._atRisk||[]).forEach(s => lines.push(`"${s.first_name} ${s.last_name||""}",${ s.user_id},${s.cgpa||'N/A'},${s.attendance_pct||'N/A'}%,At-Risk`));
            const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
            a.download = 'BarelyPassing_NBA_Report_' + new Date().toISOString().split('T')[0] + '.csv';
            a.click(); showToast('NBA/NAAC Report downloaded!', 'success');
        };
    }
    if (cohortBtn) {
        cohortBtn.textContent = '⬇ Export Cohort Analysis (CSV)';
        cohortBtn.onclick = async function() {
            try {
                const overview = await api('/reports/overview');
                const s = overview.summary || {};
                const lines = [
                    'Metric,Value',
                    `Total Students,${s.total_students||0}`,
                    `Total Faculty,${s.total_faculty||0}`,
                    `Total Courses,${s.total_courses||0}`,
                    `Active Research Projects,${s.active_research||0}`,
                    `Overall Attendance,${s.overall_attendance||'N/A'}`,
                    `Fee Compliance,${s.fee_compliance||'N/A'}`,
                    `At-Risk Students,${(window._atRisk||[]).length}`,
                    `Report Generated,${new Date().toLocaleString()}`
                ];
                const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
                const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
                a.download = 'BarelyPassing_CohortAnalysis_' + new Date().toISOString().split('T')[0] + '.csv';
                a.click(); showToast('Cohort Analysis exported!', 'success');
            } catch(e) { showToast('Export failed: ' + e.message, 'error'); }
        };
    }
    let listEl = document.getElementById('at-risk-list');
    if (!listEl) {
        listEl = document.createElement('div');
        listEl.id = 'at-risk-list';
        listEl.style.marginTop = '24px';
        const body = container.querySelector('.stats-card-body');
        if (body) body.appendChild(listEl);
    }
    try {
        if (!atRisk.length) { listEl.innerHTML = '<p style="color:#16a34a;font-weight:600;">✓ No at-risk students found.</p>'; return; }
        listEl.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                <h4 style="margin:0;color:#ef4444;">⚠ At-Risk Students (${atRisk.length})</h4>
            </div>` +
            atRisk.map(s => `
                <div style="padding:14px 16px;border-left:4px solid #ef4444;background:#fef2f2;margin-bottom:8px;border-radius:0 8px 8px 0;display:flex;justify-content:space-between;align-items:center;">
                    <div>
                        <div style="font-weight:700;color:#111;">${s.first_name} ${s.last_name||''} <span style="font-size:12px;color:#94a3b8;font-weight:400;">(${s.user_id})</span></div>
                        <div style="font-size:13px;color:#991b1b;margin-top:3px;">CGPA: ${s.cgpa||'N/A'} &nbsp;|&nbsp; Attendance: ${s.attendance_pct||'N/A'}%</div>
                    </div>
                    <span style="padding:4px 10px;background:#fee2e2;color:#ef4444;border-radius:6px;font-size:12px;font-weight:700;">AT RISK</span>
                </div>`).join('');
    } catch(e) { listEl.innerHTML = `<p style="color:#ef4444">Failed: ${e.message}</p>`; }
};

// ── Admin: Events ────────────────────────────────────────────────────────────
window.renderEventsTable = async function() {
    const el = document.getElementById('eventsTableBody');
    if (!el) return;
    try {
        const events = await api('/events');
        if (!events.length) { el.innerHTML = '<tr><td colspan="4" style="text-align:center;">No events</td></tr>'; return; }
        const today = new Date().toISOString().split('T')[0];
        const upcoming = events.filter(e => e.date >= today).sort((a,b) => a.date.localeCompare(b.date));
        const past = events.filter(e => e.date < today).sort((a,b) => b.date.localeCompare(a.date));
        let html = '';
        if (upcoming.length) {
            html += '<tr><td colspan="4" style="background:#eff6ff;font-weight:700;color:#1e40af;padding:10px;">🟢 Upcoming Events</td></tr>';
            html += upcoming.map(e => `<tr>
                <td><span style="padding:4px;background:#dcfce7;border-radius:4px;">🗓️</span></td>
                <td><div style="font-weight:600;">${e.event_name}</div></td>
                <td>${e.date} at ${e.venue}</td>
                <td style="text-align:right;">
                    <button onclick='openEditEvent(${JSON.stringify(e).replace(/'/g, "&apos;")})' style="padding:4px 8px;margin-right:4px;background:#e2e8f0;border:none;border-radius:4px;cursor:pointer;">Edit</button>
                    <button onclick="deleteEvent('${e.event_id}')" style="padding:4px 8px;background:#fef2f2;color:#ef4444;border:none;border-radius:4px;cursor:pointer;">Delete</button>
                </td>
            </tr>`).join('');
        }
        if (past.length) {
            html += '<tr><td colspan="4" style="background:#f8fafc;font-weight:700;color:#64748b;padding:10px;">📜 Past Events (Completed)</td></tr>';
            html += past.map(e => `<tr style="opacity:0.6;">
                <td><span style="padding:4px;background:#f1f5f9;border-radius:4px;">✔️</span></td>
                <td><div style="font-weight:600;color:#94a3b8;">${e.event_name}</div></td>
                <td style="color:#94a3b8;">${e.date} at ${e.venue}</td>
                <td style="text-align:right;"><span style="padding:4px 10px;background:#dcfce7;color:#166534;border-radius:12px;font-size:11px;font-weight:700;">Completed</span></td>
            </tr>`).join('');
        }
        el.innerHTML = html;
    } catch(e) { el.innerHTML = `<tr><td colspan="4" style="color:#ef4444">Failed: ${e.message}</td></tr>`; }
};

window.submitScheduleEvent = async function() {
    const event_name  = document.getElementById('eventName')?.value.trim();
    const date        = document.getElementById('eventDate')?.value;
    const venue       = document.getElementById('eventVenue')?.value.trim();
    const description = document.getElementById('eventDesc')?.value.trim();
    // Read optional time from dropdowns
    const eHour   = document.getElementById('eventHour')?.value;
    const eMin    = document.getElementById('eventMinute')?.value;
    const ePeriod = document.getElementById('eventPeriod')?.value || 'AM';
    let timeDisplay = '';
    if (eHour && eMin) {
        timeDisplay = ` at ${eHour}:${eMin} ${ePeriod}`;
    }
    // Inline validation
    let valid = true;
    const nameEl  = document.getElementById('eventName');
    const dateEl  = document.getElementById('eventDate');
    const venueEl = document.getElementById('eventVenue');
    [nameEl, dateEl, venueEl].forEach(el => { if (el) el.style.borderColor = ''; });
    if (!event_name || event_name.length < 3) {
        if (nameEl) nameEl.style.borderColor = '#ef4444';
        showToast('Event name must be at least 3 characters', 'warning'); valid = false;
    }
    if (!date) {
        if (dateEl) dateEl.style.borderColor = '#ef4444';
        showToast('Event date is required', 'warning'); valid = false;
    } else if (date < new Date().toISOString().split('T')[0]) {
        if (dateEl) dateEl.style.borderColor = '#ef4444';
        showToast('Event date cannot be in the past', 'warning'); valid = false;
    }
    if (!venue) {
        if (venueEl) venueEl.style.borderColor = '#ef4444';
        showToast('Venue is required', 'warning'); valid = false;
    }
    if (!valid) return;
    try {
        await api('/events', { method:'POST', body: JSON.stringify({ event_name, date, venue, description }) });
        showToast('Event created! All users notified. ✅', 'success');
        closeModal('eventModal');
        renderEventsTable();
        // Broadcast event notification to all users
        const user = window.Auth?.getUser?.();
        const from = user ? (user.first_name || user.username || 'Admin') : 'Admin';
        window.Notifications?.broadcastAll(from, `🎉 New Event: "${event_name}" on ${date}${timeDisplay} — ${venue}`, 'event');
    } catch(e) { showToast('Failed: ' + e.message, 'error'); }
};

window.renderResourceManagement = async function() {
    const el = document.getElementById('h-resources-body') || document.getElementById('resources-body');
    if (!el) return;
    try {
        const [res, events] = await Promise.all([
            api('/resources'),
            api('/events').catch(() => [])
        ]);
        if (!res.length) { el.innerHTML = '<p style="color:#64748b;text-align:center;">No resources found.</p>'; return; }
        el.innerHTML = res.map(r => {
            // Match events using this resource venue
            const linked = events.filter(e =>
                e.venue && (e.venue.toLowerCase().includes(r.name.toLowerCase().split(' ')[0]) ||
                (r.location || '').toLowerCase().includes((e.venue || '').toLowerCase().split(' ')[0]))
            );
            const evHtml = linked.length
                ? `<div style="margin-top:6px;font-size:11px;color:#6366f1;">📅 
                    ${linked.map(e => `<span style="background:#eff6ff;padding:2px 6px;border-radius:4px;margin-right:4px;">${e.event_name} (${e.date})</span>`).join('')}
                  </div>`
                : '';
            const statusColor = r.status === 'available' ? '#166534,#dcfce7' : r.status === 'maintenance' ? '#713f12,#fef9c3' : '#991b1b,#fef2f2';
            const [fc, bg] = statusColor.split(',');
            return `
            <div style="padding:16px;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:12px;">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                    <div style="flex:1;">
                        <h4 style="margin:0;font-size:15px;">${r.name}</h4>
                        <div style="font-size:12px;color:#64748b;margin-top:4px;">${r.type} &nbsp;&bull;&nbsp; Cap: ${r.capacity||'N/A'} &nbsp;&bull;&nbsp; ${r.location||'N/A'}</div>
                        ${evHtml}
                    </div>
                    <div style="display:flex;align-items:center;gap:8px;margin-left:12px;">
                        <span style="padding:4px 10px;border-radius:6px;font-size:11px;font-weight:700;background:${bg};color:${fc};">${r.status}</span>
                        <button onclick="toggleResource('${r.resource_id}', '${r.status}')" style="padding:4px 10px;font-size:11px;cursor:pointer;border:1px solid #e2e8f0;border-radius:6px;background:#fff;">Toggle</button>
                    </div>
                </div>
            </div>`;
        }).join('');
    } catch(e) { el.innerHTML = `<p style="color:#ef4444">Failed: ${e.message}</p>`; }
};

window.openEditEvent = function(ev) {
    document.getElementById('editEventId').value = ev.event_id;
    document.getElementById('editEventName').value = ev.event_name;
    document.getElementById('editEventDate').value = ev.date;
    document.getElementById('editEventVenue').value = ev.venue;
    openModal('editEventModal');
};

window.submitEditEvent = async function() {
    const id = document.getElementById('editEventId').value;
    const event_name = document.getElementById('editEventName').value;
    const date = document.getElementById('editEventDate').value;
    const venue = document.getElementById('editEventVenue').value;
    // Block past dates
    const today = new Date().toISOString().split('T')[0];
    if (date < today) { showToast('Cannot set event to a past date', 'warning'); return; }
    try {
        await api(`/events/${id}`, { method:'PUT', body: JSON.stringify({ event_name, date, venue }) });
        showToast('Event updated!', 'success');
        closeModal('editEventModal');
        renderEventsTable();
    } catch(e) { showToast('Failed: ' + e.message, 'error'); }
};

window.deleteEvent = async function(id) {
    if (!confirm('Are you sure you want to delete this event?')) return;
    try {
        await api(`/events/${id}`, { method:'DELETE' });
        showToast('Event deleted!', 'success');
        renderEventsTable();
    } catch(e) { showToast('Failed: ' + e.message, 'error'); }
};

// ── Admin: Resources & Fees ──────────────────────────────────────────────────
window.renderResourceManagement = async function() {
    const el = document.getElementById('h-resources-body') || document.getElementById('resources-body');
    if (!el) return;
    try {
        const res = await api('/resources');
        if (!res.length) { el.innerHTML = '<p>No resources.</p>'; return; }
        el.innerHTML = res.map(r => `
            <div style="padding:16px;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;">
                <div>
                    <h4 style="margin:0;">${r.name}</h4>
                    <div style="font-size:12px;color:#64748b;margin-top:4px;">${r.type} • Cap: ${r.capacity||'N/A'} • Loc: ${r.location||'N/A'}</div>
                </div>
                <div style="display:flex;align-items:center;gap:12px;">
                    <span style="padding:4px 8px;border-radius:4px;font-size:11px;background:${r.status==='available'?'#dcfce7':'#fef2f2'};color:${r.status==='available'?'#166534':'#991b1b'};">${r.status}</span>
                    <button onclick="toggleResource('${r.resource_id}', '${r.status}', '${(r.name||'').replace(/'/g,'')}')" style="padding:6px 12px;font-size:12px;font-weight:600;cursor:pointer;border:1px solid #e2e8f0;border-radius:6px;background:#fff;">${r.status==='available'?'Mark In Use':'Mark Available'}</button>
                </div>
            </div>`).join('');
    } catch(e) { el.innerHTML = `<p style="color:#ef4444">Failed: ${e.message}</p>`; }
};
window.toggleResource = async function(id, current, name) {
    const status = current === 'available' ? 'in_use' : 'available';
    try {
        await api(`/resources/${id}`, { method:'PUT', body: JSON.stringify({ status }) });
        const user = window.Auth?.getUser?.();
        const from = user ? (user.first_name || 'Admin') : 'Admin';
        const label = status === 'in_use' ? 'now in use' : 'now available';
        window.Notifications?.broadcastAll(from, `🏢 Resource "${name||'Facility'}" is ${label}.`, 'info');
        renderResourceManagement();
    } catch(e) { showToast('Failed', 'error'); }
};

window.renderFeeCompliance = async function() {
    const el = document.getElementById('h-fees-body') || document.getElementById('fee-compliance-body');
    if (!el) return;
    try {
        const [data, allUsers] = await Promise.all([api('/fees'), api('/admin/users').catch(() => [])]);
        const odEl = document.getElementById('fee-overdue-count'); if (odEl) odEl.textContent = data.summary?.overdue || 0;
        const crEl = document.getElementById('fee-compliance-rate'); if (crEl) crEl.textContent = data.summary?.compliance_rate || '0%';
        const studentMap = {};
        (allUsers||[]).filter(u=>u.role==='student').forEach(u => {
            studentMap[u.user_id] = { name:((u.first_name||'')+' '+(u.last_name||'')).trim()||u.username, email:u.email };
        });
        const fees = data.fees || [];
        const actionsHtml = `<div style=\"display:flex;gap:10px;flex-wrap:wrap;margin-bottom:18px;\">
            <button onclick=\"openAddFeeModal()\" style=\"padding:9px 18px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:700;\">+ Add Fee Record</button>
            <button onclick=\"openBulkSemFeeModal()\" style=\"padding:9px 18px;background:linear-gradient(135deg,#0ea5e9,#0284c7);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:700;\">&#x1F4C5; New Semester Fees</button>
            <button onclick=\"renderFeeCompliance()\" style=\"padding:9px 14px;background:#f1f5f9;color:#475569;border:1px solid #e2e8f0;border-radius:8px;cursor:pointer;font-size:13px;\">&#x21BB; Refresh</button>
        </div>`;
        if (!fees.length) { el.innerHTML = actionsHtml + '<div style="padding:40px;text-align:center;color:#64748b;"><div style="font-size:40px;">&#x1F4B3;</div><div style="font-weight:600;margin-top:8px;">No fee records</div><p style="font-size:13px;color:#94a3b8;">Use buttons above to add fees.</p></div>'; return; }
        const byStudent = {};
        fees.forEach(f=>{ if(!byStudent[f.student_id]) byStudent[f.student_id]=[]; byStudent[f.student_id].push(f); });
        let html = actionsHtml;
        Object.entries(byStudent).forEach(([sid,sfees]) => {
            const stu = studentMap[sid]||{name:'Student '+sid,email:''};
            const totalAmt=sfees.reduce((s,f)=>s+Number(f.amount||0),0);
            const paidAmt=sfees.filter(f=>f.status==='paid').reduce((s,f)=>s+Number(f.amount||0),0);
            const overdue=sfees.filter(f=>f.status==='overdue').length;
            const pending=sfees.filter(f=>f.status==='pending').length;
            const pct=totalAmt>0?Math.round((paidAmt/totalAmt)*100):0;
            const barColor=pct>=100?'#16a34a':pct>=50?'#6366f1':'#f59e0b';
            html += '<div style="border:1px solid #e2e8f0;border-radius:14px;margin-bottom:18px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.05);">';
            html += '<div style="padding:14px 18px;background:linear-gradient(135deg,#f8fafc,#eff6ff);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;"><div>';
            html += '<div style="font-size:15px;font-weight:700;color:#0f172a;">&#x1F393; '+stu.name+'</div>';
            html += '<div style="font-size:12px;color:#64748b;">ID: '+sid+(stu.email?' &middot; '+stu.email:'')+'</div></div>';
            html += '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">';
            if(overdue>0) html += '<span style="padding:3px 10px;background:#fef2f2;color:#dc2626;border-radius:20px;font-size:11px;font-weight:700;">&#x26A0; '+overdue+' Overdue</span>';
            if(pending>0) html += '<span style="padding:3px 10px;background:#fef9c3;color:#92400e;border-radius:20px;font-size:11px;font-weight:700;">&#x23F3; '+pending+' Pending</span>';
            html += '<span style="font-size:12px;color:#475569;font-weight:600;">&#x20B9;'+paidAmt.toLocaleString()+' / &#x20B9;'+totalAmt.toLocaleString()+'</span></div></div>';
            html += '<div style="padding:10px 18px;background:#fff;"><div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">';
            html += '<div style="flex:1;height:6px;background:#e2e8f0;border-radius:3px;overflow:hidden;"><div style="height:100%;background:'+barColor+';width:'+pct+'%;transition:width .4s;"></div></div>';
            html += '<span style="font-size:12px;font-weight:700;color:#475569;">'+pct+'% paid</span></div>';
            sfees.forEach(f => {
                const sc=f.status==='paid'?{bg:'#dcfce7',c:'#166534',lbl:'Paid &#x2713;'}:f.status==='overdue'?{bg:'#fef2f2',c:'#dc2626',lbl:'Overdue &#x26A0;'}:{bg:'#fef9c3',c:'#92400e',lbl:'Pending'};
                const ftype = (f.fee_type||f.type||'').replace(/'/g,'');
                const sname = stu.name.replace(/'/g,'');
                html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f8fafc;flex-wrap:wrap;gap:6px;">';
                html += '<div><div style="font-size:13px;font-weight:600;">'+(f.fee_type||f.type||'')+'</div><div style="font-size:11px;color:#64748b;">Due: '+f.due_date+' &middot; Sem: '+(f.semester||'N/A')+'</div></div>';
                html += '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;"><span style="font-size:13px;font-weight:700;">&#x20B9;'+Number(f.amount||0).toLocaleString()+'</span>';
                html += '<span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;background:'+sc.bg+';color:'+sc.c+';">'+sc.lbl+'</span>';
                if(f.status!=='paid') html += '<button onclick="payFee(\''+f.fee_id+'\',\''+sid+'\',\''+ftype+'\',\''+f.amount+'\',\''+sname+'\')" style="padding:6px 14px;font-size:12px;font-weight:700;background:#0f172a;color:#fff;border:none;border-radius:8px;cursor:pointer;">Mark Paid</button>';
                html += '<button onclick="openEditFeeModal(\''+f.fee_id+'\',\''+sid+'\',\''+ftype+'\',\''+f.amount+'\',\''+f.due_date+'\',\''+(f.semester||'')+'\')" style="padding:6px 10px;font-size:12px;background:#f1f5f9;color:#475569;border:1px solid #e2e8f0;border-radius:6px;cursor:pointer;">Edit</button>';
                html += '</div></div>';
            });
            html += '<div style="padding-top:10px;"><button onclick="openAddFeeModal(\''+sid+'\',\''+stu.name.replace(/'/g,'')+'\')" style="font-size:12px;color:#6366f1;background:none;border:none;cursor:pointer;font-weight:600;">+ Add fee for this student</button></div></div></div>';
        });
        el.innerHTML = html;
    } catch(e) { el.innerHTML = '<p style="color:#ef4444">Failed: '+e.message+'</p>'; }
};
window.payFee = async function(id, studentId, feeType, amount, studentName) {
    try {
        await api('/fees/'+id+'/pay', { method:'PATCH' });
        showToast('Fee marked as paid!', 'success');
        if (studentId) {
            const user = window.Auth?.getUser?.(); const from = user?(user.first_name||'Admin'):'Admin';
            window.Notifications?.send(studentId, from, '💳 Your '+( feeType||'fee')+' ₹'+(amount||'')+' marked PAID by '+from+'. No further action needed.', 'fee');
        }
        renderFeeCompliance();
    } catch(e) { showToast('Failed', 'error'); }
};
window.openAddFeeModal = async function(preId, preName) {
    const m = document.getElementById('addFeeModal'); if (!m) { showToast('addFeeModal not in HTML', 'error'); return; }
    const sel = document.getElementById('addFeeStudentSel');
    if (sel) { sel.innerHTML = '<option value="">Loading...</option>';
        try { const u=await api('/admin/users'); const st=u.filter(x=>x.role==='student');
            sel.innerHTML='<option value="">-- Select Student --</option>'+st.map(s=>'<option value="'+s.user_id+'"'+(s.user_id===preId?' selected':'')+'>'+( s.first_name||'')+' '+(s.last_name||'')+' ('+s.user_id+')</option>').join('');
        } catch { sel.innerHTML='<option value="">Error loading</option>'; } }
    ['addFeeSemester','addFeeType','addFeeAmount','addFeeDue'].forEach(function(id){ var el=document.getElementById(id); if(el){el.value='';el.style.borderColor='';} });
    var duEl=document.getElementById('addFeeDue'); if(duEl) duEl.min=new Date().toISOString().split('T')[0];
    openModal('addFeeModal');
};
window.submitAddFee = async function() {
    var sid=document.getElementById('addFeeStudentSel')?.value, sem=document.getElementById('addFeeSemester')?.value,
        ft=document.getElementById('addFeeType')?.value.trim(), amt=document.getElementById('addFeeAmount')?.value, dd=document.getElementById('addFeeDue')?.value;
    var valid=true;
    [['addFeeStudentSel',sid,'Select a student'],['addFeeSemester',sem,'Select semester'],['addFeeType',ft,'Fee type required'],['addFeeAmount',amt,'Amount required'],['addFeeDue',dd,'Due date required']
    ].forEach(function(a){ var el=document.getElementById(a[0]); if(!a[1]){if(el)el.style.borderColor='#ef4444';showToast(a[2],'warning');valid=false;}else if(el)el.style.borderColor=''; });
    if(!valid||Number(amt)<1){if(Number(amt)<1)showToast('Amount must be at least 1','warning');return;}
    try { await api('/fees',{method:'POST',body:JSON.stringify({student_id:sid,semester:sem,fee_type:ft,amount:Number(amt),due_date:dd,status:'pending'})});
        var user=window.Auth?.getUser?.(); var from=user?(user.first_name||'Admin'):'Admin';
        window.Notifications?.send(sid,from,'💳 New fee: '+ft+' ₹'+amt+' due '+dd+' (Sem '+sem+').','fee');
        showToast('Fee added! Student notified. ✅','success'); closeModal('addFeeModal'); renderFeeCompliance();
    } catch(e){showToast('Failed: '+e.message,'error');}
};
window.openBulkSemFeeModal = function() {
    var m=document.getElementById('bulkSemFeeModal'); if(!m){showToast('bulkSemFeeModal not in HTML','error');return;}
    ['bulkSemNum','bulkSemFeeType','bulkSemAmount','bulkSemDue'].forEach(function(id){var el=document.getElementById(id);if(el){el.value='';el.style.borderColor='';}});
    var duEl=document.getElementById('bulkSemDue'); if(duEl) duEl.min=new Date().toISOString().split('T')[0];
    openModal('bulkSemFeeModal');
};
window.submitBulkSemFee = async function() {
    var sem=document.getElementById('bulkSemNum')?.value, ft=document.getElementById('bulkSemFeeType')?.value.trim(),
        amt=document.getElementById('bulkSemAmount')?.value, dd=document.getElementById('bulkSemDue')?.value;
    var valid=true;
    [['bulkSemNum',sem,'Select semester'],['bulkSemFeeType',ft,'Fee type required'],['bulkSemAmount',amt,'Amount required'],['bulkSemDue',dd,'Due date required']
    ].forEach(function(a){var el=document.getElementById(a[0]);if(!a[1]){if(el)el.style.borderColor='#ef4444';showToast(a[2],'warning');valid=false;}else if(el)el.style.borderColor='';});
    if(!valid||Number(amt)<1)return;
    try { var users=await api('/admin/users'); var students=users.filter(u=>u.role==='student');
        if(!students.length){showToast('No students found','warning');return;}
        var created=0; var user=window.Auth?.getUser?.(); var from=user?(user.first_name||'Admin'):'Admin';
        for(var s of students){try{await api('/fees',{method:'POST',body:JSON.stringify({student_id:s.user_id,semester:sem,fee_type:ft,amount:Number(amt),due_date:dd,status:'pending'})});
            window.Notifications?.send(s.user_id,from,'💳 Sem '+sem+' fee: '+ft+' ₹'+amt+' due '+dd+'. Pay on time.','fee'); created++;}catch(e){console.warn(e);}}
        showToast('✅ Fees created for '+created+' students! All notified.','success'); closeModal('bulkSemFeeModal'); renderFeeCompliance();
    } catch(e){showToast('Failed: '+e.message,'error');}
};
window.openEditFeeModal = function(feeId,studentId,feeType,amount,dueDate,semester){
    var m=document.getElementById('editFeeModal'); if(!m){showToast('editFeeModal not in HTML','error');return;}
    var set=function(id,val){var el=document.getElementById(id);if(el){el.value=val;el.style.borderColor='';}};
    set('editFeeId',feeId);set('editFeeStudentId',studentId);set('editFeeType',feeType);set('editFeeAmount',amount);set('editFeeDue',dueDate);set('editFeeSemester',semester);
    openModal('editFeeModal');
};
window.submitEditFee = async function(){
    var feeId=document.getElementById('editFeeId')?.value, sid=document.getElementById('editFeeStudentId')?.value,
        ft=document.getElementById('editFeeType')?.value.trim(), amt=document.getElementById('editFeeAmount')?.value,
        dd=document.getElementById('editFeeDue')?.value, sem=document.getElementById('editFeeSemester')?.value;
    if(!ft||!amt||!dd){showToast('All fields required','warning');return;}
    if(Number(amt)<1){showToast('Amount must be at least 1','warning');return;}
    try { await api('/fees/'+feeId,{method:'PUT',body:JSON.stringify({fee_type:ft,amount:Number(amt),due_date:dd,semester:sem,status:'pending'})});
        var user=window.Auth?.getUser?.(); var from=user?(user.first_name||'Admin'):'Admin';
        if(sid) window.Notifications?.send(sid,from,'💳 Fee updated: '+ft+' ₹'+amt+' due '+dd+' (Sem '+(sem||'N/A')+').','fee');
        showToast('Fee updated! Student notified. ✅','success'); closeModal('editFeeModal'); renderFeeCompliance();
    } catch(e){showToast('Failed: '+e.message,'error');}
};


// ── Admin: Users ─────────────────────────────────────────────────────────────
window.renderUsersTable = async function() {
    const el = document.getElementById('usersTable');
    if (!el) return;
    try {
        const users = await api('/admin/users');
        el.innerHTML = `<table class="crud-table">
            <thead><tr><th>Username</th><th>Email</th><th>Role</th><th style="text-align:right">Actions</th></tr></thead>
            <tbody>${users.map(u => `
                <tr>
                    <td>${u.username}</td>
                    <td>${u.email}</td>
                    <td><span style="font-size:11px;padding:3px 8px;background:#e2e8f0;border-radius:4px;text-transform:uppercase;">${u.role}</span></td>
                    <td style="text-align:right;">
                        <button onclick='openEditUser(${JSON.stringify(u).replace(/'/g, "&apos;")})' style="padding:4px 8px;margin-right:4px;background:#e2e8f0;border:none;border-radius:4px;cursor:pointer;">Edit</button>
                        <button onclick="deleteUser('${u.user_id}')" style="padding:4px 8px;background:#fef2f2;color:#ef4444;border:none;border-radius:4px;cursor:pointer;">Delete</button>
                    </td>
                </tr>`).join('')}
            </tbody></table>`;
    } catch(e) { el.innerHTML = `<p style="color:#ef4444">Failed: ${e.message}</p>`; }
};

window.submitAddUser = async function() {
    const first_name = document.getElementById('newFirst')?.value.trim();
    const email      = document.getElementById('newEmail')?.value.trim();
    const password   = document.getElementById('newPass')?.value;
    const role       = document.getElementById('newRole')?.value;
    if (!first_name)              { showToast('First name is required', 'warning'); return; }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showToast('Enter a valid email address', 'warning'); return; }
    if (!password || password.length < 6) { showToast('Password must be at least 6 characters', 'warning'); return; }
    if (!role)                    { showToast('Please select a role', 'warning'); return; }
    try {
        await api('/users', { method:'POST', body: JSON.stringify({ first_name, email, password, role }) });
        showToast('User created! They can now log in.', 'success');
        closeModal('addUserModal');
        document.getElementById('addUserForm')?.reset();
        renderUsersTable();
        // Welcome notification to the new user (find their id from users list)
        setTimeout(async () => {
            try {
                const users = await api('/admin/users');
                const nu = users.find(u => u.email === email);
                if (nu) window.Notifications?.send(nu.user_id, 'Admin', `👋 Welcome to BarelyPassing! Your account (${role}) is ready.`, 'info');
            } catch(e) {}
        }, 500);
    } catch(e) { showToast('Failed: ' + e.message, 'error'); }
};

window.openEditUser = function(u) {
    document.getElementById('editUserId').value = u.user_id;
    document.getElementById('editUserName').value = u.username;
    document.getElementById('editUserEmail').value = u.email;
    document.getElementById('editUserRole').value = u.role;
    openModal('editUserModal');
};

window.submitEditUser = async function() {
    const id = document.getElementById('editUserId').value;
    const username = document.getElementById('editUserName').value;
    const email = document.getElementById('editUserEmail').value;
    const role = document.getElementById('editUserRole').value;
    try {
        await api(`/users/${id}`, { method:'PUT', body: JSON.stringify({ username, email, role }) });
        showToast('User updated!', 'success');
        closeModal('editUserModal');
        renderUsersTable();
    } catch(e) { showToast('Failed: ' + e.message, 'error'); }
};

window.deleteUser = async function(id) {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
        await api(`/users/${id}`, { method:'DELETE' });
        showToast('User deleted!', 'success');
        renderUsersTable();
    } catch(e) { showToast('Failed: ' + e.message, 'error'); }
};

// ── Admin: Leave & Overrides ─────────────────────────────────────────────────
window.renderLeaveManagement = async function() {
    const el = document.getElementById('h-leave-body');
    if (!el) return;
    try {
        const leaves = await api('/leave');
        if (!leaves.length) { el.innerHTML = '<p style="text-align:center;color:#64748b;">No leaves.</p>'; return; }
        el.innerHTML = leaves.map(l => `
            <div style="padding:12px;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;">
                <div><div style="font-weight:600;">${l.student_name||l.student_id}</div><div style="font-size:12px;color:#64748b;">${l.leave_type} • ${l.start_date} to ${l.end_date}</div><div style="font-size:12px;margin-top:4px;">${l.reason}</div></div>
                <div>
                    ${l.status === 'pending' ? `
                    <button onclick="updateLeave('${l.leave_id}', 'approved', '${l.student_id||l.user_id||''}', '${(l.student_name||l.user_name||'').replace(/'/g,'')}')"
                        style="padding:6px 14px;background:#16a34a;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;margin-right:6px;">✓ Approve</button>
                    <button onclick="updateLeave('${l.leave_id}', 'rejected', '${l.student_id||l.user_id||''}', '${(l.student_name||l.user_name||'').replace(/'/g,'')}')"
                        style="padding:6px 14px;background:#ef4444;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;">✕ Reject</button>
                    ` : `<span style="padding:4px 8px;border-radius:4px;font-size:11px;background:${l.status==='approved'?'#dcfce7':'#fef2f2'};color:${l.status==='approved'?'#166534':'#991b1b'};">${l.status}</span>`}
                </div>
            </div>`).join('');
    } catch(e) { el.innerHTML = `<p style="color:#ef4444">Failed: ${e.message}</p>`; }
};
window.updateLeave = async function(id, status, studentId, studentName) {
    try {
        await api(`/leave/${id}`, { method:'PATCH', body: JSON.stringify({ status }) });
        const statusLabel = status === 'approved' ? 'approved ✅' : 'rejected ❌';
        showToast(`Leave ${statusLabel}`, status === 'approved' ? 'success' : 'warning');
        if (studentId) {
            const user = window.Auth?.getUser?.();
            const from = user ? (user.first_name || 'Faculty') : 'Admin';
            const msg = status === 'approved'
                ? `🗓 Your leave request has been APPROVED by ${from}. Enjoy your time off!`
                : `❌ Your leave request has been REJECTED by ${from}. Please contact them for details.`;
            window.Notifications?.send(studentId, from, msg, status === 'approved' ? 'info' : 'alert');
        }
        renderLeaveManagement();
        renderAttendanceOverride();
    } catch(e) { showToast('Failed', 'error'); }
};

window.renderAttendanceOverride = async function() {
    const el = document.getElementById('h-attendance-override-body');
    if (!el) return;
    try {
        const leaves = await api('/leave');
        const overrides = leaves.filter(l => l.leave_type === 'medical' && l.status === 'pending');
        if (!overrides.length) { el.innerHTML = '<p style="text-align:center;color:#64748b;">No pending overrides.</p>'; return; }
        el.innerHTML = overrides.map(l => `
            <div style="padding:12px;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;">
                <div><div style="font-weight:600;">${l.student_name||l.student_id} (Medical)</div><div style="font-size:12px;color:#64748b;">Dates: ${l.start_date} to ${l.end_date}</div></div>
                <div><button onclick="updateLeave('${l.leave_id}', 'approved')" style="padding:6px 12px;background:#2563eb;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;">Approve Override</button></div>
            </div>`).join('');
    } catch(e) { el.innerHTML = `<p style="color:#ef4444">Failed: ${e.message}</p>`; }
};

// ── Initialization ───────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const first = document.querySelector('.view-section.active');
    if (first) { first.style.display = 'block'; }
    if (document.getElementById('attendance-course-select')) {
        api('/faculty/me/courses').then(courses => {
            const sel = document.getElementById('attendance-course-select');
            sel.innerHTML = '<option value="">— Select Course —</option>' +
                courses.map(c => `<option value="${c.course_id}">${c.course_code} - ${c.course_name}</option>`).join('');
        }).catch(e => console.error(e));
    }
});

// Make sure dashboard shows right view on load based on URL or defaults to dashboard
// ── Notifications System ─────────────────────────────────────────────────────
window.Notifications = (function() {
    const KEY   = 'bp_notifications';
    const BKEY  = 'bp_broadcasts';

    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

    function getAll() {
        try {
            const all = JSON.parse(localStorage.getItem(KEY) || '[]');
            const now = Date.now();
            return all.filter(n => !n.timestamp || (now - n.timestamp) < THIRTY_DAYS);
        } catch { return []; }
    }
    function getBC() {
        try {
            const all = JSON.parse(localStorage.getItem(BKEY) || '[]');
            const now = Date.now();
            return all.filter(b => !b.timestamp || (now - b.timestamp) < THIRTY_DAYS);
        } catch { return []; }
    }
    function save(n)    { localStorage.setItem(KEY,  JSON.stringify(n)); }
    function saveBC(b)  { localStorage.setItem(BKEY, JSON.stringify(b)); }
    function forUser(uid) { return getAll().filter(n => n.to === uid); }

    function getUnreadBC(role) {
        const readKey = `bp_bc_read_${role}`;
        const readIds = JSON.parse(localStorage.getItem(readKey) || '[]');
        return getBC().filter(b => (b.forRole === 'all' || b.forRole === role) && !readIds.includes(b.id));
    }
    function markBCRead(role) {
        const ids = getBC().filter(b => b.forRole === 'all' || b.forRole === role).map(b => b.id);
        localStorage.setItem(`bp_bc_read_${role}`, JSON.stringify(ids));
    }

    function unread(uid)  { return forUser(uid).filter(n => !n.read).length; }

    function send(toUserId, fromName, message, type='alert') {
        const all = getAll();
        const ts  = Date.now();
        const timeLabel = new Date().toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
        all.unshift({ id: ts, to: toUserId, from: fromName, message, type, read: false, time: timeLabel, timestamp: ts });
        save(all.slice(0, 200));
        updateBell();
    }

    function broadcast(targetRole, fromName, message, type='info') {
        const bc = getBC();
        const ts = Date.now();
        const timeLabel = new Date().toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
        bc.unshift({ id: ts, forRole: targetRole, from: fromName, message, type, time: timeLabel, timestamp: ts });
        saveBC(bc.slice(0, 500));
        updateBell();
    }

    function broadcastAll(fromName, message, type='info') {
        broadcast('all', fromName, message, type);
    }

    function markRead(uid) {
        const all = getAll().map(n => n.to === uid ? { ...n, read: true } : n);
        save(all);
        updateBell();
    }

    function updateBell() {
        const user = window.Auth?.getUser?.();
        if (!user) return;
        const count = unread(user.user_id) + getUnreadBC(user.role).length;
        const badge = document.getElementById('notif-badge');
        const bell  = document.getElementById('notif-bell');
        if (badge) { badge.textContent = count; badge.style.display = count > 0 ? 'flex' : 'none'; }
        if (bell)  { bell.style.color = count > 0 ? '#6366f1' : '#94a3b8'; }
    }

    const TYPE_META = {
        meeting:  { icon: '📅', bg: '#eff6ff', border: '#bfdbfe', color: '#1e40af', label: 'Meeting', viewId: 'dashboard-view' },
        event:    { icon: '🎉', bg: '#faf5ff', border: '#e9d5ff', color: '#7c3aed', label: 'Event', viewId: 'event-scheduler-view' },
        alert:    { icon: '⚠️',  bg: '#fef2f2', border: '#fecaca', color: '#dc2626', label: 'Alert', viewId: 'dashboard-view' },
        info:     { icon: '💡', bg: '#f0fdf4', border: '#bbf7d0', color: '#15803d', label: 'Info', viewId: 'research-projects-view' },
        fee:      { icon: '💳', bg: '#fff7ed', border: '#fed7aa', color: '#c2410c', label: 'Fee', viewId: 'fee-compliance-view' },
        marks:    { icon: '📊', bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8', label: 'Marks', viewId: 'attendance-view' },
        leave:    { icon: '🗓️', bg: '#f0fdf4', border: '#bbf7d0', color: '#166534', label: 'Leave', viewId: 'leave-management-view' },
        default:  { icon: '🔔', bg: '#f8fafc', border: '#e2e8f0', color: '#475569', label: 'Notice', viewId: 'dashboard-view' }
    };

    function getMeta(type) { return TYPE_META[type] || TYPE_META.default; }

    function renderPanel() {
        const user = window.Auth?.getUser?.();
        if (!user) return;
        const panel = document.getElementById('notif-panel');
        if (!panel) return;
        if (panel.style.display === 'block') { panel.style.display = 'none'; return; }
        const bcItems = getUnreadBC(user.role).map(b => ({ ...b, isBroadcast: true }));
        const personal = forUser(user.user_id);
        markRead(user.user_id);
        markBCRead(user.role);
        updateBell();
        const notifs = [...bcItems, ...personal];
        panel.style.display = 'block';
        const totalCount = notifs.length;
        panel.innerHTML = `
            <div style="padding:14px 16px;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;background:#fff;z-index:1;">
                <div style="font-size:14px;font-weight:700;color:#0f172a;">🔔 Notifications ${totalCount > 0 ? `<span style="font-size:11px;background:#6366f1;color:#fff;padding:2px 7px;border-radius:10px;margin-left:4px;">${totalCount}</span>` : ''}</div>
                <button onclick="window.Notifications.clearAll()" style="font-size:11px;color:#6366f1;background:none;border:none;cursor:pointer;font-weight:600;">Clear all</button>
            </div>
            ${notifs.length === 0
                ? `<div style="padding:40px 16px;text-align:center;"><div style="font-size:40px;margin-bottom:8px;">🎉</div><div style="font-size:14px;font-weight:600;color:#0f172a;">You're all caught up!</div><div style="font-size:12px;color:#94a3b8;margin-top:4px;">No new notifications</div></div>`
                : notifs.map(n => {
                    const m = getMeta(n.type);
                    const navView = n.viewId || m.viewId || 'dashboard-view';
                    return `<div onclick="window.switchView('${navView}'); document.getElementById('notif-panel').style.display='none';" style="padding:12px 16px;border-bottom:1px solid #f8fafc;display:flex;gap:12px;align-items:flex-start;background:${n.isBroadcast ? '#fafafa' : '#fff'};cursor:pointer;transition:background .15s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='${n.isBroadcast ? '#fafafa' : '#fff'}'">
                        <div style="width:36px;height:36px;border-radius:10px;background:${m.bg};border:1px solid ${m.border};display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">${m.icon}</div>
                        <div style="flex:1;min-width:0;">
                            <div style="font-size:13px;font-weight:600;color:#0f172a;line-height:1.4;">${n.message}</div>
                            <div style="display:flex;gap:8px;align-items:center;margin-top:4px;flex-wrap:wrap;">
                                <span style="font-size:10px;padding:2px 7px;border-radius:10px;background:${m.bg};color:${m.color};font-weight:700;">${m.label}</span>
                                <span style="font-size:11px;color:#94a3b8;">${n.from} &middot; ${n.time}</span>
                                ${n.isBroadcast ? '<span style="font-size:10px;padding:2px 7px;border-radius:10px;background:#eff6ff;color:#1d4ed8;font-weight:600;">Broadcast</span>' : ''}
                            </div>
                        </div>
                    </div>`;
                }).join('')
            }`;
    }

    function clearAll() {
        const user = window.Auth?.getUser?.();
        if (!user) return;
        save([]);
        const readKey = `bp_bc_read_${user.role}`;
        const ids = getBC().filter(b => b.forRole === 'all' || b.forRole === user.role).map(b => b.id);
        localStorage.setItem(readKey, JSON.stringify(ids));
        updateBell();
        const panel = document.getElementById('notif-panel');
        if (panel) panel.innerHTML = `<div style="padding:40px 16px;text-align:center;"><div style="font-size:40px;">&#x1F389;</div><div style="font-size:14px;font-weight:600;color:#0f172a;margin-top:8px;">All cleared!</div></div>`;
    }

    function injectBell() {
        const header = document.getElementById('top-header-bar') || document.querySelector('.top-header-bar');
        if (!header || document.getElementById('notif-bell')) return;
        const wrap = document.createElement('div');
        wrap.style.cssText = 'position:relative;display:inline-flex;align-items:center;margin-left:auto;flex-shrink:0;';
        wrap.innerHTML = `
            <button id="notif-bell" onclick="window.Notifications.renderPanel()" title="Notifications"
                style="background:none;border:none;cursor:pointer;padding:8px 10px;border-radius:10px;position:relative;color:#94a3b8;transition:color .2s,background .2s;"
                onmouseover="this.style.background='#f1f5f9';this.style.color='#6366f1'" onmouseout="this.style.background='none';this.style.color='#94a3b8'">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                <span id="notif-badge" style="display:none;position:absolute;top:2px;right:2px;background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;font-size:10px;font-weight:800;min-width:18px;height:18px;border-radius:9px;align-items:center;justify-content:center;padding:0 4px;border:2px solid #fff;">0</span>
            </button>
            <div id="notif-panel" style="display:none;position:absolute;top:48px;right:0;width:360px;background:#fff;border:1px solid #e2e8f0;border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,.15);z-index:9999;max-height:480px;overflow-y:auto;"></div>`;
        if (!header.id) header.id = 'top-header-bar';
        header.style.display = 'flex';
        header.style.alignItems = 'center';
        header.appendChild(wrap);
        document.addEventListener('click', e => {
            if (!wrap.contains(e.target)) {
                const p = document.getElementById('notif-panel');
                if (p) p.style.display = 'none';
            }
        }, true);
        updateBell();
    }

    return { send, broadcast, broadcastAll, renderPanel, clearAll, updateBell, injectBell, forUser };
})();


// Faculty: Send Alert to student (stores real notification)
window.sendStudentAlert = function(studentId, studentName, facultyName) {
    window.Notifications.send(studentId, facultyName || 'Your Faculty', `\u26A0 You have been flagged for early intervention. Please meet your faculty.`, 'alert');
    showToast(`Alert sent to ${studentName}!`, 'success');
};

// ── Student: Upcoming Meetings ────────────────────────────────────────────────
window.renderStudentMeetings = async function() {
    const card  = document.getElementById('upcoming-meetings-card');
    const list  = document.getElementById('upcoming-meetings-list');
    const count = document.getElementById('meetings-count');
    if (!card || !list) return;
    try {
        const meetings = await api('/meetings').catch(() => []);
        if (!meetings || !meetings.length) { card.style.display = 'none'; return; }
        const today = new Date().toISOString().split('T')[0];
        const upcoming = meetings.filter(m => m.date >= today);
        if (!upcoming.length) { card.style.display = 'none'; return; }
        card.style.display = 'block';
        if (count) count.textContent = `${upcoming.length} Scheduled`;
        list.innerHTML = upcoming.map(m => {
            const modeLabel = m.mode === 'online' ? '\ud83c\udf10 Online (Google Meet)' : '\ud83c\udfe2 In-Person (Faculty Cabin)';
            const modeColor = m.mode === 'online' ? '#1e40af' : '#065f46';
            const modeBg    = m.mode === 'online' ? '#eff6ff' : '#f0fdf4';
            return `<div style="padding:14px;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:10px;background:#fff;">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
                    <div>
                        <div style="font-weight:700;font-size:14px;color:#0f172a;">Meeting with ${m.faculty_name || 'Faculty'}</div>
                        <div style="font-size:13px;color:#64748b;margin-top:3px;">\ud83d\uddd3 ${m.date} &nbsp;\u00b7&nbsp; \u23f0 ${m.time||'TBD'}</div>
                        <div style="margin-top:5px;font-size:12px;padding:3px 8px;background:${modeBg};color:${modeColor};border-radius:6px;display:inline-block;font-weight:600;">${modeLabel}</div>
                    </div>
                    <span style="padding:4px 10px;background:#eff6ff;color:#3730a3;border-radius:20px;font-size:11px;font-weight:700;white-space:nowrap;">UPCOMING</span>
                </div>
                ${m.agenda ? `<div style="margin-top:10px;padding:10px;background:#f8fafc;border-radius:6px;font-size:13px;color:#374151;"><strong>Agenda:</strong> ${m.agenda}</div>` : ''}
            </div>`;
        }).join('');
    } catch(e) { if (card) card.style.display = 'none'; }
};

// ── Faculty: Assign BTP Project to Student ────────────────────────────────────
window.openAssignBTPModal = async function() {
    const studentSel = document.getElementById('btpStudentSel');
    const titleEl    = document.getElementById('btpTitle');
    const abstractEl = document.getElementById('btpAbstract');
    if (titleEl)    titleEl.value    = '';
    if (abstractEl) abstractEl.value = '';
    if (titleEl)    titleEl.style.borderColor = '';
    if (studentSel) {
        studentSel.innerHTML = '<option value="">Loading students\u2026</option>';
        studentSel.style.borderColor = '';
        try {
            const allUsers = await api('/admin/users');
            const students = (allUsers||[]).filter(u => u.role === 'student');
            if (!students.length) {
                studentSel.innerHTML = '<option value="">No students found in the system</option>';
            } else {
                studentSel.innerHTML = '<option value="">\u2014 Select Student \u2014</option>' +
                    students.map(s => `<option value="${s.user_id}">${s.first_name||s.username||''} ${s.last_name||''} (${s.user_id})</option>`).join('');
            }
        } catch(e) {
            studentSel.innerHTML = '<option value="">Error loading students \u2014 is server running?</option>';
            console.error('openAssignBTPModal:', e);
        }
    }
    openModal('assignBTPModal');
};

window.submitAssignBTP = async function() {
    const student_id = document.getElementById('btpStudentSel')?.value;
    const title      = document.getElementById('btpTitle')?.value.trim();
    const abstract   = document.getElementById('btpAbstract')?.value.trim();
    // Inline validation
    const studentSel = document.getElementById('btpStudentSel');
    const titleEl    = document.getElementById('btpTitle');
    if (studentSel) studentSel.style.borderColor = '';
    if (titleEl)    titleEl.style.borderColor    = '';
    let valid = true;
    if (!student_id) {
        if (studentSel) studentSel.style.borderColor = '#ef4444';
        showToast('Please select a student to assign this BTP project', 'warning'); valid = false;
    }
    if (!title || title.length < 3) {
        if (titleEl) titleEl.style.borderColor = '#ef4444';
        showToast('Project title must be at least 3 characters', 'warning'); valid = false;
    }
    if (!valid) return;
    try {
        await api('/research', { method:'POST', body: JSON.stringify({ student_id, title, abstract: abstract || '', status: 'active', progress: 0 }) });
        const user = window.Auth?.getUser?.();
        const from = user ? (user.first_name || 'Faculty') : 'Faculty';
        window.Notifications?.send(student_id, from,
            `📚 BTP Project Assigned: "${title}". Open your Research Projects section to view details and submit your work.`, 'info');
        showToast('BTP Project assigned to student! Student has been notified. ✅', 'success');
        closeModal('assignBTPModal');
        document.getElementById('assignBTPForm')?.reset();
        renderFacultyResearch();
    } catch(e) {
        console.error('submitAssignBTP error:', e);
        showToast('Failed to assign BTP: ' + e.message, 'error');
    }
};

// ── Faculty: Enroll Student in Course ─────────────────────────────────────────
window.openEnrollStudentModal = async function() {
    const studentSel = document.getElementById('enrollStudentSel');
    const courseSel  = document.getElementById('enrollCourseSel');
    if (studentSel) {
        studentSel.innerHTML = '<option value="">Loading…</option>';
        try {
            const allUsers = await api('/admin/users');
            const students = (allUsers||[]).filter(u => u.role === 'student');
            studentSel.innerHTML = '<option value="">— Select Student —</option>' +
                students.map(s => `<option value="${s.user_id}">${s.first_name||s.username||''} ${s.last_name||''} (${s.user_id})</option>`).join('');
        } catch(e) { studentSel.innerHTML = '<option value="">Error loading students</option>'; }
    }
    if (courseSel) {
        courseSel.innerHTML = '<option value="">Loading…</option>';
        try {
            const courses = await api('/faculty/me/courses');
            courseSel.innerHTML = '<option value="">— Select Course —</option>' +
                courses.map(c => `<option value="${c.course_id}">${c.course_code} – ${c.course_name}</option>`).join('');
        } catch(e) { courseSel.innerHTML = '<option value="">Error loading</option>'; }
    }
    openModal('enrollStudentModal');
};

window.submitEnrollStudent = async function() {
    const student_id = document.getElementById('enrollStudentSel')?.value;
    const course_id  = document.getElementById('enrollCourseSel')?.value;
    const studentSel = document.getElementById('enrollStudentSel');
    const courseSel  = document.getElementById('enrollCourseSel');
    if (studentSel) studentSel.style.borderColor = '';
    if (courseSel)  courseSel.style.borderColor  = '';
    let valid = true;
    if (!student_id) { if (studentSel) studentSel.style.borderColor = '#ef4444'; showToast('Please select a student', 'warning'); valid = false; }
    if (!course_id)  { if (courseSel)  courseSel.style.borderColor  = '#ef4444'; showToast('Please select a course', 'warning');  valid = false; }
    if (!valid) return;
    try {
        await api('/enrollment', { method:'POST', body: JSON.stringify({ student_id, course_id }) });
        const user = window.Auth?.getUser?.();
        const from = user ? (user.first_name || 'Faculty') : 'Faculty';
        window.Notifications?.send(student_id, from, `📖 You have been enrolled in a new course by ${from}. Check your "My Courses" section for details.`, 'info');
        showToast('Student enrolled successfully! Student has been notified. ✅', 'success');
        closeModal('enrollStudentModal');
    } catch(e) {
        if (e.message && e.message.toLowerCase().includes('already')) {
            showToast('⚠ Student is already enrolled in this course', 'warning');
        } else {
            showToast('Failed: ' + e.message, 'error');
        }
    }
};

// ── Forgot Password Flow ───────────────────────────────────────────────────────
window.showForgotPassword = function() {
    openModal('forgotPasswordModal');
    document.getElementById('fpEmail').value = '';
    document.getElementById('fpStep1').style.display = 'block';
    document.getElementById('fpStep2').style.display = 'none';
    document.getElementById('fpStep3').style.display = 'none';
    window._fpCode = null;
    window._fpEmail = null;
};

window.sendForgotPasswordCode = function() {
    const email = document.getElementById('fpEmail')?.value.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showToast('Enter a valid email address', 'warning'); return; }
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    window._fpCode  = code;
    window._fpEmail = email;
    document.getElementById('fpStep1').style.display = 'none';
    document.getElementById('fpStep2').style.display = 'block';
    document.getElementById('fpCodeDisplay').textContent = code;
    showToast('Verification code generated (shown below for demo)', 'success');
};

window.verifyForgotCode = function() {
    const entered = document.getElementById('fpCodeInput')?.value.trim();
    if (entered !== window._fpCode) { showToast('Invalid verification code', 'error'); return; }
    document.getElementById('fpStep2').style.display = 'none';
    document.getElementById('fpStep3').style.display = 'block';
};

window.submitNewPassword = async function() {
    const newPass  = document.getElementById('fpNewPass')?.value;
    const confPass = document.getElementById('fpConfPass')?.value;
    if (!newPass || newPass.length < 6) { showToast('Password must be at least 6 characters', 'warning'); return; }
    if (newPass !== confPass)           { showToast('Passwords do not match', 'warning'); return; }
    try {
        await fetch(`${window.Auth ? (window.Auth.API_BASE || 'http://localhost:5001/api') : 'http://localhost:5001/api'}/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: window._fpEmail, new_password: newPass })
        });
        showToast('Password reset successfully! Please log in. ✅', 'success');
        closeModal('forgotPasswordModal');
        window._fpCode = null; window._fpEmail = null;
    } catch(e) { showToast('Reset failed. Please try again.', 'error'); }
};

// ── Faculty: Render Research with full BTP management ─────────────────────────
window.renderFacultyResearchEnhanced = async function() {
    const el = document.getElementById('f-research-projects-body');
    if (!el) return;
    try {
        const projects = await api('/research');
        let html = `<div style="display:flex;gap:10px;justify-content:flex-end;margin-bottom:16px;flex-wrap:wrap;">
            <button onclick="openAssignBTPModal()" style="padding:10px 18px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:700;">📚 Assign BTP to Student</button>
        </div>`;
        if (!projects.length) {
            html += '<div style="padding:40px;text-align:center;color:#64748b;"><div style="font-size:40px;">&#x1F4CB;</div><div style="font-size:15px;font-weight:600;margin-top:8px;">No BTP projects yet</div><div style="font-size:13px;color:#94a3b8;margin-top:4px;">Assign a project to a student to get started.</div></div>';
        } else {
            html += projects.map(p => {
                const stuNames = (p.students||[]).map(s => `${s.first_name||''} ${s.last_name||''}`.trim()).join(', ') || p.student_name || p.student_id || 'N/A';
                return `<div style="padding:18px;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:14px;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.05);">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
                        <div style="flex:1;">
                            <h4 style="margin:0;font-size:15px;font-weight:700;color:#0f172a;">${p.title}</h4>
                            <div style="font-size:12px;color:#6366f1;font-weight:600;margin-top:3px;">\ud83d\udc64 Student: ${stuNames}</div>
                        </div>
                        <span style="padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;background:${p.status==='active'?'#dcfce7':'#f1f5f9'};color:${p.status==='active'?'#166534':'#475569'};margin-left:8px;">${p.status}</span>
                    </div>
                    <p style="font-size:12px;color:#64748b;margin:0 0 10px;">${p.abstract||'No abstract provided.'}</p>
                    <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
                        <span style="font-size:12px;color:#475569;white-space:nowrap;">Progress: <strong>${p.progress||0}%</strong></span>
                        <div style="flex:1;height:8px;background:#e2e8f0;border-radius:4px;overflow:hidden;">
                            <div style="height:100%;background:linear-gradient(90deg,#6366f1,#8b5cf6);width:${p.progress||0}%;transition:width .4s;"></div>
                        </div>
                    </div>
                    ${p.submission_notes
                        ? `<div style="padding:10px 12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;font-size:12px;color:#15803d;margin-bottom:10px;"><strong>📤 Student Work Submitted:</strong><br>${p.submission_notes}</div>`
                        : `<div style="padding:10px 12px;background:#fef9c3;border:1px solid #fde68a;border-radius:8px;font-size:12px;color:#92400e;margin-bottom:10px;">⏳ Awaiting student work submission</div>`
                    }
                    <button class="fac-btp-update-btn" data-id="${p.project_id}" data-progress="${p.progress||0}" data-title="${(p.title||'').replace(/"/g,'&quot;')}" data-student="${p.student_id||''}" style="padding:8px 16px;background:#0f172a;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600;">✏ Update Progress / Feedback</button>
                </div>`;
            }).join('');
        }
        el.innerHTML = html;
        el.querySelectorAll('.fac-btp-update-btn').forEach((btn, i) => {
            btn.addEventListener('click', () => {
                openFacultyBTPModal(btn.dataset.id, btn.dataset.progress, btn.dataset.title, btn.dataset.student);
            });
        });
    } catch(e) { el.innerHTML = `<p style="color:#ef4444">Failed: ${e.message}</p>`; }
};

window.openFacultyBTPModal = function(projectId, progress, title, studentId) {
    const el = (id) => document.getElementById(id);
    if (el('facBTPId'))       el('facBTPId').value = projectId;
    if (el('facBTPProgress')) el('facBTPProgress').value = progress;
    if (el('facBTPFeedback')) el('facBTPFeedback').value = '';
    if (el('facBTPStudentId')) el('facBTPStudentId').value = studentId || '';
    if (el('facBTPTitle'))    el('facBTPTitle').textContent = title || 'Project';
    openModal('facultyBTPModal');
};

window.submitFacultyBTPProgress = async function() {
    const id       = document.getElementById('facBTPId')?.value;
    const progress = document.getElementById('facBTPProgress')?.value;
    const feedback = document.getElementById('facBTPFeedback')?.value.trim();
    const studentId = document.getElementById('facBTPStudentId')?.value;
    if (!id) return;
    if (progress === '' || Number(progress) < 0 || Number(progress) > 100) {
        showToast('Progress must be between 0 and 100', 'warning'); return;
    }
    if (!feedback || feedback.trim().length < 5) {
        const fbEl = document.getElementById('facBTPFeedback');
        if (fbEl) { fbEl.style.borderColor = '#ef4444'; fbEl.style.background = '#fff1f2'; }
        showToast('Please enter feedback for the student (at least 5 characters)', 'warning');
        return;
    }
    try {
        await api(`/research/${id}/progress`, { method:'PATCH', body: JSON.stringify({ progress: Number(progress), faculty_feedback: feedback }) });
        const user = window.Auth?.getUser?.();
        const from = user ? (user.first_name || 'Faculty') : 'Faculty';
        if (studentId) {
            window.Notifications?.send(studentId, from,
                `📊 BTP Progress updated to ${progress}%.${feedback ? ' Feedback: ' + feedback : ''}`, 'info');
        }
        showToast('BTP progress updated! Student notified. ✅', 'success');
        closeModal('facultyBTPModal');
        renderFacultyResearch();
    } catch(e) { showToast('Failed: ' + e.message, 'error'); }
};

// Override the original renderFacultyResearch with enhanced version
window.renderFacultyResearch = window.renderFacultyResearchEnhanced;

// ── Form Validator ────────────────────────────────────────────────────────────
window.Validator = {
    // Show/clear field error
    setError(fieldId, msg) {
        const el = document.getElementById(fieldId);
        if (!el) return;
        el.style.borderColor = msg ? '#ef4444' : '';
        el.style.background  = msg ? '#fff1f2' : '';
        let err = el.parentNode.querySelector('.field-error');
        if (!err) { err = document.createElement('div'); err.className = 'field-error'; err.style.cssText = 'font-size:11px;color:#ef4444;margin-top:3px;'; el.parentNode.appendChild(err); }
        err.textContent = msg || '';
        err.style.display = msg ? 'block' : 'none';
    },
    clearAll(formId) {
        const form = document.getElementById(formId);
        if (!form) return;
        form.querySelectorAll('.field-error').forEach(e => e.remove());
        form.querySelectorAll('input, select, textarea').forEach(e => { e.style.borderColor = ''; e.style.background = ''; });
    },
    // Validate signup form — returns true if valid
    handleRegistration(form) {
        const fn  = document.getElementById('firstName')?.value.trim();
        const ln  = document.getElementById('lastName')?.value.trim();
        const em  = document.getElementById('email')?.value.trim();
        const pw  = document.getElementById('password')?.value;
        let ok = true;
        if (!fn)             { this.setError('firstName', 'First name is required'); ok = false; } else this.setError('firstName', '');
        if (!ln)             { this.setError('lastName',  'Last name is required');  ok = false; } else this.setError('lastName', '');
        if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { this.setError('email', 'Enter a valid email'); ok = false; } else this.setError('email', '');
        if (!pw || pw.length < 6) { this.setError('password', 'Minimum 6 characters'); ok = false; } else this.setError('password', '');
        if (ok) handleSignup({ preventDefault: () => {} });
    },
    // Validate leave application
    validateLeave(typeId, startId, endId, reasonId) {
        const type   = document.getElementById(typeId)?.value;
        const start  = document.getElementById(startId)?.value;
        const end    = document.getElementById(endId)?.value;
        const reason = document.getElementById(reasonId)?.value.trim();
        let ok = true;
        if (!type)   { showToast('Please select a leave type', 'warning'); ok = false; }
        else if (!start) { showToast('Start date is required', 'warning'); ok = false; }
        else if (!end)   { showToast('End date is required', 'warning'); ok = false; }
        else if (end < start) { showToast('End date cannot be before start date', 'warning'); ok = false; }
        else if (!reason)    { showToast('Please provide a reason', 'warning'); ok = false; }
        return ok;
    },
    // Validate meeting form
    validateMeeting() {
        const date = document.getElementById('meetingDate')?.value;
        const mode = document.getElementById('meetingMode')?.value;
        if (!date) { showToast('Please select a meeting date', 'warning'); return false; }
        if (!mode) { showToast('Please select a meeting type', 'warning'); return false; }
        return true;
    }
};

// ── Syllabus Completion Tracker (Student Dashboard) ──────────────────────────
window.renderSyllabusTracker = async function() {
    const el = document.getElementById('syllabus-tracker-body');
    if (!el) return;
    try {
        const student = await api('/students/me').catch(() => null);
        const section = student?.section || 'A';
        const progress = await api(`/syllabus-progress?section=${section}`);
        if (!progress.length) { el.innerHTML = '<p style="color:#64748b;text-align:center;">No syllabus data for your section.</p>'; return; }
        const overall = Math.round(progress.reduce((s, p) => s + (p.progress||0), 0) / progress.length);
        const overallColor = overall >= 75 ? '#16a34a' : overall >= 50 ? '#d97706' : '#ef4444';
        let html = `<div style="margin-bottom:18px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <span style="font-weight:700;font-size:15px;color:#0f172a;">Overall Completion</span>
                <span style="font-size:22px;font-weight:800;color:${overallColor};">${overall}%</span>
            </div>
            <div style="height:12px;background:#e2e8f0;border-radius:6px;overflow:hidden;">
                <div style="height:100%;background:${overallColor};width:${overall}%;border-radius:6px;transition:width .4s;"></div>
            </div>
            <div style="font-size:12px;color:#64748b;margin-top:6px;">Based on ${progress.length} course(s) in Section ${section}</div>
        </div>
        <div style="font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;">Click a course to see module breakdown</div>`;
        progress.forEach((p, i) => {
            const pct = p.progress || 0;
            const color = pct >= 75 ? '#16a34a' : pct >= 50 ? '#d97706' : '#ef4444';
            const modules = p.modules || [];
            let moduleHtml = '';
            if (modules.length) {
                moduleHtml = modules.map((m, mi) => {
                    const mp = m.progress || 0;
                    const mc = mp >= 75 ? '#16a34a' : mp >= 50 ? '#d97706' : '#ef4444';
                    return `<div style="padding:8px 12px;background:#f8fafc;border-radius:6px;margin-bottom:4px;">
                        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;">
                            <span style="font-weight:600;">${m.name || ('Module ' + (mi+1))}</span>
                            <span style="font-weight:700;color:${mc};">${mp}%</span>
                        </div>
                        <div style="height:5px;background:#e2e8f0;border-radius:3px;overflow:hidden;">
                            <div style="height:100%;background:${mc};width:${mp}%;"></div>
                        </div>
                    </div>`;
                }).join('');
            } else {
                moduleHtml = `<div style="padding:8px 12px;font-size:12px;color:#94a3b8;">No module breakdown available. Overall: <strong>${pct}%</strong></div>`;
            }
            html += `<div style="border:1px solid #e2e8f0;border-radius:10px;margin-bottom:8px;overflow:hidden;">
                <div onclick="var d=this.nextElementSibling;d.style.display=d.style.display==='none'?'block':'none';this.querySelector('.syl-chev').style.transform=d.style.display==='block'?'rotate(90deg)':'rotate(0deg)';"
                    style="padding:12px 14px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;background:#fff;transition:background .15s;"
                    onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='#fff'">
                    <div>
                        <span style="font-weight:700;font-size:13px;">${p.course_code || ''}</span>
                        <span style="font-size:12px;color:#64748b;margin-left:6px;">${p.course_name || ''}</span>
                    </div>
                    <div style="display:flex;align-items:center;gap:10px;">
                        <span style="font-weight:700;color:${color};">${pct}%</span>
                        <span class="syl-chev" style="font-size:14px;color:#94a3b8;transition:transform .2s;display:inline-block;">&rsaquo;</span>
                    </div>
                </div>
                <div style="display:none;padding:10px 14px;background:#fafafa;border-top:1px solid #f1f5f9;">
                    ${moduleHtml}
                </div>
            </div>`;
        });
        el.innerHTML = html;
    } catch(e) { el.innerHTML = `<p style="color:#ef4444">Failed: ${e.message}</p>`; }
};

// ── Faculty: Syllabus Update ─────────────────────────────────────────────────
window.renderFacultySyllabusManager = async function() {
    const el = document.getElementById('faculty-syllabus-body');
    if (!el) return;
    try {
        const [courses, allProgress] = await Promise.all([api('/faculty/me/courses'), api('/syllabus-progress')]);
        const sections = ['A','B'];
        let html = '<div style="font-size:13px;color:#64748b;margin-bottom:12px;">Update syllabus completion % per course and section</div>';
        courses.forEach(c => {
            html += `<div style="padding:12px;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:10px;"><div style="font-weight:700;font-size:14px;margin-bottom:8px;">${c.course_code} – ${c.course_name}</div>`;
            sections.forEach(sec => {
                const sp = allProgress.find(p => p.course_id === c.course_id && p.section === sec);
                const val = sp ? sp.progress : 0;
                html += `<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;"><span style="font-size:12px;font-weight:600;width:70px;">Sec ${sec}:</span><input type="range" min="0" max="100" value="${val}" id="syl_${c.course_id}_${sec}" style="flex:1;" oninput="document.getElementById('sylLbl_${c.course_id}_${sec}').textContent=this.value+'%'"><span id="sylLbl_${c.course_id}_${sec}" style="font-size:13px;font-weight:700;width:40px;">${val}%</span><button onclick="updateSyllabus('${c.course_id}','${sec}')" style="padding:4px 10px;font-size:11px;background:#6366f1;color:#fff;border:none;border-radius:6px;cursor:pointer;">Save</button></div>`;
            });
            html += '</div>';
        });
        el.innerHTML = html;
    } catch(e) { el.innerHTML = `<p style="color:#ef4444">Failed: ${e.message}</p>`; }
};
window.updateSyllabus = async function(courseId, section) {
    const val = document.getElementById(`syl_${courseId}_${section}`)?.value;
    try {
        await api('/syllabus-progress', { method:'PATCH', body: JSON.stringify({ course_id: courseId, section, progress: Number(val) }) });
        showToast(`Syllabus updated: Section ${section} → ${val}%`, 'success');
    } catch(e) { showToast('Failed: ' + e.message, 'error'); }
};

// ── Student: Attendance Request ──────────────────────────────────────────────
window.openAttendanceRequestModal = async function() {
    const sel = document.getElementById('attReqCourse');
    if (sel) {
        try { const courses = await api('/students/me/courses'); sel.innerHTML = '<option value="">Select course</option>' + courses.map(c => `<option value="${c.course_id}">${c.course_code} – ${c.course_name}</option>`).join(''); } catch { sel.innerHTML = '<option>Error</option>'; }
    }
    // Allow student to pick any date (past or present) for the request
    const dateEl = document.getElementById('attReqDate');
    if (dateEl) {
        dateEl.readOnly = false;
        dateEl.max = new Date().toISOString().split('T')[0]; // can't request future attendance
        dateEl.value = new Date().toISOString().split('T')[0];
    }
    // Reset file input
    const fi = document.getElementById('attReqFile');
    if (fi) fi.value = '';
    const fn = document.getElementById('attReqFileName');
    if (fn) fn.textContent = 'No file chosen';
    openModal('attendanceRequestModal');
};
window.submitAttendanceRequest = async function() {
    const course_id = document.getElementById('attReqCourse')?.value;
    const date      = document.getElementById('attReqDate')?.value;
    const reason    = document.getElementById('attReqReason')?.value?.trim();
    const fileInput = document.getElementById('attReqFile');
    const file      = fileInput?.files?.[0];

    // Full validation — all fields required
    if (!course_id)             { showToast('Please select a course', 'warning'); return; }
    if (!date)                  { showToast('Please select a date', 'warning'); return; }
    if (!reason || reason.length < 10) { showToast('Reason must be at least 10 characters', 'warning'); return; }
    if (!file)                  { showToast('Please attach a supporting document (e.g. medical certificate)', 'warning'); return; }
    if (file.size > 5 * 1024 * 1024) { showToast('File must be under 5MB', 'warning'); return; }

    const fileNote = ` [Document: ${file.name}]`;
    try {
        await api('/attendance-request', { method:'POST', body: JSON.stringify({ course_id, date, reason: reason + fileNote }) });
        window.Notifications?.broadcast('admin', 'Student', `📝 Attendance request from a student for ${date}. Document attached: ${file.name}. Please review.`, 'alert');
        showToast('Attendance request submitted with document! Admin will review.', 'success');
        closeModal('attendanceRequestModal');
    } catch(e) { showToast('Failed: ' + e.message, 'error'); }
};

// ── Admin: Attendance Request Review ─────────────────────────────────────────
window.renderAdminAttendanceRequests = async function() {
    const el = document.getElementById('admin-att-requests-body');
    if (!el) return;
    try {
        const reqs = await api('/attendance-requests');
        if (!reqs.length) { el.innerHTML = '<p style="color:#64748b;text-align:center;">No attendance requests.</p>'; return; }
        el.innerHTML = reqs.map(r => {
            const sc = r.admin_status === 'approved' ? {bg:'#dcfce7',c:'#166534',lbl:'Approved'} : r.admin_status === 'rejected' ? {bg:'#fef2f2',c:'#991b1b',lbl:'Rejected'} : {bg:'#fef9c3',c:'#92400e',lbl:'Pending'};
            return `<div style="padding:12px;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                <div><div style="font-weight:600;">${r.student_name} <span style="color:#64748b;font-size:12px;">(${r.course_code})</span></div><div style="font-size:12px;color:#64748b;">Date: ${r.date} · Reason: ${r.reason}</div></div>
                <div style="display:flex;gap:6px;align-items:center;">
                    <span style="padding:4px 10px;border-radius:12px;font-size:11px;font-weight:700;background:${sc.bg};color:${sc.c};">${sc.lbl}</span>
                    ${r.admin_status === 'pending' ? `<button onclick="approveAttReq('${r.request_id}','${r.student_id}','approved')" style="padding:5px 12px;background:#16a34a;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:11px;font-weight:700;">✓ Approve</button><button onclick="approveAttReq('${r.request_id}','${r.student_id}','rejected')" style="padding:5px 12px;background:#ef4444;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:11px;font-weight:700;">✕ Reject</button>` : ''}
                </div></div>`;
        }).join('');
    } catch(e) { el.innerHTML = `<p style="color:#ef4444">Failed: ${e.message}</p>`; }
};
window.approveAttReq = async function(id, studentId, status) {
    try {
        await api(`/attendance-request/${id}`, { method:'PATCH', body: JSON.stringify({ status }) });
        const user = window.Auth?.getUser?.();
        const from = user ? (user.first_name || 'Admin') : 'Admin';
        window.Notifications?.send(studentId, from, status === 'approved' ? '✅ Your attendance request has been APPROVED. Faculty can now mark your attendance.' : '❌ Your attendance request was REJECTED.', status === 'approved' ? 'info' : 'alert');
        window.Notifications?.broadcast('faculty', from, `📝 Attendance request ${status} for student. ${status === 'approved' ? 'You can now grant attendance.' : ''}`, 'info');
        window.Notifications?.broadcast('head', from, `📝 Attendance request ${status} for student.`, 'info');
        showToast(`Request ${status}! Student & Faculty notified.`, 'success');
        renderAdminAttendanceRequests();
    } catch(e) { showToast('Failed: ' + e.message, 'error'); }
};

// ── Faculty: View Attendance Requests ────────────────────────────────────────
window.renderFacultyAttendanceRequests = async function() {
    const el = document.getElementById('faculty-att-requests-body');
    if (!el) return;
    try {
        const reqs = await api('/attendance-requests');
        if (!reqs.length) { el.innerHTML = '<p style="color:#64748b;text-align:center;">No attendance requests for your courses.</p>'; return; }
        el.innerHTML = reqs.map(r => {
            const canGrant = r.admin_status === 'approved' && r.faculty_status !== 'granted';
            const rejected = r.admin_status === 'rejected';
            const granted = r.faculty_status === 'granted';
            return `<div style="padding:12px;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                <div><div style="font-weight:600;">${r.student_name} <span style="color:#64748b;font-size:12px;">(${r.course_code})</span></div><div style="font-size:12px;color:#64748b;">Date: ${r.date} · ${r.reason}</div></div>
                <div>${granted ? '<span style="padding:4px 10px;background:#dcfce7;color:#166534;border-radius:12px;font-size:11px;font-weight:700;">✓ Granted</span>' : rejected ? '<span style="padding:4px 10px;background:#fef2f2;color:#991b1b;border-radius:12px;font-size:11px;font-weight:700;">❌ Admin Rejected</span>' : canGrant ? `<button onclick="grantAttReq('${r.request_id}','${r.student_id}')" style="padding:6px 14px;background:#16a34a;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:12px;font-weight:700;">✓ Grant Attendance</button>` : '<span style="padding:4px 10px;background:#fef9c3;color:#92400e;border-radius:12px;font-size:11px;font-weight:700;">⏳ Awaiting Admin</span>'}</div></div>`;
        }).join('');
    } catch(e) { el.innerHTML = `<p style="color:#ef4444">Failed: ${e.message}</p>`; }
};
window.grantAttReq = async function(id, studentId) {
    try {
        await api(`/attendance-request/${id}/mark`, { method:'PATCH' });
        const user = window.Auth?.getUser?.();
        window.Notifications?.send(studentId, user?.first_name || 'Faculty', '✅ Your attendance has been granted by faculty!', 'info');
        showToast('Attendance granted! Student notified.', 'success');
        renderFacultyAttendanceRequests();
    } catch(e) { showToast('Failed: ' + e.message, 'error'); }
};

// ── Resource Booking Workflow ────────────────────────────────────────────────
window.openResourceBookingModal = async function() {
    const sel = document.getElementById('bookResourceSel');
    if (sel) { try { const res = await api('/resources'); sel.innerHTML = '<option value="">Select resource</option>' + res.map(r => `<option value="${r.resource_id}">${r.name} (${r.type})</option>`).join(''); } catch { sel.innerHTML = '<option>Error</option>'; } }
    const dateEl = document.getElementById('bookResourceDate');
    if (dateEl) dateEl.min = new Date().toISOString().split('T')[0];
    openModal('resourceBookingModal');
};
window.submitResourceBooking = async function() {
    const resource_id = document.getElementById('bookResourceSel')?.value;
    const date = document.getElementById('bookResourceDate')?.value;
    const purpose = document.getElementById('bookResourcePurpose')?.value?.trim();
    if (!resource_id || !date || !purpose) { showToast('All fields required', 'warning'); return; }
    try {
        await api('/resource-booking', { method:'POST', body: JSON.stringify({ resource_id, date, purpose }) });
        window.Notifications?.broadcast('admin', 'Faculty', `🏢 Resource booking request for ${date}. Please review.`, 'info');
        window.Notifications?.broadcast('head', 'Faculty', `🏢 Resource booking request for ${date}. Please review.`, 'info');
        showToast('Booking request submitted! Admin will review.', 'success');
        closeModal('resourceBookingModal');
    } catch(e) { showToast('Failed: ' + e.message, 'error'); }
};
window.renderAdminResourceBookings = async function() {
    const el = document.getElementById('admin-resource-bookings-body');
    if (!el) return;
    try {
        const bookings = await api('/resource-bookings');
        if (!bookings.length) { el.innerHTML = '<p style="color:#64748b;text-align:center;">No booking requests.</p>'; return; }
        el.innerHTML = bookings.map(b => {
            const sc = b.status === 'approved' ? {bg:'#dcfce7',c:'#166534'} : b.status === 'rejected' ? {bg:'#fef2f2',c:'#991b1b'} : {bg:'#fef9c3',c:'#92400e'};
            return `<div style="padding:12px;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                <div><div style="font-weight:600;">${b.resource_name}</div><div style="font-size:12px;color:#64748b;">By: ${b.requester_name} · ${b.date} · ${b.purpose}</div></div>
                <div style="display:flex;gap:6px;align-items:center;">
                    <span style="padding:4px 10px;border-radius:12px;font-size:11px;font-weight:700;background:${sc.bg};color:${sc.c};">${b.status}</span>
                    ${b.status === 'pending' ? `<button onclick="approveBooking('${b.booking_id}','${b.requested_by}','approved','${b.resource_name.replace(/'/g,'')}')" style="padding:5px 12px;background:#16a34a;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:11px;font-weight:700;">✓</button><button onclick="approveBooking('${b.booking_id}','${b.requested_by}','rejected','${b.resource_name.replace(/'/g,'')}')" style="padding:5px 12px;background:#ef4444;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:11px;font-weight:700;">✕</button>` : ''}
                </div></div>`;
        }).join('');
    } catch(e) { el.innerHTML = `<p style="color:#ef4444">Failed: ${e.message}</p>`; }
};
window.approveBooking = async function(id, userId, status, name) {
    try {
        await api(`/resource-booking/${id}`, { method:'PATCH', body: JSON.stringify({ status }) });
        const user = window.Auth?.getUser?.();
        const from = user?.first_name || user?.username || 'Admin';
        const role = user?.role || 'admin';
        window.Notifications?.send(userId, from, status === 'approved' ? `✅ Your booking for "${name}" has been APPROVED by ${from}.` : `❌ Your booking for "${name}" was REJECTED by ${from}.`, status === 'approved' ? 'info' : 'alert');
        // Cross-notify: if admin approved, notify head; if head approved, notify admin
        if (role === 'admin' || role === 'superadmin') {
            window.Notifications?.broadcast('head', from, `🏢 Resource "${name}" booking ${status} by ${from}.`, 'info');
        } else if (role === 'head') {
            window.Notifications?.broadcast('admin', from, `🏢 Resource "${name}" booking ${status} by ${from}.`, 'info');
        }
        showToast(`Booking ${status}! Faculty notified.`, 'success');
        renderAdminResourceBookings();
    } catch(e) { showToast('Failed: ' + e.message, 'error'); }
};

// ── Discussion Reply Notifications ───────────────────────────────────────────
const _origSubmitThreadReply = window.submitThreadReply || submitThreadReply;
window.submitThreadReplyWithNotif = async function() {
    const postId = document.getElementById('threadReplyPostId')?.value;
    const content = document.getElementById('threadReplyContent')?.value?.trim();
    if (!content) { showToast('Please write a reply', 'warning'); return; }
    try {
        await api(`/discussions/${postId}/replies`, { method:'POST', body: JSON.stringify({ content }) });
        // Notify original post author
        try {
            const post = await api(`/discussions/${postId}`);
            if (post.author_id) {
                const user = window.Auth?.getUser?.();
                const from = user ? (user.first_name || user.username || 'Someone') : 'Someone';
                window.Notifications?.send(post.author_id, from, `💬 ${from} replied to your discussion: "${post.title}"`, 'info');
            }
        } catch {}
        showToast('Reply posted! Author notified.', 'success');
        closeModal('threadDetailModal');
        renderDiscussions();
    } catch(e) { showToast('Failed: ' + e.message, 'error'); }
};

// ── Action Required Priority Widget ──────────────────────────────────────────
window.renderActionRequired = async function() {
    const el = document.getElementById('action-required-widget');
    if (!el) return;
    const user = window.Auth?.getUser?.();
    if (!user) return;
    const role = user.role;
    let items = [];
    try {
        if (['admin','head','superadmin'].includes(role)) {
            const [leaves, attReqs, bookings] = await Promise.all([api('/leave').catch(()=>[]), api('/attendance-requests').catch(()=>[]), api('/resource-bookings').catch(()=>[])]);
            const pendLeaves = leaves.filter(l => l.status === 'pending').length;
            const pendAtt = attReqs.filter(r => r.admin_status === 'pending').length;
            const pendBook = bookings.filter(b => b.status === 'pending').length;
            if (pendLeaves) items.push({ icon: '🗓️', text: `${pendLeaves} leave(s) pending approval`, view: 'leave-management-view' });
            if (pendAtt) items.push({ icon: '📝', text: `${pendAtt} attendance request(s) pending`, view: 'attendance-override-view' });
            if (pendBook) items.push({ icon: '🏢', text: `${pendBook} resource booking(s) pending`, view: 'resource-management-view' });
        } else if (role === 'faculty') {
            const [attReqs, research] = await Promise.all([api('/attendance-requests').catch(()=>[]), api('/research').catch(()=>[])]);
            const canGrant = attReqs.filter(r => r.admin_status === 'approved' && r.faculty_status !== 'granted').length;
            const pendBTP = research.filter(p => p.status === 'active' && (p.submission_notes||'').includes('[File:')).length;
            if (canGrant) items.push({ icon: '✅', text: `${canGrant} attendance request(s) to grant`, view: 'mark-attendance-view' });
            if (pendBTP) items.push({ icon: '📤', text: `${pendBTP} BTP submission(s) to review`, view: 'research-projects-view' });
        } else if (role === 'student') {
            // Fee info is shown in the notification bell only, not in action widget
        }
    } catch {}
    if (!items.length) { el.innerHTML = '<div style="text-align:center;padding:16px;color:#16a34a;font-weight:600;">✓ Nothing requires your attention</div>'; return; }
    el.innerHTML = items.map(i => `<div onclick="switchView('${i.view}')" style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:#fef9c3;border:1px solid #fde68a;border-radius:8px;margin-bottom:8px;cursor:pointer;transition:background .15s;" onmouseover="this.style.background='#fef3c7'" onmouseout="this.style.background='#fef9c3'"><span style="font-size:18px;">${i.icon}</span><span style="font-size:13px;font-weight:600;color:#92400e;">${i.text}</span></div>`).join('');
};

// ── Timetable Conflict Checker ───────────────────────────────────────────────
window.checkTimetableConflict = async function(day, time, resourceOrRoom) {
    try {
        const tt = await api('/timetable');
        const events = await api('/events').catch(() => []);
        let conflicts = [];
        if (tt.grid && tt.grid[day] && tt.grid[day][time]) {
            const slot = tt.grid[day][time];
            if (slot.room && resourceOrRoom && slot.room.toLowerCase() === resourceOrRoom.toLowerCase()) {
                conflicts.push(`Room "${slot.room}" is already booked for ${slot.course_code} on ${day} at ${time}`);
            }
        }
        return conflicts;
    } catch { return []; }
};

// ── Marks Lock UI (pre-load existing marks as read-only) ─────────────────────
const _origOpenMarksModal = window.openMarksModal;
window.openMarksModal = async function(assessmentId, maxMarks, name, examMode) {
    await _origOpenMarksModal(assessmentId, maxMarks, name, examMode);
    // After modal loads, check for locked marks and show them read-only
    setTimeout(async () => {
        try {
            const existingMarks = await api(`/marks?assessment_id=${assessmentId}`);
            if (existingMarks && existingMarks.length) {
                existingMarks.forEach(m => {
                    const inp = document.getElementById(`marks_${m.student_id}`);
                    if (inp) { inp.value = m.marks_obtained; inp.disabled = true; inp.style.background = '#f0fdf4'; inp.style.color = '#166534'; inp.title = 'Marks entered';
                        const badge = document.createElement('span'); badge.textContent = ' ✅ Entered'; badge.style.cssText = 'font-size:11px;margin-left:6px;color:#16a34a;font-weight:600;'; inp.parentNode?.appendChild(badge);
                    }
                });
            }
        } catch {}
    }, 500);
};

// ── Inject dynamic sections into dashboard views ─────────────────────────────
const _origDashRender = window.triggerViewRender || triggerViewRender;

document.addEventListener('DOMContentLoaded', () => {
    const views = document.querySelectorAll('.view-section');
    let hasActive = false;
    views.forEach(v => {
        if (v.classList.contains('active')) {
            v.style.display = 'block';
            hasActive = true;
        } else {
            v.style.display = 'none';
        }
    });
    if (!hasActive && views.length > 0) {
        views[0].classList.add('active');
        views[0].style.display = 'block';
    }
    // Inject notification bell on dashboard pages
    setTimeout(() => window.Notifications.injectBell(), 300);

    // Inject dynamic widget containers into dashboard views
    setTimeout(() => {
        const role = window.Auth?.getUser?.()?.role || '';
        // Action Required widget (admin/faculty only — student does not need it)
        const dashView = document.getElementById('dashboard-view');
        if (dashView && !document.getElementById('action-required-widget') && role !== 'student') {
            const w = document.createElement('div');
            w.innerHTML = `<div style="margin-bottom:20px;"><h3 style="font-size:15px;font-weight:700;margin-bottom:10px;">⚡ Action Required</h3><div id="action-required-widget"></div></div>`;
            dashView.insertBefore(w, dashView.firstChild?.nextSibling || null);
        }
        // Student: Syllabus Tracker + Attendance Request button
        if (role === 'student') {
            if (dashView && !document.getElementById('syllabus-tracker-body')) {
                const s = document.createElement('div');
                s.innerHTML = `<div style="margin-top:20px;padding:20px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;"><h3 style="margin:0 0 14px;font-size:15px;font-weight:700;">📚 Syllabus Completion (Your Section)</h3><div id="syllabus-tracker-body"></div></div>`;
                dashView.appendChild(s);
            }
            const attView = document.getElementById('attendance-view');
            if (attView && !document.getElementById('attReqBtn')) {
                const btn = document.createElement('button');
                btn.id = 'attReqBtn';
                btn.innerHTML = '📝 Request Attendance';
                btn.style.cssText = 'margin:12px 0;padding:10px 20px;background:#6366f1;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:700;';
                btn.onclick = () => openAttendanceRequestModal();
                attView.insertBefore(btn, attView.firstChild?.nextSibling || null);
            }
        }
        // Faculty: Syllabus Manager + Attendance Requests
        if (role === 'faculty') {
            if (dashView && !document.getElementById('faculty-syllabus-body')) {
                const s = document.createElement('div');
                s.innerHTML = `<div style="margin-top:20px;padding:20px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;"><h3 style="margin:0 0 14px;font-size:15px;font-weight:700;">📊 Update Syllabus Progress</h3><div id="faculty-syllabus-body"></div></div>`;
                dashView.appendChild(s);
            }
            const attView = document.getElementById('mark-attendance-view');
            if (attView && !document.getElementById('faculty-att-requests-body')) {
                const s = document.createElement('div');
                s.innerHTML = `<div style="margin-top:20px;padding:20px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;"><h3 style="margin:0 0 14px;font-size:15px;font-weight:700;">📝 Student Attendance Requests</h3><div id="faculty-att-requests-body"></div></div>`;
                attView.appendChild(s);
            }
        }
        // Admin: Attendance Requests + Resource Bookings
        if (['admin','head','superadmin'].includes(role)) {
            const overView = document.getElementById('attendance-override-view');
            if (overView && !document.getElementById('admin-att-requests-body')) {
                const s = document.createElement('div');
                s.innerHTML = `<div style="margin-top:20px;padding:20px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;"><h3 style="margin:0 0 14px;font-size:15px;font-weight:700;">📝 Student Attendance Requests</h3><div id="admin-att-requests-body"></div></div>`;
                overView.appendChild(s);
            }
            const resView = document.getElementById('resource-management-view');
            if (resView && !document.getElementById('admin-resource-bookings-body')) {
                const s = document.createElement('div');
                s.innerHTML = `<div style="margin-top:20px;padding:20px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;"><h3 style="margin:0 0 14px;font-size:15px;font-weight:700;">🏢 Resource Booking Requests</h3><div id="admin-resource-bookings-body"></div></div>`;
                resView.appendChild(s);
            }
        }
        // Inject modals for attendance request + resource booking
        if (!document.getElementById('attendanceRequestModal')) {
            const m = document.createElement('div');
            m.innerHTML = `<div id="attendanceRequestModal" class="modal-overlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9998;align-items:center;justify-content:center;">
                <div style="background:#fff;border-radius:16px;padding:28px;width:460px;max-width:94vw;box-shadow:0 20px 60px rgba(0,0,0,.2);max-height:90vh;overflow-y:auto;">
                    <h3 style="margin:0 0 4px;font-size:17px;font-weight:700;">📝 Request Attendance</h3>
                    <p style="font-size:12px;color:#64748b;margin:0 0 16px;">All fields are required. Attach a supporting document (e.g. medical certificate).</p>
                    <label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Course *</label>
                    <select id="attReqCourse" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:12px;font-size:13px;"></select>
                    <label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Absent Date *</label>
                    <input type="date" id="attReqDate" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:12px;box-sizing:border-box;font-size:13px;">
                    <label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Reason *</label>
                    <textarea id="attReqReason" placeholder="Explain the reason for absence (min 10 characters)" rows="3" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:12px;box-sizing:border-box;font-size:13px;resize:vertical;"></textarea>
                    <label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px;">Supporting Document * <span style="font-weight:400;color:#94a3b8;">(PDF, JPG, PNG — max 5MB)</span></label>
                    <div onclick="document.getElementById('attReqFile').click()" style="border:2px dashed #cbd5e1;border-radius:8px;padding:16px;text-align:center;cursor:pointer;background:#f8fafc;margin-bottom:12px;transition:border-color .2s;" onmouseover="this.style.borderColor='#6366f1'" onmouseout="this.style.borderColor='#cbd5e1'">
                        <div style="font-size:22px;margin-bottom:4px;">📎</div>
                        <div style="font-size:12px;font-weight:600;color:#475569;">Click to upload document</div>
                        <div id="attReqFileName" style="font-size:11px;color:#6366f1;margin-top:4px;font-weight:600;">No file chosen</div>
                    </div>
                    <input type="file" id="attReqFile" accept=".pdf,.jpg,.jpeg,.png" style="display:none;" onchange="document.getElementById('attReqFileName').textContent=this.files[0]?this.files[0].name:'No file chosen'">
                    <div style="display:flex;gap:8px;margin-top:4px;">
                        <button onclick="submitAttendanceRequest()" style="flex:1;padding:11px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700;font-size:14px;">Submit Request</button>
                        <button onclick="closeModal('attendanceRequestModal')" style="flex:1;padding:11px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;cursor:pointer;font-weight:600;font-size:14px;">Cancel</button>
                    </div>
                </div></div>`;
            document.body.appendChild(m);
        }
        if (!document.getElementById('resourceBookingModal')) {
            const m = document.createElement('div');
            m.innerHTML = `<div id="resourceBookingModal" class="modal-overlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9998;align-items:center;justify-content:center;">
                <div style="background:#fff;border-radius:16px;padding:28px;width:420px;max-width:92vw;box-shadow:0 20px 60px rgba(0,0,0,.2);">
                    <h3 style="margin:0 0 16px;">🏢 Book Resource</h3>
                    <select id="bookResourceSel" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:10px;"></select>
                    <input type="date" id="bookResourceDate" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:10px;box-sizing:border-box;">
                    <textarea id="bookResourcePurpose" placeholder="Purpose" rows="2" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:12px;box-sizing:border-box;"></textarea>
                    <div style="display:flex;gap:8px;"><button onclick="submitResourceBooking()" style="flex:1;padding:10px;background:#6366f1;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700;">Submit</button><button onclick="closeModal('resourceBookingModal')" style="flex:1;padding:10px;background:#f1f5f9;border:none;border-radius:8px;cursor:pointer;font-weight:600;">Cancel</button></div>
                </div></div>`;
            document.body.appendChild(m);
        }
    }, 600);

    // Hook dashboard render to also render new widgets
    const _origTrigger = window.triggerViewRender;
    window.triggerViewRender = function(viewId) {
        if (_origTrigger) _origTrigger(viewId);
        if (viewId === 'dashboard-view') {
            setTimeout(() => { renderActionRequired(); renderSyllabusTracker(); renderFacultySyllabusManager(); }, 200);
        }
        if (viewId === 'attendance-override-view') setTimeout(() => renderAdminAttendanceRequests(), 200);
        if (viewId === 'mark-attendance-view') setTimeout(() => renderFacultyAttendanceRequests(), 200);
        if (viewId === 'resource-management-view') setTimeout(() => renderAdminResourceBookings(), 200);
    };
});
