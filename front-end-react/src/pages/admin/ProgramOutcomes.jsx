/**
 * ProgramOutcomes — OUTCOMES_TRACKING_PLAN.md: the college-wide Program
 * Outcome list faculty map their own courses' Course Outcomes to. Scoped
 * to the college, not a department — courses carry no department_id
 * anywhere in this schema, so a true department-level PO list is out of
 * scope for now (see the plan's own note on this simplification).
 *
 * REDUX_MIGRATION_PLAN.md Phase 3: migrated to programOutcomesSlice, same
 * shape as Holidays.jsx's own migration.
 */

import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { useNotifications } from '../../features/notifications/useNotifications';
import { fetchProgramOutcomes, createProgramOutcome, deleteProgramOutcome } from '../../features/programOutcomes/programOutcomesThunks';

export default function ProgramOutcomes() {
  const { showToast } = useNotifications();
  const dispatch = useAppDispatch();
  const outcomes = useAppSelector((state) =>
    state.programOutcomes.status === 'idle' || state.programOutcomes.status === 'loading' ? undefined : state.programOutcomes.items,
  );
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    dispatch(fetchProgramOutcomes());
  }, [dispatch]);

  const add = async (e) => {
    e.preventDefault();
    if (!code.trim() || !description.trim()) return showToast('Code and description are both required', 'warning');
    setSubmitting(true);
    try {
      await dispatch(createProgramOutcome({ code: code.trim(), description: description.trim() })).unwrap();
      showToast('Program Outcome added!', 'success');
      setCode('');
      setDescription('');
    } catch (e2) {
      showToast('Failed: ' + e2.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id) => {
    try {
      await dispatch(deleteProgramOutcome(id)).unwrap();
      showToast('Program Outcome removed', 'success');
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
