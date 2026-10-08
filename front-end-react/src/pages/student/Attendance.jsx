/**
 * Attendance — ported from legacy fixes.js renderStudentAttendance() +
 * openAttendanceRequestModal() + submitAttendanceRequest().
 *
 * The "Request Attendance" button and its modal aren't in student.html's
 * static markup — they're injected at runtime by fixes.js's own
 * DOMContentLoaded handler (the same one that injects the faculty syllabus
 * manager and the admin/faculty "Action Required" widget). Missed in
 * Phase 1 because it wasn't visible in the page source; added now.
 */

import { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';
import { uploadFile } from '../../api/uploads';
import { useNotifications } from '../../context/NotificationsContext';
import Modal from '../../components/shared/Modal';

function AttendanceRequestModal({ open, onClose }) {
  const { showToast, broadcast } = useNotifications();
  const [courses, setCourses] = useState(null);
  const [courseId, setCourseId] = useState('');
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [reason, setReason] = useState('');
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCourses(null);
    setCourseId('');
    setDate(today);
    setReason('');
    setFile(null);
    apiFetch('/students/me/courses')
      .then(setCourses)
      .catch(() => setCourses([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = async () => {
    if (!courseId) return showToast('Please select a course', 'warning');
    if (!date) return showToast('Please select a date', 'warning');
    if (!reason || reason.trim().length < 10) return showToast('Reason must be at least 10 characters', 'warning');
    if (!file) return showToast('Please attach a supporting document (e.g. medical certificate)', 'warning');

    setSubmitting(true);
    try {
      const uploaded = await uploadFile(file, 'attendance_request');
      await apiFetch('/attendance-request', {
        method: 'POST',
        body: JSON.stringify({ course_id: courseId, date, reason: reason.trim(), file_id: uploaded?.file_id ?? null }),
      });
      broadcast('admin', 'Student', `📝 Attendance request from a student for ${date}. Document attached: ${uploaded?.original_name}. Please review.`, 'alert');
      showToast('Attendance request submitted with document! Admin will review.', 'success');
      onClose();
    } catch (e) {
      showToast('Failed: ' + e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="📝 Request Attendance" maxWidth={460}>
      <div className="modal-body">
        <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 16px' }}>
          All fields are required. Attach a supporting document (e.g. medical certificate).
        </p>
        <div className="form-group">
          <label>Course *</label>
          <select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
            <option value="">{courses === null ? 'Loading…' : 'Select course'}</option>
            {courses?.map((c) => (
              <option key={c.course_id} value={c.course_id}>{c.course_code} – {c.course_name}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Absent Date *</label>
          <input type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Reason *</label>
          <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Explain the reason for absence (min 10 characters)" />
        </div>
        <div className="form-group">
          <label>
            Supporting Document * <span style={{ fontWeight: 400, color: '#94a3b8' }}>(PDF, JPG, PNG — max 5MB)</span>
          </label>
          <div
            onClick={() => document.getElementById('attReqFile').click()}
            style={{ border: '2px dashed #cbd5e1', borderRadius: 8, padding: 16, textAlign: 'center', cursor: 'pointer', background: '#f8fafc' }}
          >
            <input type="file" id="attReqFile" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={(e) => setFile(e.target.files?.[0] || null)} />
            <div style={{ fontSize: 22, marginBottom: 4 }}>📎</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Click to upload document</div>
            <div style={{ fontSize: 11, color: '#6366f1', marginTop: 4, fontWeight: 600 }}>{file ? file.name : 'No file chosen'}</div>
          </div>
        </div>
      </div>
      <div className="modal-footer">
        <button onClick={submit} className="submit-btn" style={{ flex: 1 }} disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit Request'}
        </button>
        <button className="btn-cancel" onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  );
}

export default function Attendance() {
  const [data, setData] = useState(undefined);
  const [error, setError] = useState(null);
  const [requestOpen, setRequestOpen] = useState(false);

  useEffect(() => {
    apiFetch('/students/me/attendance')
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="stats-card">
      <div className="stats-card-header">
        <h3>Attendance Heatmap &amp; Overview</h3>
      </div>
      <div className="stats-card-body" style={{ padding: 24 }}>
        <button
          onClick={() => setRequestOpen(true)}
          style={{ margin: '0 0 16px', padding: '10px 20px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}
        >
          📝 Request Attendance
        </button>
        {error ? (
          <p style={{ color: '#ef4444' }}>Failed to load attendance: {error}</p>
        ) : !data ? null : (
          <AttendanceBody data={data} />
        )}
      </div>
      <AttendanceRequestModal open={requestOpen} onClose={() => setRequestOpen(false)} />
    </div>
  );
}

function AttendanceBody({ data }) {
  const { totalPresent = 0, totalAbsent = 0, totalExcused = 0, overallPct = 0, summary = [] } = data;
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        <Stat label="PRESENT" value={totalPresent} bg="#f0fdf4" color="#16a34a" />
        <Stat label="ABSENT" value={totalAbsent} bg="#fef2f2" color="#ef4444" />
        {/* Excused sessions (approved leave) count towards the overall percentage, not against it. */}
        <Stat label="ON LEAVE" value={totalExcused} bg="#fefce8" color="#ca8a04" title="Sessions covered by approved leave — these do not count against you." />
        <Stat label="OVERALL %" value={`${overallPct}%`} bg="#eff6ff" color="#2563eb" />
      </div>
      {summary.length > 0 && (
        <>
          <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: '#64748b' }}>PER COURSE</h4>
          {summary.map((s, i) => {
            const pct = s.percentage || 0;
            const color = pct >= 75 ? '#16a34a' : '#ef4444';
            return (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span>{s.course_code} – {s.course_name}</span>
                  <span style={{ fontWeight: 700, color }}>{pct}%</span>
                </div>
                <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: color, width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </>
      )}
    </>
  );
}

function Stat({ label, value, bg, color, title }) {
  return (
    <div style={{ textAlign: 'center', padding: 16, background: bg, borderRadius: 8 }} title={title}>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}
