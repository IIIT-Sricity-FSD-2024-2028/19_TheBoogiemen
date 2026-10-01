import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useApiResource } from '../../hooks/useApiResource';
import { useMutation } from '../../hooks/useMutation';
import { useSelector } from 'react-redux';
import { fetchStudentAttendance } from '../student/studentSlice';
import { ConfirmDialog } from '../../shared/ui/Modal';
import { EmptyState, ErrorState, LoadingState } from '../../shared/ui/StatusViews';
import { capitalize, formatDate } from '../../shared/format';

// Same vocabulary as LEAVE_TYPES in back-end/src/common/academic-rules.ts.
const LEAVE_TYPES = ['Medical', 'Personal', 'Event', 'Family Event', 'Other'];
const STATUS_TONE = { approved: 'is-success', rejected: 'is-danger', pending: 'is-warning', cancelled: 'is-neutral' };
const END_BEFORE_START = 'End date cannot be before start date.';

const EMPTY_FORM = { leave_type: '', start_date: '', end_date: '', reason: '' };

/** Returns { field: message } for every invalid field. Empty object = valid. */
function validate(form) {
  const errors = {};
  if (!form.leave_type) errors.leave_type = 'Select a leave type.';
  if (!form.start_date) errors.start_date = 'Start date is required.';
  if (!form.end_date) errors.end_date = 'End date is required.';
  if (form.start_date && form.end_date && form.end_date < form.start_date) errors.end_date = END_BEFORE_START;
  if (!form.reason.trim()) errors.reason = 'Reason is required.';
  else if (form.reason.trim().length < 5) errors.reason = 'Please give a little more detail (at least 5 characters).';
  return errors;
}

function LeaveForm({ onSubmitted, isStudent }) {
  const dispatch = useDispatch();
  const [form, setForm] = useState(EMPTY_FORM);
  const [touched, setTouched] = useState({});
  const [submitLeave, { loading: submitting }] = useMutation();
  const [result, setResult] = useState(null); // { type: 'success' | 'error', message }

  const errors = validate(form);
  // Date order is checked as soon as both dates exist, without waiting for blur or submit.
  const dateOrderError = errors.end_date === END_BEFORE_START;
  const showError = (field) => (touched[field] || (field === 'end_date' && dateOrderError)) && errors[field];

  const update = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
    setResult(null);
  };
  const markTouched = (field) => () => setTouched((prev) => ({ ...prev, [field]: true }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setTouched({ leave_type: true, start_date: true, end_date: true, reason: true });
    if (Object.keys(errors).length > 0) return;

    setResult(null);
    const res = await submitLeave('post', '/leave', { ...form, reason: form.reason.trim() }, { label: `Applied for ${form.leave_type} leave` });
    if (res.ok) {
      setForm(EMPTY_FORM);
      setTouched({});
      setResult({ type: 'success', message: 'Leave application submitted. It is now pending approval.' });
      onSubmitted();
      // For students, approved leave becomes excused attendance, so refresh it.
      if (isStudent) dispatch(fetchStudentAttendance({ force: true }));
    } else {
      // Backend validation (e.g. the same date rule) is shown as returned.
      setResult({ type: 'error', message: res.error.message });
    }
  };

  return (
    <form className="sp-form" onSubmit={handleSubmit} noValidate aria-labelledby="leave-form-title">
      <h2 id="leave-form-title" className="sp-section-title" style={{ margin: 0 }}>Apply for leave</h2>

      {result && (
        <div className={`sp-alert ${result.type === 'success' ? 'is-success' : 'is-error'}`} role={result.type === 'error' ? 'alert' : 'status'}>
          {result.message}
        </div>
      )}

      <div className="sp-field">
        <label htmlFor="leave-type">Leave type</label>
        <select
          id="leave-type"
          className="sp-select"
          value={form.leave_type}
          onChange={update('leave_type')}
          onBlur={markTouched('leave_type')}
          aria-invalid={!!showError('leave_type')}
          aria-describedby={showError('leave_type') ? 'leave-type-error' : undefined}
        >
          <option value="">Select type</option>
          {LEAVE_TYPES.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
        {showError('leave_type') && <p id="leave-type-error" className="sp-field-error">{errors.leave_type}</p>}
      </div>

      <div className="sp-form-row">
        <div className="sp-field">
          <label htmlFor="leave-start">Start date</label>
          <input
            id="leave-start"
            type="date"
            className="sp-input"
            value={form.start_date}
            onChange={update('start_date')}
            onBlur={markTouched('start_date')}
            aria-invalid={!!showError('start_date')}
            aria-describedby={showError('start_date') ? 'leave-start-error' : undefined}
          />
          {showError('start_date') && <p id="leave-start-error" className="sp-field-error">{errors.start_date}</p>}
        </div>
        <div className="sp-field">
          <label htmlFor="leave-end">End date</label>
          <input
            id="leave-end"
            type="date"
            className="sp-input"
            value={form.end_date}
            onChange={update('end_date')}
            onBlur={markTouched('end_date')}
            aria-invalid={!!showError('end_date')}
            aria-describedby={showError('end_date') ? 'leave-end-error' : undefined}
          />
          {showError('end_date') && (
            <p id="leave-end-error" className="sp-field-error" role="alert">{errors.end_date}</p>
          )}
        </div>
      </div>

      <div className="sp-field">
        <label htmlFor="leave-reason">Reason</label>
        <textarea
          id="leave-reason"
          className="sp-textarea"
          value={form.reason}
          onChange={update('reason')}
          onBlur={markTouched('reason')}
          maxLength={500}
          aria-invalid={!!showError('reason')}
          aria-describedby={showError('reason') ? 'leave-reason-error' : 'leave-reason-hint'}
        />
        {showError('reason') ? (
          <p id="leave-reason-error" className="sp-field-error">{errors.reason}</p>
        ) : (
          <p id="leave-reason-hint" className="sp-hint">{form.reason.length}/500 characters</p>
        )}
      </div>

      <div className="sp-btn-row">
        <button type="submit" className="sp-btn" disabled={submitting || dateOrderError}>
          {submitting ? 'Submitting...' : 'Submit application'}
        </button>
      </div>
    </form>
  );
}

/**
 * "My leave" for students, faculty and HODs: apply (validated here and on the
 * server) and track applications. The HOD of the department decides; an HOD's
 * own leave goes to the director. Pending requests can be cancelled.
 */
export default function LeaveSection() {
  const user = useSelector((state) => state.auth.user);
  const isStudent = user?.role === 'student';
  const leaves = useApiResource('/leave?scope=mine');
  const [cancelling, setCancelling] = useState(null);
  const [cancel, { loading: cancelBusy }] = useMutation();
  const list = Array.isArray(leaves.data)
    ? [...leaves.data].filter((l) => l.applicant_id === user?.user_id).sort((a, b) => String(b.applied_on).localeCompare(String(a.applied_on)))
    : [];

  const confirmCancel = async () => {
    const res = await cancel('post', `/leave/${cancelling.leave_id}/cancel`, undefined, { label: 'Cancelled a leave request' });
    setCancelling(null);
    if (res.ok) leaves.reload();
  };

  return (
    <>
      <div className="sp-page-header">
        <div>
          <h1 className="sp-page-title">Leave</h1>
          <p className="sp-page-subtitle">
            Apply for leave and track your applications. {user?.role === 'head' ? 'Your leave is approved by the director.' : 'Your HOD approves leave.'}
          </p>
        </div>
      </div>

      <div className="sp-grid sp-grid-form">
        <section className="sp-card">
          <LeaveForm onSubmitted={leaves.reload} isStudent={isStudent} />
        </section>

        <section className="sp-card" aria-labelledby="leave-history">
          <h2 id="leave-history" className="sp-section-title">My applications</h2>
          {leaves.status === 'loading' && !leaves.data && <LoadingState label="Loading applications..." />}
          {leaves.status === 'failed' && <ErrorState error={leaves.error} onRetry={leaves.reload} />}
          {leaves.data && list.length === 0 && (
            <EmptyState title="No leave applications" message="Applications you submit will appear here." />
          )}
          {list.length > 0 && (
            <div className="sp-table-wrap">
              <table className="sp-table">
                <thead>
                  <tr>
                    <th scope="col">Type</th>
                    <th scope="col">Dates</th>
                    <th scope="col">Reason</th>
                    <th scope="col">Status</th>
                    <th scope="col"><span className="sp-visually-hidden">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((leave) => (
                    <tr key={leave.leave_id}>
                      <td>{leave.leave_type}<div className="sp-muted">{leave.days} day{leave.days === 1 ? '' : 's'}</div></td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {formatDate(leave.start_date)}
                        <div className="sp-muted">to {formatDate(leave.end_date)}</div>
                      </td>
                      <td>
                        {leave.reason}
                        {leave.decision_note && <div className="sp-muted">Note: {leave.decision_note}</div>}
                      </td>
                      <td>
                        <span className={`sp-badge ${STATUS_TONE[leave.status] || 'is-neutral'}`}>{capitalize(leave.status)}</span>
                        {leave.decided_by_name && <div className="sp-muted" style={{ fontSize: 12 }}>by {leave.decided_by_name}</div>}
                      </td>
                      <td className="sp-num">
                        {leave.status === 'pending' && (
                          <button type="button" className="sp-btn is-secondary is-small" onClick={() => setCancelling(leave)}>Cancel</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
      {cancelling && (
        <ConfirmDialog
          title="Cancel leave request"
          cancelLabel="Keep request"
          message={`Cancel your ${cancelling.leave_type} leave request for ${formatDate(cancelling.start_date)} to ${formatDate(cancelling.end_date)}?`}
          confirmLabel="Cancel request"
          danger
          busy={cancelBusy}
          onConfirm={confirmCancel}
          onCancel={() => setCancelling(null)}
        />
      )}
    </>
  );
}
