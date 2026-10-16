/**
 * MarkAttendance — ported from legacy fixes.js renderMarkAttendanceTable() +
 * markAllAttendance() + submitAttendance() + renderFacultyAttendanceRequests()
 * + grantAttReq(). The attendance-requests section is injected into
 * mark-attendance-view at runtime by fixes.js, not in faculty.html's static
 * markup (same pattern as the dashboard widgets — see Dashboard.jsx's notes).
 *
 * One legacy quirk carried over faithfully, not fixed: the date field is
 * validated against "must equal today" and the actual POST body always
 * sends today's date regardless of what's selected — the picker is
 * effectively just required-but-ignored friction in the original too.
 */

import { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';
import { downloadDocument } from '../../api/uploads';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationsContext';

export default function MarkAttendance() {
  return (
    <div className="stats-card">
      <div className="stats-card-header"><h3>Mark Attendance</h3></div>
      <div className="stats-card-body" style={{ padding: 24 }}>
        <AttendanceForm />
      </div>
      <div style={{ padding: '0 24px 24px' }}>
        <AttendanceRequests />
      </div>
    </div>
  );
}

function AttendanceForm() {
  const { showToast } = useNotifications();
  const [courses, setCourses] = useState(null);
  const [courseId, setCourseId] = useState('');
  const [date, setDate] = useState('');
  const [students, setStudents] = useState(null); // null = nothing loaded, [] = loaded empty
  const [statuses, setStatuses] = useState({}); // user_id -> 'present' | 'absent'
  const [submitting, setSubmitting] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    apiFetch('/faculty/me/courses')
      .then(setCourses)
      .catch(() => setCourses([]));
  }, []);

  useEffect(() => {
    if (!courseId) {
      setStudents(null);
      return;
    }
    setStudents(null);
    apiFetch(`/faculty/attendance/today/${courseId}`)
      .then((data) => {
        setStudents(data.students || []);
        const init = {};
        (data.students || []).forEach((s) => {
          init[s.user_id] = s.today_status !== 'absent' ? 'present' : 'absent';
        });
        setStatuses(init);
      })
      .catch(() => setStudents([]));
  }, [courseId]);

  const markAll = (status) => {
    if (!students || students.length === 0) return showToast('Load students first by selecting a course', 'warning');
    const next = {};
    students.forEach((s) => {
      next[s.user_id] = status;
    });
    setStatuses(next);
    showToast(`All students marked as ${status}`, 'success');
  };

  const presentCount = students ? students.filter((s) => statuses[s.user_id] === 'present').length : 0;

  const submit = async () => {
    if (!courseId) return showToast('Select a course first', 'warning');
    if (!date) return showToast('Please select a date for attendance', 'warning');
    if (date > today) return showToast('Cannot mark attendance for future dates', 'warning');
    if (date < today) return showToast("Faculty cannot mark attendance for past dates. Use today's date only.", 'error');

    const records = Object.entries(statuses).map(([student_id, status]) => ({ student_id, status }));
    if (!records.length) return showToast('Please mark attendance for at least one student', 'warning');

    setSubmitting(true);
    try {
      await apiFetch('/faculty/attendance', { method: 'POST', body: JSON.stringify({ course_id: courseId, date: today, records }) });
      showToast(`Attendance saved for ${records.length} students! (Date: ${today})`, 'success');
    } catch (e) {
      showToast('Failed: ' + e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: 16, marginBottom: 24, alignItems: 'end' }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>Course</label>
          <select value={courseId} onChange={(e) => setCourseId(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14 }}>
            <option value="">{courses === null ? 'Loading…' : '— Select Course —'}</option>
            {courses?.map((c) => (
              <option key={c.course_id} value={c.course_id}>{c.course_code} - {c.course_name}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>Quick</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" onClick={() => markAll('present')} style={{ padding: '10px 12px', background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
              All Present
            </button>
            <button type="button" onClick={() => markAll('absent')} style={{ padding: '10px 12px', background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
              All Absent
            </button>
          </div>
        </div>
        <div>
          {students && students.length > 0 && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 700, color: '#16a34a', whiteSpace: 'nowrap' }}>
              {presentCount} of {students.length}
            </div>
          )}
        </div>
      </div>

      <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
        <table className="crud-table" style={{ margin: 0 }}>
          <thead>
            <tr>
              <th style={{ width: 40 }}>#</th>
              <th>Student Name</th>
              <th>ID</th>
              <th style={{ textAlign: 'center' }}>Attendance</th>
            </tr>
          </thead>
          <tbody>
            {!courseId ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', color: '#64748b', padding: 24 }}>Select a course above to load students</td></tr>
            ) : students === null ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', color: '#64748b', padding: 24 }}>Loading students...</td></tr>
            ) : students.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', color: '#64748b', padding: 24 }}>No students enrolled in this course</td></tr>
            ) : (
              students.map((s, i) => {
                const status = statuses[s.user_id];
                return (
                  <tr key={s.user_id}>
                    <td style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600 }}>{i + 1}</td>
                    <td><div style={{ fontWeight: 600, fontSize: 14 }}>{s.first_name} {s.last_name || ''}</div></td>
                    <td style={{ fontSize: 12, color: '#64748b' }}>{s.user_id}</td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', borderRadius: 10, overflow: 'hidden', border: '2px solid #e2e8f0' }}>
                        <button
                          type="button"
                          onClick={() => setStatuses((st) => ({ ...st, [s.user_id]: 'present' }))}
                          style={{ padding: '8px 20px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, background: status === 'present' ? '#16a34a' : '#f8fafc', color: status === 'present' ? '#fff' : '#94a3b8', borderRight: '2px solid #e2e8f0' }}
                        >
                          ✓ Present
                        </button>
                        <button
                          type="button"
                          onClick={() => setStatuses((st) => ({ ...st, [s.user_id]: 'absent' }))}
                          style={{ padding: '8px 20px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, background: status === 'absent' ? '#ef4444' : '#f8fafc', color: status === 'absent' ? '#fff' : '#94a3b8' }}
                        >
                          ✗ Absent
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <button className="submit-btn" style={{ marginTop: 20, width: '100%' }} onClick={submit} disabled={submitting}>
        {submitting ? 'Saving…' : '✓ Save Attendance'}
      </button>
    </>
  );
}

function AttendanceRequests() {
  const { user } = useAuth();
  const { showToast, send } = useNotifications();
  const [requests, setRequests] = useState(undefined);

  const load = () => apiFetch('/attendance-requests').then(setRequests).catch(() => setRequests([]));
  useEffect(() => {
    load();
  }, []);

  const grant = async (id, studentId) => {
    try {
      await apiFetch(`/attendance-request/${id}/mark`, { method: 'PATCH' });
      send(studentId, user?.first_name || 'Faculty', '✅ Your attendance has been granted by faculty!', 'info');
      showToast('Attendance granted! Student notified.', 'success');
      load();
    } catch (e) {
      showToast('Failed: ' + e.message, 'error');
    }
  };

  if (requests === undefined) return null;

  return (
    <div style={{ marginTop: 20, padding: 20, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12 }}>
      <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700 }}>📝 Student Attendance Requests</h3>
      {requests.length === 0 ? (
        <p style={{ color: '#64748b', textAlign: 'center' }}>No attendance requests for your courses.</p>
      ) : (
        requests.map((r) => {
          const canGrant = r.admin_status === 'approved' && r.faculty_status !== 'granted';
          const rejected = r.admin_status === 'rejected';
          const granted = r.faculty_status === 'granted';
          return (
            <div key={r.request_id} style={{ padding: 12, border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontWeight: 600 }}>
                  {r.student_name} <span style={{ color: '#64748b', fontSize: 12 }}>({r.course_code})</span>
                </div>
                <div style={{ fontSize: 12, color: '#64748b' }}>Date: {r.date} · {r.reason}</div>
                {r.file_id && (
                  <button
                    type="button"
                    onClick={() => downloadDocument(r.file_id).catch((e) => showToast('Failed to download: ' + e.message, 'error'))}
                    style={{ marginTop: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 6, cursor: 'pointer' }}
                  >
                    📎 View document
                  </button>
                )}
              </div>
              <div>
                {granted ? (
                  <span style={{ padding: '4px 10px', background: '#dcfce7', color: '#166534', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>✓ Granted</span>
                ) : rejected ? (
                  <span style={{ padding: '4px 10px', background: '#fef2f2', color: '#991b1b', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>❌ Admin Rejected</span>
                ) : canGrant ? (
                  <button onClick={() => grant(r.request_id, r.student_id)} style={{ padding: '6px 14px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                    ✓ Grant Attendance
                  </button>
                ) : (
                  <span style={{ padding: '4px 10px', background: '#fef9c3', color: '#92400e', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>⏳ Awaiting Admin</span>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
