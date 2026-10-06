/** Attendance — ported from legacy fixes.js renderStudentAttendance(). */

import { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';

export default function Attendance() {
  const [data, setData] = useState(undefined);
  const [error, setError] = useState(null);

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
        {error ? (
          <p style={{ color: '#ef4444' }}>Failed to load attendance: {error}</p>
        ) : !data ? null : (
          <AttendanceBody data={data} />
        )}
      </div>
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
