/**
 * SendAlertModal — ported from legacy fixes.js openAlertModal() +
 * sendCustomAlert() (faculty.html's sendAlertModal). Client-side only —
 * matches legacy exactly: a notification is pushed via the bell, nothing
 * is persisted server-side. Used from both faculty Dashboard's
 * intervention list and Student Overview's cards.
 */

import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationsContext';
import Modal from './Modal';

const TEMPLATES = [
  { label: '📉 Low Attendance', text: 'Your attendance is critically low. Please attend regularly to avoid debarment.' },
  { label: '📚 Low Performance', text: 'Your academic performance needs improvement. Please visit the faculty cabin for guidance.' },
  { label: '📋 Pending Assignment', text: 'You have a pending assignment submission. Please submit immediately.' },
];

export default function SendAlertModal({ student, onClose }) {
  const { user } = useAuth();
  const { showToast, send } = useNotifications();
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (student) setMessage('');
  }, [student]);

  const submit = () => {
    if (!message.trim() || message.trim().length < 5) return showToast('Please enter a message (at least 5 characters)', 'warning');
    const from = user?.first_name || user?.username || 'Your Faculty';
    send(student.id, from, `⚠ ${message.trim()}`, 'alert');
    showToast(`Alert sent to ${student.name}!`, 'success');
    onClose();
  };

  return (
    <Modal open={!!student} onClose={onClose} title="⚠ Send Alert" maxWidth={480}>
      <div className="modal-body">
        <div className="form-group">
          <label>Sending alert to: <strong style={{ color: '#dc2626' }}>{student?.name}</strong></label>
        </div>
        <div className="form-group">
          <label>Alert Message <span style={{ color: '#ef4444' }}>*</span></label>
          <textarea
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="e.g. Your attendance is below 75%. Please ensure regular attendance to avoid debarment."
            style={{ minHeight: 100 }}
          />
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>The student will see this in their notification bell 🔔</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {TEMPLATES.map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={() => setMessage(t.text)}
              style={{ padding: '6px 10px', fontSize: 11, border: '1px solid #e2e8f0', borderRadius: 6, background: '#f8fafc', cursor: 'pointer' }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="modal-footer">
        <button onClick={submit} className="submit-btn" style={{ flex: 1, background: 'linear-gradient(135deg,#dc2626,#b91c1c)' }}>
          ⚠ Send Alert
        </button>
        <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  );
}
