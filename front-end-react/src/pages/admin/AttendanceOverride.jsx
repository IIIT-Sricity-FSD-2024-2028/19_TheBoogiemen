/**
 * AttendanceOverride — two genuinely separate features stacked on one
 * legacy view, ported as-is:
 *
 * 1. renderAttendanceOverride() + updateLeave() — pending MEDICAL leave
 *    requests specifically (a filtered view of /leave, approved the same
 *    way any leave is approved). Static markup in super-user.html.
 * 2. renderAdminAttendanceRequests() + approveAttReq() — the real
 *    attendance-request workflow (course/date/reason/document). Injected
 *    into this view at runtime by fixes.js, not in the static markup (see
 *    faculty/Dashboard.jsx's notes on the same pattern).
 */

import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../api/client';
import { downloadDocument } from '../../api/uploads';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationsContext';

function MedicalOverrides() {
  const { user } = useAuth();
  const { showToast, send } = useNotifications();
  const [overrides, setOverrides] = useState(undefined);

  const load = () => {
    apiFetch('/leave')
      .then((leaves) => {
        // Case-insensitive: the student form posts "medical" while older
        // records store "Medical".
        setOverrides(leaves.filter((l) => String(l.leave_type || '').trim().toLowerCase() === 'medical' && String(l.status || '').trim().toLowerCase() === 'pending'));
      })
      .catch(() => setOverrides([]));
  };
  useEffect(load, []);

  const approve = async (l) => {
    try {
      await apiFetch(`/leave/${l.leave_id}`, { method: 'PATCH', body: JSON.stringify({ status: 'approved' }) });
      showToast('Leave approved ✅', 'success');
      const studentId = l.student_id || l.user_id;
      if (studentId) {
        const from = user?.first_name || 'Admin';
        send(studentId, from, `🗓 Your leave request has been APPROVED by ${from}. Enjoy your time off!`, 'info');
      }
      load();
    } catch {
      showToast('Failed', 'error');
    }
  };

  return (
    <div className="stats-card">
      <div className="stats-card-header"><h3>Attendance Override Requests</h3></div>
      <div className="stats-card-body" style={{ padding: 24 }}>
        {overrides === undefined ? null : overrides.length === 0 ? (
          <p style={{ color: '#64748b', textAlign: 'center' }}>No pending attendance overrides to review.</p>
        ) : (
          overrides.map((l) => (
            <div key={l.leave_id} style={{ padding: 12, border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600 }}>{l.student_name || l.student_id} (Medical)</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>Dates: {l.start_date} to {l.end_date}</div>
              </div>
              <button onClick={() => approve(l)} style={{ padding: '6px 12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
                Approve Override
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/**
 * ATTENDANCE_WORKFLOW_REVAMP: a single student submission now expands into
 * one row per (course, date) that actually has a class, sharing a
 * `group_id` — this groups them back for admin's review, so one request
 * reads as one request (its date range, reason, scope) with the affected
 * sessions listed underneath, rather than N unrelated-looking rows. A
 * legacy ungrouped row (no group_id) is just its own singleton group.
 */
function AttendanceRequests() {
  const { user } = useAuth();
  const { showToast, send, broadcast } = useNotifications();
  const [requests, setRequests] = useState(undefined);

  const load = () => apiFetch('/attendance-requests').then(setRequests).catch(() => setRequests([]));
  useEffect(() => {
    load();
  }, []);

  const groups = useMemo(() => {
    if (!requests) return [];
    const byGroup = new Map();
    requests.forEach((r) => {
      const key = r.group_id || r.request_id;
      if (!byGroup.has(key)) byGroup.set(key, []);
      byGroup.get(key).push(r);
    });
    return [...byGroup.entries()].map(([group_id, rows]) => ({ group_id, rows, first: rows[0] }));
  }, [requests]);

  const decideGroup = async (rows, status) => {
    try {
      await Promise.all(
        rows
          .filter((r) => r.admin_status === 'pending')
          .map((r) => apiFetch(`/attendance-request/${r.request_id}`, { method: 'PATCH', body: JSON.stringify({ status }) })),
      );
      const from = user?.first_name || 'Admin';
      const studentId = rows[0].student_id;
      send(studentId, from, status === 'approved' ? '✅ Your attendance request has been APPROVED. Faculty can now excuse the affected sessions.' : '❌ Your attendance request was REJECTED.', status === 'approved' ? 'info' : 'alert');
      // One notification per distinct faculty actually concerned — not a
      // broadcast, and never duplicated for a faculty teaching more than
      // one of the affected sessions.
      const facultyIds = new Set(rows.map((r) => r.faculty_id).filter(Boolean));
      facultyIds.forEach((fid) => send(fid, from, `📝 Attendance request ${status} for your student. ${status === 'approved' ? 'You can now excuse the session(s).' : ''}`, 'info'));
      broadcast('head', from, `📝 Attendance request ${status} for student.`, 'info');
      showToast(`Request ${status}! Student & Faculty notified.`, 'success');
      load();
    } catch (e) {
      showToast('Failed: ' + e.message, 'error');
    }
  };

  if (requests === undefined) return null;

  return (
    <div style={{ marginTop: 20, padding: 20, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12 }}>
      <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700 }}>📝 Student Attendance Requests</h3>
      {groups.length === 0 ? (
        <p style={{ color: '#64748b', textAlign: 'center' }}>No attendance requests.</p>
      ) : (
        groups.map(({ group_id, rows, first }) => {
          const pendingCount = rows.filter((r) => r.admin_status === 'pending').length;
          const sc = pendingCount === 0
            ? (rows.every((r) => r.admin_status === 'rejected') ? { bg: '#fef2f2', c: '#991b1b', lbl: 'Rejected' } : { bg: '#dcfce7', c: '#166534', lbl: 'Approved' })
            : { bg: '#fef9c3', c: '#92400e', lbl: `Pending (${pendingCount})` };
          const range = first.start_date && first.end_date && first.start_date !== first.end_date
            ? `${first.start_date} → ${first.end_date}` : (first.start_date || first.date);
          return (
            <div key={group_id} style={{ padding: 12, border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {first.student_name} <span style={{ color: '#64748b', fontSize: 12 }}>({rows.length} session{rows.length === 1 ? '' : 's'}{first.leave_type ? ' · ' + first.leave_type : ''})</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Dates: {range} · Reason: {first.reason}</div>
                  {first.file_id && (
                    <button
                      type="button"
                      onClick={() => downloadDocument(first.file_id).catch((e) => showToast('Failed to download: ' + e.message, 'error'))}
                      style={{ marginTop: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 6, cursor: 'pointer' }}
                    >
                      📎 View document
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.c }}>{sc.lbl}</span>
                  {pendingCount > 0 && (
                    <>
                      <button onClick={() => decideGroup(rows, 'approved')} style={{ padding: '5px 12px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>✓ Approve All</button>
                      <button onClick={() => decideGroup(rows, 'rejected')} style={{ padding: '5px 12px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>✕ Reject All</button>
                    </>
                  )}
                </div>
              </div>
              <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {rows.map((r) => (
                  <span key={r.request_id} title={r.faculty_name ? `Faculty: ${r.faculty_name}` : undefined} style={{ fontSize: 11, padding: '3px 8px', background: '#f1f5f9', borderRadius: 6, color: '#475569' }}>
                    {r.course_code} · {r.date}{r.section ? ` · Sec ${r.section}` : ''}
                  </span>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

export default function AttendanceOverride() {
  return (
    <>
      <MedicalOverrides />
      <AttendanceRequests />
    </>
  );
}
