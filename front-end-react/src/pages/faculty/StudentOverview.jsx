/**
 * StudentOverview — ported from legacy fixes.js renderFacultyStudents() +
 * renderStudentCards() + filterStudentOverview() + sendFacultyBroadcast() +
 * openAssignBTPModal() + submitAssignBTP() (faculty.html's
 * student-overview-view).
 */

import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationsContext';
import Modal from '../../components/shared/Modal';
import SendAlertModal from '../../components/shared/SendAlertModal';
import MeetingModal from '../../components/shared/MeetingModal';

function AssignBTPModal({ open, onClose, onAssigned }) {
  const { user } = useAuth();
  const { showToast, send } = useNotifications();
  const [students, setStudents] = useState(null);
  const [studentId, setStudentId] = useState('');
  const [title, setTitle] = useState('');
  const [abstract, setAbstract] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStudentId('');
    setTitle('');
    setAbstract('');
    Promise.all([apiFetch('/admin/users'), apiFetch('/faculty/me/students').catch(() => [])])
      .then(([allUsers, profiles]) => {
        const profileMap = {};
        (profiles || []).forEach((p) => {
          profileMap[p.user_id] = p;
        });
        const list = (allUsers || [])
          .filter((u) => u.role === 'student')
          .map((s) => {
            const p = profileMap[s.user_id] || {};
            return { id: s.user_id, name: `${p.first_name || s.first_name || s.username || ''} ${p.last_name || s.last_name || ''}`.trim() };
          });
        setStudents(list);
      })
      .catch(() => setStudents([]));
  }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    if (!studentId) return showToast('Please select a student to assign this BTP project', 'warning');
    if (!title.trim() || title.trim().length < 3) return showToast('Project title must be at least 3 characters', 'warning');

    setSubmitting(true);
    try {
      await apiFetch('/research', { method: 'POST', body: JSON.stringify({ student_id: studentId, title: title.trim(), abstract: abstract.trim(), status: 'active', progress: 0 }) });
      const from = user?.first_name || 'Faculty';
      send(studentId, from, `📚 BTP Project Assigned: "${title.trim()}". Open your Research Projects section to view details and submit your work.`, 'info');
      showToast('BTP Project assigned to student! Student has been notified. ✅', 'success');
      onClose();
      onAssigned();
    } catch (e2) {
      showToast('Failed to assign BTP: ' + e2.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="📚 Assign BTP Project to Student">
      <form onSubmit={submit}>
        <div className="modal-body">
          <div className="form-group">
            <label>Select Student <span style={{ color: '#ef4444' }}>*</span></label>
            <select required value={studentId} onChange={(e) => setStudentId(e.target.value)}>
              <option value="">{students === null ? 'Loading…' : '— Select Student —'}</option>
              {students?.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Project Title <span style={{ color: '#ef4444' }}>*</span></label>
            <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., AI-Based Attendance System" />
          </div>
          <div className="form-group">
            <label>Abstract / Description</label>
            <textarea rows={3} value={abstract} onChange={(e) => setAbstract(e.target.value)} placeholder="Brief description of the project…" />
          </div>
        </div>
        <div className="modal-footer">
          <button type="submit" className="submit-btn" style={{ flex: 1 }} disabled={submitting}>
            {submitting ? 'Assigning…' : 'Assign Project'}
          </button>
          <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}

function StudentCard({ student, onAlert, onMeeting }) {
  const fullName = `${student.first_name || ''} ${student.last_name || ''}`.trim();
  const initials = ((student.first_name || '?')[0] + (student.last_name || '?')[0]).toUpperCase();
  const riskColor = student.is_at_risk ? '#ef4444' : student.cgpa && student.cgpa < 7 ? '#d97706' : '#16a34a';
  const riskBg = student.is_at_risk ? '#fef2f2' : student.cgpa && student.cgpa < 7 ? '#fef9c3' : '#dcfce7';
  const riskLabel = student.is_at_risk ? 'AT RISK' : student.cgpa && student.cgpa < 7 ? 'LOW CGPA' : 'GOOD';
  const cgpaColor = student.cgpa && student.cgpa < 6 ? '#dc2626' : student.cgpa && student.cgpa < 7 ? '#d97706' : '#16a34a';
  const hasAtt = student.attendance_pct !== null && student.attendance_pct !== undefined;
  const attText = hasAtt ? `${student.attendance_pct}%` : 'N/A';
  const attColor = !hasAtt ? '#94a3b8' : student.attendance_pct < 75 ? '#ef4444' : '#16a34a';

  return (
    <div style={{ padding: 16, marginBottom: 12, background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, boxSizing: 'border-box', boxShadow: '0 1px 4px rgba(0,0,0,.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fullName}</div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>ID: {student.user_id}{student.branch ? ' · ' + student.branch : ''}</div>
        </div>
        <span style={{ padding: '3px 9px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: riskBg, color: riskColor, whiteSpace: 'nowrap', flexShrink: 0 }}>{riskLabel}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12, padding: 10, background: '#f8fafc', borderRadius: 8 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>CGPA</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: cgpaColor }}>{student.cgpa || 'N/A'}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>Attendance</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: attColor }}>{attText}</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <button onClick={onAlert} style={{ padding: 8, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
          ⚠ Send Alert
        </button>
        <button onClick={onMeeting} style={{ padding: 8, background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
          📅 Meeting
        </button>
      </div>
    </div>
  );
}

export default function StudentOverview() {
  const { user } = useAuth();
  const { showToast, broadcast } = useNotifications();
  const [students, setStudents] = useState(undefined);
  const [search, setSearch] = useState('');
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [alertTarget, setAlertTarget] = useState(null);
  const [meetingTarget, setMeetingTarget] = useState(null);

  const load = () => {
    Promise.all([apiFetch('/admin/users').catch(() => []), apiFetch('/faculty/me/students').catch(() => [])])
      .then(([allUsers, profileStudents]) => {
        const profileMap = {};
        (profileStudents || []).forEach((s) => {
          profileMap[s.user_id] = s;
        });
        const list = (allUsers || [])
          .filter((u) => u.role === 'student')
          .map((u) => {
            const p = profileMap[u.user_id] || {};
            return {
              user_id: u.user_id,
              first_name: p.first_name || u.first_name || u.username || 'Student',
              last_name: p.last_name || u.last_name || '',
              cgpa: p.cgpa || null,
              branch: p.branch || p.department || '',
              attendance_pct: p.attendance_pct === null || p.attendance_pct === undefined ? null : p.attendance_pct,
              is_at_risk: !!p.is_at_risk,
            };
          });
        setStudents(list);
      })
      .catch(() => setStudents([]));
  };
  useEffect(load, []);

  const filtered = useMemo(() => {
    if (!students) return [];
    const term = search.toLowerCase();
    return students.filter(
      (s) => (s.first_name || '').toLowerCase().includes(term) || (s.last_name || '').toLowerCase().includes(term) || (s.user_id || '').toLowerCase().includes(term),
    );
  }, [students, search]);

  const sendBroadcast = () => {
    if (!broadcastMsg.trim() || broadcastMsg.trim().length < 5) return showToast('Please enter a message (min 5 characters)', 'warning');
    const from = user?.first_name || user?.username || 'Faculty';
    broadcast('student', from, `📢 ${broadcastMsg.trim()}`, 'info');
    showToast('Message broadcast to all your students!', 'success');
    setBroadcastMsg('');
  };

  return (
    <>
      <div className="stats-card" style={{ marginBottom: 16, background: 'linear-gradient(135deg,#eff6ff,#f0fdf4)' }}>
        <div className="stats-card-header"><h3>📢 Broadcast Message to All Students</h3></div>
        <div className="stats-card-body" style={{ padding: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'end' }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>
                Message to all students
              </label>
              <input
                type="text"
                value={broadcastMsg}
                onChange={(e) => setBroadcastMsg(e.target.value)}
                placeholder="e.g. Assignment 2 deadline extended to Monday…"
                style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
              />
            </div>
            <button
              onClick={sendBroadcast}
              style={{ padding: '10px 20px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap' }}
            >
              Send to All
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <button onClick={() => setMeetingOpen(true)} style={{ padding: '10px 18px', background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
          📅 Schedule Meeting
        </button>
        <button onClick={() => setAssignOpen(true)} style={{ padding: '10px 18px', background: '#faf5ff', color: '#7c3aed', border: '1px solid #e9d5ff', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
          📚 Assign BTP Project
        </button>
      </div>

      <div className="stats-card">
        <div className="stats-card-header"><h3>Student Overview</h3></div>
        <div className="stats-card-body" style={{ padding: 24 }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or ID..."
            style={{ padding: '10px 12px', width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14, marginBottom: 16, boxSizing: 'border-box' }}
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14, maxWidth: '100%', overflow: 'hidden' }}>
            {students === undefined ? null : filtered.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>No students found.</div>
            ) : (
              filtered.map((s) => (
                <StudentCard
                  key={s.user_id}
                  student={s}
                  onAlert={() => setAlertTarget({ id: s.user_id, name: `${s.first_name} ${s.last_name || ''}`.trim() })}
                  onMeeting={() => setMeetingTarget({ id: s.user_id, name: s.first_name })}
                />
              ))
            )}
          </div>
        </div>
      </div>

      <SendAlertModal student={alertTarget} onClose={() => setAlertTarget(null)} />
      <MeetingModal open={meetingOpen || !!meetingTarget} preselected={meetingTarget} onClose={() => { setMeetingOpen(false); setMeetingTarget(null); }} />
      <AssignBTPModal open={assignOpen} onClose={() => setAssignOpen(false)} onAssigned={load} />
    </>
  );
}
