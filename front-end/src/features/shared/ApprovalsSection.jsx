import React, { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useApiResource } from '../../hooks/useApiResource';
import { useMutation } from '../../hooks/useMutation';
import DataTable from '../../shared/ui/DataTable';
import Modal from '../../shared/ui/Modal';
import { ErrorState, LoadingState } from '../../shared/ui/StatusViews';
import { capitalize, formatDate } from '../../shared/format';

const TONE = { approved: 'is-success', rejected: 'is-danger', pending: 'is-warning', cancelled: 'is-neutral' };
const ROLE_LABEL = { student: 'Student', faculty: 'Faculty', hod: 'HOD' };
const roleName = (r) => ROLE_LABEL[r] || capitalize(r);
const isHod = (role) => role === 'head' || role === 'DEPARTMENT_ADMIN_HOD';

function DecisionModal({ item, kind, onClose, onDone }) {
  const [decision, setDecision] = useState('approve');
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [decide, { loading, error }] = useMutation();
  const needNote = decision === 'reject' && !note.trim();
  const path = kind === 'leave' ? `/leave/${item.leave_id}/decide` : `/resource-bookings/${item.booking_id}/decide`;

  const submit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    if (needNote) return;
    const label = `${decision === 'approve' ? 'Approved' : 'Rejected'} ${kind === 'leave' ? `leave for ${item.applicant_name}` : `booking by ${item.requester_name}`}`;
    const res = await decide('post', path, { decision, note: note.trim() || undefined }, { label });
    if (res.ok) onDone();
  };

  return (
    <Modal
      title={kind === 'leave' ? 'Decide leave request' : 'Decide booking request'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="sp-btn is-secondary" onClick={onClose} disabled={loading}>Cancel</button>
          <button type="submit" form="decision-form" className={`sp-btn${decision === 'reject' ? ' is-danger' : ''}`} disabled={loading}>
            {loading ? 'Saving...' : decision === 'approve' ? 'Approve' : 'Reject'}
          </button>
        </>
      }
    >
      <form id="decision-form" className="sp-form" onSubmit={submit} noValidate>
        {error && <div className="sp-alert is-error" role="alert">{error.message}</div>}
        {kind === 'leave' ? (
          <dl className="sp-details">
            <div><dt>Applicant</dt><dd>{item.applicant_name} ({roleName(item.applicant_role)}){item.roll_no ? ` · ${item.roll_no}` : ''}</dd></div>
            <div><dt>Type</dt><dd>{item.leave_type} · {item.days} day{item.days === 1 ? '' : 's'}</dd></div>
            <div><dt>Dates</dt><dd>{formatDate(item.start_date)} to {formatDate(item.end_date)}</dd></div>
            <div style={{ gridColumn: '1 / -1' }}><dt>Reason</dt><dd style={{ fontWeight: 400 }}>{item.reason}</dd></div>
          </dl>
        ) : (
          <dl className="sp-details">
            <div><dt>Requested by</dt><dd>{item.requester_name}</dd></div>
            <div><dt>Resource</dt><dd>{item.resource_name}</dd></div>
            <div><dt>When</dt><dd>{formatDate(item.date)} · {item.time_slot}</dd></div>
            <div style={{ gridColumn: '1 / -1' }}><dt>Purpose</dt><dd style={{ fontWeight: 400 }}>{item.purpose}</dd></div>
          </dl>
        )}
        {kind === 'leave' && item.applicant_role === 'student' && (
          <p className="sp-hint" style={{ margin: 0 }}>Approving marks the student's absences in these dates as excused.</p>
        )}
        <div className="sp-segmented" role="group" aria-label="Decision">
          <button type="button" aria-pressed={decision === 'approve'} onClick={() => setDecision('approve')}>Approve</button>
          <button type="button" aria-pressed={decision === 'reject'} onClick={() => setDecision('reject')}>Reject</button>
        </div>
        <div className="sp-field">
          <label htmlFor="decision-note">Note {decision === 'reject' ? '(required)' : '(optional)'}</label>
          <textarea id="decision-note" className="sp-textarea" style={{ minHeight: 70 }} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} aria-invalid={submitted && needNote} />
          {submitted && needNote && <p className="sp-field-error">Give a reason when rejecting.</p>}
        </div>
      </form>
    </Modal>
  );
}

/**
 * Approvals for HODs (their department's student and faculty leave, and
 * resource bookings) and directors (HOD leave, all bookings). The server
 * decides who may approve what; this list only shows what the user can act on.
 */
export default function ApprovalsSection() {
  const user = useSelector((state) => state.auth.user);
  const leave = useApiResource('/leave');
  const bookings = useApiResource('/resource-bookings');
  const [tab, setTab] = useState('pending');
  const [active, setActive] = useState(null);

  const canDecideLeave = (l) => l.applicant_id !== user?.user_id && (isHod(user?.role) ? l.applicant_role !== 'hod' : l.applicant_role === 'hod');
  const leaveRows = useMemo(() => (Array.isArray(leave.data) ? leave.data.filter((l) => l.applicant_id !== user?.user_id) : []), [leave.data, user]);
  const bookingRows = useMemo(() => (Array.isArray(bookings.data) ? bookings.data.filter((b) => b.requested_by !== user?.user_id) : []), [bookings.data, user]);
  const filter = (rows) => (tab === 'pending' ? rows.filter((r) => r.status === 'pending') : rows);
  const pendingCount = leaveRows.filter((l) => l.status === 'pending' && canDecideLeave(l)).length + bookingRows.filter((b) => b.status === 'pending').length;

  const done = () => {
    setActive(null);
    leave.reload();
    bookings.reload();
  };

  return (
    <>
      <div className="sp-page-header">
        <div>
          <h1 className="sp-page-title">Approvals</h1>
          <p className="sp-page-subtitle">
            {isHod(user?.role) ? 'Leave and resource bookings from your department.' : 'HOD leave and resource bookings across the college.'} {pendingCount} waiting for you.
          </p>
        </div>
        <div className="sp-segmented" role="group" aria-label="Filter">
          <button type="button" aria-pressed={tab === 'pending'} onClick={() => setTab('pending')}>Pending</button>
          <button type="button" aria-pressed={tab === 'all'} onClick={() => setTab('all')}>All</button>
        </div>
      </div>

      <section className="sp-card" aria-labelledby="appr-leave">
        <h2 id="appr-leave" className="sp-section-title">Leave requests</h2>
        {leave.status === 'loading' && !leave.data && <LoadingState />}
        {leave.status === 'failed' && <ErrorState error={leave.error} onRetry={leave.reload} />}
        {leave.data && (
          <DataTable
            rows={filter(leaveRows)}
            rowKey={(r) => r.leave_id}
            csvName="leave-requests"
            searchPlaceholder="Search by name, type or reason"
            emptyTitle={tab === 'pending' ? 'Nothing waiting' : 'No leave requests'}
            emptyMessage={tab === 'pending' ? 'New leave requests will appear here.' : undefined}
            columns={[
              { key: 'applicant_name', header: 'Applicant', render: (r) => (<>{r.applicant_name}<div className="sp-muted">{roleName(r.applicant_role)}{r.roll_no ? ` · ${r.roll_no}` : ''}</div></>) },
              { key: 'leave_type', header: 'Type' },
              { key: 'start_date', header: 'Dates', render: (r) => (<span style={{ whiteSpace: 'nowrap' }}>{formatDate(r.start_date)}<div className="sp-muted">to {formatDate(r.end_date)} · {r.days}d</div></span>) },
              { key: 'reason', header: 'Reason' },
              { key: 'status', header: 'Status', render: (r) => <span className={`sp-badge ${TONE[r.status] || 'is-neutral'}`}>{capitalize(r.status)}</span> },
              { key: 'action', header: 'Action', sortable: false, csv: () => '', render: (r) => (r.status === 'pending' && canDecideLeave(r) ? <button type="button" className="sp-btn is-small" onClick={() => setActive({ kind: 'leave', item: r })}>Review</button> : <span className="sp-muted">{r.decided_by_name ? `by ${r.decided_by_name}` : '—'}</span>) },
            ]}
          />
        )}
      </section>

      <section className="sp-card sp-section" aria-labelledby="appr-bookings">
        <h2 id="appr-bookings" className="sp-section-title">Resource bookings</h2>
        {bookings.status === 'loading' && !bookings.data && <LoadingState />}
        {bookings.status === 'failed' && <ErrorState error={bookings.error} onRetry={bookings.reload} />}
        {bookings.data && (
          <DataTable
            rows={filter(bookingRows)}
            rowKey={(r) => r.booking_id}
            searchPlaceholder="Search bookings"
            emptyTitle={tab === 'pending' ? 'Nothing waiting' : 'No bookings'}
            columns={[
              { key: 'requester_name', header: 'Requested by' },
              { key: 'resource_name', header: 'Resource' },
              { key: 'date', header: 'When', render: (r) => (<>{formatDate(r.date)}<div className="sp-muted">{r.time_slot}</div></>) },
              { key: 'purpose', header: 'Purpose' },
              { key: 'status', header: 'Status', render: (r) => <span className={`sp-badge ${TONE[r.status] || 'is-neutral'}`}>{capitalize(r.status)}</span> },
              { key: 'action', header: 'Action', sortable: false, render: (r) => (r.status === 'pending' ? <button type="button" className="sp-btn is-small" onClick={() => setActive({ kind: 'booking', item: r })}>Review</button> : <span className="sp-muted">{r.decided_by_name ? `by ${r.decided_by_name}` : '—'}</span>) },
            ]}
          />
        )}
      </section>

      {active && <DecisionModal item={active.item} kind={active.kind} onClose={() => setActive(null)} onDone={done} />}
    </>
  );
}
