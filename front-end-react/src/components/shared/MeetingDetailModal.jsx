import { useState } from 'react';
import Modal from './Modal';
import { apiFetch } from '../../api/client';
import { useNotifications } from '../../context/NotificationsContext';

const STATUS_CONFIG = {
  PENDING: { label: 'Pending Approval', color: '#b45309', bg: '#fef3c7', border: '#fcd34d' },
  SCHEDULED: { label: 'Confirmed / Scheduled', color: '#15803d', bg: '#dcfce7', border: '#86efac' },
  RESCHEDULE_REQUESTED: { label: 'Reschedule Requested', color: '#6d28d9', bg: '#ede9fe', border: '#c4b5fd' },
  RESCHEDULE_PROPOSED: { label: 'New Time Proposed', color: '#0369a1', bg: '#e0f2fe', border: '#7dd3fc' },
  DENIED: { label: 'Declined', color: '#b91c1c', bg: '#fee2e2', border: '#fca5a5' },
  CANCELLED: { label: 'Cancelled', color: '#475569', bg: '#f1f5f9', border: '#cbd5e1' },
  COMPLETED: { label: 'Completed', color: '#047857', bg: '#d1fae5', border: '#6ee7b7' },
};

export default function MeetingDetailModal({
  open,
  meeting,
  role,
  onClose,
  onRefresh,
  onOpenReschedule,
  onOpenComplete,
}) {
  const { showToast, send } = useNotifications();
  const [acting, setActing] = useState(false);

  if (!meeting) return null;

  const cfg = STATUS_CONFIG[meeting.status] || {
    label: meeting.status,
    color: '#334155',
    bg: '#f8fafc',
    border: '#cbd5e1',
  };

  const isStudent = role === 'student';
  const isFaculty = role === 'faculty';

  // Accept pending meeting (faculty)
  const handleFacultyAccept = async () => {
    setActing(true);
    try {
      await apiFetch(`/meetings/${meeting.meeting_id}/accept`, {
        method: 'PATCH',
        body: JSON.stringify({
          scheduledDate: meeting.requested_date,
          scheduledStartTime: meeting.requested_start_time,
          scheduledEndTime: meeting.requested_end_time,
          meetingType: meeting.meeting_type,
          meetingLink: meeting.meeting_link,
          location: meeting.location,
        }),
      });
      showToast('Meeting request accepted! Confirmed on schedule.', 'success');
      send(
        meeting.student_id,
        'Faculty',
        `Your meeting on ${meeting.requested_date} at ${meeting.requested_start_time} has been accepted!`,
        'meeting',
      );
      onRefresh?.();
      onClose();
    } catch (err) {
      showToast('Failed to accept: ' + err.message, 'error');
    } finally {
      setActing(false);
    }
  };

  // Deny pending meeting (faculty)
  const handleFacultyDeny = async () => {
    const reason = window.prompt('Please enter a reason for declining this meeting (optional):');
    if (reason === null) return; // user cancelled prompt

    setActing(true);
    try {
      await apiFetch(`/meetings/${meeting.meeting_id}/deny`, {
        method: 'PATCH',
        body: JSON.stringify({ reason: reason || 'Faculty is currently unavailable' }),
      });
      showToast('Meeting declined.', 'info');
      send(
        meeting.student_id,
        'Faculty',
        `Meeting request was declined: ${reason || 'Faculty unavailable'}`,
        'meeting',
      );
      onRefresh?.();
      onClose();
    } catch (err) {
      showToast('Failed to deny: ' + err.message, 'error');
    } finally {
      setActing(false);
    }
  };

  // Student accepts faculty-proposed time
  const handleStudentAcceptProposed = async () => {
    setActing(true);
    try {
      await apiFetch(`/meetings/${meeting.meeting_id}/accept-reschedule`, { method: 'PATCH' });
      showToast('Proposed time accepted! Meeting is confirmed.', 'success');
      send(
        meeting.faculty_id,
        'Student',
        `Student accepted the proposed meeting time: ${meeting.proposed_date} at ${meeting.proposed_start_time}`,
        'meeting',
      );
      onRefresh?.();
      onClose();
    } catch (err) {
      showToast('Failed: ' + err.message, 'error');
    } finally {
      setActing(false);
    }
  };

  // Student declines faculty-proposed time
  const handleStudentDeclineProposed = async () => {
    setActing(true);
    try {
      await apiFetch(`/meetings/${meeting.meeting_id}/decline-reschedule`, { method: 'PATCH' });
      showToast('Proposal declined. Meeting status restored.', 'info');
      send(
        meeting.faculty_id,
        'Student',
        `Student declined the proposed reschedule.`,
        'meeting',
      );
      onRefresh?.();
      onClose();
    } catch (err) {
      showToast('Failed: ' + err.message, 'error');
    } finally {
      setActing(false);
    }
  };

  // Cancel meeting
  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this meeting?')) return;
    setActing(true);
    try {
      await apiFetch(`/meetings/${meeting.meeting_id}/cancel`, {
        method: 'PATCH',
        body: JSON.stringify({ reason: 'Cancelled by user' }),
      });
      showToast('Meeting cancelled.', 'info');
      onRefresh?.();
      onClose();
    } catch (err) {
      showToast('Failed to cancel: ' + err.message, 'error');
    } finally {
      setActing(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Meeting Details" maxWidth="640px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem', maxHeight: '70vh', overflowY: 'auto', padding: '1.25rem 1.5rem' }}>
        {/* Header Banner */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem',
            borderRadius: '8px',
            backgroundColor: cfg.bg,
            border: `1px solid ${cfg.border}`,
          }}
        >
          <div>
            <div style={{ fontSize: '0.85rem', color: cfg.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Status
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: cfg.color }}>
              {cfg.label}
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: '0.85rem', color: '#64748b' }}>
            ID: <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{meeting.meeting_id}</span>
          </div>
        </div>

        {/* Participants & Core Info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={{ padding: '0.875rem', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Student</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
              {meeting.student_name || meeting.student_id}
            </div>
          </div>
          <div style={{ padding: '0.875rem', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Faculty</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
              {meeting.faculty_name || meeting.faculty_id}
            </div>
          </div>
        </div>

        {/* Purpose & Description */}
        <div>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>PURPOSE / TOPIC</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 600, color: '#1e293b' }}>{meeting.purpose}</div>
          {meeting.description && (
            <div style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '4px', lineHeight: 1.5 }}>
              {meeting.description}
            </div>
          )}
        </div>

        {/* Date & Time Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>CONFIRMED SCHEDULE</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: meeting.scheduled_date ? '#0f172a' : '#94a3b8', marginTop: '2px' }}>
              {meeting.scheduled_date ? `${meeting.scheduled_date} (${meeting.scheduled_start_time} - ${meeting.scheduled_end_time})` : 'Awaiting confirmation'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>ORIGINAL REQUEST</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#475569', marginTop: '2px' }}>
              {meeting.requested_date} ({meeting.requested_start_time} - {meeting.requested_end_time})
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>MODE & VENUE</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#475569', marginTop: '2px' }}>
              {meeting.meeting_type === 'ONLINE' ? '🌐 Online' : '🏢 In-Person'}
              {meeting.location ? ` • ${meeting.location}` : ''}
            </div>
          </div>
        </div>

        {/* Online Join Link */}
        {meeting.meeting_type === 'ONLINE' && meeting.meeting_link && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1rem', background: '#ecfdf5', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#065f46' }}>Virtual Meeting Link</div>
              <div style={{ fontSize: '0.85rem', color: '#047857', wordBreak: 'break-all' }}>{meeting.meeting_link}</div>
            </div>
            <a
              href={meeting.meeting_link}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
              style={{ padding: '7px 16px', fontSize: '0.85rem', textDecoration: 'none', background: '#0284c7', color: '#ffffff', borderRadius: '6px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap' }}
            >
              Join Meeting ↗
            </a>
          </div>
        )}

        {/* Reschedule Proposal Details if Active */}
        {(meeting.status === 'RESCHEDULE_PROPOSED' || meeting.status === 'RESCHEDULE_REQUESTED') && (
          <div style={{ padding: '0.85rem 1rem', background: '#f5f3ff', borderRadius: '8px', border: '1px solid #ddd6fe' }}>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#5b21b6' }}>
              Pending Reschedule Proposal (Proposed by {meeting.reschedule_requested_by || 'Participant'})
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#4c1d95', marginTop: '4px' }}>
              Proposed Date: {meeting.proposed_date} at {meeting.proposed_start_time} - {meeting.proposed_end_time}
            </div>
            {meeting.reschedule_reason && (
              <div style={{ fontSize: '0.85rem', color: '#6d28d9', marginTop: '4px' }}>
                Reason: {meeting.reschedule_reason}
              </div>
            )}
          </div>
        )}

        {/* Completed Academic Outcomes */}
        {meeting.status === 'COMPLETED' && (
          <div style={{ padding: '1rem', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#166534', marginBottom: '8px' }}>
              🎓 Academic Outcomes & Meeting Minutes
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem', fontSize: '0.9rem' }}>
              {meeting.outcome && (
                <div>
                  <span style={{ fontWeight: 700, color: '#14532d' }}>Learning Outcome / Progress: </span>
                  <span style={{ color: '#15803d' }}>{meeting.outcome}</span>
                </div>
              )}
              {meeting.discussion_notes && (
                <div>
                  <span style={{ fontWeight: 700, color: '#14532d' }}>Discussion Notes: </span>
                  <span style={{ color: '#15803d' }}>{meeting.discussion_notes}</span>
                </div>
              )}
              {meeting.action_items && (
                <div>
                  <span style={{ fontWeight: 700, color: '#14532d' }}>Student Action Items: </span>
                  <span style={{ color: '#15803d' }}>{meeting.action_items}</span>
                </div>
              )}
              {meeting.faculty_remarks && (
                <div>
                  <span style={{ fontWeight: 700, color: '#14532d' }}>Faculty Remarks: </span>
                  <span style={{ color: '#15803d' }}>{meeting.faculty_remarks}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* History Audit Trail */}
        {meeting.meeting_history && meeting.meeting_history.length > 0 && (
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>
              AUDIT LOG / TIMELINE
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem' }}>
              {meeting.meeting_history.map((h, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'baseline', color: '#64748b' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#94a3b8' }}>
                    {new Date(h.timestamp).toLocaleDateString()} {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span style={{ fontWeight: 700, color: '#334155' }}>[{h.action}]</span>
                  <span style={{ color: '#475569' }}>{typeof h.details === 'string' ? h.details : JSON.stringify(h.details)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '1rem', borderTop: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={acting}>
            Close
          </button>

          {/* Student Actions on Proposal */}
          {isStudent && meeting.status === 'RESCHEDULE_PROPOSED' && (
            <>
              <button
                type="button"
                className="btn btn-primary" style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 14px', fontWeight: 600 }}
                onClick={handleStudentAcceptProposed}
                disabled={acting}
              >
                Accept Proposed Time
              </button>
              <button
                type="button"
                className="btn btn-outline"
                style={{ color: '#b91c1c', borderColor: '#fca5a5' }}
                onClick={handleStudentDeclineProposed}
                disabled={acting}
              >
                Decline Proposal
              </button>
            </>
          )}

          {/* Student Actions on Confirmed Meeting */}
          {isStudent && meeting.status === 'SCHEDULED' && (
            <button
              type="button"
              className="btn btn-primary" style={{ background: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 14px', fontWeight: 600 }}
              onClick={() => {
                onClose();
                onOpenReschedule?.(meeting, 'request');
              }}
              disabled={acting}
            >
              Request Reschedule
            </button>
          )}

          {/* Faculty Actions on Pending Request */}
          {isFaculty && meeting.status === 'PENDING' && (
            <>
              <button
                type="button"
                className="btn btn-primary" style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 14px', fontWeight: 600 }}
                onClick={handleFacultyAccept}
                disabled={acting}
              >
                Accept Request
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  onClose();
                  onOpenReschedule?.(meeting, 'propose');
                }}
                disabled={acting}
              >
                Propose Another Time
              </button>
              <button
                type="button"
                className="btn btn-outline"
                style={{ color: '#b91c1c', borderColor: '#fca5a5' }}
                onClick={handleFacultyDeny}
                disabled={acting}
              >
                Decline
              </button>
            </>
          )}

          {/* Faculty Actions on Student Reschedule Request */}
          {isFaculty && meeting.status === 'RESCHEDULE_REQUESTED' && (
            <>
              <button
                type="button"
                className="btn btn-primary" style={{ background: '#6d28d9', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '8px 14px', fontWeight: 600, cursor: 'pointer' }}
                onClick={() => {
                  onClose();
                  onOpenReschedule?.(meeting, 'handle');
                }}
                disabled={acting}
              >
                Respond to Reschedule Request
              </button>
            </>
          )}

          {/* Faculty Actions on Scheduled Meeting */}
          {isFaculty && meeting.status === 'SCHEDULED' && (
            <>
              <button
                type="button"
                className="btn btn-primary"
                style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 14px', fontWeight: 600 }}
                onClick={() => {
                  onClose();
                  onOpenComplete?.(meeting);
                }}
                disabled={acting}
              >
                Mark Completed & Record Outcomes
              </button>
              <button
                type="button"
                className="btn btn-outline" style={{ padding: '8px 14px', fontWeight: 600, cursor: 'pointer' }}
                onClick={() => {
                  onClose();
                  onOpenReschedule?.(meeting, 'faculty-direct');
                }}
                disabled={acting}
              >
                Reschedule
              </button>
            </>
          )}

          {/* Cancellation */}
          {(meeting.status === 'PENDING' || meeting.status === 'SCHEDULED' || meeting.status === 'RESCHEDULE_PROPOSED' || meeting.status === 'RESCHEDULE_REQUESTED') && (
            <button
              type="button"
              className="btn btn-outline"
              style={{ color: '#b91c1c', borderColor: '#fca5a5' }}
              onClick={handleCancel}
              disabled={acting}
            >
              Cancel Meeting
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
