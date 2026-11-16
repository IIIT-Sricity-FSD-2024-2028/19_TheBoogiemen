import { useState, useEffect } from 'react';
import Modal from './Modal';
import { apiFetch } from '../../api/client';
import { useNotifications } from '../../context/NotificationsContext';

export default function CompleteMeetingModal({ open, meeting, onClose, onRefresh }) {
  const { showToast, send } = useNotifications();
  const [outcome, setOutcome] = useState('');
  const [discussionNotes, setDiscussionNotes] = useState('');
  const [actionItems, setActionItems] = useState('');
  const [facultyRemarks, setFacultyRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setOutcome(meeting?.outcome || '');
    setDiscussionNotes(meeting?.discussion_notes || '');
    setActionItems(meeting?.action_items || '');
    setFacultyRemarks(meeting?.faculty_remarks || '');
  }, [open, meeting]);

  const submit = async (e) => {
    e.preventDefault();
    if (!meeting) return;

    if (!outcome.trim() && !discussionNotes.trim()) {
      return showToast('Please enter at least discussion notes or an outcome summary', 'warning');
    }

    setSubmitting(true);
    try {
      await apiFetch(`/meetings/${meeting.meeting_id}/complete`, {
        method: 'PATCH',
        body: JSON.stringify({
          outcome: outcome.trim(),
          discussionNotes: discussionNotes.trim(),
          actionItems: actionItems.trim(),
          facultyRemarks: facultyRemarks.trim(),
        }),
      });

      showToast('Meeting completed and outcomes recorded! 🎓', 'success');
      send(
        meeting.student_id,
        'Faculty',
        `Meeting completed! Outcome: ${outcome.trim() || 'Reviewed'}`,
        'meeting',
      );

      onRefresh?.();
      onClose();
    } catch (err) {
      showToast('Failed to complete meeting: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Complete Meeting & Record Outcomes">
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden" }}>
        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1rem", overflowY: "auto", flex: 1, minHeight: 0, padding: "1.25rem 1.5rem" }}>
          <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.9rem' }}>
            <div><strong>Meeting:</strong> {meeting?.purpose}</div>
            <div><strong>Student:</strong> {meeting?.student_name || meeting?.student_id}</div>
            <div><strong>Schedule:</strong> {meeting?.scheduled_date} ({meeting?.scheduled_start_time} - {meeting?.scheduled_end_time})</div>
          </div>

          <div className="form-group">
            <label style={{ fontWeight: 600 }}>Meeting Outcome / Academic Progress</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Chapter 3 methodology approved; Course Outcome CO-2 demonstrated"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label style={{ fontWeight: 600 }}>Discussion Notes / Key Minutes</label>
            <textarea
              className="form-control"
              rows={3}
              placeholder="Summary of discussion points and topics covered during the meeting..."
              value={discussionNotes}
              onChange={(e) => setDiscussionNotes(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label style={{ fontWeight: 600 }}>Action Items Assigned to Student</label>
            <textarea
              className="form-control"
              rows={2}
              placeholder="Next steps, deliverables, or deadlines assigned to the student..."
              value={actionItems}
              onChange={(e) => setActionItems(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label style={{ fontWeight: 600 }}>Faculty Remarks / Evaluation</label>
            <textarea
              className="form-control"
              rows={2}
              placeholder="Feedback, recommendations, or qualitative assessment..."
              value={facultyRemarks}
              onChange={(e) => setFacultyRemarks(e.target.value)}
            />
          </div>
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '1rem 1.25rem', borderTop: '1px solid #e2e8f0' }}>
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" style={{ background: '#059669', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '8px 16px', fontWeight: 600, cursor: 'pointer' }} disabled={submitting}>
            {submitting ? 'Saving Outcomes...' : 'Mark Completed & Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
