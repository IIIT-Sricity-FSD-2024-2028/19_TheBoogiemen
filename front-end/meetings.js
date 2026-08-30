/**
 * meetings.js — Meeting Scheduling and Management Module for APOTS (BarelyPassing)
 * Purely additive module providing full student and faculty meeting workflows.
 * Only Student and Faculty roles are involved in meeting scheduling.
 */

(function () {
    'use strict';

    // Extend VIEW_TITLES safely if present
    if (typeof VIEW_TITLES !== 'undefined') {
        VIEW_TITLES['meetings-view'] = 'Meetings';
    }

    const api = window.Auth ? window.Auth.apiFetch.bind(window.Auth) : window.apiFetch;

    // Toast helper fallback
    function notify(msg, type = 'success') {
        if (typeof showToast === 'function') {
            showToast(msg, type);
        } else {
            alert(msg);
        }
    }

    // Modal helpers
    function openM(id) {
        const el = document.getElementById(id);
        if (el) el.style.display = 'flex';
    }
    function closeM(id) {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    }

    // State storage for current meetings
    let currentMeetings = [];
    let facultyList = [];
    let studentList = [];
    let activeTab = 'all';

    // ─────────────────────────────────────────────────────────────────────────
    // 1. DATA FETCHING
    // ─────────────────────────────────────────────────────────────────────────

    async function loadFacultyList() {
        try {
            const res = await api('/meetings/faculty-list');
            facultyList = (res && res.data) ? res.data : [];
            return facultyList;
        } catch (e) {
            console.error('Failed to load faculty list:', e);
            return [];
        }
    }

    async function loadStudentList() {
        try {
            const res = await api('/meetings/student-list');
            studentList = (res && res.data) ? res.data : [];
            return studentList;
        } catch (e) {
            console.error('Failed to load student list:', e);
            return [];
        }
    }

    async function fetchMeetings() {
        try {
            const res = await api('/meetings/my');
            currentMeetings = (res && res.data) ? res.data : [];
            return currentMeetings;
        } catch (e) {
            console.error('Failed to load meetings:', e);
            return [];
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. STATUS BADGE HELPER
    // ─────────────────────────────────────────────────────────────────────────

    function getStatusBadge(status, rescheduleBy) {
        const styles = {
            PENDING: 'background:#fef3c7;color:#92400e;border:1px solid #fde68a;',
            SCHEDULED: 'background:#dcfce7;color:#166534;border:1px solid #bbf7d0;',
            RESCHEDULE_REQUESTED: 'background:#e0e7ff;color:#3730a3;border:1px solid #c7d2fe;',
            COMPLETED: 'background:#f1f5f9;color:#334155;border:1px solid #cbd5e1;',
            DENIED: 'background:#fee2e2;color:#991b1b;border:1px solid #fecaca;',
            CANCELLED: 'background:#f3f4f6;color:#6b7280;border:1px solid #e5e7eb;',
        };
        const labels = {
            PENDING: '⏳ Pending Approval',
            SCHEDULED: '📅 Scheduled',
            RESCHEDULE_REQUESTED: rescheduleBy === 'STUDENT' ? '🔄 Reschedule Requested (By Student)' : '🔄 Reschedule Proposed (By Faculty)',
            COMPLETED: '✓ Completed',
            DENIED: '✕ Denied',
            CANCELLED: '✕ Cancelled',
        };
        const s = styles[status] || styles.PENDING;
        const l = labels[status] || status;
        return `<span style="padding:4px 10px;border-radius:20px;font-size:12px;font-weight:700;display:inline-block;${s}">${l}</span>`;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. STUDENT VIEW RENDERER
    // ─────────────────────────────────────────────────────────────────────────

    window.renderStudentMeetings = async function () {
        const user = window.Auth ? window.Auth.getUser() : null;
        if (!user || user.role !== 'student') return;

        await fetchMeetings();

        // 3a. Update Dashboard Upcoming Meetings Alert card if it exists
        const upcomingCard = document.getElementById('upcoming-meetings-card');
        const upcomingList = document.getElementById('upcoming-meetings-list');
        const countBadge = document.getElementById('meetings-count');

        if (upcomingCard && upcomingList) {
            const scheduled = currentMeetings.filter(m => m.status === 'SCHEDULED');
            const resched = currentMeetings.filter(m => m.status === 'RESCHEDULE_REQUESTED' && m.reschedule_requested_by === 'FACULTY');

            if (scheduled.length > 0 || resched.length > 0) {
                upcomingCard.style.display = 'block';
                if (countBadge) countBadge.textContent = `${scheduled.length} Scheduled`;

                let html = '';
                if (resched.length > 0) {
                    html += `<div style="background:#e0e7ff;border:1px solid #c7d2fe;padding:12px;border-radius:8px;margin-bottom:12px;">
                        <strong style="color:#3730a3;">⚠️ Faculty Proposed Reschedule:</strong>
                        <p style="margin:4px 0 8px;font-size:13px;color:#4338ca;">You have ${resched.length} meeting(s) awaiting your reschedule confirmation.</p>
                        <button onclick="switchView('meetings-view')" style="padding:6px 12px;background:#4f46e5;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;">View Proposal & Respond</button>
                    </div>`;
                }

                scheduled.slice(0, 3).forEach(m => {
                    html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f1f5f9;">
                        <div>
                            <div style="font-weight:700;color:#0f172a;font-size:14px;">${m.purpose} with ${m.faculty_name || 'Faculty'}</div>
                            <div style="font-size:12px;color:#64748b;margin-top:2px;">
                                📅 ${m.scheduled_date} at ${m.scheduled_start_time}–${m.scheduled_end_time} &bull; 
                                <span>${m.meeting_type === 'ONLINE' ? '🌐 Online (Google Meet)' : `📍 ${m.location || 'In Person'}`}</span>
                            </div>
                        </div>
                        <div>
                            ${m.meeting_type === 'ONLINE' && m.meeting_link ? `
                                <a href="${m.meeting_link}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:6px 14px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;font-size:12px;">Join Meet ↗</a>
                            ` : ''}
                        </div>
                    </div>`;
                });
                upcomingList.innerHTML = html || '<p style="color:#64748b;font-size:13px;">No upcoming scheduled meetings.</p>';
            } else {
                upcomingCard.style.display = 'none';
            }
        }

        // 3b. Render full Student Meetings View if container exists
        const container = document.getElementById('meetings-view');
        if (!container) return;

        renderStudentMeetingsPage(container);
    };

    function renderStudentMeetingsPage(container) {
        let filtered = currentMeetings;
        if (activeTab === 'pending') filtered = currentMeetings.filter(m => m.status === 'PENDING');
        else if (activeTab === 'scheduled') filtered = currentMeetings.filter(m => m.status === 'SCHEDULED');
        else if (activeTab === 'reschedule') filtered = currentMeetings.filter(m => m.status === 'RESCHEDULE_REQUESTED');
        else if (activeTab === 'completed') filtered = currentMeetings.filter(m => m.status === 'COMPLETED');
        else if (activeTab === 'denied') filtered = currentMeetings.filter(m => m.status === 'DENIED' || m.status === 'CANCELLED');

        const pendingCount = currentMeetings.filter(m => m.status === 'PENDING').length;
        const scheduledCount = currentMeetings.filter(m => m.status === 'SCHEDULED').length;
        const reschedCount = currentMeetings.filter(m => m.status === 'RESCHEDULE_REQUESTED').length;
        const completedCount = currentMeetings.filter(m => m.status === 'COMPLETED').length;
        const deniedCount = currentMeetings.filter(m => m.status === 'DENIED' || m.status === 'CANCELLED').length;

        container.innerHTML = `
            <div style="margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
                <div>
                    <h2 style="font-size:22px;font-weight:700;color:#0f172a;margin:0;">Meeting Scheduling & Management</h2>
                    <p style="font-size:14px;color:#64748b;margin:4px 0 0;">Request, manage, and track 1-on-1 meetings with faculty mentors</p>
                </div>
                <button onclick="window.openStudentRequestModal()" style="padding:10px 20px;background:linear-gradient(135deg,#2563eb,#3b82f6);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700;font-size:14px;display:flex;align-items:center;gap:8px;box-shadow:0 4px 12px rgba(37,99,235,0.25);">
                    <span>+</span> Request New Meeting
                </button>
            </div>

            <!-- Tab Navigation -->
            <div style="display:flex;gap:8px;border-bottom:2px solid #e2e8f0;margin-bottom:20px;overflow-x:auto;padding-bottom:2px;">
                <button onclick="window.setMeetingTab('all')" style="padding:8px 16px;border:none;background:none;font-weight:700;font-size:14px;cursor:pointer;color:${activeTab==='all'?'#2563eb':'#64748b'};border-bottom:${activeTab==='all'?'2px solid #2563eb':'none'};margin-bottom:-2px;">
                    All (${currentMeetings.length})
                </button>
                <button onclick="window.setMeetingTab('scheduled')" style="padding:8px 16px;border:none;background:none;font-weight:700;font-size:14px;cursor:pointer;color:${activeTab==='scheduled'?'#2563eb':'#64748b'};border-bottom:${activeTab==='scheduled'?'2px solid #2563eb':'none'};margin-bottom:-2px;">
                    📅 Scheduled (${scheduledCount})
                </button>
                <button onclick="window.setMeetingTab('pending')" style="padding:8px 16px;border:none;background:none;font-weight:700;font-size:14px;cursor:pointer;color:${activeTab==='pending'?'#2563eb':'#64748b'};border-bottom:${activeTab==='pending'?'2px solid #2563eb':'none'};margin-bottom:-2px;">
                    ⏳ Pending Approval (${pendingCount})
                </button>
                <button onclick="window.setMeetingTab('reschedule')" style="padding:8px 16px;border:none;background:none;font-weight:700;font-size:14px;cursor:pointer;color:${activeTab==='reschedule'?'#2563eb':'#64748b'};border-bottom:${activeTab==='reschedule'?'2px solid #2563eb':'none'};margin-bottom:-2px;">
                    🔄 Reschedule Requests (${reschedCount})
                </button>
                <button onclick="window.setMeetingTab('completed')" style="padding:8px 16px;border:none;background:none;font-weight:700;font-size:14px;cursor:pointer;color:${activeTab==='completed'?'#16a34a':'#64748b'};border-bottom:${activeTab==='completed'?'2px solid #16a34a':'none'};margin-bottom:-2px;">
                    ✓ Completed (${completedCount})
                </button>
                <button onclick="window.setMeetingTab('denied')" style="padding:8px 16px;border:none;background:none;font-weight:700;font-size:14px;cursor:pointer;color:${activeTab==='denied'?'#dc2626':'#64748b'};border-bottom:${activeTab==='denied'?'2px solid #dc2626':'none'};margin-bottom:-2px;">
                    ✕ Denied / Cancelled (${deniedCount})
                </button>
            </div>

            <!-- Meetings Cards List -->
            <div id="student-meetings-list">
                ${filtered.length === 0 ? `
                    <div style="text-align:center;padding:48px 20px;background:#fff;border-radius:12px;border:1px solid #e2e8f0;">
                        <div style="font-size:40px;margin-bottom:12px;">📅</div>
                        <h3 style="color:#334155;margin:0 0 6px;">No meetings found</h3>
                        <p style="color:#64748b;font-size:14px;margin:0 0 16px;">You don't have any meetings in this category.</p>
                        <button onclick="window.openStudentRequestModal()" style="padding:8px 16px;background:#2563eb;color:#fff;border:none;border-radius:6px;font-weight:600;cursor:pointer;">Request a Meeting</button>
                    </div>
                ` : filtered.map(m => renderStudentMeetingCard(m)).join('')}
            </div>
        `;
    }

    function renderStudentMeetingCard(m) {
        const isScheduled = m.status === 'SCHEDULED';
        const isPending = m.status === 'PENDING';
        const isResched = m.status === 'RESCHEDULE_REQUESTED';
        const isReschedByFaculty = isResched && m.reschedule_requested_by === 'FACULTY';
        const isReschedByStudent = isResched && m.reschedule_requested_by === 'STUDENT';
        const isCompleted = m.status === 'COMPLETED';
        const isDenied = m.status === 'DENIED';
        const isOnline = m.meeting_type === 'ONLINE';

        return `
            <div class="stats-card" style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:20px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                <!-- Header -->
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
                    <div>
                        <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;">
                            <h3 style="margin:0;font-size:16px;font-weight:700;color:#0f172a;">${m.purpose}</h3>
                            ${getStatusBadge(m.status, m.reschedule_requested_by)}
                        </div>
                        <div style="font-size:13px;color:#64748b;">
                            Faculty: <strong style="color:#334155;">${m.faculty_name || 'Faculty Member'}</strong>
                        </div>
                    </div>
                    <div>
                        ${isOnline && isScheduled && m.meeting_link ? `
                            <a href="${m.meeting_link}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;padding:8px 16px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px;box-shadow:0 2px 8px rgba(37,99,235,0.25);">
                                🌐 Join Google Meet ↗
                            </a>
                        ` : ''}
                    </div>
                </div>

                <!-- Description if present -->
                ${m.description ? `<p style="font-size:13px;color:#475569;margin:0 0 14px;background:#f8fafc;padding:10px 14px;border-radius:6px;">${m.description}</p>` : ''}

                <!-- Date & Schedule Details Grid -->
                <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:12px;background:#f8fafc;padding:14px;border-radius:8px;margin-bottom:14px;font-size:13px;">
                    <div>
                        <span style="color:#64748b;display:block;font-size:11px;font-weight:700;text-transform:uppercase;">Student Requested Slot</span>
                        <strong style="color:#0f172a;">${m.requested_date}</strong>
                        <div style="color:#475569;">${m.requested_start_time} – ${m.requested_end_time}</div>
                    </div>

                    ${(m.scheduled_date || isScheduled || isCompleted) ? `
                        <div>
                            <span style="color:#16a34a;display:block;font-size:11px;font-weight:700;text-transform:uppercase;">Confirmed Schedule</span>
                            <strong style="color:#15803d;">${m.scheduled_date || '—'}</strong>
                            <div style="color:#166534;">${m.scheduled_start_time || ''} – ${m.scheduled_end_time || ''}</div>
                        </div>
                    ` : ''}

                    <div>
                        <span style="color:#64748b;display:block;font-size:11px;font-weight:700;text-transform:uppercase;">Meeting Mode</span>
                        <strong style="color:#0f172a;">${isOnline ? '🌐 Online (Google Meet)' : '📍 In-Person'}</strong>
                        <div style="color:#475569;">${isOnline ? (m.meeting_link || 'Link provided on confirmation') : (m.location || 'Location provided on confirmation')}</div>
                    </div>
                </div>

                <!-- Reschedule Proposal Banner if Faculty asked to reschedule -->
                ${isReschedByFaculty ? `
                    <div style="background:#eef2ff;border:1px solid #c7d2fe;padding:14px;border-radius:8px;margin-bottom:14px;">
                        <div style="font-weight:700;color:#3730a3;font-size:14px;margin-bottom:4px;">
                            📅 Faculty Proposed a New Time Slot:
                        </div>
                        <div style="font-size:13px;color:#1e1b4b;margin-bottom:8px;">
                            <strong>${m.proposed_date}</strong> at <strong>${m.proposed_start_time} – ${m.proposed_end_time}</strong>
                            ${m.reschedule_reason ? `<br><span style="color:#4338ca;font-style:italic;">Reason: "${m.reschedule_reason}"</span>` : ''}
                        </div>
                        <div style="display:flex;gap:10px;">
                            <button onclick="window.studentAcceptReschedule('${m.meeting_id}')" style="padding:8px 16px;background:#16a34a;color:#fff;border:none;border-radius:6px;font-weight:700;cursor:pointer;font-size:13px;">
                                ✓ Accept Proposed Schedule
                            </button>
                            <button onclick="window.studentDeclineReschedule('${m.meeting_id}')" style="padding:8px 16px;background:#dc2626;color:#fff;border:none;border-radius:6px;font-weight:700;cursor:pointer;font-size:13px;">
                                ✕ Decline (Return to Pending)
                            </button>
                        </div>
                    </div>
                ` : ''}

                <!-- Student reschedule pending faculty review -->
                ${isReschedByStudent ? `
                    <div style="background:#fefce8;border:1px solid #fef08a;padding:12px 14px;border-radius:8px;margin-bottom:14px;font-size:13px;color:#854d0e;">
                        ⏳ <strong>Reschedule Request Submitted:</strong> You proposed <strong>${m.proposed_date}</strong> at <strong>${m.proposed_start_time}–${m.proposed_end_time}</strong>. Awaiting faculty response.
                    </div>
                ` : ''}

                <!-- Denial reason -->
                ${isDenied ? `
                    <div style="background:#fef2f2;border:1px solid #fecaca;padding:12px 14px;border-radius:8px;margin-bottom:14px;font-size:13px;color:#991b1b;">
                        ✕ <strong>Denial Reason:</strong> ${m.denial_reason || 'No specific reason provided.'}
                    </div>
                ` : ''}

                <!-- Completed Outcome Details -->
                ${isCompleted ? `
                    <div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:10px;padding:16px;margin-bottom:14px;box-shadow:0 1px 3px rgba(16,185,129,0.1);">
                        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
                            <span style="font-size:18px;">✅</span>
                            <h4 style="margin:0;color:#15803d;font-size:15px;font-weight:700;">Meeting Completed & Recorded Minutes</h4>
                        </div>
                        <div style="display:grid;grid-template-columns:1fr;gap:10px;font-size:13px;">
                            ${m.faculty_remarks ? `
                                <div style="background:#fff;border:1px solid #bbf7d0;padding:10px 14px;border-radius:8px;">
                                    <strong style="color:#166534;display:block;margin-bottom:2px;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">💬 Faculty Remarks & Feedback</strong>
                                    <span style="color:#1e293b;font-size:14px;line-height:1.5;font-weight:500;">${m.faculty_remarks}</span>
                                </div>
                            ` : ''}
                            ${m.discussion_notes ? `
                                <div style="background:#fff;border:1px solid #bbf7d0;padding:10px 14px;border-radius:8px;">
                                    <strong style="color:#166534;display:block;margin-bottom:2px;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">📝 Discussion Notes</strong>
                                    <span style="color:#334155;line-height:1.5;">${m.discussion_notes}</span>
                                </div>
                            ` : ''}
                            ${m.outcome ? `
                                <div style="background:#fff;border:1px solid #bbf7d0;padding:10px 14px;border-radius:8px;">
                                    <strong style="color:#166534;display:block;margin-bottom:2px;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">🎯 Outcomes & Decisions</strong>
                                    <span style="color:#334155;line-height:1.5;">${m.outcome}</span>
                                </div>
                            ` : ''}
                            ${m.action_items ? `
                                <div style="background:#fff;border:1px solid #bbf7d0;padding:10px 14px;border-radius:8px;">
                                    <strong style="color:#166534;display:block;margin-bottom:2px;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">📌 Action Items for Student</strong>
                                    <span style="color:#334155;line-height:1.5;">${m.action_items}</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                ` : ''}

                <!-- Footer Actions -->
                <div style="display:flex;justify-content:flex-end;gap:10px;border-top:1px solid #f1f5f9;padding-top:12px;margin-top:8px;">
                    ${isScheduled ? `
                        <button onclick="window.openStudentRescheduleModal('${m.meeting_id}', '${m.scheduled_date}', '${m.scheduled_start_time}', '${m.scheduled_end_time}')" style="padding:7px 14px;background:#f1f5f9;color:#334155;border:1px solid #cbd5e1;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px;">
                            🔄 Request Reschedule
                        </button>
                    ` : ''}

                    ${(isPending || isScheduled) ? `
                        <button onclick="window.cancelMeeting('${m.meeting_id}')" style="padding:7px 14px;background:#fee2e2;color:#991b1b;border:1px solid #fecaca;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px;">
                            Cancel Meeting
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. FACULTY VIEW RENDERER
    // ─────────────────────────────────────────────────────────────────────────

    window.renderFacultyDashboardMeetings = async function () {
        const user = window.Auth ? window.Auth.getUser() : null;
        if (!user || user.role !== 'faculty') return;

        await fetchMeetings();

        // Render notifications banner on faculty dashboard overview
        window.renderFacultyMeetingsAlerts();

        const container = document.getElementById('meetings-view');
        if (!container) return;

        renderFacultyMeetingsPage(container);
    };

    window.renderFacultyMeetingsAlerts = function () {
        const user = window.Auth ? window.Auth.getUser() : null;
        if (!user || user.role !== 'faculty') return;

        const pendingList = currentMeetings.filter(m => m.status === 'PENDING');
        const reschedList = currentMeetings.filter(m => m.status === 'RESCHEDULE_REQUESTED' && m.reschedule_requested_by === 'STUDENT');
        const scheduledToday = currentMeetings.filter(m => m.status === 'SCHEDULED' && m.scheduled_date === getTodayDateString());

        // 1. Update Sidebar Nav Badge
        const navBadge = document.getElementById('faculty-meetings-nav-badge');
        const totalActionable = pendingList.length + reschedList.length;
        if (navBadge) {
            if (totalActionable > 0) {
                navBadge.textContent = totalActionable;
                navBadge.style.display = 'inline-block';
            } else {
                navBadge.style.display = 'none';
            }
        }

        // 2. Render Notifications / Alerts on Faculty Dashboard Overview (#faculty-meeting-notifications-container)
        const notifContainer = document.getElementById('faculty-meeting-notifications-container');
        if (!notifContainer) return;

        let html = '';

        // Pending Meeting Requests Alert
        if (pendingList.length > 0) {
            html += `
                <div style="background:linear-gradient(135deg,#fffbeb,#fef3c7);border:1.5px solid #f59e0b;border-radius:12px;padding:16px 20px;margin-bottom:14px;box-shadow:0 2px 8px rgba(245,158,11,0.12);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
                    <div style="display:flex;align-items:center;gap:14px;">
                        <div style="font-size:26px;background:#fde68a;width:44px;height:44px;border-radius:10px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 4px rgba(0,0,0,0.05);">📅</div>
                        <div>
                            <div style="font-size:15px;font-weight:700;color:#92400e;display:flex;align-items:center;gap:8px;">
                                <span>Pending Meeting Requests</span>
                                <span style="background:#dc2626;color:#fff;font-size:11px;font-weight:800;padding:2px 8px;border-radius:12px;">${pendingList.length} Action Required</span>
                            </div>
                            <div style="font-size:13px;color:#78350f;margin-top:3px;">
                                Latest request: <strong>${pendingList[0].purpose}</strong> from <strong>${pendingList[0].student_name || 'Student'}</strong> (${pendingList[0].student_id}) for <strong>${pendingList[0].requested_date}</strong> at <strong>${pendingList[0].requested_start_time}–${pendingList[0].requested_end_time}</strong>.
                            </div>
                        </div>
                    </div>
                    <button onclick="if(typeof switchView==='function')switchView('meetings-view'); window.setMeetingTab('pending');" style="padding:9px 18px;background:#d97706;color:#fff;border:none;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;box-shadow:0 2px 6px rgba(217,119,6,0.3);transition:background 0.2s;">
                        Review &amp; Schedule ↗
                    </button>
                </div>
            `;
        }

        // Student Reschedule Requests Alert
        if (reschedList.length > 0) {
            html += `
                <div style="background:linear-gradient(135deg,#eff6ff,#dbeafe);border:1.5px solid #3b82f6;border-radius:12px;padding:16px 20px;margin-bottom:14px;box-shadow:0 2px 8px rgba(59,130,246,0.12);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
                    <div style="display:flex;align-items:center;gap:14px;">
                        <div style="font-size:26px;background:#bfdbfe;width:44px;height:44px;border-radius:10px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 4px rgba(0,0,0,0.05);">🔄</div>
                        <div>
                            <div style="font-size:15px;font-weight:700;color:#1e40af;display:flex;align-items:center;gap:8px;">
                                <span>Meeting Reschedule Requests</span>
                                <span style="background:#2563eb;color:#fff;font-size:11px;font-weight:800;padding:2px 8px;border-radius:12px;">${reschedList.length} Awaiting Response</span>
                            </div>
                            <div style="font-size:13px;color:#1e3a8a;margin-top:3px;">
                                <strong>${reschedList[0].student_name || 'Student'}</strong> proposed new slot on <strong>${reschedList[0].proposed_date}</strong> at <strong>${reschedList[0].proposed_start_time}–${reschedList[0].proposed_end_time}</strong> (${reschedList[0].reschedule_reason || 'Clash with schedule'}).
                            </div>
                        </div>
                    </div>
                    <button onclick="if(typeof switchView==='function')switchView('meetings-view'); window.setMeetingTab('reschedule');" style="padding:9px 18px;background:#2563eb;color:#fff;border:none;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;box-shadow:0 2px 6px rgba(37,99,235,0.3);transition:background 0.2s;">
                        View &amp; Respond ↗
                    </button>
                </div>
            `;
        }

        // Today's Scheduled Meetings Banner
        if (scheduledToday.length > 0) {
            html += `
                <div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:1.5px solid #22c55e;border-radius:12px;padding:16px 20px;margin-bottom:14px;box-shadow:0 2px 8px rgba(34,197,94,0.12);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
                    <div style="display:flex;align-items:center;gap:14px;">
                        <div style="font-size:26px;background:#bbf7d0;width:44px;height:44px;border-radius:10px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 4px rgba(0,0,0,0.05);">📅</div>
                        <div>
                            <div style="font-size:15px;font-weight:700;color:#15803d;">Today's Scheduled Meetings (${scheduledToday.length})</div>
                            <div style="font-size:13px;color:#166534;margin-top:3px;">
                                ${scheduledToday.map(m => `<strong>${m.purpose}</strong> with <strong>${m.student_name || 'Student'}</strong> at <strong>${m.scheduled_start_time}</strong> (${m.meeting_type === 'ONLINE' ? '🌐 Google Meet' : '📍 ' + (m.location || 'In-Person')})`).join(' &bull; ')}
                            </div>
                        </div>
                    </div>
                    <div style="display:flex;gap:8px;">
                        ${scheduledToday[0].meeting_type === 'ONLINE' && scheduledToday[0].meeting_link ? `
                            <a href="${scheduledToday[0].meeting_link}" target="_blank" rel="noopener noreferrer" style="padding:9px 18px;background:#16a34a;color:#fff;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px;box-shadow:0 2px 6px rgba(22,163,74,0.3);">
                                🌐 Start Meet ↗
                            </a>
                        ` : ''}
                        <button onclick="if(typeof switchView==='function')switchView('meetings-view'); window.setMeetingTab('scheduled');" style="padding:9px 18px;background:#f1f5f9;color:#334155;border:1px solid #cbd5e1;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;">
                            View All
                        </button>
                    </div>
                </div>
            `;
        }

        notifContainer.innerHTML = html;
    };

    function renderFacultyMeetingsPage(container) {
        let filtered = currentMeetings;
        if (activeTab === 'pending') filtered = currentMeetings.filter(m => m.status === 'PENDING');
        else if (activeTab === 'scheduled') filtered = currentMeetings.filter(m => m.status === 'SCHEDULED');
        else if (activeTab === 'reschedule') filtered = currentMeetings.filter(m => m.status === 'RESCHEDULE_REQUESTED');
        else if (activeTab === 'completed') filtered = currentMeetings.filter(m => m.status === 'COMPLETED');
        else if (activeTab === 'history') filtered = currentMeetings.filter(m => ['COMPLETED', 'DENIED', 'CANCELLED'].includes(m.status));

        const pendingCount = currentMeetings.filter(m => m.status === 'PENDING').length;
        const scheduledCount = currentMeetings.filter(m => m.status === 'SCHEDULED').length;
        const reschedCount = currentMeetings.filter(m => m.status === 'RESCHEDULE_REQUESTED').length;
        const completedCount = currentMeetings.filter(m => m.status === 'COMPLETED').length;
        const historyCount = currentMeetings.filter(m => ['COMPLETED', 'DENIED', 'CANCELLED'].includes(m.status)).length;

        container.innerHTML = `
            <div style="margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
                <div>
                    <h2 style="font-size:22px;font-weight:700;color:#0f172a;margin:0;">Faculty Meeting Management</h2>
                    <p style="font-size:14px;color:#64748b;margin:4px 0 0;">Schedule meetings directly with students, review requests, and record outcomes</p>
                </div>
                <button onclick="window.openFacultyScheduleModal()" style="padding:10px 20px;background:linear-gradient(135deg,#2563eb,#3b82f6);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700;font-size:14px;display:flex;align-items:center;gap:8px;box-shadow:0 4px 12px rgba(37,99,235,0.25);">
                    <span>+</span> Schedule Meeting
                </button>
            </div>

            <!-- Tab Navigation -->
            <div style="display:flex;gap:8px;border-bottom:2px solid #e2e8f0;margin-bottom:20px;overflow-x:auto;padding-bottom:2px;">
                <button onclick="window.setMeetingTab('all')" style="padding:8px 16px;border:none;background:none;font-weight:700;font-size:14px;cursor:pointer;color:${activeTab==='all'?'#2563eb':'#64748b'};border-bottom:${activeTab==='all'?'2px solid #2563eb':'none'};margin-bottom:-2px;">
                    All (${currentMeetings.length})
                </button>
                <button onclick="window.setMeetingTab('pending')" style="padding:8px 16px;border:none;background:none;font-weight:700;font-size:14px;cursor:pointer;color:${activeTab==='pending'?'#2563eb':'#64748b'};border-bottom:${activeTab==='pending'?'2px solid #2563eb':'none'};margin-bottom:-2px;">
                    ⏳ Pending Requests (${pendingCount})
                </button>
                <button onclick="window.setMeetingTab('scheduled')" style="padding:8px 16px;border:none;background:none;font-weight:700;font-size:14px;cursor:pointer;color:${activeTab==='scheduled'?'#2563eb':'#64748b'};border-bottom:${activeTab==='scheduled'?'2px solid #2563eb':'none'};margin-bottom:-2px;">
                    📅 Scheduled (${scheduledCount})
                </button>
                <button onclick="window.setMeetingTab('reschedule')" style="padding:8px 16px;border:none;background:none;font-weight:700;font-size:14px;cursor:pointer;color:${activeTab==='reschedule'?'#2563eb':'#64748b'};border-bottom:${activeTab==='reschedule'?'2px solid #2563eb':'none'};margin-bottom:-2px;">
                    🔄 Reschedule Requests (${reschedCount})
                </button>
                <button onclick="window.setMeetingTab('completed')" style="padding:8px 16px;border:none;background:none;font-weight:700;font-size:14px;cursor:pointer;color:${activeTab==='completed'?'#16a34a':'#64748b'};border-bottom:${activeTab==='completed'?'2px solid #16a34a':'none'};margin-bottom:-2px;">
                    ✓ Completed (${completedCount})
                </button>
                <button onclick="window.setMeetingTab('history')" style="padding:8px 16px;border:none;background:none;font-weight:700;font-size:14px;cursor:pointer;color:${activeTab==='history'?'#64748b':'#64748b'};border-bottom:${activeTab==='history'?'2px solid #64748b':'none'};margin-bottom:-2px;">
                    History / Denied (${historyCount})
                </button>
            </div>

            <!-- List container -->
            <div id="faculty-meetings-list">
                ${filtered.length === 0 ? `
                    <div style="text-align:center;padding:48px 20px;background:#fff;border-radius:12px;border:1px solid #e2e8f0;">
                        <div style="font-size:40px;margin-bottom:12px;">📅</div>
                        <h3 style="color:#334155;margin:0 0 6px;">No meetings found</h3>
                        <p style="color:#64748b;font-size:14px;margin:0 0 16px;">No meetings in this category currently.</p>
                        <button onclick="window.openFacultyScheduleModal()" style="padding:8px 16px;background:#2563eb;color:#fff;border:none;border-radius:6px;font-weight:600;cursor:pointer;">Schedule a Meeting</button>
                    </div>
                ` : filtered.map(m => renderFacultyMeetingCard(m)).join('')}
            </div>
        `;
    }

    function renderFacultyMeetingCard(m) {
        const isScheduled = m.status === 'SCHEDULED';
        const isPending = m.status === 'PENDING';
        const isResched = m.status === 'RESCHEDULE_REQUESTED';
        const isReschedByStudent = isResched && m.reschedule_requested_by === 'STUDENT';
        const isReschedByFaculty = isResched && m.reschedule_requested_by === 'FACULTY';
        const isCompleted = m.status === 'COMPLETED';
        const isOnline = m.meeting_type === 'ONLINE';

        return `
            <div class="stats-card" style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:20px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                <!-- Header -->
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
                    <div>
                        <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;">
                            <h3 style="margin:0;font-size:16px;font-weight:700;color:#0f172a;">${m.purpose}</h3>
                            ${getStatusBadge(m.status, m.reschedule_requested_by)}
                        </div>
                        <div style="font-size:13px;color:#64748b;">
                            Student: <strong style="color:#334155;">${m.student_name || 'Student'}</strong> (${m.student_id})
                        </div>
                    </div>
                    <div>
                        ${isOnline && isScheduled && m.meeting_link ? `
                            <a href="${m.meeting_link}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;padding:8px 16px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px;box-shadow:0 2px 8px rgba(37,99,235,0.25);">
                                🌐 Start / Join Google Meet ↗
                            </a>
                        ` : ''}
                    </div>
                </div>

                <!-- Description / Agenda -->
                ${m.description ? `<p style="font-size:13px;color:#475569;margin:0 0 14px;background:#f8fafc;padding:10px 14px;border-radius:6px;">${m.description}</p>` : ''}

                <!-- Time Details -->
                <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:12px;background:#f8fafc;padding:14px;border-radius:8px;margin-bottom:14px;font-size:13px;">
                    <div>
                        <span style="color:#64748b;display:block;font-size:11px;font-weight:700;text-transform:uppercase;">Requested Slot</span>
                        <strong style="color:#0f172a;">${m.requested_date}</strong>
                        <div style="color:#475569;">${m.requested_start_time} – ${m.requested_end_time}</div>
                    </div>

                    ${(m.scheduled_date || isScheduled || isCompleted) ? `
                        <div>
                            <span style="color:#16a34a;display:block;font-size:11px;font-weight:700;text-transform:uppercase;">Confirmed Schedule</span>
                            <strong style="color:#15803d;">${m.scheduled_date || '—'}</strong>
                            <div style="color:#166534;">${m.scheduled_start_time || ''} – ${m.scheduled_end_time || ''}</div>
                        </div>
                    ` : ''}

                    <div>
                        <span style="color:#64748b;display:block;font-size:11px;font-weight:700;text-transform:uppercase;">Meeting Mode</span>
                        <strong style="color:#0f172a;">${isOnline ? '🌐 Online (Google Meet)' : '📍 In-Person'}</strong>
                        <div style="color:#475569;">${isOnline ? (m.meeting_link || 'Link set upon acceptance') : (m.location || 'Location set upon acceptance')}</div>
                    </div>
                </div>

                <!-- Student Reschedule Request Box (Faculty Action Required) -->
                ${isReschedByStudent ? `
                    <div style="background:#fef3c7;border:1px solid #fde68a;padding:14px;border-radius:8px;margin-bottom:14px;">
                        <div style="font-weight:700;color:#92400e;font-size:14px;margin-bottom:4px;">
                            ⚠️ Student Requested a New Schedule:
                        </div>
                        <div style="font-size:13px;color:#78350f;margin-bottom:8px;">
                            Proposed: <strong>${m.proposed_date}</strong> at <strong>${m.proposed_start_time} – ${m.proposed_end_time}</strong>
                            ${m.reschedule_reason ? `<br><span style="font-style:italic;">Reason: "${m.reschedule_reason}"</span>` : ''}
                        </div>
                        <div style="display:flex;gap:10px;flex-wrap:wrap;">
                            <button onclick="window.facultyAcceptStudentReschedule('${m.meeting_id}')" style="padding:8px 16px;background:#16a34a;color:#fff;border:none;border-radius:6px;font-weight:700;cursor:pointer;font-size:13px;">
                                ✓ Accept Student's Proposed Time
                            </button>
                            <button onclick="window.openFacultyCounterProposeModal('${m.meeting_id}')" style="padding:8px 16px;background:#6366f1;color:#fff;border:none;border-radius:6px;font-weight:700;cursor:pointer;font-size:13px;">
                                🔄 Propose Alternative Time
                            </button>
                            <button onclick="window.facultyDenyStudentReschedule('${m.meeting_id}')" style="padding:8px 16px;background:#64748b;color:#fff;border:none;border-radius:6px;font-weight:700;cursor:pointer;font-size:13px;">
                                ✕ Keep Original Schedule
                            </button>
                        </div>
                    </div>
                ` : ''}

                <!-- Faculty Reschedule Proposal Status -->
                ${isReschedByFaculty ? `
                    <div style="background:#eef2ff;border:1px solid #c7d2fe;padding:12px 14px;border-radius:8px;margin-bottom:14px;font-size:13px;color:#3730a3;">
                        ⏳ <strong>You proposed a reschedule:</strong> ${m.proposed_date} at ${m.proposed_start_time}–${m.proposed_end_time}. Awaiting student response.
                    </div>
                ` : ''}

                <!-- Completed Outcome Details -->
                ${isCompleted ? `
                    <div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:10px;padding:16px;margin-bottom:14px;box-shadow:0 1px 3px rgba(16,185,129,0.1);">
                        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
                            <span style="font-size:18px;">✅</span>
                            <h4 style="margin:0;color:#15803d;font-size:15px;font-weight:700;">Meeting Minutes & Recorded Outcome</h4>
                        </div>
                        <div style="display:grid;grid-template-columns:1fr;gap:10px;font-size:13px;">
                            ${m.faculty_remarks ? `
                                <div style="background:#fff;border:1px solid #bbf7d0;padding:10px 14px;border-radius:8px;">
                                    <strong style="color:#166534;display:block;margin-bottom:2px;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">💬 Faculty Remarks & Feedback</strong>
                                    <span style="color:#1e293b;font-size:14px;line-height:1.5;font-weight:500;">${m.faculty_remarks}</span>
                                </div>
                            ` : ''}
                            ${m.discussion_notes ? `
                                <div style="background:#fff;border:1px solid #bbf7d0;padding:10px 14px;border-radius:8px;">
                                    <strong style="color:#166534;display:block;margin-bottom:2px;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">📝 Discussion Notes</strong>
                                    <span style="color:#334155;line-height:1.5;">${m.discussion_notes}</span>
                                </div>
                            ` : ''}
                            ${m.outcome ? `
                                <div style="background:#fff;border:1px solid #bbf7d0;padding:10px 14px;border-radius:8px;">
                                    <strong style="color:#166534;display:block;margin-bottom:2px;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">🎯 Outcomes & Conclusions</strong>
                                    <span style="color:#334155;line-height:1.5;">${m.outcome}</span>
                                </div>
                            ` : ''}
                            ${m.action_items ? `
                                <div style="background:#fff;border:1px solid #bbf7d0;padding:10px 14px;border-radius:8px;">
                                    <strong style="color:#166534;display:block;margin-bottom:2px;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">📌 Action Items for Student</strong>
                                    <span style="color:#334155;line-height:1.5;">${m.action_items}</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                ` : ''}

                <!-- Action Toolbar for Faculty -->
                <div style="display:flex;justify-content:flex-end;gap:10px;border-top:1px solid #f1f5f9;padding-top:12px;margin-top:8px;flex-wrap:wrap;">
                    ${isPending ? `
                        <button onclick="window.openFacultyAcceptModal('${m.meeting_id}', '${m.requested_date}', '${m.requested_start_time}', '${m.requested_end_time}', '${m.meeting_type}')" style="padding:8px 16px;background:#16a34a;color:#fff;border:none;border-radius:6px;font-weight:700;cursor:pointer;font-size:13px;">
                            ✓ Accept & Confirm Schedule
                        </button>
                        <button onclick="window.openFacultyAskRescheduleModal('${m.meeting_id}', '${m.requested_date}', '${m.requested_start_time}', '${m.requested_end_time}')" style="padding:8px 16px;background:#f59e0b;color:#fff;border:none;border-radius:6px;font-weight:700;cursor:pointer;font-size:13px;">
                            🔄 Ask to Reschedule
                        </button>
                        <button onclick="window.openFacultyDenyModal('${m.meeting_id}')" style="padding:8px 16px;background:#dc2626;color:#fff;border:none;border-radius:6px;font-weight:700;cursor:pointer;font-size:13px;">
                            ✕ Deny Request
                        </button>
                    ` : ''}

                    ${isScheduled ? `
                        <button onclick="window.openFacultyCompleteModal('${m.meeting_id}')" style="padding:8px 16px;background:#059669;color:#fff;border:none;border-radius:6px;font-weight:700;cursor:pointer;font-size:13px;">
                            ✓ Mark as Completed
                        </button>
                        <button onclick="window.openFacultyDirectRescheduleModal('${m.meeting_id}', '${m.scheduled_date}', '${m.scheduled_start_time}', '${m.scheduled_end_time}', '${m.meeting_type}', '${m.meeting_link || ''}', '${m.location || ''}')" style="padding:8px 16px;background:#4f46e5;color:#fff;border:none;border-radius:6px;font-weight:700;cursor:pointer;font-size:13px;">
                            🔄 Reschedule
                        </button>
                        <button onclick="window.cancelMeeting('${m.meeting_id}')" style="padding:8px 16px;background:#fee2e2;color:#991b1b;border:1px solid #fecaca;border-radius:6px;font-weight:600;cursor:pointer;font-size:13px;">
                            Cancel Meeting
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. MODAL HANDLERS & API ACTIONS
    // ─────────────────────────────────────────────────────────────────────────

    window.setMeetingTab = function (tab) {
        activeTab = tab;
        const user = window.Auth ? window.Auth.getUser() : null;
        if (user && user.role === 'faculty') {
            window.renderFacultyDashboardMeetings();
        } else {
            window.renderStudentMeetings();
        }
    };

    function getCurrentTimeString() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    function getTodayDateString() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function validateMeetingDateTime(date, startTime, endTime) {
        if (!date || !startTime || !endTime) {
            notify('Please specify meeting date and time range.', 'warning');
            return false;
        }
        if (startTime >= endTime) {
            notify('Start time must be strictly before end time.', 'warning');
            return false;
        }
        const today = getTodayDateString();
        if (date < today) {
            notify('Meeting date cannot be in the past.', 'warning');
            return false;
        }
        if (date === today) {
            const curTime = getCurrentTimeString();
            if (startTime < curTime) {
                notify(`On today's date, meetings can only be scheduled from current time (${curTime}) onwards.`, 'warning');
                return false;
            }
        }
        return true;
    }

    // --- Student: Request Meeting Modal ---
    window.openStudentRequestModal = async function () {
        await loadFacultyList();
        const sel = document.getElementById('reqFacultySelect');
        if (sel) {
            sel.innerHTML = '<option value="">-- Choose Faculty Member --</option>' +
                facultyList.map(f => `<option value="${f.user_id}">${f.first_name} ${f.last_name} (${f.designation || 'Faculty'}${f.department_name ? ' - ' + f.department_name : ''})</option>`).join('');
        }
        const dateInput = document.getElementById('reqMeetingDate');
        if (dateInput) {
            dateInput.min = getTodayDateString();
            if (!dateInput.value) dateInput.value = getTodayDateString();
        }
        openM('studentRequestMeetingModal');
    };

    window.submitStudentMeetingRequest = async function () {
        const facultyId = document.getElementById('reqFacultySelect')?.value;
        const purpose = document.getElementById('reqMeetingPurpose')?.value;
        const description = document.getElementById('reqMeetingDescription')?.value;
        const requestedDate = document.getElementById('reqMeetingDate')?.value;
        const requestedStartTime = document.getElementById('reqMeetingStartTime')?.value;
        const requestedEndTime = document.getElementById('reqMeetingEndTime')?.value;
        const meetingType = document.getElementById('reqMeetingType')?.value;
        const location = document.getElementById('reqMeetingLocation')?.value;

        if (!facultyId || !purpose) {
            notify('Please select a faculty member and meeting purpose.', 'warning');
            return;
        }

        if (!validateMeetingDateTime(requestedDate, requestedStartTime, requestedEndTime)) {
            return;
        }

        try {
            const res = await api('/meetings', {
                method: 'POST',
                body: JSON.stringify({
                    facultyId,
                    purpose,
                    description,
                    requestedDate,
                    requestedStartTime,
                    requestedEndTime,
                    meetingType,
                    location: meetingType === 'IN_PERSON' ? location : undefined,
                })
            });
            const curUser = window.Auth ? window.Auth.getUser() : null;
            const fromName = curUser ? `${curUser.first_name || ''} ${curUser.last_name || ''}`.trim() || 'Student' : 'Student';
            window.Notifications?.send?.(
                facultyId,
                fromName,
                `📅 New Meeting Request: "${purpose}" on ${requestedDate} at ${requestedStartTime}–${requestedEndTime}. Please review.`,
                'meeting'
            );
            notify('Meeting request submitted successfully!');
            closeM('studentRequestMeetingModal');
            window.renderStudentMeetings();
        } catch (e) {
            notify(e.message || 'Failed to submit meeting request', 'error');
        }
    };

    // --- Faculty: Direct Schedule Meeting Modal ---
    window.openFacultyScheduleModal = async function (preselectedStudentId) {
        await loadStudentList();
        const sel = document.getElementById('facultyStudentSelect');
        if (sel) {
            sel.innerHTML = '<option value="">-- Choose Student --</option>' +
                studentList.map(s => `<option value="${s.user_id}" ${preselectedStudentId === s.user_id ? 'selected' : ''}>${s.first_name} ${s.last_name} (${s.roll_number || s.user_id}${s.department_name ? ' - ' + s.department_name : ''})</option>`).join('');
        }
        const dateInput = document.getElementById('facultyDirectScheduleDate');
        if (dateInput) {
            dateInput.min = getTodayDateString();
            if (!dateInput.value) dateInput.value = getTodayDateString();
        }
        openM('facultyScheduleMeetingModal');
    };

    window.submitFacultyScheduleMeeting = async function () {
        const studentId = document.getElementById('facultyStudentSelect')?.value;
        const purpose = document.getElementById('facultyDirectPurpose')?.value;
        const description = document.getElementById('facultyDirectDescription')?.value;
        const scheduledDate = document.getElementById('facultyDirectScheduleDate')?.value;
        const scheduledStartTime = document.getElementById('facultyDirectStartTime')?.value;
        const scheduledEndTime = document.getElementById('facultyDirectEndTime')?.value;
        const meetingType = document.getElementById('facultyDirectMeetingType')?.value;
        const location = document.getElementById('facultyDirectLocation')?.value;
        const meetingLink = document.getElementById('facultyDirectMeetLink')?.value;
        const facultyRemarks = document.getElementById('facultyDirectRemarks')?.value;

        if (!studentId || !purpose) {
            notify('Please select a student and specify meeting purpose.', 'warning');
            return;
        }

        if (!validateMeetingDateTime(scheduledDate, scheduledStartTime, scheduledEndTime)) {
            return;
        }

        if (meetingType === 'ONLINE' && (!meetingLink || !meetingLink.trim())) {
            notify('Please enter a Google Meet link for online meetings.', 'warning');
            return;
        }

        try {
            await api('/meetings/faculty-schedule', {
                method: 'POST',
                body: JSON.stringify({
                    studentId,
                    purpose,
                    description,
                    scheduledDate,
                    scheduledStartTime,
                    scheduledEndTime,
                    meetingType,
                    location: meetingType === 'IN_PERSON' ? location : undefined,
                    meetingLink: meetingType === 'ONLINE' ? meetingLink : undefined,
                    facultyRemarks,
                })
            });
            notify('Meeting scheduled successfully! Student has been notified.');
            closeM('facultyScheduleMeetingModal');
            window.renderFacultyDashboardMeetings();
        } catch (e) {
            notify(e.message || 'Failed to schedule meeting', 'error');
        }
    };

    // Generic openMeetingModal bridge
    window.openMeetingModal = function (studentId, name) {
        const user = window.Auth ? window.Auth.getUser() : null;
        if (user && user.role === 'faculty') {
            window.openFacultyScheduleModal(studentId);
        } else {
            window.openStudentRequestModal();
        }
    };

    // --- Student: Reschedule Modal ---
    let currentRescheduleMeetingId = null;
    window.openStudentRescheduleModal = function (id, currDate, currStart, currEnd) {
        currentRescheduleMeetingId = id;
        const d = document.getElementById('studentReschedDate');
        const s = document.getElementById('studentReschedStart');
        const e = document.getElementById('studentReschedEnd');
        if (d) { d.value = currDate || ''; d.min = new Date().toISOString().split('T')[0]; }
        if (s) s.value = currStart || '';
        if (e) e.value = currEnd || '';
        openM('studentRescheduleModal');
    };

    window.submitStudentReschedule = async function () {
        if (!currentRescheduleMeetingId) return;
        const proposedDate = document.getElementById('studentReschedDate')?.value;
        const proposedStartTime = document.getElementById('studentReschedStart')?.value;
        const proposedEndTime = document.getElementById('studentReschedEnd')?.value;
        const rescheduleReason = document.getElementById('studentReschedReason')?.value;

        if (!validateMeetingDateTime(proposedDate, proposedStartTime, proposedEndTime)) {
            return;
        }

        try {
            await api(`/meetings/${currentRescheduleMeetingId}/request-reschedule`, {
                method: 'PATCH',
                body: JSON.stringify({
                    proposedDate,
                    proposedStartTime,
                    proposedEndTime,
                    rescheduleReason,
                })
            });
            const curUser = window.Auth ? window.Auth.getUser() : null;
            const fromName = curUser ? `${curUser.first_name || ''} ${curUser.last_name || ''}`.trim() || 'Student' : 'Student';
            const m = currentMeetings.find(x => x.meeting_id === currentRescheduleMeetingId);
            if (m && m.faculty_id) {
                window.Notifications?.send?.(
                    m.faculty_id,
                    fromName,
                    `🔄 Meeting Reschedule Request: Student requested new slot on ${proposedDate} at ${proposedStartTime}–${proposedEndTime}. Reason: "${rescheduleReason || 'Schedule clash'}".`,
                    'meeting'
                );
            }
            notify('Reschedule request sent to faculty.');
            closeM('studentRescheduleModal');
            window.renderStudentMeetings();
        } catch (e) {
            notify(e.message || 'Failed to request reschedule', 'error');
        }
    };

    // --- Student: Accept / Decline Faculty Reschedule ---
    window.studentAcceptReschedule = async function (id) {
        try {
            await api(`/meetings/${id}/accept-reschedule`, { method: 'PATCH' });
            notify('Faculty proposed schedule confirmed! Meeting is scheduled.');
            window.renderStudentMeetings();
        } catch (e) {
            notify(e.message || 'Failed to confirm schedule', 'error');
        }
    };

    window.studentDeclineReschedule = async function (id) {
        try {
            await api(`/meetings/${id}/decline-reschedule`, { method: 'PATCH' });
            notify('Proposal declined. Meeting returned to pending status.');
            window.renderStudentMeetings();
        } catch (e) {
            notify(e.message || 'Failed to decline proposal', 'error');
        }
    };

    // --- Student/Faculty: Cancel Meeting ---
    window.cancelMeeting = async function (id) {
        if (!confirm('Are you sure you want to cancel this meeting?')) return;
        try {
            await api(`/meetings/${id}/cancel`, { method: 'PATCH' });
            notify('Meeting cancelled.');
            const user = window.Auth ? window.Auth.getUser() : null;
            if (user && user.role === 'faculty') window.renderFacultyDashboardMeetings();
            else window.renderStudentMeetings();
        } catch (e) {
            notify(e.message || 'Failed to cancel meeting', 'error');
        }
    };

    // --- Faculty: Accept Meeting Modal ---
    let currentAcceptId = null;
    window.openFacultyAcceptModal = function (id, reqDate, reqStart, reqEnd, mode) {
        currentAcceptId = id;
        const d = document.getElementById('facultyAcceptDate');
        const s = document.getElementById('facultyAcceptStart');
        const e = document.getElementById('facultyAcceptEnd');
        const m = document.getElementById('facultyAcceptMode');
        const linkBox = document.getElementById('facultyAcceptLinkBox');
        const locBox = document.getElementById('facultyAcceptLocBox');

        if (d) { d.value = reqDate || ''; d.min = getTodayDateString(); }
        if (s) s.value = reqStart || '';
        if (e) e.value = reqEnd || '';
        if (m) m.value = mode || 'ONLINE';
        if (linkBox && locBox) {
            linkBox.style.display = mode === 'ONLINE' ? 'block' : 'none';
            locBox.style.display = mode === 'IN_PERSON' ? 'block' : 'none';
        }
        openM('facultyAcceptModal');
    };

    window.submitFacultyAccept = async function () {
        if (!currentAcceptId) return;
        const scheduledDate = document.getElementById('facultyAcceptDate')?.value;
        const scheduledStartTime = document.getElementById('facultyAcceptStart')?.value;
        const scheduledEndTime = document.getElementById('facultyAcceptEnd')?.value;
        const meetingType = document.getElementById('facultyAcceptMode')?.value;
        const meetingLink = document.getElementById('facultyAcceptLink')?.value;
        const location = document.getElementById('facultyAcceptLoc')?.value;
        const facultyRemarks = document.getElementById('facultyAcceptRemarks')?.value;

        if (!validateMeetingDateTime(scheduledDate, scheduledStartTime, scheduledEndTime)) {
            return;
        }

        if (meetingType === 'ONLINE' && (!meetingLink || !meetingLink.trim())) {
            notify('Please enter a Google Meet link for online meetings.', 'warning');
            return;
        }

        try {
            await api(`/meetings/${currentAcceptId}/accept`, {
                method: 'PATCH',
                body: JSON.stringify({
                    scheduledDate,
                    scheduledStartTime,
                    scheduledEndTime,
                    meetingType,
                    meetingLink: meetingType === 'ONLINE' ? meetingLink : undefined,
                    location: meetingType === 'IN_PERSON' ? location : undefined,
                    facultyRemarks,
                })
            });
            notify('Meeting scheduled successfully! Student notified.');
            closeM('facultyAcceptModal');
            window.renderFacultyDashboardMeetings();
        } catch (e) {
            notify(e.message || 'Failed to accept meeting', 'error');
        }
    };

    // --- Faculty: Ask to Reschedule ---
    let currentAskReschedId = null;
    window.openFacultyAskRescheduleModal = function (id, reqDate, reqStart, reqEnd) {
        currentAskReschedId = id;
        const d = document.getElementById('facultyAskDate');
        const s = document.getElementById('facultyAskStart');
        const e = document.getElementById('facultyAskEnd');
        if (d) { d.value = reqDate || ''; d.min = getTodayDateString(); }
        if (s) s.value = reqStart || '';
        if (e) e.value = reqEnd || '';
        openM('facultyAskRescheduleModal');
    };

    window.submitFacultyAskReschedule = async function () {
        if (!currentAskReschedId) return;
        const proposedDate = document.getElementById('facultyAskDate')?.value;
        const proposedStartTime = document.getElementById('facultyAskStart')?.value;
        const proposedEndTime = document.getElementById('facultyAskEnd')?.value;
        const rescheduleReason = document.getElementById('facultyAskReason')?.value;

        if (!validateMeetingDateTime(proposedDate, proposedStartTime, proposedEndTime)) {
            return;
        }

        try {
            await api(`/meetings/${currentAskReschedId}/ask-reschedule`, {
                method: 'PATCH',
                body: JSON.stringify({
                    proposedDate,
                    proposedStartTime,
                    proposedEndTime,
                    rescheduleReason,
                })
            });
            notify('Reschedule proposal sent to student.');
            closeM('facultyAskRescheduleModal');
            window.renderFacultyDashboardMeetings();
        } catch (e) {
            notify(e.message || 'Failed to send proposal', 'error');
        }
    };

    // --- Faculty: Deny Modal ---
    let currentDenyId = null;
    window.openFacultyDenyModal = function (id) {
        currentDenyId = id;
        openM('facultyDenyModal');
    };

    window.submitFacultyDeny = async function () {
        if (!currentDenyId) return;
        const reason = document.getElementById('facultyDenyReason')?.value;
        if (!reason || !reason.trim()) {
            notify('Please provide a reason for denial.', 'warning');
            return;
        }

        try {
            await api(`/meetings/${currentDenyId}/deny`, {
                method: 'PATCH',
                body: JSON.stringify({ reason })
            });
            notify('Meeting request denied.');
            closeM('facultyDenyModal');
            window.renderFacultyDashboardMeetings();
        } catch (e) {
            notify(e.message || 'Failed to deny meeting', 'error');
        }
    };

    // --- Faculty: Handle Student Reschedule ---
    window.facultyAcceptStudentReschedule = async function (id) {
        try {
            await api(`/meetings/${id}/handle-student-reschedule`, {
                method: 'PATCH',
                body: JSON.stringify({ action: 'ACCEPT' })
            });
            notify('Student proposed schedule accepted! Meeting is confirmed.');
            window.renderFacultyDashboardMeetings();
        } catch (e) {
            notify(e.message || 'Failed to accept reschedule', 'error');
        }
    };

    window.facultyDenyStudentReschedule = async function (id) {
        try {
            await api(`/meetings/${id}/handle-student-reschedule`, {
                method: 'PATCH',
                body: JSON.stringify({ action: 'DENY', denialReason: 'Original schedule retained' })
            });
            notify('Reschedule request denied; original schedule remains active.');
            window.renderFacultyDashboardMeetings();
        } catch (e) {
            notify(e.message || 'Failed to deny reschedule', 'error');
        }
    };

    let currentCounterId = null;
    window.openFacultyCounterProposeModal = function (id) {
        currentCounterId = id;
        const d = document.getElementById('facultyCounterDate');
        if (d) d.min = getTodayDateString();
        openM('facultyCounterProposeModal');
    };

    window.submitFacultyCounterPropose = async function () {
        if (!currentCounterId) return;
        const proposedDate = document.getElementById('facultyCounterDate')?.value;
        const proposedStartTime = document.getElementById('facultyCounterStart')?.value;
        const proposedEndTime = document.getElementById('facultyCounterEnd')?.value;
        const reason = document.getElementById('facultyCounterReason')?.value;

        if (!validateMeetingDateTime(proposedDate, proposedStartTime, proposedEndTime)) {
            return;
        }

        try {
            await api(`/meetings/${currentCounterId}/handle-student-reschedule`, {
                method: 'PATCH',
                body: JSON.stringify({
                    action: 'COUNTER_PROPOSE',
                    proposedDate,
                    proposedStartTime,
                    proposedEndTime,
                    rescheduleReason: reason,
                })
            });
            notify('Counter proposal sent to student.');
            closeM('facultyCounterProposeModal');
            window.renderFacultyDashboardMeetings();
        } catch (e) {
            notify(e.message || 'Failed to send counter proposal', 'error');
        }
    };

    // --- Faculty: Direct Reschedule Modal ---
    let currentDirectReschedId = null;
    window.openFacultyDirectRescheduleModal = function (id, schedDate, schedStart, schedEnd, mode, link, loc) {
        currentDirectReschedId = id;
        const d = document.getElementById('facultyDirectDate');
        const s = document.getElementById('facultyDirectStart');
        const e = document.getElementById('facultyDirectEnd');
        const lk = document.getElementById('facultyDirectLink');
        const lc = document.getElementById('facultyDirectLoc');
        if (d) { d.value = schedDate || ''; d.min = getTodayDateString(); }
        if (s) s.value = schedStart || '';
        if (e) e.value = schedEnd || '';
        if (lk) lk.value = link || '';
        if (lc) lc.value = loc || '';
        openM('facultyDirectRescheduleModal');
    };

    window.submitFacultyDirectReschedule = async function () {
        if (!currentDirectReschedId) return;
        const scheduledDate = document.getElementById('facultyDirectDate')?.value;
        const scheduledStartTime = document.getElementById('facultyDirectStart')?.value;
        const scheduledEndTime = document.getElementById('facultyDirectEnd')?.value;
        const rescheduleReason = document.getElementById('facultyDirectReason')?.value;
        const meetingLink = document.getElementById('facultyDirectLink')?.value;
        const location = document.getElementById('facultyDirectLoc')?.value;

        if (!validateMeetingDateTime(scheduledDate, scheduledStartTime, scheduledEndTime)) {
            return;
        }

        try {
            await api(`/meetings/${currentDirectReschedId}/reschedule`, {
                method: 'PATCH',
                body: JSON.stringify({
                    scheduledDate,
                    scheduledStartTime,
                    scheduledEndTime,
                    rescheduleReason,
                    meetingLink: meetingLink || undefined,
                    location: location || undefined,
                })
            });
            notify('Meeting schedule updated directly.');
            closeM('facultyDirectRescheduleModal');
            window.renderFacultyDashboardMeetings();
        } catch (e) {
            notify(e.message || 'Failed to reschedule meeting', 'error');
        }
    };

    // --- Faculty: Complete Meeting Modal ---
    let currentCompleteId = null;
    window.openFacultyCompleteModal = function (id) {
        currentCompleteId = id;
        openM('facultyCompleteModal');
    };

    window.submitFacultyComplete = async function () {
        if (!currentCompleteId) return;
        const discussionNotes = document.getElementById('completeNotes')?.value;
        const outcome = document.getElementById('completeOutcome')?.value;
        const actionItems = document.getElementById('completeActionItems')?.value;
        const facultyRemarks = document.getElementById('completeRemarks')?.value;

        try {
            await api(`/meetings/${currentCompleteId}/complete`, {
                method: 'PATCH',
                body: JSON.stringify({
                    discussionNotes,
                    outcome,
                    actionItems,
                    facultyRemarks,
                })
            });
            notify('Meeting marked as COMPLETED.');
            closeM('facultyCompleteModal');
            window.renderFacultyDashboardMeetings();
        } catch (e) {
            notify(e.message || 'Failed to complete meeting', 'error');
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // 6. INJECT MODALS INTO DOCUMENT DOM
    // ─────────────────────────────────────────────────────────────────────────

    function injectModals() {
        if (document.getElementById('meetingsModalsContainer')) return;
        const wrapper = document.createElement('div');
        wrapper.id = 'meetingsModalsContainer';
        wrapper.innerHTML = `
            <!-- Student: Request Meeting Modal -->
            <div id="studentRequestMeetingModal" class="modal-overlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9998;align-items:center;justify-content:center;">
                <div style="background:#fff;border-radius:16px;padding:28px;width:520px;max-width:92vw;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.2);">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
                        <h3 style="margin:0;font-size:18px;font-weight:700;color:#0f172a;">📅 Request Faculty Meeting</h3>
                        <button onclick="closeModal('studentRequestMeetingModal')" style="border:none;background:none;font-size:20px;cursor:pointer;color:#64748b;">✕</button>
                    </div>

                    <div style="margin-bottom:12px;">
                        <label style="display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:4px;">Select Faculty Member *</label>
                        <select id="reqFacultySelect" style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px;font-size:14px;box-sizing:border-box;"></select>
                    </div>

                    <div style="margin-bottom:12px;">
                        <label style="display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:4px;">Meeting Purpose *</label>
                        <select id="reqMeetingPurpose" style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px;font-size:14px;box-sizing:border-box;">
                            <option value="Academic Guidance">Academic Guidance</option>
                            <option value="Project Review">Project Review</option>
                            <option value="Research Discussion">Research Discussion</option>
                            <option value="Marks / Assessment Query">Marks / Assessment Query</option>
                            <option value="Leave / Attendance Issue">Leave / Attendance Issue</option>
                            <option value="Course Feedback">Course Feedback</option>
                            <option value="Career Guidance">Career Guidance</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    <div style="margin-bottom:12px;">
                        <label style="display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:4px;">Description / Discussion Topics</label>
                        <textarea id="reqMeetingDescription" rows="3" placeholder="Briefly describe what you'd like to discuss..." style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px;font-size:14px;box-sizing:border-box;"></textarea>
                    </div>

                    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px;">
                        <div>
                            <label style="display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:4px;">Date *</label>
                            <input type="date" id="reqMeetingDate" style="width:100%;padding:9px;border:1px solid #cbd5e1;border-radius:8px;font-size:13px;box-sizing:border-box;">
                        </div>
                        <div>
                            <label style="display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:4px;">Start Time *</label>
                            <input type="time" id="reqMeetingStartTime" value="10:00" style="width:100%;padding:9px;border:1px solid #cbd5e1;border-radius:8px;font-size:13px;box-sizing:border-box;">
                        </div>
                        <div>
                            <label style="display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:4px;">End Time *</label>
                            <input type="time" id="reqMeetingEndTime" value="10:30" style="width:100%;padding:9px;border:1px solid #cbd5e1;border-radius:8px;font-size:13px;box-sizing:border-box;">
                        </div>
                    </div>

                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:18px;">
                        <div>
                            <label style="display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:4px;">Meeting Mode</label>
                            <select id="reqMeetingType" onchange="document.getElementById('reqLocationBox').style.display=this.value==='IN_PERSON'?'block':'none';" style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px;font-size:14px;box-sizing:border-box;">
                                <option value="ONLINE">🌐 Online (Google Meet)</option>
                                <option value="IN_PERSON">📍 In-Person</option>
                            </select>
                        </div>
                        <div id="reqLocationBox" style="display:none;">
                            <label style="display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:4px;">Proposed Location</label>
                            <input type="text" id="reqMeetingLocation" placeholder="e.g. Faculty Cabin" style="width:100%;padding:9px;border:1px solid #cbd5e1;border-radius:8px;font-size:13px;box-sizing:border-box;">
                        </div>
                    </div>

                    <div style="display:flex;gap:10px;">
                        <button onclick="window.submitStudentMeetingRequest()" style="flex:2;padding:11px;background:linear-gradient(135deg,#2563eb,#3b82f6);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700;font-size:14px;">Submit Request</button>
                        <button onclick="closeModal('studentRequestMeetingModal')" style="flex:1;padding:11px;background:#f1f5f9;color:#475569;border:1px solid #cbd5e1;border-radius:8px;cursor:pointer;font-weight:600;font-size:14px;">Cancel</button>
                    </div>
                </div>
            </div>

            <!-- Faculty: Direct Schedule Meeting Modal -->
            <div id="facultyScheduleMeetingModal" class="modal-overlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9998;align-items:center;justify-content:center;">
                <div style="background:#fff;border-radius:16px;padding:28px;width:540px;max-width:92vw;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.2);">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
                        <h3 style="margin:0;font-size:18px;font-weight:700;color:#0f172a;">📅 Schedule Meeting with Student</h3>
                        <button onclick="closeModal('facultyScheduleMeetingModal')" style="border:none;background:none;font-size:20px;cursor:pointer;color:#64748b;">✕</button>
                    </div>

                    <div style="margin-bottom:12px;">
                        <label style="display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:4px;">Select Student *</label>
                        <select id="facultyStudentSelect" style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px;font-size:14px;box-sizing:border-box;"></select>
                    </div>

                    <div style="margin-bottom:12px;">
                        <label style="display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:4px;">Meeting Purpose / Topic *</label>
                        <input type="text" id="facultyDirectPurpose" placeholder="e.g. Project Progress Review" style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px;font-size:14px;box-sizing:border-box;">
                    </div>

                    <div style="margin-bottom:12px;">
                        <label style="display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:4px;">Description / Agenda</label>
                        <textarea id="facultyDirectDescription" rows="2" placeholder="Discussion points or preparation requirements..." style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px;font-size:14px;box-sizing:border-box;"></textarea>
                    </div>

                    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px;">
                        <div>
                            <label style="display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:4px;">Date *</label>
                            <input type="date" id="facultyDirectScheduleDate" style="width:100%;padding:9px;border:1px solid #cbd5e1;border-radius:8px;font-size:13px;box-sizing:border-box;">
                        </div>
                        <div>
                            <label style="display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:4px;">Start Time *</label>
                            <input type="time" id="facultyDirectStartTime" value="11:00" style="width:100%;padding:9px;border:1px solid #cbd5e1;border-radius:8px;font-size:13px;box-sizing:border-box;">
                        </div>
                        <div>
                            <label style="display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:4px;">End Time *</label>
                            <input type="time" id="facultyDirectEndTime" value="11:30" style="width:100%;padding:9px;border:1px solid #cbd5e1;border-radius:8px;font-size:13px;box-sizing:border-box;">
                        </div>
                    </div>

                    <div style="margin-bottom:12px;">
                        <label style="display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:4px;">Meeting Mode</label>
                        <select id="facultyDirectMeetingType" onchange="const isOnline=this.value==='ONLINE'; document.getElementById('facultyDirectMeetBox').style.display=isOnline?'block':'none'; document.getElementById('facultyDirectLocBox').style.display=isOnline?'none':'block';" style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px;font-size:14px;box-sizing:border-box;">
                            <option value="ONLINE">🌐 Online (Google Meet)</option>
                            <option value="IN_PERSON">📍 In-Person</option>
                        </select>
                    </div>

                    <div id="facultyDirectMeetBox" style="margin-bottom:12px;">
                        <label style="display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:4px;">Google Meet Link *</label>
                        <input type="url" id="facultyDirectMeetLink" placeholder="https://meet.google.com/abc-defg-hij" value="https://meet.google.com/" style="width:100%;padding:9px;border:1px solid #cbd5e1;border-radius:8px;font-size:13px;box-sizing:border-box;">
                    </div>

                    <div id="facultyDirectLocBox" style="margin-bottom:12px;display:none;">
                        <label style="display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:4px;">Location / Room</label>
                        <input type="text" id="facultyDirectLocation" placeholder="e.g. Faculty Cabin 304" style="width:100%;padding:9px;border:1px solid #cbd5e1;border-radius:8px;font-size:13px;box-sizing:border-box;">
                    </div>

                    <div style="margin-bottom:18px;">
                        <label style="display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:4px;">Remarks for Student (Optional)</label>
                        <input type="text" id="facultyDirectRemarks" placeholder="e.g. Please bring draft slides and report" style="width:100%;padding:9px;border:1px solid #cbd5e1;border-radius:8px;font-size:13px;box-sizing:border-box;">
                    </div>

                    <div style="display:flex;gap:10px;">
                        <button onclick="window.submitFacultyScheduleMeeting()" style="flex:2;padding:11px;background:linear-gradient(135deg,#2563eb,#3b82f6);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700;font-size:14px;">Confirm & Schedule</button>
                        <button onclick="closeModal('facultyScheduleMeetingModal')" style="flex:1;padding:11px;background:#f1f5f9;color:#475569;border:1px solid #cbd5e1;border-radius:8px;cursor:pointer;font-weight:600;font-size:14px;">Cancel</button>
                    </div>
                </div>
            </div>

            <!-- Student: Request Reschedule Modal -->
            <div id="studentRescheduleModal" class="modal-overlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9998;align-items:center;justify-content:center;">
                <div style="background:#fff;border-radius:16px;padding:28px;width:460px;max-width:92vw;box-shadow:0 20px 60px rgba(0,0,0,0.2);">
                    <h3 style="margin:0 0 16px;font-size:18px;font-weight:700;color:#0f172a;">🔄 Request Reschedule</h3>
                    <p style="font-size:13px;color:#64748b;margin-bottom:14px;">Propose a new date and time for your confirmed meeting with faculty.</p>
                    
                    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px;">
                        <div>
                            <label style="display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:4px;">Date *</label>
                            <input type="date" id="studentReschedDate" style="width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:8px;font-size:13px;box-sizing:border-box;">
                        </div>
                        <div>
                            <label style="display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:4px;">Start *</label>
                            <input type="time" id="studentReschedStart" style="width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:8px;font-size:13px;box-sizing:border-box;">
                        </div>
                        <div>
                            <label style="display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:4px;">End *</label>
                            <input type="time" id="studentReschedEnd" style="width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:8px;font-size:13px;box-sizing:border-box;">
                        </div>
                    </div>

                    <div style="margin-bottom:16px;">
                        <label style="display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:4px;">Reason for Reschedule *</label>
                        <textarea id="studentReschedReason" rows="2" placeholder="e.g. Class schedule clash, exam..." style="width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:8px;font-size:13px;box-sizing:border-box;"></textarea>
                    </div>

                    <div style="display:flex;gap:10px;">
                        <button onclick="window.submitStudentReschedule()" style="flex:2;padding:10px;background:#4f46e5;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700;">Submit Request</button>
                        <button onclick="closeModal('studentRescheduleModal')" style="flex:1;padding:10px;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:8px;cursor:pointer;font-weight:600;">Cancel</button>
                    </div>
                </div>
            </div>

            <!-- Faculty: Accept Request Modal -->
            <div id="facultyAcceptModal" class="modal-overlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9998;align-items:center;justify-content:center;">
                <div style="background:#fff;border-radius:16px;padding:28px;width:500px;max-width:92vw;box-shadow:0 20px 60px rgba(0,0,0,0.2);">
                    <h3 style="margin:0 0 16px;font-size:18px;font-weight:700;color:#15803d;">✓ Accept & Schedule Meeting</h3>
                    
                    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px;">
                        <div>
                            <label style="display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:4px;">Date *</label>
                            <input type="date" id="facultyAcceptDate" style="width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:8px;font-size:13px;box-sizing:border-box;">
                        </div>
                        <div>
                            <label style="display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:4px;">Start *</label>
                            <input type="time" id="facultyAcceptStart" style="width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:8px;font-size:13px;box-sizing:border-box;">
                        </div>
                        <div>
                            <label style="display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:4px;">End *</label>
                            <input type="time" id="facultyAcceptEnd" style="width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:8px;font-size:13px;box-sizing:border-box;">
                        </div>
                    </div>

                    <div style="margin-bottom:12px;">
                        <label style="display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:4px;">Mode</label>
                        <select id="facultyAcceptMode" onchange="const isOnline=this.value==='ONLINE'; document.getElementById('facultyAcceptLinkBox').style.display=isOnline?'block':'none'; document.getElementById('facultyAcceptLocBox').style.display=isOnline?'none':'block';" style="width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:8px;font-size:13px;box-sizing:border-box;">
                            <option value="ONLINE">🌐 Online (Google Meet)</option>
                            <option value="IN_PERSON">📍 In-Person</option>
                        </select>
                    </div>

                    <div id="facultyAcceptLinkBox" style="margin-bottom:12px;">
                        <label style="display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:4px;">Google Meet Link *</label>
                        <input type="url" id="facultyAcceptLink" placeholder="https://meet.google.com/abc-defg-hij" value="https://meet.google.com/" style="width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:8px;font-size:13px;box-sizing:border-box;">
                    </div>

                    <div id="facultyAcceptLocBox" style="margin-bottom:12px;display:none;">
                        <label style="display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:4px;">Location / Room</label>
                        <input type="text" id="facultyAcceptLoc" placeholder="e.g. Faculty Room 204" style="width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:8px;font-size:13px;box-sizing:border-box;">
                    </div>

                    <div style="margin-bottom:16px;">
                        <label style="display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:4px;">Remarks for Student (Optional)</label>
                        <input type="text" id="facultyAcceptRemarks" placeholder="e.g. Please bring draft slides" style="width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:8px;font-size:13px;box-sizing:border-box;">
                    </div>

                    <div style="display:flex;gap:10px;">
                        <button onclick="window.submitFacultyAccept()" style="flex:2;padding:10px;background:#16a34a;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700;">Confirm & Schedule</button>
                        <button onclick="closeModal('facultyAcceptModal')" style="flex:1;padding:10px;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:8px;cursor:pointer;font-weight:600;">Cancel</button>
                    </div>
                </div>
            </div>

            <!-- Faculty: Ask Reschedule Modal -->
            <div id="facultyAskRescheduleModal" class="modal-overlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9998;align-items:center;justify-content:center;">
                <div style="background:#fff;border-radius:16px;padding:28px;width:460px;max-width:92vw;box-shadow:0 20px 60px rgba(0,0,0,0.2);">
                    <h3 style="margin:0 0 16px;font-size:18px;font-weight:700;color:#d97706;">🔄 Propose Alternative Time</h3>
                    <p style="font-size:13px;color:#64748b;margin-bottom:14px;">Suggest a different date and time to the student for this meeting.</p>

                    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px;">
                        <div>
                            <label style="display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:4px;">Date *</label>
                            <input type="date" id="facultyAskDate" style="width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:8px;font-size:13px;box-sizing:border-box;">
                        </div>
                        <div>
                            <label style="display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:4px;">Start *</label>
                            <input type="time" id="facultyAskStart" style="width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:8px;font-size:13px;box-sizing:border-box;">
                        </div>
                        <div>
                            <label style="display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:4px;">End *</label>
                            <input type="time" id="facultyAskEnd" style="width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:8px;font-size:13px;box-sizing:border-box;">
                        </div>
                    </div>

                    <div style="margin-bottom:16px;">
                        <label style="display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:4px;">Reason for Alternative Time</label>
                        <input type="text" id="facultyAskReason" placeholder="e.g. Department meeting scheduled in morning" style="width:100%;padding:9px;border:1px solid #cbd5e1;border-radius:8px;font-size:13px;box-sizing:border-box;">
                    </div>

                    <div style="display:flex;gap:10px;">
                        <button onclick="window.submitFacultyAskReschedule()" style="flex:2;padding:10px;background:#d97706;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700;">Send Proposal</button>
                        <button onclick="closeModal('facultyAskRescheduleModal')" style="flex:1;padding:10px;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:8px;cursor:pointer;font-weight:600;">Cancel</button>
                    </div>
                </div>
            </div>

            <!-- Faculty: Deny Modal -->
            <div id="facultyDenyModal" class="modal-overlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9998;align-items:center;justify-content:center;">
                <div style="background:#fff;border-radius:16px;padding:28px;width:440px;max-width:92vw;box-shadow:0 20px 60px rgba(0,0,0,0.2);">
                    <h3 style="margin:0 0 14px;font-size:18px;font-weight:700;color:#dc2626;">✕ Deny Meeting Request</h3>
                    <p style="font-size:13px;color:#64748b;margin-bottom:14px;">Please provide a reason to the student for denying this request.</p>

                    <div style="margin-bottom:16px;">
                        <label style="display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:4px;">Reason for Denial *</label>
                        <textarea id="facultyDenyReason" rows="3" placeholder="e.g. Out of station for academic conference" style="width:100%;padding:9px;border:1px solid #cbd5e1;border-radius:8px;font-size:13px;box-sizing:border-box;"></textarea>
                    </div>

                    <div style="display:flex;gap:10px;">
                        <button onclick="window.submitFacultyDeny()" style="flex:2;padding:10px;background:#dc2626;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700;">Deny Request</button>
                        <button onclick="closeModal('facultyDenyModal')" style="flex:1;padding:10px;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:8px;cursor:pointer;font-weight:600;">Cancel</button>
                    </div>
                </div>
            </div>

            <!-- Faculty: Direct Reschedule Modal -->
            <div id="facultyDirectRescheduleModal" class="modal-overlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9998;align-items:center;justify-content:center;">
                <div style="background:#fff;border-radius:16px;padding:28px;width:480px;max-width:92vw;box-shadow:0 20px 60px rgba(0,0,0,0.2);">
                    <h3 style="margin:0 0 16px;font-size:18px;font-weight:700;color:#4f46e5;">🔄 Update Meeting Schedule</h3>
                    
                    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px;">
                        <div>
                            <label style="display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:4px;">New Date *</label>
                            <input type="date" id="facultyDirectDate" style="width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:8px;font-size:13px;box-sizing:border-box;">
                        </div>
                        <div>
                            <label style="display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:4px;">Start *</label>
                            <input type="time" id="facultyDirectStart" style="width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:8px;font-size:13px;box-sizing:border-box;">
                        </div>
                        <div>
                            <label style="display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:4px;">End *</label>
                            <input type="time" id="facultyDirectEnd" style="width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:8px;font-size:13px;box-sizing:border-box;">
                        </div>
                    </div>

                    <div style="margin-bottom:12px;">
                        <label style="display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:4px;">Reason for Rescheduling</label>
                        <input type="text" id="facultyDirectReason" placeholder="e.g. Schedule conflict" style="width:100%;padding:9px;border:1px solid #cbd5e1;border-radius:8px;font-size:13px;box-sizing:border-box;">
                    </div>

                    <div style="margin-bottom:12px;">
                        <label style="display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:4px;">Updated Meet Link (If Online)</label>
                        <input type="url" id="facultyDirectLink" placeholder="https://meet.google.com/..." style="width:100%;padding:9px;border:1px solid #cbd5e1;border-radius:8px;font-size:13px;box-sizing:border-box;">
                    </div>

                    <div style="margin-bottom:16px;">
                        <label style="display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:4px;">Updated Location (If In-Person)</label>
                        <input type="text" id="facultyDirectLoc" placeholder="e.g. Faculty Room 102" style="width:100%;padding:9px;border:1px solid #cbd5e1;border-radius:8px;font-size:13px;box-sizing:border-box;">
                    </div>

                    <div style="display:flex;gap:10px;">
                        <button onclick="window.submitFacultyDirectReschedule()" style="flex:2;padding:10px;background:#4f46e5;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700;">Update Schedule</button>
                        <button onclick="closeModal('facultyDirectRescheduleModal')" style="flex:1;padding:10px;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:8px;cursor:pointer;font-weight:600;">Cancel</button>
                    </div>
                </div>
            </div>

            <!-- Faculty: Counter Propose Modal -->
            <div id="facultyCounterProposeModal" class="modal-overlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9998;align-items:center;justify-content:center;">
                <div style="background:#fff;border-radius:16px;padding:28px;width:460px;max-width:92vw;box-shadow:0 20px 60px rgba(0,0,0,0.2);">
                    <h3 style="margin:0 0 16px;font-size:18px;font-weight:700;color:#4f46e5;">🔄 Propose Counter Time Slot</h3>
                    
                    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px;">
                        <div>
                            <label style="display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:4px;">Date *</label>
                            <input type="date" id="facultyCounterDate" style="width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:8px;font-size:13px;box-sizing:border-box;">
                        </div>
                        <div>
                            <label style="display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:4px;">Start *</label>
                            <input type="time" id="facultyCounterStart" style="width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:8px;font-size:13px;box-sizing:border-box;">
                        </div>
                        <div>
                            <label style="display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:4px;">End *</label>
                            <input type="time" id="facultyCounterEnd" style="width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:8px;font-size:13px;box-sizing:border-box;">
                        </div>
                    </div>

                    <div style="margin-bottom:16px;">
                        <label style="display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:4px;">Reason</label>
                        <input type="text" id="facultyCounterReason" placeholder="e.g. Free after 2 PM" style="width:100%;padding:9px;border:1px solid #cbd5e1;border-radius:8px;font-size:13px;box-sizing:border-box;">
                    </div>

                    <div style="display:flex;gap:10px;">
                        <button onclick="window.submitFacultyCounterPropose()" style="flex:2;padding:10px;background:#6366f1;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700;">Send Counter Proposal</button>
                        <button onclick="closeModal('facultyCounterProposeModal')" style="flex:1;padding:10px;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:8px;cursor:pointer;font-weight:600;">Cancel</button>
                    </div>
                </div>
            </div>

            <!-- Faculty: Complete Meeting Modal -->
            <div id="facultyCompleteModal" class="modal-overlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9998;align-items:center;justify-content:center;">
                <div style="background:#fff;border-radius:16px;padding:28px;width:520px;max-width:92vw;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.2);">
                    <h3 style="margin:0 0 14px;font-size:18px;font-weight:700;color:#059669;">✓ Mark Meeting as Completed</h3>
                    <p style="font-size:13px;color:#64748b;margin-bottom:14px;">Record outcomes, discussion notes, and action items for this meeting session.</p>

                    <div style="margin-bottom:12px;">
                        <label style="display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:4px;">Discussion Notes</label>
                        <textarea id="completeNotes" rows="3" placeholder="Key topics covered during the meeting..." style="width:100%;padding:9px;border:1px solid #cbd5e1;border-radius:8px;font-size:13px;box-sizing:border-box;"></textarea>
                    </div>

                    <div style="margin-bottom:12px;">
                        <label style="display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:4px;">Outcome / Conclusions</label>
                        <textarea id="completeOutcome" rows="2" placeholder="Outcomes reached..." style="width:100%;padding:9px;border:1px solid #cbd5e1;border-radius:8px;font-size:13px;box-sizing:border-box;"></textarea>
                    </div>

                    <div style="margin-bottom:12px;">
                        <label style="display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:4px;">Action Items for Student</label>
                        <textarea id="completeActionItems" rows="2" placeholder="Next steps and deliverables agreed upon..." style="width:100%;padding:9px;border:1px solid #cbd5e1;border-radius:8px;font-size:13px;box-sizing:border-box;"></textarea>
                    </div>

                    <div style="margin-bottom:16px;">
                        <label style="display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:4px;">Faculty Remarks</label>
                        <input type="text" id="completeRemarks" placeholder="e.g. Good progress on Phase 1" style="width:100%;padding:9px;border:1px solid #cbd5e1;border-radius:8px;font-size:13px;box-sizing:border-box;">
                    </div>

                    <div style="display:flex;gap:10px;">
                        <button onclick="window.submitFacultyComplete()" style="flex:2;padding:10px;background:#059669;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700;">Complete Meeting</button>
                        <button onclick="closeModal('facultyCompleteModal')" style="flex:1;padding:10px;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:8px;cursor:pointer;font-weight:600;">Cancel</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(wrapper);
    }

    // Auto-initialize on load
    document.addEventListener('DOMContentLoaded', () => {
        injectModals();

        // Hook triggerViewRender to render meetings view when switched to
        const origTrigger = window.triggerViewRender;
        window.triggerViewRender = function (viewId) {
            if (typeof origTrigger === 'function') origTrigger(viewId);
            if (viewId === 'meetings-view') {
                const user = window.Auth ? window.Auth.getUser() : null;
                if (user && user.role === 'faculty') {
                    window.renderFacultyDashboardMeetings();
                } else {
                    window.renderStudentMeetings();
                }
            }
        };

        // If landing on meetings-view directly
        const active = document.querySelector('.view-section.active');
        if (active && active.id === 'meetings-view') {
            const user = window.Auth ? window.Auth.getUser() : null;
            if (user && user.role === 'faculty') window.renderFacultyDashboardMeetings();
            else window.renderStudentMeetings();
        }
    });

})();
