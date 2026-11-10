/**
 * Holidays — ATTENDANCE_WORKFLOW_REVAMP: the admin side of a concept that
 * didn't exist anywhere before this. A holiday is a fact the whole
 * attendance system respects (faculty can't mark attendance on one, no
 * student's percentage is ever penalized for one, and a merged
 * leave/attendance-request spanning one simply skips it) — this page is
 * just where that fact gets declared.
 */

import { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';
import { useNotifications } from '../../context/NotificationsContext';

export default function Holidays() {
  const { showToast } = useNotifications();
  const [holidays, setHolidays] = useState(undefined);
  const [date, setDate] = useState('');
  const [label, setLabel] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = () => apiFetch('/holidays').then(setHolidays).catch(() => setHolidays([]));
  useEffect(load, []);

  const add = async (e) => {
    e.preventDefault();
    if (!date || !label.trim()) return showToast('Date and label are both required', 'warning');
    setSubmitting(true);
    try {
      await apiFetch('/holidays', { method: 'POST', body: JSON.stringify({ date, label: label.trim() }) });
      showToast('Holiday added!', 'success');
      setDate('');
      setLabel('');
      load();
    } catch (e2) {
      showToast('Failed: ' + e2.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id) => {
    try {
      await apiFetch(`/holidays/${id}`, { method: 'DELETE' });
      showToast('Holiday removed', 'success');
      load();
    } catch (e) {
      showToast('Failed: ' + e.message, 'error');
    }
  };

  return (
    <div className="stats-card">
      <div className="stats-card-header">
        <div>
          <h3>Holidays</h3>
          <p style={{ fontSize: 13, color: '#64748b' }}>No class is held, and no student's attendance is ever affected, on these dates.</p>
        </div>
      </div>
      <div className="stats-card-body" style={{ padding: 24 }}>
        <form onSubmit={add} style={{ display: 'grid', gridTemplateColumns: '160px 1fr auto', gap: 10, marginBottom: 20, alignItems: 'end' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Label</label>
            <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Diwali" />
          </div>
          <button type="submit" className="page-action-btn" disabled={submitting}>{submitting ? 'Adding…' : '+ Add Holiday'}</button>
        </form>

        {holidays === undefined ? (
          <div style={{ textAlign: 'center', color: '#64748b', padding: 20 }}>Loading...</div>
        ) : holidays.length === 0 ? (
          <p style={{ color: '#64748b', textAlign: 'center' }}>No holidays declared yet.</p>
        ) : (
          <table className="crud-table">
            <thead><tr><th>Date</th><th>Label</th><th /></tr></thead>
            <tbody>
              {holidays.map((h) => (
                <tr key={h.holiday_id}>
                  <td>{h.date}</td>
                  <td>{h.label}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button onClick={() => remove(h.holiday_id)} style={{ padding: '4px 10px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
