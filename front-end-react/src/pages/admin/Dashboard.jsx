/**
 * Dashboard — ported from legacy fixes.js renderReports() + the
 * action-required-widget injection (role !== 'student' branch, shared with
 * faculty/Dashboard.jsx's own copy — see that file's notes on why this
 * isn't a shared component: the data-fetching differs per role).
 * "AVG ATTAINMENT 81%" is static demo content in the legacy markup too,
 * not computed from real data.
 */

import { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';

export default function Dashboard({ onNavigate }) {
  return (
    <>
      <Metrics onNavigate={onNavigate} />
      <SystemOverview />
      <ActionRequired onNavigate={onNavigate} />
    </>
  );
}

function Metrics({ onNavigate }) {
  const [counts, setCounts] = useState({ students: 0, faculty: 0, courses: 0 });

  useEffect(() => {
    apiFetch('/reports/overview')
      .then((data) => {
        const s = data.summary;
        setCounts({ students: s.total_students, faculty: s.total_faculty, courses: s.total_courses });
      })
      .catch(() => {});
  }, []);

  return (
    <div className="metrics-grid">
      <div className="metric-card" style={{ cursor: 'pointer' }} onClick={() => onNavigate('user-management')} title="View all users">
        <div className="label">STUDENTS</div>
        <div className="value">{counts.students}</div>
        <div className="sub">click to manage ↗</div>
      </div>
      <div className="metric-card" style={{ cursor: 'pointer' }} onClick={() => onNavigate('user-management')} title="View all faculty">
        <div className="label">FACULTY</div>
        <div className="value">{counts.faculty}</div>
        <div className="sub">click to manage ↗</div>
      </div>
      <div className="metric-card" style={{ cursor: 'pointer' }} onClick={() => onNavigate('institutional-reports')} title="View reports">
        <div className="label">ACTIVE COURSES</div>
        <div className="value">{counts.courses}</div>
        <div className="sub">click to view report ↗</div>
      </div>
      <div className="metric-card" style={{ cursor: 'pointer' }} onClick={() => onNavigate('institutional-reports')} title="View attainment">
        <div className="label">AVG ATTAINMENT</div>
        <div className="value">81%</div>
        <div className="sub">click to view report ↗</div>
      </div>
    </div>
  );
}

function SystemOverview() {
  const [summary, setSummary] = useState(undefined);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiFetch('/reports/overview')
      .then((data) => setSummary(data.summary))
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="stats-card" style={{ marginTop: 20 }}>
      <div className="stats-card-header"><div><h3>System Overview</h3></div></div>
      <div className="stats-card-body" style={{ padding: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {error ? (
          <p style={{ color: '#ef4444', gridColumn: '1/-1' }}>Failed: {error}</p>
        ) : summary === undefined ? null : (
          <>
            <Stat label="Total Students" value={summary.total_students} />
            <Stat label="Total Faculty" value={summary.total_faculty} />
            <Stat label="Total Courses" value={summary.total_courses} />
            <Stat label="Active Research" value={summary.active_research} />
            <Stat label="Overall Attendance" value={summary.overall_attendance} color="#16a34a" />
            <Stat label="Fee Compliance" value={summary.fee_compliance} color="#2563eb" />
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={{ padding: 16, background: '#f8fafc', borderRadius: 8 }}>
      <div style={{ fontSize: 12, color: '#64748b' }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

function ActionRequired({ onNavigate }) {
  const [items, setItems] = useState(undefined);

  useEffect(() => {
    Promise.all([apiFetch('/leave').catch(() => []), apiFetch('/attendance-requests').catch(() => []), apiFetch('/resource-bookings').catch(() => [])])
      .then(([leaves, attReqs, bookings]) => {
        const pendLeaves = leaves.filter((l) => l.status === 'pending').length;
        const pendAtt = attReqs.filter((r) => r.admin_status === 'pending').length;
        const pendBook = bookings.filter((b) => b.status === 'pending').length;
        const list = [];
        if (pendLeaves) list.push({ icon: '🗓️', text: `${pendLeaves} leave(s) pending approval`, view: 'leave-management' });
        if (pendAtt) list.push({ icon: '📝', text: `${pendAtt} attendance request(s) pending`, view: 'attendance-override' });
        if (pendBook) list.push({ icon: '🏢', text: `${pendBook} resource booking(s) pending`, view: 'resource-management' });
        setItems(list);
      })
      .catch(() => setItems([]));
  }, []);

  if (items === undefined) return null;

  return (
    <div style={{ marginTop: 20 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>⚡ Action Required</h3>
      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 16, color: '#16a34a', fontWeight: 600 }}>✓ Nothing requires your attention</div>
      ) : (
        items.map((i, idx) => (
          <div
            key={idx}
            onClick={() => onNavigate(i.view)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 8, marginBottom: 8, cursor: 'pointer' }}
          >
            <span style={{ fontSize: 18 }}>{i.icon}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#92400e' }}>{i.text}</span>
          </div>
        ))
      )}
    </div>
  );
}
