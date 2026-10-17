/**
 * LeavePanel — ported from legacy fixes.js renderStudentLeave() +
 * submitLeaveApplication() (student.html's leaveModal),
 * renderFacultyLeaveList() + submitFacultyLeave() (faculty.html's
 * fLeaveModal), and renderLeaveManagement() + updateLeave() (admin/head's
 * approval view, super-user.html). Three different audiences for the same
 * underlying `/leave` resource, each with genuinely different markup —
 * admin/head's view has no metrics grid and no apply button at all (they
 * only approve/reject), unlike student/faculty's apply-and-track views.
 */

import { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';
import { uploadFile, downloadDocument } from '../../api/uploads';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationsContext';
import Modal from './Modal';

const STATUS_COLORS = {
  approved: ['#dcfce7', '#166534'],
  pending: ['#fef9c3', '#713f12'],
  rejected: ['#fef2f2', '#991b1b'],
};

function LeaveRow({ leave }) {
  const { showToast } = useNotifications();
  const [bg, fg] = STATUS_COLORS[leave.status] || ['#f1f5f9', '#475569'];
  return (
    <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{leave.leave_type || leave.type || 'Leave'}</div>
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
          {leave.start_date || leave.from_date || ''} → {leave.end_date || leave.to_date || ''}
        </div>
        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{leave.reason || ''}</div>
        {leave.file_id && (
          <button
            type="button"
            onClick={() => downloadDocument(leave.file_id).catch((e) => showToast('Failed to download: ' + e.message, 'error'))}
            style={{ marginTop: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 6, cursor: 'pointer' }}
          >
            📎 View document
          </button>
        )}
      </div>
      <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: bg, color: fg }}>{leave.status}</span>
    </div>
  );
}

function LeaveTable({ leaves }) {
  return (
    <table className="crud-table">
      <thead>
        <tr><th>Type</th><th>Start</th><th>End</th><th>Reason</th><th>Status</th></tr>
      </thead>
      <tbody>
        {leaves.length === 0 ? (
          <tr><td colSpan={5} style={{ textAlign: 'center' }}>No leave applications</td></tr>
        ) : (
          leaves.map((l) => {
            const [bg, fg] = STATUS_COLORS[l.status] || ['#f1f5f9', '#475569'];
            return (
              <tr key={l.leave_id}>
                <td>{l.leave_type || 'Leave'}</td>
                <td>{l.start_date || ''}</td>
                <td>{l.end_date || ''}</td>
                <td>{l.reason || ''}</td>
                <td><span style={{ padding: '4px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: bg, color: fg }}>{l.status}</span></td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );
}

function LeaveApplyModal({ role, open, onClose, onSubmitted }) {
  const { showToast } = useNotifications();
  const [leaveType, setLeaveType] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [reason, setReason] = useState('');
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  const reset = () => {
    setLeaveType('');
    setStart('');
    setEnd('');
    setReason('');
    setFile(null);
    setDragActive(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!leaveType) return showToast('Please select a leave type', 'warning');
    if (!start) return showToast('Start date is required', 'warning');
    if (!end) return showToast('End date is required', 'warning');
    if (end < start) return showToast('End date cannot be before start date', 'warning');
    if (!reason || reason.trim().length < 10) {
      return showToast(role === 'faculty' ? 'Reason must be at least 10 characters' : 'Please provide a reason (at least 10 characters)', 'warning');
    }

    setSubmitting(true);
    try {
      const uploaded = file ? await uploadFile(file, 'leave') : null;
      await apiFetch('/leave', {
        method: 'POST',
        body: JSON.stringify({ leave_type: leaveType, start_date: start, end_date: end, reason: reason.trim(), file_id: uploaded?.file_id ?? null }),
      });
      const verb = role === 'faculty' ? 'Leave applied' : 'Leave application submitted';
      showToast(uploaded ? `${verb} with ${uploaded.original_name}! ✅` : `${verb}!`, 'success');
      handleClose();
      onSubmitted();
    } catch (e2) {
      showToast('Failed: ' + e2.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Apply for Leave">
      <form onSubmit={submit}>
        <div className="modal-body">
          <div className="form-group">
            <label>Leave Type</label>
            <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)}>
              <option value="">Select leave type</option>
              <option value="medical">Medical Leave</option>
              <option value="personal">Personal Leave</option>
              <option value="event">{role === 'faculty' ? 'Event/Conference' : 'Event Participation'}</option>
            </select>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Start Date</label>
              <input type="date" min={today} value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="form-group">
              <label>End Date</label>
              <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label>Reason</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Provide detailed reason for leave..." />
          </div>
          <div className="form-group">
            <label>
              Supporting Document <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400 }}>(Optional)</span>
            </label>
            <div
              onClick={() => document.getElementById('leaveFileInput').click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                const f = e.dataTransfer.files?.[0];
                if (f) setFile(f);
              }}
              style={{
                border: `2px dashed ${file ? '#16a34a' : dragActive ? '#6366f1' : '#cbd5e1'}`,
                borderRadius: 10,
                padding: 24,
                textAlign: 'center',
                background: file ? '#f0fdf4' : dragActive ? '#eef2ff' : '#f8fafc',
                cursor: 'pointer',
              }}
            >
              <input
                type="file"
                id="leaveFileInput"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                style={{ display: 'none' }}
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <div style={{ fontSize: 32, marginBottom: 8 }}>{file ? '✅' : '📄'}</div>
              <button type="button" style={{ padding: '8px 18px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                Choose File
              </button>
              <div style={{ marginTop: 10, fontSize: 12, color: '#64748b', fontWeight: 600 }}>{file ? file.name : 'No file chosen'}</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>PDF, JPG, PNG up to 5MB</div>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button type="submit" className="submit-btn" style={{ flex: 1 }} disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit Application'}
          </button>
          <button type="button" className="btn-cancel" onClick={handleClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}

function AdminLeaveRow({ leave, onDecide }) {
  const [bg, fg] = STATUS_COLORS[leave.status] || ['#f1f5f9', '#475569'];
  return (
    <div style={{ padding: 12, border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <div style={{ fontWeight: 600 }}>{leave.student_name || leave.student_id}</div>
        <div style={{ fontSize: 12, color: '#64748b' }}>{leave.leave_type} • {leave.start_date} to {leave.end_date}</div>
        <div style={{ fontSize: 12, marginTop: 4 }}>{leave.reason}</div>
        {leave.file_id && (
          <button
            type="button"
            onClick={() => downloadDocument(leave.file_id)}
            style={{ marginTop: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 6, cursor: 'pointer' }}
          >
            📎 View document
          </button>
        )}
      </div>
      <div>
        {leave.status === 'pending' ? (
          <>
            <button
              onClick={() => onDecide(leave, 'approved')}
              style={{ padding: '6px 14px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, marginRight: 6 }}
            >
              ✓ Approve
            </button>
            <button
              onClick={() => onDecide(leave, 'rejected')}
              style={{ padding: '6px 14px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
            >
              ✕ Reject
            </button>
          </>
        ) : (
          <span style={{ padding: '4px 8px', borderRadius: 4, fontSize: 11, background: bg, color: fg }}>{leave.status}</span>
        )}
      </div>
    </div>
  );
}

function AdminLeaveManagement() {
  const { user } = useAuth();
  const { showToast, send } = useNotifications();
  const [leaves, setLeaves] = useState(undefined);

  const load = () => apiFetch('/leave').then(setLeaves).catch(() => setLeaves([]));
  useEffect(() => {
    load();
  }, []);

  const decide = async (leave, status) => {
    try {
      await apiFetch(`/leave/${leave.leave_id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      showToast(`Leave ${status === 'approved' ? 'approved ✅' : 'rejected ❌'}`, status === 'approved' ? 'success' : 'warning');
      const studentId = leave.student_id || leave.user_id;
      if (studentId) {
        const from = user?.first_name || 'Admin';
        const msg = status === 'approved'
          ? `🗓 Your leave request has been APPROVED by ${from}. Enjoy your time off!`
          : `❌ Your leave request has been REJECTED by ${from}. Please contact them for details.`;
        send(studentId, from, msg, status === 'approved' ? 'info' : 'alert');
      }
      load();
    } catch {
      showToast('Failed', 'error');
    }
  };

  return (
    <div className="stats-card">
      <div className="stats-card-header"><h3>Leave Request Management</h3></div>
      <div className="stats-card-body" style={{ padding: 24 }}>
        {leaves === undefined ? (
          <div style={{ textAlign: 'center', color: '#64748b' }}>Loading...</div>
        ) : leaves.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#64748b' }}>No leaves.</p>
        ) : (
          leaves.map((l) => <AdminLeaveRow key={l.leave_id} leave={l} onDecide={decide} />)
        )}
      </div>
    </div>
  );
}

// A thin dispatcher, no hooks of its own — avoids a wasted /leave fetch on
// the admin/head path, which renders an entirely different component.
export default function LeavePanel({ role }) {
  if (role === 'admin' || role === 'head') return <AdminLeaveManagement />;
  if (role === 'student' || role === 'faculty') return <PersonalLeavePanel role={role} />;
  return null;
}

function PersonalLeavePanel({ role }) {
  const [leaves, setLeaves] = useState(undefined);
  const [modalOpen, setModalOpen] = useState(false);

  const load = () => apiFetch('/leave').then(setLeaves).catch(() => setLeaves([]));
  useEffect(() => {
    load();
  }, []);

  const total = leaves?.length ?? 0;
  const rejected = leaves?.filter((l) => l.status === 'rejected').length ?? 0;

  return (
    <>
      <div className="metrics-grid" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 20 }}>
        <div className="metric-card">
          <div className="label">TOTAL APPLICATIONS</div>
          <div className="value">{total}</div>
        </div>
        <div className="metric-card">
          <div className="label">REJECTED</div>
          <div className="value">{rejected}</div>
          <div className="sub red">Not approved</div>
        </div>
      </div>
      <div className="stats-card">
        <div className="stats-card-header">
          <div>
            <h3>Leave Applications</h3>
            {role === 'student' && <p style={{ fontSize: 13, color: '#64748b' }}>Your submitted leave requests and their status</p>}
          </div>
          <button className="page-action-btn" onClick={() => setModalOpen(true)}>+ Apply for Leave</button>
        </div>
        <div className="stats-card-body">
          {leaves === undefined ? (
            <div style={{ textAlign: 'center', color: '#64748b', padding: 20 }}>Loading...</div>
          ) : role === 'faculty' ? (
            <LeaveTable leaves={leaves} />
          ) : leaves.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>No leave applications yet.</div>
          ) : (
            leaves.map((l) => <LeaveRow key={l.leave_id} leave={l} />)
          )}
        </div>
      </div>
      <LeaveApplyModal role={role} open={modalOpen} onClose={() => setModalOpen(false)} onSubmitted={load} />
    </>
  );
}
