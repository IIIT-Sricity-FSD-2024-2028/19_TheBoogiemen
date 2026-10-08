/**
 * EventScheduler — ported from legacy fixes.js renderFacultyEventsTable().
 *
 * Read-only by design, matching the legacy app exactly: faculty.html's
 * "+ Add Event" button calls `openModal('facultyEventModal')`, but no
 * `facultyEventModal` markup exists anywhere in that file or fixes.js — a
 * dead button in the shipped app. Admin/head has its own, real, working
 * event-creation flow (a different modal, Phase 3). Not inventing a new
 * modal here to make this button do something it never did.
 */

import { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';

export default function EventScheduler() {
  const [events, setEvents] = useState(undefined);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiFetch('/events')
      .then(setEvents)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="stats-card">
      <div className="stats-card-header">
        <div><h3>Upcoming Events</h3></div>
      </div>
      <div className="stats-card-body">
        <table className="crud-table">
          <thead>
            <tr><th>Type</th><th>Event Details</th><th>Date</th><th>Venue</th></tr>
          </thead>
          <tbody>
            {error ? (
              <tr><td colSpan={4} style={{ color: '#ef4444' }}>Failed: {error}</td></tr>
            ) : events === undefined ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', color: '#64748b', padding: 20 }}>Loading...</td></tr>
            ) : events.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: 'center' }}>No events</td></tr>
            ) : (
              events.map((e) => (
                <tr key={e.event_id}>
                  <td><span style={{ padding: 4, background: '#e2e8f0', borderRadius: 4 }}>🗓️</span></td>
                  <td><div style={{ fontWeight: 600 }}>{e.event_name}</div></td>
                  <td>{e.date} at {e.venue}</td>
                  <td></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
