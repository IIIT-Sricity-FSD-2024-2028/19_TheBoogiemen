import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Check, X } from 'lucide-react';
import Modal from '../../../shared/ui/Modal';
import { EmptyState, ErrorState, LoadingState } from '../../../shared/ui/StatusViews';
import { useApiResource } from '../../../hooks/useApiResource';
import { useMutation } from '../../../hooks/useMutation';
import { capitalize, formatDate, timeAgo } from '../../../shared/format';
import { fetchFacultyDashboard } from '../facultySlice';
import { STATUS_TONE } from './common';

const FILTERS = [
  { value: 'pending', label: 'Pending' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'all', label: 'All' },
];

function DecideDialog({ request, decision, onClose, onDone }) {
  const [note, setNote] = useState('');
  const [touched, setTouched] = useState(false);
  const [decide, { loading, error }] = useMutation();
  const noteError = decision === 'reject' && !note.trim() ? 'Give the student a reason when rejecting.' : null;

  const submit = async (e) => {
    e?.preventDefault();
    setTouched(true);
    if (noteError) return;
    const res = await decide(
      'post',
      `/attendance/corrections/${encodeURIComponent(request.request_id)}/decide`,
      { decision, note: note.trim() || undefined },
      { label: `${decision === 'accept' ? 'Accepted' : 'Rejected'} attendance correction for ${request.student_name}` }
    );
    if (res.ok) onDone();
  };

  return (
    <Modal
      title={decision === 'accept' ? 'Accept correction' : 'Reject correction'}
      onClose={onClose}
      width={500}
      footer={
        <>
          <button type="button" className="sp-btn is-secondary" onClick={onClose} disabled={loading}>Cancel</button>
          <button type="button" className={`sp-btn${decision === 'reject' ? ' is-danger' : ''}`} onClick={submit} disabled={loading}>
            {loading ? 'Saving...' : decision === 'accept' ? 'Accept and mark present' : 'Reject request'}
          </button>
        </>
      }
    >
      <form className="sp-form" onSubmit={submit} noValidate>
        <dl className="sp-details">
          <div><dt>Student</dt><dd>{request.student_name} ({request.roll_no ?? '-'})</dd></div>
          <div><dt>Class</dt><dd>{request.course_code} · {formatDate(request.date)}</dd></div>
        </dl>
        <p style={{ margin: 0 }} className="sp-muted">"{request.reason}"</p>
        {decision === 'accept' && <p className="sp-hint">Accepting changes the student's record for that class to present.</p>}
        <div className="sp-field">
          <label htmlFor="corr-note">{decision === 'reject' ? 'Reason for rejecting' : 'Note to the student (optional)'}</label>
          <textarea
            id="corr-note"
            className="sp-textarea"
            value={note}
            maxLength={500}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => setTouched(true)}
            aria-invalid={touched && noteError ? 'true' : undefined}
          />
          {touched && noteError && <p className="sp-field-error">{noteError}</p>}
        </div>
        {error && <div className="sp-alert is-error" role="alert">{error.message}</div>}
      </form>
    </Modal>
  );
}

export default function AttendanceCorrections() {
  const dispatch = useDispatch();
  const [filter, setFilter] = useState('pending');
  const list = useApiResource('/attendance/corrections');
  const [dialog, setDialog] = useState(null); // { request, decision }

  const all = Array.isArray(list.data) ? list.data : [];
  const rows = filter === 'all' ? all : all.filter((r) => r.status === filter);
  const pendingCount = all.filter((r) => r.status === 'pending').length;

  return (
    <>
      <div className="sp-page-header">
        <div>
          <h1 className="sp-page-title">Attendance Corrections</h1>
          <p className="sp-page-subtitle">Students who believe they were wrongly marked absent in your classes ask for a correction here.</p>
        </div>
        {list.status !== 'failed' && list.data && (
          <div className="sp-card" style={{ padding: '10px 16px', textAlign: 'right' }}>
            <div className="sp-stat-label">Pending</div>
            <div className="sp-stat-value" style={{ fontSize: 22 }}>{pendingCount}</div>
          </div>
        )}
      </div>

      <div className="sp-card">
        <div className="sp-segmented" role="group" aria-label="Filter by status" style={{ marginBottom: 14 }}>
          {FILTERS.map((f) => (
            <button key={f.value} type="button" aria-pressed={filter === f.value} onClick={() => setFilter(f.value)}>
              {f.label}
              {f.value === 'pending' && pendingCount > 0 ? ` (${pendingCount})` : ''}
            </button>
          ))}
        </div>

        {list.status === 'loading' && !list.data && <LoadingState />}
        {list.status === 'failed' && <ErrorState error={list.error} onRetry={list.reload} />}
        {list.status !== 'failed' && list.data &&
          (rows.length === 0 ? (
            <EmptyState
              title={filter === 'pending' ? 'No pending requests' : 'No requests'}
              message={filter === 'pending' ? 'You are all caught up. New student requests will appear here.' : 'Nothing matches this filter.'}
            />
          ) : (
            <ul className="fac-list">
              {rows.map((r) => (
                <li key={r.request_id} className="fac-list-row" style={{ alignItems: 'flex-start', border: '1px solid var(--sp-border)' }}>
                  <div className="fac-list-main" style={{ flex: 1 }}>
                    <div>
                      <strong>{r.student_name}</strong> <span className="sp-muted">{r.roll_no ?? ''}</span>{' '}
                      <span className={`sp-badge ${STATUS_TONE[r.status] || 'is-neutral'}`}>{capitalize(r.status)}</span>
                    </div>
                    <div className="sp-card-meta">
                      <span className="sp-code">{r.course_code}</span> class on {formatDate(r.date)} · requested {timeAgo(r.created_at)}
                    </div>
                    <p style={{ margin: '6px 0 0', whiteSpace: 'normal' }}>{r.reason}</p>
                    {r.decision_note && (
                      <p className="sp-hint" style={{ marginTop: 4, whiteSpace: 'normal' }}>Your note: {r.decision_note}</p>
                    )}
                  </div>
                  {r.status === 'pending' && (
                    <div className="sp-btn-row" style={{ flexShrink: 0 }}>
                      <button type="button" className="sp-btn is-small" onClick={() => setDialog({ request: r, decision: 'accept' })}>
                        <Check size={14} /> Accept
                      </button>
                      <button type="button" className="sp-btn is-secondary is-small" onClick={() => setDialog({ request: r, decision: 'reject' })}>
                        <X size={14} /> Reject
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ))}
      </div>

      {dialog && (
        <DecideDialog
          request={dialog.request}
          decision={dialog.decision}
          onClose={() => setDialog(null)}
          onDone={() => {
            setDialog(null);
            list.reload();
            dispatch(fetchFacultyDashboard({ force: true }));
          }}
        />
      )}
    </>
  );
}
