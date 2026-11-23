/**
 * Redux migration (Dev 5): meetingsSlice/Thunks — directory lookup +
 * create.
 */
import { useEffect, useState } from 'react';
import { useAuth } from '../../features/auth/useAuth';
import { useNotifications } from '../../features/notifications/useNotifications';
import Modal from './Modal';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchMeetingDirectory, createMeeting } from '../../features/meetings/meetingsThunks';

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = ['00', '15', '30', '45'];

export default function MeetingModal({ open, preselected, onClose, onRefresh }) {
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const { showToast, send } = useNotifications();

  const isStudent = user?.role === 'student';
  const isFaculty = user?.role === 'faculty' || user?.role === 'admin' || user?.role === 'head';

  const directory = useAppSelector((state) => state.meetings.directory);
  const counterparts = preselected ? [preselected] : directory;
  const [selectedId, setSelectedId] = useState('');
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState('');

  const [hour, setHour] = useState('10');
  const [minute, setMinute] = useState('00');
  const [period, setPeriod] = useState('AM');

  const [endHour, setEndHour] = useState('10');
  const [endMinute, setEndMinute] = useState('30');
  const [endPeriod, setEndPeriod] = useState('AM');

  const [mode, setMode] = useState('ONLINE');
  const [meetingLink, setMeetingLink] = useState('https://meet.google.com/new');
  const [location, setLocation] = useState('');
  const [agenda, setAgenda] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDate('');
    setHour('10');
    setMinute('00');
    setPeriod('AM');
    setEndHour('10');
    setEndMinute('30');
    setEndPeriod('AM');
    setMode('ONLINE');
    setMeetingLink('https://meet.google.com/new');
    setLocation('');
    setAgenda('');

    if (preselected) {
      setSelectedId(preselected.id || preselected.user_id);
    } else {
      setSelectedId('');
      dispatch(fetchMeetingDirectory(isStudent ? 'student' : 'faculty'));
    }
  }, [open, preselected, isStudent, dispatch]);

  const to24Hour = (hourStr, minuteStr, periodStr) => {
    let h = parseInt(hourStr, 10);
    if (periodStr === 'PM' && h !== 12) h += 12;
    if (periodStr === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${minuteStr}`;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!selectedId) {
      return showToast(`Please select a ${isStudent ? 'faculty member' : 'student'}`, 'warning');
    }
    if (!date) return showToast('Meeting date is required', 'warning');
    if (date < today) return showToast('Meeting date cannot be in the past', 'warning');

    const startTime = to24Hour(hour, minute, period);
    const endTime = to24Hour(endHour, endMinute, endPeriod);

    if (startTime >= endTime) {
      return showToast('Start time must be strictly before end time', 'warning');
    }
    if (!agenda || agenda.trim().length < 5) {
      return showToast('Please enter a meeting purpose/agenda (at least 5 characters)', 'warning');
    }

    if (mode === 'ONLINE' && !meetingLink.trim()) {
      return showToast('Online meetings require a valid meeting link', 'warning');
    }
    if (mode === 'IN_PERSON' && !location.trim()) {
      return showToast('In-person meetings require a venue or cabin location', 'warning');
    }

    setSubmitting(true);
    try {
      const payload = isStudent
        ? {
            facultyId: selectedId,
            requestedDate: date,
            requestedStartTime: startTime,
            requestedEndTime: endTime,
            purpose: agenda.trim(),
            description: agenda.trim(),
            meetingType: mode,
            meetingLink: mode === 'ONLINE' ? meetingLink.trim() : undefined,
            location: mode === 'IN_PERSON' ? location.trim() : undefined,
          }
        : {
            studentId: selectedId,
            scheduledDate: date,
            scheduledStartTime: startTime,
            scheduledEndTime: endTime,
            purpose: agenda.trim(),
            description: agenda.trim(),
            meetingType: mode,
            meetingLink: mode === 'ONLINE' ? meetingLink.trim() : undefined,
            location: mode === 'IN_PERSON' ? location.trim() : undefined,
          };

      await dispatch(createMeeting(payload)).unwrap();

      const senderName = user?.first_name || (isStudent ? 'Student' : 'Faculty');
      const timeDisplay = `${hour}:${minute} ${period}`;
      const modeLabel = mode === 'ONLINE' ? 'Online' : `In-Person (${location.trim()})`;

      if (isStudent) {
        send(
          selectedId,
          senderName,
          `📅 New meeting request from student: ${date} at ${timeDisplay}. Purpose: ${agenda.trim()}`,
          'meeting',
        );
        showToast('Meeting request submitted! Faculty has been notified. ⏳', 'success');
      } else {
        send(
          selectedId,
          senderName,
          `📅 Meeting confirmed by faculty: ${date} at ${timeDisplay} — ${modeLabel}. Purpose: ${agenda.trim()}`,
          'meeting',
        );
        showToast('Meeting scheduled! Student has been notified. ✅', 'success');
      }

      onRefresh?.();
      onClose();
    } catch (err) {
      showToast('Failed to schedule meeting: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const title = isStudent ? 'Request Meeting with Faculty' : 'Schedule Meeting with Student';

  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth="560px">
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden" }}>
        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1rem", overflowY: "auto", flex: 1, minHeight: 0, padding: "1.25rem 1.5rem" }}>
          {/* Participant Selection */}
          <div className="form-group">
            <label style={{ fontWeight: 600 }}>
              {isStudent ? 'Select Faculty Member' : 'Select Student'} <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              disabled={!!preselected}
              className="form-control"
              required
            >
              {!preselected && (
                <option value="">
                  {counterparts === null ? 'Loading directory…' : `— Select ${isStudent ? 'Faculty' : 'Student'} —`}
                </option>
              )}
              {counterparts?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.department ? `(${c.department})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Date Picker */}
          <div className="form-group">
            <label style={{ fontWeight: 600 }}>
              Date <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="date"
              min={today}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="form-control"
              required
            />
          </div>

          {/* Start and End Times */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'flex-start' }}>
            <div className="form-group">
              <label style={{ fontWeight: 600 }}>Start Time</label>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <select value={hour} onChange={(e) => setHour(e.target.value)} className="form-control" style={{ width: '56px', padding: '6px 2px', fontSize: '0.85rem', textAlign: 'center' }}>
                  {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
                <span>:</span>
                <select value={minute} onChange={(e) => setMinute(e.target.value)} className="form-control" style={{ width: '56px', padding: '6px 2px', fontSize: '0.85rem', textAlign: 'center' }}>
                  {MINUTES.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                <select value={period} onChange={(e) => setPeriod(e.target.value)} className="form-control" style={{ width: '64px', padding: '6px 2px', fontSize: '0.85rem', textAlign: 'center' }}>
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label style={{ fontWeight: 600 }}>End Time</label>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
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

          {/* Mode & Details */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label style={{ fontWeight: 600 }}>Meeting Type</label>
              <select value={mode} onChange={(e) => setMode(e.target.value)} className="form-control">
                <option value="ONLINE">🌐 Online (Virtual)</option>
                <option value="IN_PERSON">🏢 In-Person (Physical)</option>
              </select>
            </div>

            <div className="form-group">
              <label style={{ fontWeight: 600 }}>
                {mode === 'ONLINE' ? 'Meeting URL' : 'Location / Cabin'} <span style={{ color: '#ef4444' }}>*</span>
              </label>
              {mode === 'ONLINE' ? (
                <input
                  type="url"
                  className="form-control"
                  placeholder="https://meet.google.com/..."
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                  required
                />
              ) : (
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Faculty Cabin 304, CS Block"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  required
                />
              )}
            </div>
          </div>

          {/* Agenda / Purpose */}
          <div className="form-group">
            <label style={{ fontWeight: 600 }}>
              Purpose & Agenda <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <textarea
              rows={3}
              className="form-control"
              placeholder="Describe the topics, questions, or progress to review..."
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '1rem 1.25rem', borderTop: '1px solid #e2e8f0' }}>
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" style={{ background: '#0284c7', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '9px 18px', fontWeight: 600, cursor: 'pointer' }} disabled={submitting}>
            {submitting ? 'Submitting…' : isStudent ? 'Submit Meeting Request' : 'Schedule Meeting'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
