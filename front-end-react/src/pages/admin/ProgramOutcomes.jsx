/**
 * ProgramOutcomes — OUTCOMES_TRACKING_PLAN.md: the college-wide Program
 * Outcome list faculty map their own courses' Course Outcomes to. Scoped
 * to the college, not a department — courses carry no department_id
 * anywhere in this schema, so a true department-level PO list is out of
 * scope for now (see the plan's own note on this simplification).
 */

import { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';
import { useNotifications } from '../../context/NotificationsContext';

export default function ProgramOutcomes() {
  const { showToast } = useNotifications();
  const [outcomes, setOutcomes] = useState(undefined);
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = () => apiFetch('/program-outcomes').then(setOutcomes).catch(() => setOutcomes([]));
  // Wrapped, not passed directly — see Team.jsx's fix note: load() returns a
  // Promise, which React would otherwise try to call as an unmount cleanup.
  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    if (!code.trim() || !description.trim()) return showToast('Code and description are both required', 'warning');
    setSubmitting(true);
    try {
      await apiFetch('/program-outcomes', { method: 'POST', body: JSON.stringify({ code: code.trim(), description: description.trim() }) });
      showToast('Program Outcome added!', 'success');
      setCode('');
      setDescription('');
      load();
    } catch (e2) {
      showToast('Failed: ' + e2.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id) => {
    try {
      await apiFetch(`/program-outcomes/${id}`, { method: 'DELETE' });
      showToast('Program Outcome removed', 'success');
      load();
    } catch (e) {
      showToast('Failed: ' + e.message, 'error');
    }
  };

  return (
    <div className="stats-card">
      <div className="stats-card-header">
        <div>
          <h3>Program Outcomes</h3>
          <p style={{ fontSize: 13, color: '#64748b' }}>The college-wide outcomes faculty map their courses' Course Outcomes to.</p>
        </div>
      </div>
      <div className="stats-card-body" style={{ padding: 24 }}>
        <form onSubmit={add} style={{ display: 'grid', gridTemplateColumns: '100px 1fr auto', gap: 10, marginBottom: 20, alignItems: 'end' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Code</label>
            <input type="text" value={code} onChange={(e) => setCode(e.target.value)} placeholder="PO6" />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Description</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. The engineer and society" />
          </div>
          <button type="submit" className="page-action-btn" disabled={submitting}>{submitting ? 'Adding…' : '+ Add'}</button>
        </form>

        {outcomes === undefined ? (
          <div style={{ textAlign: 'center', color: '#64748b', padding: 20 }}>Loading...</div>
        ) : outcomes.length === 0 ? (
          <p style={{ color: '#64748b', textAlign: 'center' }}>No Program Outcomes defined yet.</p>
        ) : (
          <table className="crud-table">
            <thead><tr><th>Code</th><th>Description</th><th /></tr></thead>
            <tbody>
              {outcomes.map((po) => (
                <tr key={po.po_id}>
                  <td><strong>{po.code}</strong></td>
                  <td>{po.description}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button onClick={() => remove(po.po_id)} style={{ padding: '4px 10px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
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
