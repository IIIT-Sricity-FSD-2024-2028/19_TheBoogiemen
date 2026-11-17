/**
 * Redux migration (Dev 5): meetingsSlice/Thunks — all four reschedule-
 * shaped mutations this one modal covers (request/propose/direct/handle).
 */
import { useState, useEffect } from 'react';
import Modal from './Modal';
import { useNotifications } from '../../context/NotificationsContext';
import { useAppDispatch } from '../../store/hooks';
import { requestReschedule, askReschedule, directReschedule, handleStudentReschedule } from '../../features/meetings/meetingsThunks';

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = ['00', '15', '30', '45'];

export default function RescheduleModal({ open, meeting, mode, onClose, onRefresh }) {
  const dispatch = useAppDispatch();
  const { showToast, send } = useNotifications();
  const today = new Date().toISOString().split('T')[0];

  const [date, setDate] = useState('');
  const [startHour, setStartHour] = useState('');
  const [startMinute, setStartMinute] = useState('00');
  const [startPeriod, setStartPeriod] = useState('AM');

  const [endHour, setEndHour] = useState('');
  const [endMinute, setEndMinute] = useState('30');
  const [endPeriod, setEndPeriod] = useState('AM');

  const [reason, setReason] = useState('');
  const [action, setAction] = useState('ACCEPT'); // For 'handle' mode: ACCEPT | DENY | PROPOSE

  const [meetingType, setMeetingType] = useState('ONLINE');
  const [meetingLink, setMeetingLink] = useState('');
  const [location, setLocation] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDate('');
    setStartHour('10');
    setStartMinute('00');
    setStartPeriod('AM');
    setEndHour('10');
    setEndMinute('30');
    setEndPeriod('AM');
    setReason('');
    setAction('ACCEPT');
    if (meeting) {
      setMeetingType(meeting.meeting_type || 'ONLINE');
      setMeetingLink(meeting.meeting_link || '');
      setLocation(meeting.location || '');
      if (meeting.proposed_date) {
        setDate(meeting.proposed_date);
      }
    }
  }, [open, meeting, mode]);

  const to24Hour = (hourStr, minuteStr, periodStr) => {
    let h = parseInt(hourStr, 10);
    if (periodStr === 'PM' && h !== 12) h += 12;
    if (periodStr === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${minuteStr}`;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!meeting) return;

    const startTime = to24Hour(startHour, startMinute, startPeriod);
    const endTime = to24Hour(endHour, endMinute, endPeriod);

    setSubmitting(true);
    try {
      if (mode === 'request') {
        // Student requests reschedule
        if (!date) throw new Error('Please select a proposed date');
        if (date < today) throw new Error('Date cannot be in the past');
        if (startTime >= endTime) throw new Error('Start time must be before end time');

        await dispatch(requestReschedule({
          meetingId: meeting.meeting_id,
          payload: {
            proposedDate: date,
            proposedStartTime: startTime,
            proposedEndTime: endTime,
            reason: reason.trim() || 'Schedule conflict',
          },
        })).unwrap();

        showToast('Reschedule request sent to faculty! 📅', 'success');
        send(
          meeting.faculty_id,
          'Student',
          `Student requested reschedule for meeting on ${date} at ${startTime}`,
          'meeting',
        );
      } else if (mode === 'propose') {
        // Faculty proposes new time
        if (!date) throw new Error('Please select a proposed date');
        if (date < today) throw new Error('Date cannot be in the past');
        if (startTime >= endTime) throw new Error('Start time must be before end time');

        await dispatch(askReschedule({
          meetingId: meeting.meeting_id,
          payload: {
            proposedDate: date,
            proposedStartTime: startTime,
            proposedEndTime: endTime,
            reason: reason.trim() || 'Alternative slot proposed by faculty',
            meetingType,
            meetingLink: meetingType === 'ONLINE' ? meetingLink : undefined,
            location: meetingType === 'IN_PERSON' ? location : undefined,
          },
        })).unwrap();

        showToast('Alternative time proposed to student! 📩', 'success');
        send(
          meeting.student_id,
          'Faculty',
          `Faculty proposed a new meeting time on ${date} at ${startTime}`,
          'meeting',
        );
      } else if (mode === 'faculty-direct') {
        // Faculty directly reschedules confirmed meeting
        if (!date) throw new Error('Please select a new date');
        if (date < today) throw new Error('Date cannot be in the past');
        if (startTime >= endTime) throw new Error('Start time must be before end time');

        await dispatch(directReschedule({
          meetingId: meeting.meeting_id,
          payload: {
            scheduledDate: date,
            scheduledStartTime: startTime,
            scheduledEndTime: endTime,
            rescheduleReason: reason.trim() || 'Faculty updated the schedule',
            meetingType,
            meetingLink: meetingType === 'ONLINE' ? meetingLink : undefined,
            location: meetingType === 'IN_PERSON' ? location : undefined,
          },
        })).unwrap();

        showToast('Meeting rescheduled directly! Student notified. 📅', 'success');
        send(
          meeting.student_id,
          'Faculty',
          `Your meeting has been rescheduled to ${date} at ${startTime}`,
          'meeting',
        );
      } else if (mode === 'handle') {
        // Faculty handles student request (ACCEPT, DENY, PROPOSE)
        const payload = { action, reason: reason.trim() || undefined };
        if (action === 'PROPOSE') {
          if (!date) throw new Error('Please select a proposed date');
          if (date < today) throw new Error('Date cannot be in the past');
          if (startTime >= endTime) throw new Error('Start time must be before end time');
          payload.proposedDate = date;
          payload.proposedStartTime = startTime;
          payload.proposedEndTime = endTime;
          payload.meetingType = meetingType;
          payload.meetingLink = meetingType === 'ONLINE' ? meetingLink : undefined;
          payload.location = meetingType === 'IN_PERSON' ? location : undefined;
        }

        await dispatch(handleStudentReschedule({ meetingId: meeting.meeting_id, payload })).unwrap();

        if (action === 'ACCEPT') {
          showToast('Approved student reschedule request! 📅', 'success');
          send(
            meeting.student_id,
            'Faculty',
            `Your meeting reschedule request was approved!`,
            'meeting',
          );
        } else if (action === 'DENY') {
          showToast('Declined student reschedule request. Original slot remains active.', 'info');
          send(
            meeting.student_id,
            'Faculty',
            `Reschedule request declined: ${reason || 'Original slot stands'}`,
            'meeting',
          );
        } else {
          showToast('Counter-proposal sent to student! 📩', 'success');
          send(
            meeting.student_id,
            'Faculty',
            `Faculty counter-proposed new time: ${date} at ${startTime}`,
            'meeting',
          );
        }
      }

      onRefresh?.();
      onClose();
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getTitle = () => {
    if (mode === 'request') return 'Request Meeting Reschedule';
    if (mode === 'propose') return 'Propose Alternative Time';
    if (mode === 'faculty-direct') return 'Reschedule Confirmed Meeting';
    return 'Respond to Student Reschedule Request';
  };

  return (
    <Modal open={open} onClose={onClose} title={getTitle()}>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden" }}>
        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1rem", overflowY: "auto", flex: 1, minHeight: 0, padding: "1.25rem 1.5rem" }}>
          {/* Handle Action Selector for 'handle' mode */}
          {mode === 'handle' && (
            <div className="form-group">
              <label style={{ fontWeight: 700, color: '#0f172a' }}>Response Action</label>
              <select value={action} onChange={(e) => setAction(e.target.value)} className="form-control">
                <option value="ACCEPT">Accept Proposed Time ({meeting?.proposed_date} at {meeting?.proposed_start_time})</option>
                <option value="DENY">Decline Request (Keep original schedule: {meeting?.scheduled_date} at {meeting?.scheduled_start_time})</option>
                <option value="PROPOSE">Counter-Propose Another Time</option>
              </select>
            </div>
          )}

          {/* Date & Time Picker */}
          {(mode !== 'handle' || action === 'PROPOSE') && (
            <>
              <div className="form-group">
                <label style={{ fontWeight: 600 }}>New Date</label>
                <input
                  type="date"
                  className="form-control"
                  min={today}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label style={{ fontWeight: 600 }}>Start Time</label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <select value={startHour} onChange={(e) => setStartHour(e.target.value)} className="form-control" style={{ width: '56px', padding: '6px 2px', fontSize: '0.85rem', textAlign: 'center' }}>
                      {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                    <span>:</span>
                    <select value={startMinute} onChange={(e) => setStartMinute(e.target.value)} className="form-control" style={{ width: '56px', padding: '6px 2px', fontSize: '0.85rem', textAlign: 'center' }}>
                      {MINUTES.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <select value={startPeriod} onChange={(e) => setStartPeriod(e.target.value)} className="form-control" style={{ width: '64px', padding: '6px 2px', fontSize: '0.85rem', textAlign: 'center' }}>
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label style={{ fontWeight: 600 }}>End Time</label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <select value={endHour} onChange={(e) => setEndHour(e.target.value)} className="form-control" style={{ width: '56px', padding: '6px 2px', fontSize: '0.85rem', textAlign: 'center' }}>
                      {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                    <span>:</span>
                    <select value={endMinute} onChange={(e) => setEndMinute(e.target.value)} className="form-control" style={{ width: '56px', padding: '6px 2px', fontSize: '0.85rem', textAlign: 'center' }}>
                      {MINUTES.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <select value={endPeriod} onChange={(e) => setEndPeriod(e.target.value)} className="form-control" style={{ width: '64px', padding: '6px 2px', fontSize: '0.85rem', textAlign: 'center' }}>
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Mode & Venue (if faculty proposing or rescheduling) */}
              {(mode === 'propose' || mode === 'faculty-direct' || (mode === 'handle' && action === 'PROPOSE')) && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label style={{ fontWeight: 600 }}>Meeting Mode</label>
                    <select value={meetingType} onChange={(e) => setMeetingType(e.target.value)} className="form-control">
                      <option value="ONLINE">Online (Virtual)</option>
                      <option value="IN_PERSON">In-Person (Physical)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label style={{ fontWeight: 600 }}>
                      {meetingType === 'ONLINE' ? 'Meeting URL (Google Meet)' : 'Location (Cabin/Room)'}
                    </label>
                    {meetingType === 'ONLINE' ? (
                      <input
                        type="url"
                        className="form-control"
                        placeholder="https://meet.google.com/..."
                        value={meetingLink}
                        onChange={(e) => setMeetingLink(e.target.value)}
                      />
                    ) : (
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Cabin 304, CS Dept"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                      />
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Reason */}
          <div className="form-group">
            <label style={{ fontWeight: 600 }}>
              {mode === 'request'
                ? 'Reason for Reschedule Request'
                : mode === 'handle' && action === 'DENY'
                ? 'Reason for Declining (Optional)'
                : 'Remarks / Reason'}
            </label>
            <textarea
              className="form-control"
              rows={3}
              placeholder="Provide context or explanation..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '1rem 1.25rem', borderTop: '1px solid #e2e8f0' }}>
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" style={{ background: '#0284c7', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '9px 18px', fontWeight: 600, cursor: 'pointer' }} disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
