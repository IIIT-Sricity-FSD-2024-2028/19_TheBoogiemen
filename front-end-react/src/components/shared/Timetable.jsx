/**
 * Timetable — ported from legacy fixes.js renderStudentTimetable() /
 * renderFacultyTimetable() / renderTimetableGrid(). One component, the
 * `role` prop picks the endpoint — the grid-building logic itself never
 * differed between the two in the legacy code.
 */

import { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';

const ENDPOINT_BY_ROLE = {
  student: '/student-timetable',
  faculty: '/faculty/me/timetable',
};

const DAY_LABELS = { MON: 'Monday', TUE: 'Tuesday', WED: 'Wednesday', THU: 'Thursday', FRI: 'Friday' };
const DAY_SHORT = { MON: 'Mon', TUE: 'Tue', WED: 'Wed', THU: 'Thu', FRI: 'Fri' };
const DAY_COLORS = {
  MON: { bg: '#6366f1' },
  TUE: { bg: '#8b5cf6' },
  WED: { bg: '#0ea5e9' },
  THU: { bg: '#f59e0b' },
  FRI: { bg: '#10b981' },
};
const TYPE_COLORS = {
  lab: { bg: 'linear-gradient(135deg, #fef3c7, #fde68a)', border: '#f59e0b', text: '#92400e', icon: '🔬' },
  lecture: { bg: 'linear-gradient(135deg, #eff6ff, #dbeafe)', border: '#6366f1', text: '#1e40af', icon: '📖' },
  tutorial: { bg: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', border: '#22c55e', text: '#166534', icon: '✏️' },
};

function formatTime(t) {
  const [h, m] = t.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${h12}:${m.toString().padStart(2, '0')} ${suffix}`;
}

export default function Timetable({ role }) {
  const [data, setData] = useState(undefined); // undefined = loading
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch(ENDPOINT_BY_ROLE[role])
      .then((res) => !cancelled && setData(res))
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [role]);

  if (error) return <p style={{ color: '#ef4444' }}>Failed to load timetable: {error}</p>;
  if (data === undefined) return null;
  if (!data || !data.grid) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📅</div>
        <p style={{ color: '#64748b', fontSize: 15, fontWeight: 600 }}>No timetable data available</p>
        <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 4 }}>Your schedule will appear here once classes are assigned.</p>
      </div>
    );
  }

  const days = data.days || ['MON', 'TUE', 'WED', 'THU', 'FRI'];
  const times = data.times || ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'];
  let totalSlots = 0;
  days.forEach((d) => {
    if (data.grid[d]) totalSlots += Object.keys(data.grid[d]).length;
  });
  if (totalSlots === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
        <p style={{ color: '#64748b', fontSize: 15, fontWeight: 600 }}>No classes scheduled this week</p>
      </div>
    );
  }

  return (
    <>
      <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid #e2e8f0' }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 13, minWidth: 750, background: '#fff' }}>
          <thead>
            <tr>
              <th
                style={{
                  width: 90, padding: '14px 12px', background: 'linear-gradient(135deg,#f8fafc,#f1f5f9)', color: '#475569',
                  fontSize: 11, fontWeight: 800, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 1,
                  borderBottom: '2px solid #e2e8f0', borderRight: '1px solid #e2e8f0', position: 'sticky', left: 0, zIndex: 1,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  Time
                </div>
              </th>
              {days.map((d) => {
                const dc = DAY_COLORS[d] || { bg: '#6366f1' };
                return (
                  <th key={d} style={{ padding: '14px 8px', background: dc.bg, color: '#fff', fontSize: 12, fontWeight: 700, textAlign: 'center', letterSpacing: 0.5, borderBottom: `2px solid ${dc.bg}` }}>
                    <div style={{ fontSize: 13, fontWeight: 800 }}>{DAY_SHORT[d] || d}</div>
                    <div style={{ fontSize: 9, opacity: 0.8, marginTop: 2, fontWeight: 500 }}>{DAY_LABELS[d] || d}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {times.map((t, idx) => {
              const isEvenRow = idx % 2 === 0;
              return (
                <tr key={t} style={{ background: isEvenRow ? '#ffffff' : '#fafbfc' }}>
                  <td
                    style={{
                      padding: '10px 8px', fontSize: 12, color: '#475569', fontWeight: 700, textAlign: 'center', verticalAlign: 'middle',
                      whiteSpace: 'nowrap', borderRight: '1px solid #e2e8f0', background: isEvenRow ? '#f8fafc' : '#f1f5f9',
                      position: 'sticky', left: 0, zIndex: 1,
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#334155' }}>{formatTime(t)}</div>
                  </td>
                  {days.map((d) => {
                    const cell = data.grid[d] && data.grid[d][t];
                    if (!cell) {
                      return (
                        <td key={d} style={{ padding: 6, verticalAlign: 'top', borderBottom: '1px solid #f1f5f9' }}>
                          <div style={{ minHeight: 60, borderRadius: 8, background: '#f8fafc', border: '1px dashed #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: 18, opacity: 0.15 }}>—</span>
                          </div>
                        </td>
                      );
                    }
                    const slots = Array.isArray(cell) ? cell : [cell];
                    return (
                      <td key={d} style={{ padding: 6, verticalAlign: 'top', borderBottom: '1px solid #f1f5f9' }}>
                        {slots.map((slot, si) => {
                          const c = TYPE_COLORS[slot.type] || TYPE_COLORS.lecture;
                          return (
                            <div key={si} style={{ padding: '10px 12px', background: c.bg, borderRadius: 10, borderLeft: `4px solid ${c.border}`, marginBottom: 4, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                <span style={{ fontSize: 12 }}>{c.icon}</span>
                                <span style={{ fontWeight: 800, color: c.text, fontSize: 13, letterSpacing: 0.3 }}>{slot.course_code || ''}</span>
                              </div>
                              {slot.course_name && (
                                <div style={{ fontSize: 11, color: '#475569', fontWeight: 500, marginBottom: 4, lineHeight: 1.3 }}>{slot.course_name}</div>
                              )}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                {slot.room && (
                                  <span style={{ fontSize: 10, color: '#64748b', display: 'flex', alignItems: 'center', gap: 3 }}>
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                      <circle cx="12" cy="10" r="3" />
                                    </svg>
                                    {slot.room}
                                  </span>
                                )}
                                {slot.type && (
                                  <span style={{ fontSize: 9, background: `${c.border}18`, color: c.text, padding: '2px 8px', borderRadius: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                    {slot.type}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', gap: 16, marginTop: 16, padding: '12px 16px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>Legend:</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#1e40af', fontWeight: 600 }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: '#6366f1', display: 'inline-block' }} />Lecture
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#92400e', fontWeight: 600 }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: '#f59e0b', display: 'inline-block' }} />Lab
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#166534', fontWeight: 600 }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: '#22c55e', display: 'inline-block' }} />Tutorial
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>{totalSlots} classes/week</span>
      </div>
    </>
  );
}
