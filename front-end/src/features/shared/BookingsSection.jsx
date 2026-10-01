import React, { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Building2, Plus, Users, Wrench } from 'lucide-react';
import { useApiResource } from '../../hooks/useApiResource';
import { useMutation } from '../../hooks/useMutation';
import DataTable from '../../shared/ui/DataTable';
import Modal from '../../shared/ui/Modal';
import { EmptyState, ErrorState, LoadingState } from '../../shared/ui/StatusViews';
import { capitalize, formatDate } from '../../shared/format';
import { isDirectorRole, listOf } from './roles';
import './shared.css';

const TONE = { approved: 'is-success', rejected: 'is-danger', pending: 'is-warning' };
const todayIso = () => new Date().toISOString().slice(0, 10);

function FormModal({ title, formId, onClose, loading, submitLabel, children }) {
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="sp-btn is-secondary" onClick={onClose} disabled={loading}>Cancel</button>
          <button type="submit" form={formId} className="sp-btn" disabled={loading}>{loading ? 'Saving...' : submitLabel}</button>
        </>
      }
    >
      {children}
    </Modal>
  );
}

function BookingForm({ resource, onClose, onDone }) {
  const [form, setForm] = useState({ date: todayIso(), from: '10:00', to: '11:00', purpose: '' });
  const [submitted, setSubmitted] = useState(false);
  const [book, { loading, error }] = useMutation();
  const errors = {};
  if (!form.date) errors.date = 'Choose a date.';
  else if (form.date < todayIso()) errors.date = 'Choose today or a later date.';
  if (!form.from || !form.to || form.to <= form.from) errors.to = 'The slot must end after it starts.';
  if (!form.purpose.trim()) errors.purpose = 'Say what the booking is for.';
  const show = (k) => submitted && errors[k];
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length) return;
    const res = await book('post', '/resource-bookings', { resource_id: resource.resource_id, date: form.date, time_slot: `${form.from}-${form.to}`, purpose: form.purpose.trim() }, { label: `Requested ${resource.name}` });
    if (res.ok) onDone();
  };

  return (
    <FormModal title={`Book ${resource.name}`} formId="booking-form" onClose={onClose} loading={loading} submitLabel="Send request">
      <form id="booking-form" className="sp-form" onSubmit={submit} noValidate>
        {error && <div className="sp-alert is-error" role="alert">{error.message}</div>}
        <p className="sp-hint" style={{ margin: 0 }}>Requests go to your HOD (or the director) for approval.</p>
        <div className="sp-field">
          <label htmlFor="bk-date">Date</label>
          <input id="bk-date" type="date" min={todayIso()} className="sp-input" value={form.date} onChange={set('date')} aria-invalid={!!show('date')} />
          {show('date') && <p className="sp-field-error">{errors.date}</p>}
        </div>
        <div className="sp-grid sp-grid-2" style={{ gap: 12 }}>
          <div className="sp-field">
            <label htmlFor="bk-from">From</label>
            <input id="bk-from" type="time" className="sp-input" value={form.from} onChange={set('from')} />
          </div>
          <div className="sp-field">
            <label htmlFor="bk-to">To</label>
            <input id="bk-to" type="time" className="sp-input" value={form.to} onChange={set('to')} aria-invalid={!!show('to')} />
            {show('to') && <p className="sp-field-error">{errors.to}</p>}
          </div>
        </div>
        <div className="sp-field">
          <label htmlFor="bk-purpose">Purpose</label>
          <input id="bk-purpose" className="sp-input" maxLength={200} value={form.purpose} onChange={set('purpose')} aria-invalid={!!show('purpose')} />
          {show('purpose') && <p className="sp-field-error">{errors.purpose}</p>}
        </div>
      </form>
    </FormModal>
  );
}

function ResourceForm({ onClose, onDone }) {
  const [form, setForm] = useState({ name: '', type: 'hall', capacity: '', location: '' });
  const [submitted, setSubmitted] = useState(false);
  const [create, { loading, error }] = useMutation();
  const errors = {};
  if (!form.name.trim()) errors.name = 'Name is required.';
  if (!/^\d+$/.test(form.capacity) || Number(form.capacity) < 1) errors.capacity = 'Enter a positive whole number.';
  const show = (k) => submitted && errors[k];
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length) return;
    const res = await create('post', '/resources', { name: form.name.trim(), type: form.type, capacity: Number(form.capacity), location: form.location.trim() || undefined }, { label: `Added ${form.name.trim()}` });
    if (res.ok) onDone();
  };

  return (
    <FormModal title="Add resource" formId="resource-form" onClose={onClose} loading={loading} submitLabel="Add resource">
      <form id="resource-form" className="sp-form" onSubmit={submit} noValidate>
        {error && <div className="sp-alert is-error" role="alert">{error.message}</div>}
        <div className="sp-field">
          <label htmlFor="rs-name">Name</label>
          <input id="rs-name" className="sp-input" maxLength={80} value={form.name} onChange={set('name')} aria-invalid={!!show('name')} />
          {show('name') && <p className="sp-field-error">{errors.name}</p>}
        </div>
        <div className="sp-grid sp-grid-2" style={{ gap: 12 }}>
          <div className="sp-field">
            <label htmlFor="rs-type">Type</label>
            <select id="rs-type" className="sp-select" value={form.type} onChange={set('type')}>
              {['hall', 'lab', 'room', 'equipment'].map((t) => <option key={t} value={t}>{capitalize(t)}</option>)}
            </select>
          </div>
          <div className="sp-field">
            <label htmlFor="rs-cap">Capacity</label>
            <input id="rs-cap" inputMode="numeric" className="sp-input" value={form.capacity} onChange={set('capacity')} aria-invalid={!!show('capacity')} />
            {show('capacity') && <p className="sp-field-error">{errors.capacity}</p>}
          </div>
        </div>
        <div className="sp-field">
          <label htmlFor="rs-loc">Location (optional)</label>
          <input id="rs-loc" className="sp-input" value={form.location} onChange={set('location')} />
        </div>
      </form>
    </FormModal>
  );
}

/**
 * Halls, labs and equipment. Faculty and HODs request bookings (approved by
 * the HOD or director in Approvals); the director adds resources and marks
 * them under maintenance.
 */
export default function BookingsSection() {
  const user = useSelector((state) => state.auth.user);
  const director = isDirectorRole(user?.role);
  const resources = useApiResource('/resources');
  const bookings = useApiResource('/resource-bookings');
  const [booking, setBooking] = useState(null);
  const [adding, setAdding] = useState(false);
  const [toggle, toggling] = useMutation();

  const mine = useMemo(() => listOf(bookings.data).filter((b) => director || b.requested_by === user?.user_id), [bookings.data, director, user]);

  const toggleStatus = (r) => {
    const status = r.status === 'available' ? 'maintenance' : 'available';
    toggle('patch', `/resources/${r.resource_id}`, { status }, { label: `${r.name} marked ${status}` }).then((res) => res.ok && resources.reload());
  };

  return (
    <>
      <div className="sp-page-header">
        <div>
          <h1 className="sp-page-title">Resources</h1>
          <p className="sp-page-subtitle">{director ? 'Manage bookable halls, labs and equipment.' : 'Book halls, labs and equipment for classes and events.'}</p>
        </div>
        {director && (
          <button type="button" className="sp-btn" onClick={() => setAdding(true)}>
            <Plus size={16} aria-hidden="true" /> Add resource
          </button>
        )}
      </div>

      <section className="sp-card" aria-labelledby="res-title">
        <h2 id="res-title" className="sp-section-title">Available resources</h2>
        {toggling.error && <div className="sp-alert is-error" role="alert">{toggling.error.message}</div>}
        {resources.status === 'loading' && !resources.data && <LoadingState />}
        {resources.status === 'failed' && <ErrorState error={resources.error} onRetry={resources.reload} />}
        {resources.data && !listOf(resources.data).length && <EmptyState title="No resources yet" message={director ? 'Add halls, labs and equipment with Add resource.' : 'Your college has not listed any bookable resources.'} />}
        {resources.data && listOf(resources.data).length > 0 && (
          <div className="sp-resource-grid">
            {listOf(resources.data).map((r) => (
              <article key={r.resource_id} className="sp-resource-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <h3>{r.name}</h3>
                  <span className={`sp-badge ${r.status === 'available' ? 'is-success' : 'is-warning'}`}>{capitalize(r.status)}</span>
                </div>
                <div className="sp-event-meta">
                  <span><Building2 size={13} aria-hidden="true" /> {capitalize(r.type)}{r.location ? ` · ${r.location}` : ''}</span>
                  <span><Users size={13} aria-hidden="true" /> {r.capacity}</span>
                </div>
                <div className="sp-muted" style={{ fontSize: 13 }}>{r.upcoming_bookings} upcoming booking{r.upcoming_bookings === 1 ? '' : 's'}</div>
                <div className="sp-btn-row">
                  {!director && <button type="button" className="sp-btn is-small" disabled={r.status !== 'available'} onClick={() => setBooking(r)}>Book</button>}
                  {director && (
                    <button type="button" className="sp-btn is-small is-secondary" disabled={toggling.loading} onClick={() => toggleStatus(r)}>
                      <Wrench size={13} aria-hidden="true" /> {r.status === 'available' ? 'Mark maintenance' : 'Mark available'}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="sp-card sp-section" aria-labelledby="bk-title">
        <h2 id="bk-title" className="sp-section-title">{director ? 'All bookings' : 'My bookings'}</h2>
        {bookings.status === 'loading' && !bookings.data && <LoadingState />}
        {bookings.status === 'failed' && <ErrorState error={bookings.error} onRetry={bookings.reload} />}
        {bookings.data && (
          <DataTable
            rows={mine}
            rowKey={(r) => r.booking_id}
            searchPlaceholder="Search bookings"
            emptyTitle="No bookings"
            emptyMessage={director ? undefined : 'Pick a resource above and choose Book.'}
            columns={[
              { key: 'resource_name', header: 'Resource' },
              ...(director ? [{ key: 'requester_name', header: 'Requested by' }] : []),
              { key: 'date', header: 'When', render: (r) => (<>{formatDate(r.date)}<div className="sp-muted">{r.time_slot}</div></>) },
              { key: 'purpose', header: 'Purpose' },
              { key: 'status', header: 'Status', render: (r) => (<><span className={`sp-badge ${TONE[r.status] || 'is-neutral'}`}>{capitalize(r.status)}</span>{r.decision_note && <div className="sp-muted">{r.decision_note}</div>}</>) },
              { key: 'decided_by_name', header: 'Decided by', render: (r) => r.decided_by_name || '—' },
            ]}
          />
        )}
      </section>

      {booking && <BookingForm resource={booking} onClose={() => setBooking(null)} onDone={() => { setBooking(null); bookings.reload(); resources.reload(); }} />}
      {adding && <ResourceForm onClose={() => setAdding(false)} onDone={() => { setAdding(false); resources.reload(); }} />}
    </>
  );
}
