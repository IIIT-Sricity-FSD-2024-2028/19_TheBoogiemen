/**
 * EventScheduler — ported from legacy fixes.js renderEventsTable() +
 * submitScheduleEvent() + openEditEvent()/submitEditEvent() + deleteEvent()
 * (super-user.html's eventModal/editEventModal). Full CRUD — unlike
 * faculty's read-only Event Scheduler (a separate component; the two
 * actually differ in the legacy app, not just by permission).
 */

import { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationsContext';
import Modal from '../../components/shared/Modal';

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = ['00', '15', '30', '45'];

function ScheduleEventModal({ open, onClose, onCreated }) {
  const { user } = useAuth();
  const { showToast, broadcastAll } = useNotifications();
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [hour, setHour] = useState('');
  const [minute, setMinute] = useState('');
  const [period, setPeriod] = useState('AM');
  const [venue, setVenue] = useState('');
  const [desc, setDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!open) return;
    setName('');
    setDate('');
    setHour('');
    setMinute('');
    setPeriod('AM');
    setVenue('');
    setDesc('');
  }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim() || name.trim().length < 3) return showToast('Event name must be at least 3 characters', 'warning');
    if (!date) return showToast('Event date is required', 'warning');
    if (date < today) return showToast('Event date cannot be in the past', 'warning');
    if (!venue.trim()) return showToast('Venue is required', 'warning');

    const timeDisplay = hour && minute ? ` at ${hour}:${minute} ${period}` : '';
    setSubmitting(true);
    try {
      await apiFetch('/events', { method: 'POST', body: JSON.stringify({ event_name: name.trim(), date, venue: venue.trim(), description: desc.trim() }) });
      showToast('Event created! All users notified. ✅', 'success');
      const from = user?.first_name || user?.username || 'Admin';
      broadcastAll(from, `🎉 New Event: "${name.trim()}" on ${date}${timeDisplay} — ${venue.trim()}`, 'event');
      onClose();
      onCreated();
    } catch (e2) {
      showToast('Failed: ' + e2.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Schedule Event">
      <form onSubmit={submit}>
        <div className="modal-body">
          <div className="form-group">
            <label>Event Name <span style={{ color: '#ef4444' }}>*</span></label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Annual Sports Meet" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Date <span style={{ color: '#ef4444' }}>*</span></label>
              <input type="date" required min={today} value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Time <span style={{ fontSize: 11, color: '#64748b' }}>(optional)</span></label>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <select value={hour} onChange={(e) => setHour(e.target.value)} style={{ flex: 1, padding: '9px 6px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14 }}>
                  <option value="">Hr</option>
                  {HOURS.map((h) => <option key={h}>{h}</option>)}
                </select>
                <span style={{ fontWeight: 700, color: '#64748b' }}>:</span>
                <select value={minute} onChange={(e) => setMinute(e.target.value)} style={{ flex: 1, padding: '9px 6px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14 }}>
                  <option value="">Min</option>
                  {MINUTES.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                <select value={period} onChange={(e) => setPeriod(e.target.value)} style={{ flex: 1, padding: '9px 6px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14 }}>
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>
          </div>
          <div className="form-group">
            <label>Venue <span style={{ color: '#ef4444' }}>*</span></label>
            <input type="text" required value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="e.g., Seminar Hall" />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Describe the event..." />
          </div>
        </div>
        <div className="modal-footer">
          <button type="submit" className="submit-btn" style={{ flex: 1 }} disabled={submitting}>
            {submitting ? 'Scheduling…' : 'Schedule Event'}
          </button>
          <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}

function EditEventModal({ event, onClose, onSaved }) {
  const { showToast } = useNotifications();
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [venue, setVenue] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!event) return;
    setName(event.event_name);
    setDate(event.date);
    setVenue(event.venue);
  }, [event]);

  const submit = async (e) => {
    e.preventDefault();
    const today = new Date().toISOString().split('T')[0];
    if (date < today) return showToast('Cannot set event to a past date', 'warning');
    setSubmitting(true);
    try {
      await apiFetch(`/events/${event.event_id}`, { method: 'PUT', body: JSON.stringify({ event_name: name, date, venue }) });
      showToast('Event updated!', 'success');
      onClose();
      onSaved();
    } catch (e2) {
      showToast('Failed: ' + e2.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={!!event} onClose={onClose} title="Edit Event">
      <form onSubmit={submit}>
        <div className="modal-body">
          <div className="form-group">
            <label>Event Name <span style={{ color: '#ef4444' }}>*</span></label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Date <span style={{ color: '#ef4444' }}>*</span></label>
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Venue <span style={{ color: '#ef4444' }}>*</span></label>
            <input type="text" required value={venue} onChange={(e) => setVenue(e.target.value)} />
          </div>
        </div>
        <div className="modal-footer">
          <button type="submit" className="submit-btn" style={{ flex: 1 }} disabled={submitting}>
            {submitting ? 'Saving…' : 'Save Changes'}
          </button>
          <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}

export default function EventScheduler() {
  const { showToast } = useNotifications();
  const [events, setEvents] = useState(undefined);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const load = () => apiFetch('/events').then(setEvents).catch(() => setEvents([]));
  useEffect(() => {
    load();
  }, []);

  const remove = async (id) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    try {
      await apiFetch(`/events/${id}`, { method: 'DELETE' });
      showToast('Event deleted!', 'success');
      load();
    } catch (e) {
      showToast('Failed: ' + e.message, 'error');
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const upcoming = events ? events.filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date)) : [];
  const past = events ? events.filter((e) => e.date < today).sort((a, b) => b.date.localeCompare(a.date)) : [];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>Event Scheduler</h2>
        <button className="page-action-btn" onClick={() => setCreateOpen(true)}>+ Add Event</button>
      </div>
      <div className="stats-card">
        <div className="stats-card-header"><div><h3>Upcoming Events</h3></div></div>
        <div className="stats-card-body">
          <table className="crud-table">
            <thead>
              <tr><th style={{ width: 90 }}>Type</th><th>Event Details</th><th>Timing</th><th style={{ textAlign: 'right' }}>Actions</th></tr>
            </thead>
            <tbody>
              {events === undefined ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: '#64748b', padding: 24 }}>Loading...</td></tr>
              ) : events.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center' }}>No events</td></tr>
              ) : (
                <>
                  {upcoming.length > 0 && (
                    <>
                      <tr><td colSpan={4} style={{ background: '#eff6ff', fontWeight: 700, color: '#1e40af', padding: 10 }}>🟢 Upcoming Events</td></tr>
                      {upcoming.map((e) => (
                        <tr key={e.event_id}>
                          <td><span style={{ padding: 4, background: '#dcfce7', borderRadius: 4 }}>🗓️</span></td>
                          <td><div style={{ fontWeight: 600 }}>{e.event_name}</div></td>
                          <td>{e.date} at {e.venue}</td>
                          <td style={{ textAlign: 'right' }}>
                            <button onClick={() => setEditTarget(e)} style={{ padding: '4px 8px', marginRight: 4, background: '#e2e8f0', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Edit</button>
                            <button onClick={() => remove(e.event_id)} style={{ padding: '4px 8px', background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Delete</button>
                          </td>
                        </tr>
                      ))}
                    </>
                  )}
                  {past.length > 0 && (
                    <>
                      <tr><td colSpan={4} style={{ background: '#f8fafc', fontWeight: 700, color: '#64748b', padding: 10 }}>📜 Past Events (Completed)</td></tr>
                      {past.map((e) => (
                        <tr key={e.event_id} style={{ opacity: 0.6 }}>
                          <td><span style={{ padding: 4, background: '#f1f5f9', borderRadius: 4 }}>✔️</span></td>
                          <td><div style={{ fontWeight: 600, color: '#94a3b8' }}>{e.event_name}</div></td>
                          <td style={{ color: '#94a3b8' }}>{e.date} at {e.venue}</td>
                          <td style={{ textAlign: 'right' }}><span style={{ padding: '4px 10px', background: '#dcfce7', color: '#166534', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>Completed</span></td>
                        </tr>
                      ))}
                    </>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <ScheduleEventModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={load} />
      <EditEventModal event={editTarget} onClose={() => setEditTarget(null)} onSaved={load} />
    </>
  );
}
