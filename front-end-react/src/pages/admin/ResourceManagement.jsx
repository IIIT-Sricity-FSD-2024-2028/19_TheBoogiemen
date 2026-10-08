/**
 * ResourceManagement — ported from legacy fixes.js renderResourceManagement()
 * + toggleResource() + submitCreateResource() (super-user.html's
 * resourceModal) plus renderAdminResourceBookings() + approveBooking(), the
 * latter injected into resource-management-view at runtime by fixes.js
 * (same pattern documented in faculty/Dashboard.jsx's notes).
 */

import { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationsContext';
import Modal from '../../components/shared/Modal';

function AddResourceModal({ open, onClose, onCreated }) {
  const { showToast } = useNotifications();
  const [name, setName] = useState('');
  const [type, setType] = useState('Lab');
  const [capacity, setCapacity] = useState('');
  const [location, setLocation] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName('');
    setType('Lab');
    setCapacity('');
    setLocation('');
  }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim() || name.trim().length < 2) return showToast('Resource name is required', 'warning');
    if (!type) return showToast('Please select a resource type', 'warning');
    setSubmitting(true);
    try {
      await apiFetch('/resources', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), type, capacity: capacity ? Number(capacity) : null, location: location.trim() || null }),
      });
      showToast('Resource added!', 'success');
      onClose();
      onCreated();
    } catch (e2) {
      showToast('Failed: ' + e2.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Resource">
      <form onSubmit={submit}>
        <div className="modal-body">
          <div className="form-group">
            <label>Name <span style={{ color: '#ef4444' }}>*</span></label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Computing Lab 3" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Type <span style={{ color: '#ef4444' }}>*</span></label>
              <select required value={type} onChange={(e) => setType(e.target.value)}>
                <option value="Lab">Lab</option>
                <option value="Hall">Hall</option>
                <option value="Room">Room</option>
                <option value="Equipment">Equipment</option>
              </select>
            </div>
            <div className="form-group">
              <label>Capacity</label>
              <input type="number" min={1} value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="e.g., 60" />
            </div>
          </div>
          <div className="form-group">
            <label>Location</label>
            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g., Block C, 2nd Floor" />
          </div>
        </div>
        <div className="modal-footer">
          <button type="submit" className="submit-btn" style={{ flex: 1 }} disabled={submitting}>
            {submitting ? 'Adding…' : 'Add Resource'}
          </button>
          <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}

function ResourceBookingRequests({ onResourcesChanged }) {
  const { user } = useAuth();
  const { showToast, send, broadcast } = useNotifications();
  const [bookings, setBookings] = useState(undefined);

  const load = () => apiFetch('/resource-bookings').then(setBookings).catch(() => setBookings([]));
  useEffect(() => {
    load();
  }, []);

  const decide = async (b, status) => {
    try {
      await apiFetch(`/resource-booking/${b.booking_id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      const from = user?.first_name || user?.username || 'Admin';
      send(b.requested_by, from, status === 'approved' ? `✅ Your booking for "${b.resource_name}" has been APPROVED by ${from}.` : `❌ Your booking for "${b.resource_name}" was REJECTED by ${from}.`, status === 'approved' ? 'info' : 'alert');
      // Cross-notify the other oversight role.
      if (user?.role === 'admin' || user?.role === 'superadmin') broadcast('head', from, `🏢 Resource "${b.resource_name}" booking ${status} by ${from}.`, 'info');
      else if (user?.role === 'head') broadcast('admin', from, `🏢 Resource "${b.resource_name}" booking ${status} by ${from}.`, 'info');
      showToast(`Booking ${status}! Faculty notified.`, 'success');
      load();
      // Approval flips the resource itself to in_use server-side.
      onResourcesChanged();
    } catch (e) {
      showToast('Failed: ' + e.message, 'error');
    }
  };

  if (bookings === undefined) return null;

  return (
    <div style={{ marginTop: 20, padding: 20, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12 }}>
      <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700 }}>🏢 Resource Booking Requests</h3>
      {bookings.length === 0 ? (
        <p style={{ color: '#64748b', textAlign: 'center' }}>No booking requests.</p>
      ) : (
        bookings.map((b) => {
          const sc = b.status === 'approved' ? { bg: '#dcfce7', c: '#166534' } : b.status === 'rejected' ? { bg: '#fef2f2', c: '#991b1b' } : { bg: '#fef9c3', c: '#92400e' };
          return (
            <div key={b.booking_id} style={{ padding: 12, border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontWeight: 600 }}>{b.resource_name}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>By: {b.requester_name} · {b.date} · {b.purpose}</div>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.c }}>{b.status}</span>
                {b.status === 'pending' && (
                  <>
                    <button onClick={() => decide(b, 'approved')} style={{ padding: '5px 12px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>✓</button>
                    <button onClick={() => decide(b, 'rejected')} style={{ padding: '5px 12px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>✕</button>
                  </>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

export default function ResourceManagement() {
  const { showToast, broadcastAll } = useNotifications();
  const { user } = useAuth();
  const [resources, setResources] = useState(undefined);
  const [addOpen, setAddOpen] = useState(false);

  const load = () => apiFetch('/resources').then(setResources).catch(() => setResources([]));
  useEffect(() => {
    load();
  }, []);

  const toggle = async (r) => {
    const status = r.status === 'available' ? 'in_use' : 'available';
    try {
      await apiFetch(`/resources/${r.resource_id}`, { method: 'PUT', body: JSON.stringify({ status }) });
      const from = user?.first_name || 'Admin';
      broadcastAll(from, `🏢 Resource "${r.name || 'Facility'}" is ${status === 'in_use' ? 'now in use' : 'now available'}.`, 'info');
      load();
    } catch {
      showToast('Failed', 'error');
    }
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>Resource Allocation</h2>
        <button className="page-action-btn" onClick={() => setAddOpen(true)}>+ Add Resource</button>
      </div>
      <div className="stats-card">
        <div className="stats-card-header"><h3>Resources</h3></div>
        <div className="stats-card-body" style={{ padding: 24 }}>
          {resources === undefined ? null : resources.length === 0 ? (
            <p>No resources.</p>
          ) : (
            resources.map((r) => (
              <div key={r.resource_id} style={{ padding: 16, border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ margin: 0 }}>{r.name}</h4>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{r.type} • Cap: {r.capacity || 'N/A'} • Loc: {r.location || 'N/A'}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ padding: '4px 8px', borderRadius: 4, fontSize: 11, background: r.status === 'available' ? '#dcfce7' : '#fef2f2', color: r.status === 'available' ? '#166534' : '#991b1b' }}>{r.status}</span>
                  <button onClick={() => toggle(r)} style={{ padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid #e2e8f0', borderRadius: 6, background: '#fff' }}>
                    {r.status === 'available' ? 'Mark In Use' : 'Mark Available'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <ResourceBookingRequests onResourcesChanged={load} />
      <AddResourceModal open={addOpen} onClose={() => setAddOpen(false)} onCreated={load} />
    </>
  );
}
