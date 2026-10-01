import React, { useMemo, useState } from 'react';
import { Bell } from 'lucide-react';
import { useApiResource } from '../../../hooks/useApiResource';
import { useMutation } from '../../../hooks/useMutation';
import { EmptyState, LoadingState } from '../../../shared/ui/StatusViews';
import { formatCurrency, formatDate, timeAgo } from '../../../shared/format';
import { FeeStatusBadge, FeesErrorState, FeesGate } from '../feesUi';

/** Overdue / unpaid fees with multi-select → POST /api/fees/reminders {fee_ids}. */
function Dues() {
  const [view, setView] = useState('overdue');
  const fees = useApiResource(view === 'overdue' ? '/fees?overdue=true' : '/fees');
  const [selected, setSelected] = useState(() => new Set());
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState(null);
  const [send, { loading, error, reset }] = useMutation();

  const rows = useMemo(() => {
    const all = Array.isArray(fees.data) ? fees.data.filter((f) => f.status !== 'paid' && f.balance > 0) : [];
    const q = query.trim().toLowerCase();
    return q ? all.filter((f) => [f.student_name, f.roll_no, f.fee_type, f.department_code].some((v) => String(v || '').toLowerCase().includes(q))) : all;
  }, [fees.data, query]);

  const visibleIds = rows.map((r) => r.fee_id);
  const chosen = visibleIds.filter((id) => selected.has(id));
  const allChosen = rows.length > 0 && chosen.length === rows.length;
  const outstanding = rows.reduce((s, r) => s + (r.balance || 0), 0);

  const switchView = (v) => {
    setView(v);
    setSelected(new Set());
    setNotice(null);
    reset();
  };
  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = () => setSelected(allChosen ? new Set() : new Set(visibleIds));

  const remind = async () => {
    if (chosen.length === 0) return;
    const res = await send('post', '/fees/reminders', { fee_ids: chosen }, { label: `Sent fee reminders to ${chosen.length} student${chosen.length === 1 ? '' : 's'}` });
    if (res.ok) {
      const n = res.data?.reminded ?? 0;
      setNotice(`Reminder sent for ${n} fee${n === 1 ? '' : 's'}.${n < chosen.length ? ` ${chosen.length - n} were skipped because they are already paid.` : ''}`);
      setSelected(new Set());
      fees.reload();
    }
  };

  return (
    <>
      <div className="sp-page-header">
        <div>
          <h1 className="sp-page-title">Dues and reminders</h1>
          <p className="sp-page-subtitle">Select students with unpaid fees and send them a payment reminder.</p>
        </div>
        <div className="sp-segmented" role="group" aria-label="Which dues to show">
          <button type="button" aria-pressed={view === 'overdue'} onClick={() => switchView('overdue')}>Overdue</button>
          <button type="button" aria-pressed={view === 'unpaid'} onClick={() => switchView('unpaid')}>All unpaid</button>
        </div>
      </div>

      {notice && (
        <div className="sp-alert is-success" role="status" style={{ marginBottom: 16 }}>
          <span>{notice}</span>
          <button type="button" className="sp-link-btn" onClick={() => setNotice(null)}>Dismiss</button>
        </div>
      )}
      {error && <div className="sp-alert is-error" role="alert" style={{ marginBottom: 16 }}>{error.message}</div>}

      {fees.status === 'loading' && <LoadingState label="Loading dues..." lines={5} />}
      {fees.status === 'failed' && <FeesErrorState error={fees.error} onRetry={fees.reload} />}
      {fees.status === 'succeeded' && (
        <>
          <div className="sp-table-toolbar">
            <input type="search" className="sp-input" placeholder="Search student, roll no. or fee" aria-label="Search dues" value={query} onChange={(e) => setQuery(e.target.value)} />
            <div style={{ flex: 1 }} />
            <span className="sp-muted">{chosen.length} selected</span>
            <button type="button" className="sp-btn is-small" onClick={remind} disabled={chosen.length === 0 || loading}>
              <Bell size={14} /> {loading ? 'Sending...' : `Send reminder${chosen.length > 1 ? 's' : ''}`}
            </button>
          </div>
          {rows.length === 0 ? (
            <div className="sp-card">
              {query ? (
                <EmptyState title="No matches" message="Try a different search." />
              ) : (
                <EmptyState
                  title={view === 'overdue' ? 'No overdue fees' : 'No unpaid fees'}
                  message={view === 'overdue' ? 'Every fee past its due date has been paid.' : 'All billed fees are fully paid.'}
                />
              )}
            </div>
          ) : (
            <>
              <p className="sp-muted" style={{ margin: '0 0 10px' }}>
                {rows.length} fee{rows.length === 1 ? '' : 's'} with <strong>{formatCurrency(outstanding)}</strong> outstanding
              </p>
              <div className="sp-table-wrap">
                <table className="sp-table">
                  <caption className="sp-visually-hidden">Unpaid fees</caption>
                  <thead>
                    <tr>
                      <th scope="col" style={{ width: 36 }}>
                        <input type="checkbox" checked={allChosen} onChange={toggleAll} aria-label={allChosen ? 'Clear selection' : 'Select all'} />
                      </th>
                      <th scope="col">Student</th>
                      <th scope="col">Fee</th>
                      <th scope="col" className="sp-num">Balance</th>
                      <th scope="col">Due</th>
                      <th scope="col">Status</th>
                      <th scope="col">Last reminder</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((f) => (
                      <tr key={f.fee_id} className={selected.has(f.fee_id) ? 'fin-row-selected' : undefined}>
                        <td>
                          <input type="checkbox" checked={selected.has(f.fee_id)} onChange={() => toggle(f.fee_id)} aria-label={`Select ${f.student_name}, ${f.fee_type}`} />
                        </td>
                        <td>
                          {f.student_name}
                          <div className="sp-card-meta">{f.roll_no}{f.department_code ? ` · ${f.department_code}` : ''}</div>
                        </td>
                        <td>{f.fee_type}</td>
                        <td className="sp-num">{formatCurrency(f.balance)}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>{formatDate(f.due_date)}</td>
                        <td><FeeStatusBadge fee={f} /></td>
                        <td>
                          {f.reminded_at ? (
                            <>
                              {timeAgo(f.reminded_at)}
                              <div className="sp-card-meta">{f.reminders || 1} sent</div>
                            </>
                          ) : (
                            <span className="sp-muted">Never</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}

export default function FeeDues() {
  return (
    <FeesGate>
      <Dues />
    </FeesGate>
  );
}
