/**
 * Attendance — ported from legacy fixes.js renderStudentAttendance(), plus
 * the ATTENDANCE_WORKFLOW_REVAMP: a real calendar heatmap (the page's own
 * title always claimed one; it never rendered it) and the former
 * openAttendanceRequestModal()/submitAttendanceRequest() single-day,
 * single-course flow merged with what used to be the student side of
 * /leave — one request, a date range (a single day is a range of one) and
 * a scope of either one course or every enrolled course. Faculty's own
 * personal-leave flow is unaffected; see LeavePanel.jsx's own notes.
 */

import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../api/client';
import { uploadFile } from '../../api/uploads';
import { useNotifications } from '../../context/NotificationsContext';
import Modal from '../../components/shared/Modal';

const DAY_STATUS_COLOR = {
  present: { bg: '#16a34a', fg: '#fff' },
  absent: { bg: '#ef4444', fg: '#fff' },
  excused: { bg: '#f59e0b', fg: '#fff' },
  holiday: { bg: '#e2e8f0', fg: '#94a3b8' },
  'no-class': { bg: '#f8fafc', fg: '#cbd5e1' },
};

const STATUS_LABEL = { present: 'Present', absent: 'Absent', excused: 'Excused', holiday: 'Holiday', 'no-class': 'No class' };

function monthLabel(month) {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function shiftMonth(month, delta) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function AttendanceHeatmap() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [days, setDays] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    setDays(null);
    apiFetch(`/students/me/attendance-calendar?month=${month}`)
      .then(setDays)
      .catch(() => setDays([]));
  }, [month]);

  // Calendar cells need a leading blank for every weekday before the 1st.
  const leadingBlanks = useMemo(() => {
    if (!days?.length) return 0;
    return new Date(`${days[0].date}T00:00:00Z`).getUTCDay();
  }, [days]);

  return (
    <div className="stats-card" style={{ marginBottom: 20 }}>
      <div className="stats-card-header">
        <h3>Attendance Heatmap</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setMonth((m) => shiftMonth(m, -1))} style={{ padding: '4px 10px', border: '1px solid #e2e8f0', borderRadius: 6, background: '#fff', cursor: 'pointer' }}>‹</button>
          <span style={{ fontSize: 13, fontWeight: 700, minWidth: 130, textAlign: 'center' }}>{monthLabel(month)}</span>
          <button onClick={() => setMonth((m) => shiftMonth(m, 1))} style={{ padding: '4px 10px', border: '1px solid #e2e8f0', borderRadius: 6, background: '#fff', cursor: 'pointer' }}>›</button>
        </div>
      </div>
      <div className="stats-card-body" style={{ padding: 20 }}>
        {days === null ? (
          <div style={{ textAlign: 'center', color: '#64748b', padding: 20 }}>Loading...</div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6, marginBottom: 10 }}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#94a3b8' }}>{d}</div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6 }}>
              {Array.from({ length: leadingBlanks }).map((_, i) => <div key={`b${i}`} />)}
              {days.map((day) => {
                const canOpen = day.dayStatus !== 'no-class' && day.dayStatus !== 'holiday';
                const color = DAY_STATUS_COLOR[day.dayStatus];
                return (
                  <button
                    key={day.date}
                    type="button"
                    onClick={() => canOpen && setSelected(day)}
                    title={day.dayStatus === 'holiday' ? day.label : STATUS_LABEL[day.dayStatus]}
                    style={{
                      aspectRatio: '1', borderRadius: 8, border: 'none', cursor: canOpen ? 'pointer' : 'default',
                      background: color.bg, color: color.fg, fontSize: 12, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {Number(day.date.slice(-2))}
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 14, marginTop: 16, flexWrap: 'wrap' }}>
              {Object.entries(STATUS_LABEL).map(([key, label]) => (
                <span key={key} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#64748b' }}>
                  <span style={{ width: 12, height: 12, borderRadius: 3, background: DAY_STATUS_COLOR[key].bg, display: 'inline-block' }} />
                  {label}
                </span>
              ))}
            </div>
          </>
        )}
      </div>
      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.date} maxWidth={380}>
        <div className="modal-body">
          {(selected?.courses || []).map((c) => (
            <div key={c.course_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{c.course_code}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: DAY_STATUS_COLOR[c.status]?.bg || '#64748b' }}>{STATUS_LABEL[c.status] || c.status}</span>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}

const LEAVE_TYPES = ['Medical', 'Personal', 'Event', 'Family Event', 'Other'];

function AttendanceRequestModal({ open, onClose }) {
  const { showToast, broadcast } = useNotifications();
  const today = new Date().toISOString().split('T')[0];
  const [scope, setScope] = useState('course');
  const [courses, setCourses] = useState(null);
  const [courseId, setCourseId] = useState('');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [leaveType, setLeaveType] = useState('');
  const [reason, setReason] = useState('');
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setScope('course');
    setCourses(null);
    setCourseId('');
    setStartDate(today);
    setEndDate(today);
    setLeaveType('');
    setReason('');
    setFile(null);
    apiFetch('/students/me/courses')
      .then(setCourses)
      .catch(() => setCourses([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = async () => {
    if (scope === 'course' && !courseId) return showToast('Please select a course', 'warning');
    if (!startDate || !endDate) return showToast('Please select a date range', 'warning');
    if (endDate < startDate) return showToast('End date cannot be before start date', 'warning');
    if (!reason || reason.trim().length < 10) return showToast('Reason must be at least 10 characters', 'warning');

    setSubmitting(true);
    try {
      const uploaded = file ? await uploadFile(file, 'attendance_request') : null;
      const res = await apiFetch('/attendance-request', {
        method: 'POST',
        body: JSON.stringify({
          scope,
          course_id: scope === 'course' ? courseId : undefined,
          start_date: startDate,
          end_date: endDate,
          leave_type: leaveType || undefined,
          reason: reason.trim(),
          file_id: uploaded?.file_id ?? null,
        }),
      });
      const count = res?.data?.requests?.length ?? 0;
      broadcast('admin', 'Student', `📝 Attendance request submitted (${count} session${count === 1 ? '' : 's'}). Please review.`, 'alert');
      showToast(`Request submitted for ${count} session${count === 1 ? '' : 's'}! Admin will review.`, 'success');
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
          Covers a single day or a longer leave — holidays and days with no class in the range need no request.
        </p>
        <div className="form-group">
          <label>Scope</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => setScope('course')} style={{ flex: 1, padding: 8, borderRadius: 8, border: `1.5px solid ${scope === 'course' ? '#6366f1' : '#e2e8f0'}`, background: scope === 'course' ? '#eef2ff' : '#fff', fontWeight: 600, fontSize: 12.5, cursor: 'pointer' }}>
              One Course
            </button>
            <button type="button" onClick={() => setScope('all_courses')} style={{ flex: 1, padding: 8, borderRadius: 8, border: `1.5px solid ${scope === 'all_courses' ? '#6366f1' : '#e2e8f0'}`, background: scope === 'all_courses' ? '#eef2ff' : '#fff', fontWeight: 600, fontSize: 12.5, cursor: 'pointer' }}>
              All My Courses
            </button>
          </div>
        </div>
        {scope === 'course' && (
          <div className="form-group">
            <label>Course *</label>
            <select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
              <option value="">{courses === null ? 'Loading…' : 'Select course'}</option>
              {courses?.map((c) => (
                <option key={c.course_id} value={c.course_id}>{c.course_code} – {c.course_name}</option>
              ))}
            </select>
          </div>
        )}
        <div className="form-row">
          <div className="form-group">
            <label>Start Date *</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label>End Date *</label>
            <input type="date" min={startDate} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
        <div className="form-group">
          <label>Leave Type <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400 }}>(optional)</span></label>
          <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)}>
            <option value="">— Not specified —</option>
            {LEAVE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Reason *</label>
          <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Explain the reason (min 10 characters)" />
        </div>
        <div className="form-group">
          <label>Supporting Document <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400 }}>(optional, PDF/JPG/PNG, max 5MB)</span></label>
          <div
            onClick={() => document.getElementById('attReqFile').click()}
            style={{ border: '2px dashed #cbd5e1', borderRadius: 8, padding: 16, textAlign: 'center', cursor: 'pointer', background: file ? '#f0fdf4' : '#f8fafc' }}
          >
            <input type="file" id="attReqFile" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={(e) => setFile(e.target.files?.[0] || null)} />
            <div style={{ fontSize: 22, marginBottom: 4 }}>{file ? '✅' : '📎'}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>{file ? file.name : 'Click to upload document'}</div>
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
    <>
      <AttendanceHeatmap />
      <div className="stats-card">
        <div className="stats-card-header">
          <h3>Attendance Overview</h3>
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
    </>
  );
}

function AttendanceBody({ data }) {
  const { totalPresent = 0, totalAbsent = 0, totalExcused = 0, overallPct = 0, summary = [] } = data;
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        <Stat label="PRESENT" value={totalPresent} bg="#f0fdf4" color="#16a34a" />
        <Stat label="ABSENT" value={totalAbsent} bg="#fef2f2" color="#ef4444" />
        {/* Excused sessions (approved leave/attendance requests) count towards the overall percentage, not against it. */}
        <Stat label="ON LEAVE" value={totalExcused} bg="#fefce8" color="#ca8a04" title="Sessions covered by an approved attendance request — these do not count against you." />
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
