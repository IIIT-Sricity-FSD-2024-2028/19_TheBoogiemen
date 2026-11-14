/**
 * AttendanceRegister — SRS 6.2 #3 / 6.3 #10: "Manage User Roles and oversee
 * Master Attendance." Nothing before this let admin/head browse the raw
 * attendance register at all — AttendanceOverride.jsx is entirely request-
 * approval queues, and reports/overview only ever gave one aggregate
 * percentage. GET /attendance-register (new) is unfiltered by default; this
 * page is what picks a sane starting view (the current month) and lets the
 * admin broaden or narrow from there.
 */

import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { apiFetch } from '../../api/client';

// Mirrors RISK_THRESHOLDS.MIN_ATTENDANCE_PCT in back-end/src/common/academic-rules.ts
// — same threshold InstitutionalReports.jsx's meter already keys off of.
const MIN_ATTENDANCE_PCT = 75;

const STATUS_COLOR = {
  present: { bg: '#16a34a', fg: '#fff' },
  absent: { bg: '#ef4444', fg: '#fff' },
  excused: { bg: '#f59e0b', fg: '#fff' },
};

function StatusBadge({ status }) {
  const c = STATUS_COLOR[status] || { bg: '#94a3b8', fg: '#fff' };
  return (
    <span style={{ background: c.bg, color: c.fg, borderRadius: 6, padding: '2px 10px', fontSize: 11, fontWeight: 700, textTransform: 'capitalize' }}>
      {status}
    </span>
  );
}

function Stat({ label, value, color }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: color || '#0f172a' }}>{value}</div>
    </div>
  );
}

function monthBounds() {
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().split('T')[0];
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).toISOString().split('T')[0];
  return { from, to };
}

function PerCourseChart({ records }) {
  const data = useMemo(() => {
    const byCourse = {};
    records.forEach((r) => {
      (byCourse[r.course_code] ||= []).push(r.status);
    });
    return Object.entries(byCourse).map(([course, statuses]) => {
      const attended = statuses.filter((s) => s === 'present' || s === 'excused').length;
      return { course, pct: Math.round((attended / statuses.length) * 100) };
    }).sort((a, b) => a.pct - b.pct);
  }, [records]);

  if (!data.length) return null;

  return (
    <ResponsiveContainer width="100%" height={Math.max(120, data.length * 36)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24 }}>
        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} unit="%" />
        <YAxis type="category" dataKey="course" tick={{ fontSize: 13, fill: '#475569' }} axisLine={false} tickLine={false} width={70} />
        <Tooltip formatter={(v) => [`${v}%`, 'Attendance']} cursor={{ fill: '#f8fafc' }} />
        <Bar dataKey="pct" radius={[0, 4, 4, 0]} maxBarSize={20}>
          {data.map((d) => (
            <Cell key={d.course} fill={d.pct >= MIN_ATTENDANCE_PCT ? '#16a34a' : '#ef4444'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function AttendanceRegister() {
  const { from: defaultFrom, to: defaultTo } = monthBounds();
  const [courses, setCourses] = useState(null);
  const [courseId, setCourseId] = useState('');
  const [section, setSection] = useState('');
  const [dateFrom, setDateFrom] = useState(defaultFrom);
  const [dateTo, setDateTo] = useState(defaultTo);
  const [status, setStatus] = useState('');
  const [data, setData] = useState(undefined);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiFetch('/courses').then(setCourses).catch(() => setCourses([]));
  }, []);

  const sections = courses?.find((c) => c.course_id === courseId)?.sections || [];

  useEffect(() => {
    const params = new URLSearchParams();
    if (courseId) params.set('course_id', courseId);
    if (section) params.set('section', section);
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);
    if (status) params.set('status', status);
    setData(undefined);
    apiFetch(`/attendance-register?${params.toString()}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [courseId, section, dateFrom, dateTo, status]);

  return (
    <div className="stats-card">
      <div className="stats-card-header"><h3>Master Attendance Register</h3></div>
      <div className="stats-card-body" style={{ padding: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Course</label>
            <select value={courseId} onChange={(e) => { setCourseId(e.target.value); setSection(''); }}>
              <option value="">All courses</option>
              {courses?.map((c) => (
                <option key={c.course_id} value={c.course_id}>{c.course_code} – {c.course_name}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Section</label>
            <select value={section} onChange={(e) => setSection(e.target.value)} disabled={!courseId}>
              <option value="">{courseId ? 'All sections' : '— Select a course first —'}</option>
              {sections.map((s) => <option key={s.section} value={s.section}>Section {s.section}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>From</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>To</label>
            <input type="date" min={dateFrom} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="excused">Excused</option>
            </select>
          </div>
        </div>

        {error && <p style={{ color: '#ef4444' }}>Failed to load: {error}</p>}
        {!data ? null : (
          <>
            <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap', marginBottom: 24, padding: 16, background: '#f8fafc', borderRadius: 10 }}>
              <Stat label="Present" value={data.summary.present} color="#16a34a" />
              <Stat label="Absent" value={data.summary.absent} color="#ef4444" />
              <Stat label="Excused" value={data.summary.excused} color="#f59e0b" />
              <Stat label="Total Sessions" value={data.summary.total} />
              <Stat label="Overall %" value={`${data.summary.percentage}%`} color={data.summary.percentage >= MIN_ATTENDANCE_PCT ? '#16a34a' : '#ef4444'} />
            </div>

            {!courseId && data.records.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: '#475569' }}>ATTENDANCE BY COURSE</h4>
                <PerCourseChart records={data.records} />
              </div>
            )}

            <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: '#475569' }}>RECORDS ({data.records.length})</h4>
            {data.records.length === 0 ? (
              <p style={{ color: '#64748b', textAlign: 'center', padding: 20 }}>No attendance records match these filters.</p>
            ) : (
              <table className="crud-table">
                <thead><tr><th>Date</th><th>Student</th><th>Course</th><th>Section</th><th>Status</th></tr></thead>
                <tbody>
                  {data.records.map((r) => (
                    <tr key={r.log_id}>
                      <td style={{ fontSize: 13 }}>{r.date}</td>
                      <td style={{ fontSize: 13 }}>{r.student_name}</td>
                      <td style={{ fontSize: 13 }}>{r.course_code}</td>
                      <td style={{ fontSize: 13 }}>{r.section || '—'}</td>
                      <td><StatusBadge status={r.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </div>
  );
}
