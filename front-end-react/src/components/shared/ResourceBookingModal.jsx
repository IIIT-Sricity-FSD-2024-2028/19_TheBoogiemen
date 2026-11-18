/**
 * ResourceBookingModal — ported from legacy fixes.js openResourceBookingModal()
 * + submitResourceBooking() (a modal fixes.js injects into every dashboard
 * page at runtime, not static markup). Triggered from faculty's "Request
 * Resources" nav item; admin/head's Resource Management view (Phase 3)
 * reuses it for the same creation flow alongside their own approval list.
 *
 * Redux migration (Dev 5): reuses resourcesSlice (read-only here) and
 * resourceBookingsSlice.createResourceBooking, same shared domains
 * admin/ResourceManagement.jsx owns the mutation/approval side of.
 */

import { useEffect, useState } from 'react';
import { useNotifications } from '../../features/notifications/useNotifications';
import Modal from './Modal';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchResources } from '../../features/resources/resourcesThunks';
import { createResourceBooking } from '../../features/resourceBookings/resourceBookingsThunks';

export default function ResourceBookingModal({ open, onClose }) {
  const dispatch = useAppDispatch();
  const { showToast, broadcast } = useNotifications();
  const allResources = useAppSelector((state) => state.resources.items);
  const [resourceId, setResourceId] = useState('');
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState('');
  const [purpose, setPurpose] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const resources = allResources === undefined ? null : allResources.filter((r) => r.status === 'available');

  useEffect(() => {
    if (!open) return;
    setResourceId('');
    setDate('');
    setPurpose('');
    dispatch(fetchResources());
  }, [open, dispatch]);

  const submit = async () => {
    if (!resourceId || !date || !purpose.trim()) return showToast('All fields required', 'warning');
    setSubmitting(true);
    try {
      await dispatch(createResourceBooking({ resource_id: resourceId, date, purpose: purpose.trim() })).unwrap();
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
