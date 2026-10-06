/**
 * MeetingModal — ported from legacy fixes.js openMeetingModal() +
 * submitScheduleMeeting() (faculty.html's meetingModal). Used from both
 * faculty Dashboard's intervention list and Student Overview — either with
 * a `preselected` student (locks the dropdown to one option, matching
 * legacy's `openMeetingModal(studentId, name)`), or without one (shows
 * every student this faculty teaches, matching `openMeetingModal()`).
 */

import { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationsContext';
import Modal from './Modal';

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = ['00', '15', '30', '45'];

export default function MeetingModal({ open, preselected, onClose }) {
  const { user } = useAuth();
  const { showToast, send } = useNotifications();
  const [students, setStudents] = useState(null);
  const [studentId, setStudentId] = useState('');
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState('');
  const [hour, setHour] = useState('');
  const [minute, setMinute] = useState('');
  const [period, setPeriod] = useState('AM');
  const [mode, setMode] = useState('');
  const [agenda, setAgenda] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDate('');
    setHour('');
    setMinute('');
    setPeriod('AM');
    setMode('');
    setAgenda('');
    if (preselected) {
      setStudentId(preselected.id);
      setStudents([preselected]);
    } else {
      setStudentId('');
      setStudents(null);
      apiFetch('/faculty/me/students')
        .then((list) => setStudents(list.map((s) => ({ id: s.user_id, name: `${s.first_name} ${s.last_name || ''}`.trim() }))))
        .catch(() => setStudents([]));
    }
  }, [open, preselected]);

  const submit = async (e) => {
    e.preventDefault();
    if (!studentId) return showToast('Please select a student', 'warning');
    if (!date) return showToast('Meeting date is required', 'warning');
    if (date < today) return showToast('Meeting date cannot be in the past', 'warning');
    if (!hour || !minute) return showToast('Please select meeting time (hour and minute)', 'warning');
    if (!mode) return showToast('Please select a meeting type', 'warning');
    if (!agenda || agenda.trim().length < 5) return showToast('Please enter a meeting agenda (at least 5 characters)', 'warning');

    let h = parseInt(hour, 10);
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    const time = `${String(h).padStart(2, '0')}:${minute}`;
    const timeDisplay = `${hour}:${minute} ${period}`;

    setSubmitting(true);
    try {
      await apiFetch('/meetings', { method: 'POST', body: JSON.stringify({ student_id: studentId, date, time, agenda: agenda.trim(), mode }) });
      const from = user?.first_name || 'Faculty';
      const modeLabel = mode === 'online' ? 'Online (Google Meet)' : 'In-Person (Faculty Cabin)';
      send(studentId, from, `📅 Meeting scheduled: ${date} at ${timeDisplay} — ${modeLabel}. Agenda: ${agenda.trim()}`, 'meeting');
      showToast('Meeting scheduled! Student has been notified. ✅', 'success');
      onClose();
    } catch (e2) {
      showToast('Failed: ' + e2.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Schedule Meeting">
      <form onSubmit={submit}>
        <div className="modal-body">
          <div className="form-group">
            <label>Student</label>
            <select value={studentId} onChange={(e) => setStudentId(e.target.value)} disabled={!!preselected}>
              {!preselected && <option value="">{students === null ? 'Loading students…' : '— Select Student —'}</option>}
              {students?.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Date <span style={{ color: '#ef4444' }}>*</span></label>
              <input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Time <span style={{ color: '#ef4444' }}>*</span></label>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <select value={hour} onChange={(e) => setHour(e.target.value)} style={{ flex: 1, padding: '9px 6px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14 }}>
                  <option value="">Hr</option>
                  {HOURS.map((h) => <option key={h}>{h}</option>)}
                </select>
                <span style={{ fontWeight: 700, color: '#64748b' }}>:</span>
                <select value={minute} onChange={(e) => setMinute(e.target.value)} style={{ flex: 1, padding: '9px 6px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14 }}>
                  <option value="">Min</option>
                  {MINUTES.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                <select value={period} onChange={(e) => setPeriod(e.target.value)} style={{ flex: 1, padding: '9px 6px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14 }}>
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>
          </div>
          <div className="form-group">
            <label>Meeting Type</label>
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="">Select meeting type</option>
              <option value="in-person">In-Person (Faculty Cabin)</option>
              <option value="online">Online (Google Meet)</option>
            </select>
          </div>
          <div className="form-group">
            <label>Agenda</label>
            <textarea value={agenda} onChange={(e) => setAgenda(e.target.value)} placeholder="Discuss academic performance, attendance concerns..." />
          </div>
        </div>
        <div className="modal-footer">
          <button type="submit" className="submit-btn" style={{ flex: 1 }} disabled={submitting}>
            {submitting ? 'Scheduling…' : 'Schedule Meeting'}
          </button>
          <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}
