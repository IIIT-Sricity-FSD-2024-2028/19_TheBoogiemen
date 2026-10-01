import React, { useCallback, useState } from 'react';
import { useApiResource } from '../../../hooks/useApiResource';
import { useMutation } from '../../../hooks/useMutation';
import Modal from '../../../shared/ui/Modal';
import { EmptyState, ErrorState, LoadingState } from '../../../shared/ui/StatusViews';
import { capitalize, formatDate, formatDateTime } from '../../../shared/format';

const TONE = { accepted: 'is-success', rejected: 'is-danger', pending: 'is-warning' };
const today = () => new Date().toISOString().slice(0, 10);

/**
 * POST /api/attendance/corrections {course_section_id, date, reason}. The
 * server accepts it only for a past class of one of your active enrollments
 * where you are marked absent; its message is shown inline otherwise.
 */
function RequestForm({ courses, absences, onClose, onCreated }) {
  const [form, setForm] = useState({ course_section_id: courses[0]?.course_section_id || '', date: '', reason: '' });
  const [submitted, setSubmitted] = useState(false);
  const [send, { loading, error }] = useMutation();

  const absentDates = [...new Set(absences.filter((a) => a.course_section_id === form.course_section_id).map((a) => a.date))].sort().reverse();

  const errors = {
    course_section_id: !form.course_section_id ? 'Choose a course.' : null,
    date: !form.date ? 'Choose the class date.' : form.date > today() ? 'The date cannot be in the future.' : null,
    reason: form.reason.trim().length < 10 ? 'Explain the reason (at least 10 characters).' : null,
  };
  const valid = !errors.course_section_id && !errors.date && !errors.reason;

  const submit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    if (!valid) return;
    const course = courses.find((c) => c.course_section_id === form.course_section_id);
    const res = await send('post', '/attendance/corrections', { ...form, reason: form.reason.trim() }, {
      label: `Requested attendance correction for ${course?.course_code || 'a course'}`,
    });
    if (res.ok) onCreated();
  };

  return (
    <Modal
      title="Request attendance correction"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="sp-btn is-secondary" onClick={onClose} disabled={loading}>Cancel</button>
          <button type="submit" form="att-req-form" className="sp-btn" disabled={loading}>{loading ? 'Submitting...' : 'Submit request'}</button>
        </>
      }
    >
      <form id="att-req-form" className="sp-form" onSubmit={submit} noValidate>
        <p className="sp-hint" style={{ margin: 0 }}>The request goes to the teacher of the course, who accepts or rejects it. Only classes where you are marked absent can be corrected.</p>
        {error && <div className="sp-alert is-error" role="alert">{error.message}</div>}
        <div className="sp-field">
          <label htmlFor="ar-course">Course</label>
          <select id="ar-course" className="sp-select" value={form.course_section_id} onChange={(e) => setForm({ ...form, course_section_id: e.target.value, date: '' })} aria-invalid={submitted && !!errors.course_section_id}>
            {courses.map((c) => (
              <option key={c.enrollment_id} value={c.course_section_id}>{c.course_code} — {c.course_name}</option>
            ))}
          </select>
          {submitted && errors.course_section_id && <p className="sp-field-error">{errors.course_section_id}</p>}
        </div>
        <div className="sp-field">
          <label htmlFor="ar-date">Class date</label>
          {absentDates.length > 0 ? (
            <select id="ar-date" className="sp-select" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} aria-invalid={submitted && !!errors.date}>
              <option value="">Choose a class you were marked absent for</option>
              {absentDates.map((d) => <option key={d} value={d}>{formatDate(d)}</option>)}
            </select>
          ) : (
            <>
              <input id="ar-date" type="date" max={today()} className="sp-input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} aria-invalid={submitted && !!errors.date} />
              <p className="sp-hint">You have no recorded absences in this course.</p>
            </>
          )}
          {submitted && errors.date && <p className="sp-field-error">{errors.date}</p>}
        </div>
        <div className="sp-field">
          <label htmlFor="ar-reason">Reason</label>
          <textarea id="ar-reason" className="sp-textarea" maxLength={500} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} aria-invalid={submitted && !!errors.reason} />
          {submitted && errors.reason && <p className="sp-field-error">{errors.reason}</p>}
        </div>
      </form>
    </Modal>
  );
}

/**
 * The student's attendance correction requests (GET /api/attendance/corrections).
 * `courses` are active enrollments (with course_section_id); `records` are the
 * attendance records, used to offer only dates the student was marked absent.
 */
export default function AttendanceRequests({ courses, records = [] }) {
  const requests = useApiResource('/attendance/corrections');
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const list = Array.isArray(requests.data) ? [...requests.data].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))) : [];
  const active = courses.filter((c) => c.course_section_id && (!c.enrollment_status || c.enrollment_status === 'active'));
  // A class with a request still awaiting a decision cannot be requested again.
  const pending = new Set(list.filter((r) => r.status === 'pending').map((r) => `${r.course_section_id}|${r.date}`));
  const absences = records.filter((r) => r.status === 'absent' && r.course_section_id && !pending.has(`${r.course_section_id}|${r.date}`));

  return (
    <section className="sp-card sp-section" aria-labelledby="att-requests">
      <div className="sp-page-header" style={{ marginBottom: 12 }}>
        <h2 id="att-requests" className="sp-section-title" style={{ margin: 0 }}>Correction requests</h2>
        <button type="button" className="sp-btn is-small" onClick={() => setOpen(true)} disabled={active.length === 0}>Request correction</button>
      </div>
      {requests.status === 'loading' && !requests.data && <LoadingState />}
      {requests.status === 'failed' && <ErrorState error={requests.error} onRetry={requests.reload} />}
      {requests.data && list.length === 0 && (
        <EmptyState title="No correction requests" message="If you were marked absent by mistake, request a correction here." />
      )}
      {list.length > 0 && (
        <div className="sp-table-wrap">
          <table className="sp-table">
            <thead>
              <tr>
                <th scope="col">Course</th>
                <th scope="col">Class date</th>
                <th scope="col">Reason</th>
                <th scope="col">Teacher</th>
                <th scope="col">Status</th>
                <th scope="col">Decision note</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.request_id}>
                  <td><span className="sp-code">{r.course_code}</span></td>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatDate(r.date)}</td>
                  <td>{r.reason}<div className="sp-card-meta">Sent {formatDateTime(r.created_at)}</div></td>
                  <td>{r.faculty_name || <span className="sp-muted">Not assigned</span>}</td>
                  <td><span className={`sp-badge ${TONE[r.status] || 'is-neutral'}`}>{capitalize(r.status)}</span></td>
                  <td>
                    {r.decision_note || <span className="sp-muted">{r.status === 'pending' ? 'Awaiting decision' : 'No note'}</span>}
                    {r.decided_at && <div className="sp-card-meta">{formatDateTime(r.decided_at)}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {open && (
        <RequestForm
          courses={active}
          absences={absences}
          onClose={close}
          onCreated={() => {
            setOpen(false);
            requests.reload();
          }}
        />
      )}
    </section>
  );
}
