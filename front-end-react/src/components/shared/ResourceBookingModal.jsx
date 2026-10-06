/**
 * ResourceBookingModal — ported from legacy fixes.js openResourceBookingModal()
 * + submitResourceBooking() (a modal fixes.js injects into every dashboard
 * page at runtime, not static markup). Triggered from faculty's "Request
 * Resources" nav item; admin/head's Resource Management view (Phase 3)
 * reuses it for the same creation flow alongside their own approval list.
 */

import { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';
import { useNotifications } from '../../context/NotificationsContext';
import Modal from './Modal';

export default function ResourceBookingModal({ open, onClose }) {
  const { showToast, broadcast } = useNotifications();
  const [resources, setResources] = useState(null);
  const [resourceId, setResourceId] = useState('');
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState('');
  const [purpose, setPurpose] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setResourceId('');
    setDate('');
    setPurpose('');
    apiFetch('/resources')
      .then((all) => setResources(all.filter((r) => r.status === 'available')))
      .catch(() => setResources([]));
  }, [open]);

  const submit = async () => {
    if (!resourceId || !date || !purpose.trim()) return showToast('All fields required', 'warning');
    setSubmitting(true);
    try {
      await apiFetch('/resource-booking', { method: 'POST', body: JSON.stringify({ resource_id: resourceId, date, purpose: purpose.trim() }) });
      broadcast('admin', 'Faculty', `🏢 Resource booking request for ${date}. Please review.`, 'info');
      broadcast('head', 'Faculty', `🏢 Resource booking request for ${date}. Please review.`, 'info');
      showToast('Booking request submitted! Admin will review.', 'success');
      onClose();
    } catch (e) {
      showToast('Failed: ' + e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="🏢 Book Resource" maxWidth={420}>
      <div className="modal-body">
        <div className="form-group">
          <label>Resource</label>
          <select value={resourceId} onChange={(e) => setResourceId(e.target.value)}>
            <option value="">{resources === null ? 'Loading…' : resources.length === 0 ? 'No resources available right now' : 'Select resource'}</option>
            {resources?.map((r) => (
              <option key={r.resource_id} value={r.resource_id}>{r.name} ({r.type})</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Date</label>
          <input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Purpose</label>
          <textarea rows={2} value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Purpose" />
        </div>
      </div>
      <div className="modal-footer">
        <button onClick={submit} className="submit-btn" style={{ flex: 1 }} disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit'}
        </button>
        <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  );
}
