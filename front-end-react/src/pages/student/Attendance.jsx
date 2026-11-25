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
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { uploadFile } from '../../api/uploads';
import { downloadCsv } from '../../utils/csv';
import { useNotifications } from '../../features/notifications/useNotifications';
import Modal from '../../components/shared/Modal';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchMyAttendance, fetchAttendanceCalendar, createAttendanceRequest } from '../../features/studentAttendance/studentAttendanceThunks';
import { fetchMyCourses } from '../../features/studentCourses/studentCoursesThunks';

// Same 75% convention admin/AttendanceRegister.jsx's PerCourseChart already uses.
const MIN_ATTENDANCE_PCT = 75;

const DAY_STATUS_COLOR = {
  present: { bg: '#16a34a', fg: '#fff' },
  absent: { bg: '#ef4444', fg: '#fff' },
  excused: { bg: '#f59e0b', fg: '#fff' },
  holiday: { bg: '#e0e7ff', fg: '#4338ca' },
  'no-class': { bg: '#f8fafc', fg: '#cbd5e1' },
};

const STATUS_LABEL = { present: 'Present', absent: 'Absent', excused: 'Excused', holiday: 'Holiday', 'no-class': 'No class' };

const CELL = 20;
const GAP = 3;
const WEEKDAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', '']; // GitHub shows only alternating labels — full 7 would crowd a 20px row.

/** The `count` calendar months ending with the current one, oldest first — same 'YYYY-MM' key fetchAttendanceCalendar/byMonth already use. */
function trailingMonths(count) {
  const now = new Date();
  const months = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    months.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  return months;
}

function shortMonthLabel(dateStr) {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
}

const HEATMAP_MONTHS = 12;

function AttendanceHeatmap() {
  const dispatch = useAppDispatch();
  const months = useMemo(() => trailingMonths(HEATMAP_MONTHS), []);
  const byMonth = useAppSelector((state) => state.studentAttendance.byMonth);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    months.forEach((m) => dispatch(fetchAttendanceCalendar(m)));
  }, [dispatch, months]);

  const loaded = months.every((m) => byMonth[m]);

  // One continuous day sequence across all fetched months, then regrouped
  // into Sun–Sat columns — the same trick github.com's own contribution
  // graph uses: pad the front so day 1 lands on its real weekday, pad the
  // back to a full week, then slice every 7 into one column.
  const weeks = useMemo(() => {
    if (!loaded) return [];
    const allDays = months.flatMap((m) => byMonth[m]);
    if (!allDays.length) return [];
    const leading = new Date(`${allDays[0].date}T00:00:00Z`).getUTCDay();
    const cells = [...Array(leading).fill(null), ...allDays];
    while (cells.length % 7 !== 0) cells.push(null);
    const result = [];
    for (let i = 0; i < cells.length; i += 7) result.push(cells.slice(i, i + 7));
    return result;
  }, [loaded, months, byMonth]);

  // Label the first column whose week contains the 1st of a month.
  const monthLabelByColumn = useMemo(() => {
    const labels = {};
    weeks.forEach((week, col) => {
      const firstOfMonth = week.find((d) => d?.date.endsWith('-01'));
      if (firstOfMonth) labels[col] = shortMonthLabel(firstOfMonth.date);
    });
    return labels;
  }, [weeks]);

  const gridWidth = weeks.length * (CELL + GAP);

  return (
    <div className="stats-card" style={{ marginBottom: 20 }}>
      <div className="stats-card-header">
        <h3>Attendance Heatmap</h3>
        <span style={{ fontSize: 12, color: '#94a3b8' }}>Last {HEATMAP_MONTHS} months</span>
      </div>
      <div className="stats-card-body" style={{ padding: 20 }}>
        {!loaded ? (
          <div style={{ textAlign: 'center', color: '#64748b', padding: 20 }}>Loading...</div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 6 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: GAP, paddingTop: 16, flexShrink: 0 }}>
                {WEEKDAY_LABELS.map((label, i) => (
                  <div key={i} style={{ height: CELL, display: 'flex', alignItems: 'center', fontSize: 9, fontWeight: 700, color: '#94a3b8' }}>
                    {label}
                  </div>
                ))}
              </div>
              <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
                <div style={{ position: 'relative', height: 14, width: gridWidth, marginBottom: 2 }}>
                  {Object.entries(monthLabelByColumn).map(([col, label]) => (
                    <span key={col} style={{ position: 'absolute', left: Number(col) * (CELL + GAP), fontSize: 10, fontWeight: 700, color: '#64748b' }}>
                      {label}
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: GAP, width: gridWidth }}>
                  {weeks.map((week, col) => (
                    <div key={col} style={{ display: 'flex', flexDirection: 'column', gap: GAP }}>
                      {week.map((day, row) =>
                        day ? (
                          <button
                            key={day.date}
                            type="button"
                            onClick={() => {
                              const canOpen = day.dayStatus !== 'no-class' && day.dayStatus !== 'holiday';
                              if (canOpen) setSelected(day);
                            }}
                            title={`${day.date} — ${day.dayStatus === 'holiday' ? day.label : STATUS_LABEL[day.dayStatus]}`}
                            style={{
                              width: CELL, height: CELL, borderRadius: 4, border: 'none',
                              cursor: day.dayStatus !== 'no-class' && day.dayStatus !== 'holiday' ? 'pointer' : 'default',
                              background: DAY_STATUS_COLOR[day.dayStatus].bg, color: DAY_STATUS_COLOR[day.dayStatus].fg,
                              fontSize: 8.5, fontWeight: 700, lineHeight: `${CELL}px`, padding: 0,
                            }}
                          >
                            {Number(day.date.slice(-2))}
                          </button>
                        ) : (
                          <div key={`b${col}-${row}`} style={{ width: CELL, height: CELL }} />
                        ),
                      )}
                    </div>
                  ))}
                </div>
              </div>
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
  const dispatch = useAppDispatch();
  const { showToast, broadcast } = useNotifications();
  const today = new Date().toISOString().split('T')[0];
  const [scope, setScope] = useState('course');
  const courses = useAppSelector((state) => state.studentCourses.items);
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
    setCourseId('');
    setStartDate(today);
    setEndDate(today);
    setLeaveType('');
    setReason('');
    setFile(null);
    dispatch(fetchMyCourses());
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
      const res = await dispatch(createAttendanceRequest({
        scope,
        course_id: scope === 'course' ? courseId : undefined,
        start_date: startDate,
        end_date: endDate,
        leave_type: leaveType || undefined,
        reason: reason.trim(),
        file_id: uploaded?.file_id ?? null,
      })).unwrap();
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
  const dispatch = useAppDispatch();
  const data = useAppSelector((state) => state.studentAttendance.data);
  const error = useAppSelector((state) => state.studentAttendance.error);
  const [requestOpen, setRequestOpen] = useState(false);

  useEffect(() => {
    dispatch(fetchMyAttendance());
  }, [dispatch]);

  const exportCsv = () => {
    const lines = [
      `Overall %,${data.overallPct || 0}%`,
      '',
      'Course,Percentage,Present,Absent,Excused,Total Sessions',
      ...(data.summary || []).map((s) => `"${s.course_code} - ${s.course_name}",${s.percentage || 0}%,${s.present || 0},${s.absent || 0},${s.excused || 0},${s.total || 0}`),
    ];
    downloadCsv(`BarelyPassing_MyAttendance_${new Date().toISOString().split('T')[0]}.csv`, lines);
  };

  return (
    <>
      <AttendanceHeatmap />
      <div className="stats-card">
        <div className="stats-card-header">
          <h3>Attendance Overview</h3>
          {data && (
            <button className="btn-cancel" onClick={exportCsv} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              ⬇ Export (CSV)
            </button>
          )}
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

function PerSubjectChart({ summary }) {
  const data = summary.map((s) => ({ course: s.course_code, pct: s.percentage || 0 }));
  if (!data.length) return null;
  return (
    <ResponsiveContainer width="100%" height={Math.max(100, data.length * 36)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24 }}>
        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} unit="%" />
        <YAxis type="category" dataKey="course" tick={{ fontSize: 13, fill: '#475569' }} axisLine={false} tickLine={false} width={70} />
        <Tooltip formatter={(v) => [`${v}%`, 'Attendance']} cursor={{ fill: '#f8fafc' }} />
        <Bar dataKey="pct" radius={[0, 4, 4, 0]} maxBarSize={20}>
          {data.map((d) => <Cell key={d.course} fill={d.pct >= MIN_ATTENDANCE_PCT ? '#16a34a' : '#ef4444'} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function AttendanceBody({ data }) {
  const { overallPct = 0, summary = [] } = data;
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 13, color: '#64748b' }}>
          Day counts below are per subject — a day present/absent in one course doesn't count toward another.
        </div>
        <Stat label="OVERALL %" value={`${overallPct}%`} bg="#eff6ff" color="#2563eb" />
      </div>
      <PerSubjectChart summary={summary} />
      {summary.length > 0 && (
        <>
          <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, marginTop: 24, color: '#64748b' }}>PER SUBJECT</h4>
          {summary.map((s, i) => {
            const pct = s.percentage || 0;
            const color = pct >= 75 ? '#16a34a' : '#ef4444';
            return (
              <div key={i} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: i < summary.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                  <span style={{ fontWeight: 600 }}>{s.course_code} – {s.course_name}</span>
                  <span style={{ fontWeight: 700, color }}>{pct}%</span>
                </div>
                <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
                  <div style={{ height: '100%', background: color, width: `${pct}%` }} />
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#64748b' }}>
                  <span><strong style={{ color: '#16a34a' }}>{s.present || 0}</strong> present</span>
                  <span><strong style={{ color: '#ef4444' }}>{s.absent || 0}</strong> absent</span>
                  <span title="Sessions covered by an approved attendance request — these count toward attendance, not against it.">
                    <strong style={{ color: '#ca8a04' }}>{s.excused || 0}</strong> on leave
                  </span>
                  <span style={{ marginLeft: 'auto' }}>{s.total || 0} total sessions</span>
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
