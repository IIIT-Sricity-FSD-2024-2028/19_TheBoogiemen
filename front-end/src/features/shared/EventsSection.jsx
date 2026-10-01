import React, { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { CalendarPlus, Clock, MapPin, Pencil, Trash2 } from 'lucide-react';
import { useApiResource } from '../../hooks/useApiResource';
import { useMutation } from '../../hooks/useMutation';
import Modal, { ConfirmDialog } from '../../shared/ui/Modal';
import { EmptyState, ErrorState, LoadingState } from '../../shared/ui/StatusViews';
import { isDirectorRole, isHodRole, listOf } from './roles';
import './shared.css';

const EMPTY = { title: '', date: '', time: '', venue: '', description: '' };

function EventForm({ initial, onClose, onSaved }) {
  const editing = !!initial?.event_id;
  const [form, setForm] = useState(initial ? { ...EMPTY, ...initial, time: initial.time || '', description: initial.description || '' } : EMPTY);
  const [submitted, setSubmitted] = useState(false);
  const [save, { loading, error }] = useMutation();
  const errors = {};
  if (!form.title.trim()) errors.title = 'Title is required.';
  if (!form.date) errors.date = 'Choose a date.';
  if (!form.venue.trim()) errors.venue = 'Venue is required.';
  const show = (k) => submitted && errors[k];
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length) return;
    const body = { title: form.title.trim(), date: form.date, time: form.time || undefined, venue: form.venue.trim(), description: form.description.trim() };
    const res = editing
      ? await save('put', `/events/${initial.event_id}`, body, { label: `Updated event "${body.title}"` })
      : await save('post', '/events', body, { label: `Created event "${body.title}"` });
    if (res.ok) onSaved();
  };

  return (
    <Modal
      title={editing ? 'Edit event' : 'New event'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="sp-btn is-secondary" onClick={onClose} disabled={loading}>Cancel</button>
          <button type="submit" form="event-form" className="sp-btn" disabled={loading}>{loading ? 'Saving...' : editing ? 'Save changes' : 'Create event'}</button>
        </>
      }
    >
      <form id="event-form" className="sp-form" onSubmit={submit} noValidate>
        {error && <div className="sp-alert is-error" role="alert">{error.message}</div>}
        <div className="sp-field">
          <label htmlFor="ev-title">Title</label>
          <input id="ev-title" className="sp-input" maxLength={120} value={form.title} onChange={set('title')} aria-invalid={!!show('title')} />
          {show('title') && <p className="sp-field-error">{errors.title}</p>}
        </div>
        <div className="sp-grid sp-grid-2" style={{ gap: 12 }}>
          <div className="sp-field">
            <label htmlFor="ev-date">Date</label>
            <input id="ev-date" type="date" className="sp-input" value={form.date} onChange={set('date')} aria-invalid={!!show('date')} />
            {show('date') && <p className="sp-field-error">{errors.date}</p>}
          </div>
          <div className="sp-field">
            <label htmlFor="ev-time">Time (optional)</label>
            <input id="ev-time" type="time" className="sp-input" value={form.time} onChange={set('time')} />
          </div>
        </div>
        <div className="sp-field">
          <label htmlFor="ev-venue">Venue</label>
          <input id="ev-venue" className="sp-input" maxLength={120} value={form.venue} onChange={set('venue')} aria-invalid={!!show('venue')} />
          {show('venue') && <p className="sp-field-error">{errors.venue}</p>}
        </div>
        <div className="sp-field">
          <label htmlFor="ev-desc">Description (optional)</label>
          <textarea id="ev-desc" className="sp-textarea" maxLength={1000} value={form.description} onChange={set('description')} />
        </div>
      </form>
    </Modal>
  );
}

function EventCard({ event, canEdit, onEdit, onDelete }) {
  const d = new Date(`${event.date}T00:00:00`);
  return (
    <article className={`sp-event-card${event.upcoming ? '' : ' is-past'}`}>
      <div className="sp-event-date" aria-hidden="true">
        <span className="m">{d.toLocaleString('en-IN', { month: 'short' })}</span>
        <span className="d">{d.getDate()}</span>
      </div>
      <div className="sp-event-body">
        <h3>{event.title}</h3>
        <div className="sp-event-meta">
          <span><MapPin size={13} aria-hidden="true" /> {event.venue}</span>
          {event.time && <span><Clock size={13} aria-hidden="true" /> {event.time}</span>}
          <span>{event.department_code ? `${event.department_code} department` : 'College-wide'}</span>
        </div>
        {event.description && <p className="sp-event-desc">{event.description}</p>}
        {canEdit && (
          <div className="sp-event-actions">
            <button type="button" className="sp-btn is-small is-secondary" onClick={onEdit}><Pencil size={13} aria-hidden="true" /> Edit</button>
            <button type="button" className="sp-btn is-small is-secondary" onClick={onDelete}><Trash2 size={13} aria-hidden="true" /> Delete</button>
          </div>
        )}
      </div>
    </article>
  );
}

/** Campus events. Everyone sees them; the director and HODs create and manage them. */
export default function EventsSection() {
  const user = useSelector((state) => state.auth.user);
  const director = isDirectorRole(user?.role);
  const canCreate = director || isHodRole(user?.role);
  const events = useApiResource('/events');
  const [tab, setTab] = useState('upcoming');
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [remove, removal] = useMutation();

  const rows = listOf(events.data);
  const shown = useMemo(() => (tab === 'upcoming' ? rows.filter((e) => e.upcoming) : [...rows.filter((e) => !e.upcoming)].reverse()), [rows, tab]);

  const confirmDelete = async () => {
    const res = await remove('delete', `/events/${deleting.event_id}`, undefined, { label: `Deleted event "${deleting.title}"` });
    if (res.ok) {
      setDeleting(null);
      events.reload();
    }
  };

  return (
    <>
      <div className="sp-page-header">
        <div>
          <h1 className="sp-page-title">Events</h1>
          <p className="sp-page-subtitle">What is happening across the college and your department.</p>
        </div>
        {canCreate && (
          <button type="button" className="sp-btn" onClick={() => setEditing({})}>
            <CalendarPlus size={16} aria-hidden="true" /> New event
          </button>
        )}
      </div>
      <div className="sp-segmented" role="group" aria-label="Show" style={{ marginBottom: 16 }}>
        <button type="button" aria-pressed={tab === 'upcoming'} onClick={() => setTab('upcoming')}>Upcoming</button>
        <button type="button" aria-pressed={tab === 'past'} onClick={() => setTab('past')}>Past</button>
      </div>
      <section className="sp-card">
        {events.status === 'loading' && !events.data && <LoadingState />}
        {events.status === 'failed' && <ErrorState error={events.error} onRetry={events.reload} />}
        {events.data && !shown.length && (
          <EmptyState title={tab === 'upcoming' ? 'No upcoming events' : 'No past events'} message={canCreate && tab === 'upcoming' ? 'Create one with New event.' : undefined} />
        )}
        {events.data && shown.length > 0 && (
          <div className="sp-event-grid">
            {shown.map((e) => (
              <EventCard key={e.event_id} event={e} canEdit={director || e.created_by === user?.user_id} onEdit={() => setEditing(e)} onDelete={() => setDeleting(e)} />
            ))}
          </div>
        )}
      </section>
      {editing && (
        <EventForm
          initial={editing.event_id ? editing : null}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            events.reload();
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete event"
          message={`Delete "${deleting.title}" on ${deleting.date}? ${removal.error ? removal.error.message : 'This cannot be undone.'}`}
          confirmLabel="Delete"
          danger
          busy={removal.loading}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </>
  );
}
