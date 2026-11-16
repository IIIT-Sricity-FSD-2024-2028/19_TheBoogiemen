import { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '../../api/client';
import { useNotifications } from '../../context/NotificationsContext';
import MeetingModal from '../../components/shared/MeetingModal';
import RescheduleModal from '../../components/shared/RescheduleModal';
import CompleteMeetingModal from '../../components/shared/CompleteMeetingModal';
import MeetingDetailModal from '../../components/shared/MeetingDetailModal';

const STATUS_BADGES = {
  PENDING: { label: 'Pending Approval', bg: '#fef3c7', color: '#b45309', border: '#fcd34d' },
  SCHEDULED: { label: 'Scheduled', bg: '#dcfce7', color: '#15803d', border: '#86efac' },
  RESCHEDULE_REQUESTED: { label: 'Reschedule Requested', bg: '#ede9fe', color: '#6d28d9', border: '#c4b5fd' },
  RESCHEDULE_PROPOSED: { label: 'New Time Proposed', bg: '#e0f2fe', color: '#0369a1', border: '#7dd3fc' },
  DENIED: { label: 'Declined', bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5' },
  CANCELLED: { label: 'Cancelled', bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' },
  COMPLETED: { label: 'Completed', bg: '#d1fae5', color: '#047857', border: '#6ee7b7' },
};

export default function FacultyMeetingsSection() {
  const { showToast, send } = useNotifications();
  const [meetings, setMeetings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL'); // ALL | REQUESTS | UPCOMING | RESCHEDULES | COMPLETED

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailMeeting, setDetailMeeting] = useState(null);
  const [completeMeeting, setCompleteMeeting] = useState(null);
  const [rescheduleData, setRescheduleData] = useState({ open: false, meeting: null, mode: 'faculty-direct' });

  const fetchMeetings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/meetings/my');
      const list = Array.isArray(res) ? res : res?.data || [];
      setMeetings(list);
    } catch {
      setMeetings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  const all = meetings || [];
  const today = new Date().toISOString().split('T')[0];

  const pendingRequests = all.filter((m) => m.status === 'PENDING');
  const studentReschedules = all.filter((m) => m.status === 'RESCHEDULE_REQUESTED');
  const upcoming = all.filter(
    (m) => m.status === 'SCHEDULED' && (m.scheduled_date || m.requested_date) >= today,
  );
  const completed = all.filter((m) => m.status === 'COMPLETED');

  const filtered = all.filter((m) => {
    if (filter === 'REQUESTS') return pendingRequests.includes(m);
    if (filter === 'UPCOMING') return upcoming.includes(m);
    if (filter === 'RESCHEDULES') return studentReschedules.includes(m);
    if (filter === 'COMPLETED') return completed.includes(m);
    return true;
  });

  // Quick accept student request
  const quickAccept = async (m) => {
    try {
      await apiFetch(`/meetings/${m.meeting_id}/accept`, {
        method: 'PATCH',
        body: JSON.stringify({
          scheduledDate: m.requested_date,
          scheduledStartTime: m.requested_start_time,
          scheduledEndTime: m.requested_end_time,
          meetingType: m.meeting_type,
          meetingLink: m.meeting_link,
          location: m.location,
        }),
      });
      showToast('Meeting request accepted! Confirmed on schedule. ✅', 'success');
      send(
        m.student_id,
        'Faculty',
        `Your meeting on ${m.requested_date} at ${m.requested_start_time} was accepted!`,
        'meeting',
      );
      fetchMeetings();
    } catch (err) {
      showToast('Failed to accept: ' + err.message, 'error');
    }
  };

  // Quick deny student request
  const quickDeny = async (m) => {
    const reason = window.prompt('Enter reason for declining this request (optional):');
    if (reason === null) return;
    try {
      await apiFetch(`/meetings/${m.meeting_id}/deny`, {
        method: 'PATCH',
        body: JSON.stringify({ reason: reason || 'Faculty unavailable' }),
      });
      showToast('Meeting request declined.', 'info');
      send(
        m.student_id,
        'Faculty',
        `Meeting request was declined: ${reason || 'Faculty unavailable'}`,
        'meeting',
      );
      fetchMeetings();
    } catch (err) {
      showToast('Failed to deny: ' + err.message, 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Student Advising & Consultations
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '4px 0 0' }}>
            Manage student consultation requests, schedule project reviews, and record academic outcomes.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontWeight: 600, background: '#0284c7', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
          onClick={() => setCreateModalOpen(true)}
        >
          <span>+</span> Schedule Meeting with Student
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div style={{ background: '#fff', padding: '1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Total Meetings</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{all.length}</div>
        </div>

        <div style={{ background: '#fff', padding: '1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '0.8rem', color: '#b45309', fontWeight: 600, textTransform: 'uppercase' }}>Incoming Requests</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#d97706', marginTop: '4px' }}>{pendingRequests.length}</div>
        </div>

        <div style={{ background: '#fff', padding: '1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '0.8rem', color: '#15803d', fontWeight: 600, textTransform: 'uppercase' }}>Upcoming Confirmed</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#16a34a', marginTop: '4px' }}>{upcoming.length}</div>
        </div>

        <div style={{ background: '#fff', padding: '1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '0.8rem', color: '#047857', fontWeight: 600, textTransform: 'uppercase' }}>Completed & Outcomes</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#059669', marginTop: '4px' }}>{completed.length}</div>
        </div>
      </div>

      {/* Pending Student Requests Action Inbox */}
      {pendingRequests.length > 0 && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '1.2rem' }}>⚡</span>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#92400e', margin: 0 }}>
              Action Required: {pendingRequests.length} Student Meeting Request{pendingRequests.length > 1 ? 's' : ''}
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {pendingRequests.map((r) => (
              <div
                key={r.meeting_id}
                style={{
                  background: '#fff',
                  borderRadius: '8px',
                  padding: '1rem',
                  border: '1px solid #fef3c7',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>
                    {r.student_name || r.student_id} — {r.purpose}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>
                    Requested for <strong>{r.requested_date}</strong> ({r.requested_start_time} - {r.requested_end_time}) • {r.meeting_type === 'ONLINE' ? '🌐 Virtual' : '🏢 In-Person'}
                  </div>
                  {r.description && <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '4px' }}>{r.description}</div>}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '0.85rem', background: '#16a34a', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                    onClick={() => quickAccept(r)}
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ padding: '6px 14px', fontSize: '0.85rem' }}
                    onClick={() => setRescheduleData({ open: true, meeting: r, mode: 'propose' })}
                  >
                    Propose Other Time
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ padding: '6px 14px', fontSize: '0.85rem', color: '#b91c1c', borderColor: '#fca5a5' }}
                    onClick={() => quickDeny(r)}
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px', flexWrap: 'wrap' }}>
        {[
          { id: 'ALL', label: `All (${all.length})` },
          { id: 'REQUESTS', label: `Requests (${pendingRequests.length})` },
          { id: 'UPCOMING', label: `Upcoming (${upcoming.length})` },
          { id: 'RESCHEDULES', label: `Student Reschedules (${studentReschedules.length})` },
          { id: 'COMPLETED', label: `Completed (${completed.length})` },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setFilter(t.id)}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              border: 'none',
              background: filter === t.id ? '#0284c7' : 'transparent',
              color: filter === t.id ? '#fff' : '#475569',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Meetings List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Loading meetings…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3.5rem', background: '#fff', borderRadius: '10px', border: '1px dashed #cbd5e1', color: '#64748b' }}>
          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📅</div>
          <div style={{ fontWeight: 600, fontSize: '1.05rem', color: '#334155' }}>No meetings found in this view</div>
          <p style={{ fontSize: '0.875rem', marginTop: '4px', color: '#94a3b8' }}>
            Click &quot;Schedule Meeting with Student&quot; to initiate a consultation.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
          {filtered.map((m) => {
            const badge = STATUS_BADGES[m.status] || { label: m.status, bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };
            const activeDate = m.scheduled_date || m.requested_date;
            const activeTime = m.scheduled_start_time
              ? `${m.scheduled_start_time} - ${m.scheduled_end_time}`
              : `${m.requested_start_time} - ${m.requested_end_time}`;

            return (
              <div
                key={m.meeting_id}
                style={{
                  background: '#fff',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  padding: '1.25rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, minWidth: '280px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '12px',
                        backgroundColor: badge.bg,
                        color: badge.color,
                        border: `1px solid ${badge.border}`,
                      }}
                    >
                      {badge.label}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                      {m.meeting_type === 'ONLINE' ? '🌐 Virtual' : '🏢 In-Person'}
                    </span>
                    {m.location && <span style={{ fontSize: '0.8rem', color: '#475569' }}>• {m.location}</span>}
                  </div>

                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    {m.purpose}
                  </h3>

                  <div style={{ fontSize: '0.875rem', color: '#475569' }}>
                    <strong>Student:</strong> {m.student_name || m.student_id}
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: '#64748b' }}>
                    <div>
                      📅 <strong style={{ color: '#0f172a' }}>{activeDate}</strong> ({activeTime})
                    </div>
                  </div>

                  {/* Reschedule Requested alert */}
                  {m.status === 'RESCHEDULE_REQUESTED' && (
                    <div style={{ background: '#f5f3ff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd6fe', fontSize: '0.85rem' }}>
                      <strong style={{ color: '#6d28d9' }}>Student Requested Reschedule: </strong>
                      <span style={{ color: '#5b21b6' }}>{m.proposed_date} at {m.proposed_start_time} - {m.proposed_end_time}</span>
                      {m.reschedule_reason && <div style={{ fontSize: '0.8rem', color: '#6d28d9', marginTop: '2px' }}>Reason: {m.reschedule_reason}</div>}
                    </div>
                  )}

                  {/* Outcome summary preview */}
                  {m.status === 'COMPLETED' && m.outcome && (
                    <div style={{ background: '#f0fdf4', padding: '8px 12px', borderRadius: '6px', border: '1px solid #bbf7d0', fontSize: '0.85rem' }}>
                      <strong style={{ color: '#15803d' }}>Outcome Recorded: </strong>
                      <span style={{ color: '#166534' }}>{m.outcome}</span>
                    </div>
                  )}
                </div>

                {/* Right side actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {m.status === 'SCHEDULED' && m.meeting_type === 'ONLINE' && m.meeting_link && (
                    <a
                      href={m.meeting_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', background: '#0284c7', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer', padding: '6px 14px', fontSize: '0.85rem', textDecoration: 'none', fontWeight: 600 }}
                    >
                      Join Meeting ↗
                    </a>
                  )}

                  {m.status === 'SCHEDULED' && (
                    <button
                      type="button"
                      className="btn btn-primary" style={{ background: '#059669', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer', padding: '6px 14px', fontSize: '0.85rem', fontWeight: 600 }}
                      onClick={() => setCompleteMeeting(m)}
                    >
                      Mark Completed
                    </button>
                  )}

                  {m.status === 'RESCHEDULE_REQUESTED' && (
                    <button
                      type="button"
                      className="btn btn-primary" style={{ background: '#6d28d9', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer', padding: '6px 14px', fontSize: '0.85rem', fontWeight: 600 }}
                      onClick={() => setRescheduleData({ open: true, meeting: m, mode: 'handle' })}
                    >
                      Handle Reschedule
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                    onClick={() => setDetailMeeting(m)}
                  >
                    Details & History
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <MeetingModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onRefresh={fetchMeetings}
      />

      <RescheduleModal
        open={rescheduleData.open}
        meeting={rescheduleData.meeting}
        mode={rescheduleData.mode}
        onClose={() => setRescheduleData({ open: false, meeting: null, mode: 'faculty-direct' })}
        onRefresh={fetchMeetings}
      />

      <CompleteMeetingModal
        open={!!completeMeeting}
        meeting={completeMeeting}
        onClose={() => setCompleteMeeting(null)}
        onRefresh={fetchMeetings}
      />

      <MeetingDetailModal
        open={!!detailMeeting}
        meeting={detailMeeting}
        role="faculty"
        onClose={() => setDetailMeeting(null)}
        onRefresh={fetchMeetings}
        onOpenReschedule={(meeting, mode) => setRescheduleData({ open: true, meeting, mode })}
        onOpenComplete={(meeting) => setCompleteMeeting(meeting)}
      />
    </div>
  );
}
