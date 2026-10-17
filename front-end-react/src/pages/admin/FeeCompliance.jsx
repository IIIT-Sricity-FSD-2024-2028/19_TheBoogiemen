/**
 * FeeCompliance — ported from legacy fixes.js renderFeeCompliance() +
 * payFee() + openAddFeeModal()/submitAddFee() + openBulkSemFeeModal()/
 * submitBulkSemFee() + openEditFeeModal()/submitEditFee() (super-user.html's
 * addFeeModal/bulkSemFeeModal/editFeeModal).
 */

import { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationsContext';
import Modal from '../../components/shared/Modal';

const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];
const FEE_TYPES = ['Tuition Fee', 'Exam Fee', 'Hostel Fee', 'Lab Fee', 'Library Fee', 'Bus Fee', 'Other'];

function AddFeeModal({ target, onClose, onAdded }) {
  const { user } = useAuth();
  const { showToast, send } = useNotifications();
  const [students, setStudents] = useState(null);
  const [studentId, setStudentId] = useState('');
  const [semester, setSemester] = useState('');
  const [feeType, setFeeType] = useState('');
  const [amount, setAmount] = useState('');
  const [due, setDue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!target) return;
    setStudentId(target.studentId || '');
    setSemester('');
    setFeeType('');
    setAmount('');
    setDue('');
    apiFetch('/admin/users')
      .then((users) => setStudents(users.filter((u) => u.role === 'student')))
      .catch(() => setStudents([]));
  }, [target]);

  const submit = async () => {
    let valid = true;
    if (!studentId) { showToast('Select a student', 'warning'); valid = false; }
    if (!semester) { showToast('Select semester', 'warning'); valid = false; }
    if (!feeType) { showToast('Fee type required', 'warning'); valid = false; }
    if (!amount) { showToast('Amount required', 'warning'); valid = false; }
    if (!due) { showToast('Due date required', 'warning'); valid = false; }
    if (!valid) return;
    if (Number(amount) < 1) return showToast('Amount must be at least 1', 'warning');

    setSubmitting(true);
    try {
      await apiFetch('/fees', { method: 'POST', body: JSON.stringify({ student_id: studentId, semester, fee_type: feeType, amount: Number(amount), due_date: due, status: 'pending' }) });
      const from = user?.first_name || 'Admin';
      send(studentId, from, `💳 New fee: ${feeType} ₹${amount} due ${due} (Sem ${semester}).`, 'fee');
      showToast('Fee added! Student notified. ✅', 'success');
      onClose();
      onAdded();
    } catch (e) {
      showToast('Failed: ' + e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={!!target} onClose={onClose} title="💳 Add Fee Record">
      <div className="modal-body">
        <div className="form-group">
          <label>Student <span style={{ color: '#ef4444' }}>*</span></label>
          <select value={studentId} onChange={(e) => setStudentId(e.target.value)}>
            <option value="">-- Select Student --</option>
            {students?.map((s) => (
              <option key={s.user_id} value={s.user_id}>{s.first_name || ''} {s.last_name || ''} ({s.user_id})</option>
            ))}
          </select>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Semester <span style={{ color: '#ef4444' }}>*</span></label>
            <select value={semester} onChange={(e) => setSemester(e.target.value)}>
              <option value="">-- Select Sem --</option>
              {SEMESTERS.map((n) => <option key={n} value={n}>Semester {n}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Fee Type <span style={{ color: '#ef4444' }}>*</span></label>
            <select value={feeType} onChange={(e) => setFeeType(e.target.value)}>
              <option value="">-- Type --</option>
              {FEE_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Amount (₹) <span style={{ color: '#ef4444' }}>*</span></label>
            <input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 45000" />
          </div>
          <div className="form-group">
            <label>Due Date <span style={{ color: '#ef4444' }}>*</span></label>
            <input type="date" min={today} value={due} onChange={(e) => setDue(e.target.value)} />
          </div>
        </div>
      </div>
      <div className="modal-footer">
        <button className="submit-btn" style={{ flex: 1 }} onClick={submit} disabled={submitting}>
          {submitting ? 'Adding…' : '➕ Add Fee & Notify Student'}
        </button>
        <button className="btn-cancel" onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  );
}

function BulkSemFeeModal({ open, onClose, onAdded }) {
  const { user } = useAuth();
  const { showToast, send } = useNotifications();
  const [semester, setSemester] = useState('');
  const [feeType, setFeeType] = useState('');
  const [amount, setAmount] = useState('');
  const [due, setDue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!open) return;
    setSemester('');
    setFeeType('');
    setAmount('');
    setDue('');
  }, [open]);

  const submit = async () => {
    let valid = true;
    if (!semester) { showToast('Select semester', 'warning'); valid = false; }
    if (!feeType) { showToast('Fee type required', 'warning'); valid = false; }
    if (!amount) { showToast('Amount required', 'warning'); valid = false; }
    if (!due) { showToast('Due date required', 'warning'); valid = false; }
    if (!valid || Number(amount) < 1) return;

    setSubmitting(true);
    try {
      const users = await apiFetch('/admin/users');
      const students = users.filter((u) => u.role === 'student');
      if (!students.length) {
        showToast('No students found', 'warning');
        return;
      }
      let created = 0;
      const from = user?.first_name || 'Admin';
      for (const s of students) {
        try {
          await apiFetch('/fees', { method: 'POST', body: JSON.stringify({ student_id: s.user_id, semester, fee_type: feeType, amount: Number(amount), due_date: due, status: 'pending' }) });
          send(s.user_id, from, `💳 Sem ${semester} fee: ${feeType} ₹${amount} due ${due}. Pay on time.`, 'fee');
          created++;
        } catch {
          // Keep going — one student's failure shouldn't stop the batch.
        }
      }
      showToast(`✅ Fees created for ${created} students! All notified.`, 'success');
      onClose();
      onAdded();
    } catch (e) {
      showToast('Failed: ' + e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="📅 Generate Semester Fees for All Students">
      <div className="modal-body">
        <div style={{ padding: '10px 12px', background: '#eff6ff', borderRadius: 8, fontSize: 13, color: '#1e40af', marginBottom: 14 }}>
          ℹ️ This will create one fee record for <strong>every student</strong> in the system and notify them all.
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Semester <span style={{ color: '#ef4444' }}>*</span></label>
            <select value={semester} onChange={(e) => setSemester(e.target.value)}>
              <option value="">-- Select Sem --</option>
              {SEMESTERS.map((n) => <option key={n} value={n}>Semester {n}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Fee Type <span style={{ color: '#ef4444' }}>*</span></label>
            <select value={feeType} onChange={(e) => setFeeType(e.target.value)}>
              <option value="">-- Type --</option>
              {FEE_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Amount per Student (₹) <span style={{ color: '#ef4444' }}>*</span></label>
            <input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 45000" />
          </div>
          <div className="form-group">
            <label>Due Date <span style={{ color: '#ef4444' }}>*</span></label>
            <input type="date" min={today} value={due} onChange={(e) => setDue(e.target.value)} />
          </div>
        </div>
      </div>
      <div className="modal-footer">
        <button className="submit-btn" style={{ flex: 1 }} onClick={submit} disabled={submitting}>
          {submitting ? 'Generating…' : '📢 Generate & Notify All Students'}
        </button>
        <button className="btn-cancel" onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  );
}

function EditFeeModal({ fee, onClose, onSaved }) {
  const { user } = useAuth();
  const { showToast, send } = useNotifications();
  const [feeType, setFeeType] = useState('');
  const [semester, setSemester] = useState('');
  const [amount, setAmount] = useState('');
  const [due, setDue] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!fee) return;
    setFeeType(fee.fee_type || fee.type || '');
    setSemester(fee.semester || '');
    setAmount(fee.amount || '');
    setDue(fee.due_date || '');
  }, [fee]);

  const submit = async () => {
    if (!feeType || !amount || !due) return showToast('All fields required', 'warning');
    if (Number(amount) < 1) return showToast('Amount must be at least 1', 'warning');
    setSubmitting(true);
    try {
      await apiFetch(`/fees/${fee.fee_id}`, { method: 'PUT', body: JSON.stringify({ fee_type: feeType, amount: Number(amount), due_date: due, semester, status: 'pending' }) });
      const from = user?.first_name || 'Admin';
      if (fee.studentId) send(fee.studentId, from, `💳 Fee updated: ${feeType} ₹${amount} due ${due} (Sem ${semester || 'N/A'}).`, 'fee');
      showToast('Fee updated! Student notified. ✅', 'success');
      onClose();
      onSaved();
    } catch (e) {
      showToast('Failed: ' + e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={!!fee} onClose={onClose} title="✏ Edit Fee Record">
      <div className="modal-body">
        <div className="form-row">
          <div className="form-group">
            <label>Fee Type <span style={{ color: '#ef4444' }}>*</span></label>
            <input type="text" value={feeType} onChange={(e) => setFeeType(e.target.value)} placeholder="e.g. Tuition Fee" />
          </div>
          <div className="form-group">
            <label>Semester</label>
            <select value={semester} onChange={(e) => setSemester(e.target.value)}>
              <option value="">-- Select Sem --</option>
              {SEMESTERS.map((n) => <option key={n} value={n}>Semester {n}</option>)}
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Amount (₹) <span style={{ color: '#ef4444' }}>*</span></label>
            <input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Due Date <span style={{ color: '#ef4444' }}>*</span></label>
            <input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </div>
        </div>
      </div>
      <div className="modal-footer">
        <button className="submit-btn" style={{ flex: 1 }} onClick={submit} disabled={submitting}>
          {submitting ? 'Saving…' : '💾 Save & Notify Student'}
        </button>
        <button className="btn-cancel" onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  );
}

function StudentFeeGroup({ studentId, fees, student, onPay, onAddFee, onEditFee }) {
  const totalAmt = fees.reduce((s, f) => s + Number(f.amount || 0), 0);
  const paidAmt = fees.filter((f) => f.status === 'paid').reduce((s, f) => s + Number(f.amount || 0), 0);
  const overdue = fees.filter((f) => f.status === 'overdue').length;
  const pending = fees.filter((f) => f.status === 'pending').length;
  const pct = totalAmt > 0 ? Math.round((paidAmt / totalAmt) * 100) : 0;
  const barColor = pct >= 100 ? '#16a34a' : pct >= 50 ? '#6366f1' : '#f59e0b';
  const STATUS = { paid: { bg: '#dcfce7', c: '#166534', lbl: 'Paid ✓' }, overdue: { bg: '#fef2f2', c: '#dc2626', lbl: 'Overdue ⚠' }, pending: { bg: '#fef9c3', c: '#92400e', lbl: 'Pending' } };

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 14, marginBottom: 18, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.05)' }}>
      <div style={{ padding: '14px 18px', background: 'linear-gradient(135deg,#f8fafc,#eff6ff)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>🎓 {student.name}</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>ID: {studentId}{student.email ? ' · ' + student.email : ''}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {overdue > 0 && <span style={{ padding: '3px 10px', background: '#fef2f2', color: '#dc2626', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>⚠ {overdue} Overdue</span>}
          {pending > 0 && <span style={{ padding: '3px 10px', background: '#fef9c3', color: '#92400e', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>⏳ {pending} Pending</span>}
          <span style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>₹{paidAmt.toLocaleString()} / ₹{totalAmt.toLocaleString()}</span>
        </div>
      </div>
      <div style={{ padding: '10px 18px', background: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ flex: 1, height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: barColor, width: `${pct}%` }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>{pct}% paid</span>
        </div>
        {fees.map((f) => {
          const sc = STATUS[f.status] || STATUS.pending;
          return (
            <div key={f.fee_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f8fafc', flexWrap: 'wrap', gap: 6 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{f.fee_type || f.type || ''}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>Due: {f.due_date} · Sem: {f.semester || 'N/A'}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>₹{Number(f.amount || 0).toLocaleString()}</span>
                <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.c }}>{sc.lbl}</span>
                {f.status !== 'paid' && (
                  <button onClick={() => onPay(f, studentId)} style={{ padding: '6px 14px', fontSize: 12, fontWeight: 700, background: '#0f172a', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                    Mark Paid
                  </button>
                )}
                <button onClick={() => onEditFee({ ...f, studentId })} style={{ padding: '6px 10px', fontSize: 12, background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer' }}>
                  Edit
                </button>
              </div>
            </div>
          );
        })}
        <div style={{ paddingTop: 10 }}>
          <button onClick={() => onAddFee(studentId)} style={{ fontSize: 12, color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
            + Add fee for this student
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FeeCompliance() {
  const { showToast, send } = useNotifications();
  const { user } = useAuth();
  const [fees, setFees] = useState(undefined);
  const [summary, setSummary] = useState({ overdue: 0, compliance_rate: '0%' });
  const [students, setStudents] = useState({});
  const [addTarget, setAddTarget] = useState(null); // { studentId } | null
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const load = () => {
    Promise.all([apiFetch('/fees'), apiFetch('/admin/users').catch(() => [])]).then(([data, allUsers]) => {
      setSummary(data.summary || { overdue: 0, compliance_rate: '0%' });
      const map = {};
      allUsers.filter((u) => u.role === 'student').forEach((u) => {
        map[u.user_id] = { name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username, email: u.email };
      });
      setStudents(map);
      setFees(data.fees || []);
    }).catch(() => setFees([]));
  };
  useEffect(load, []);

  const pay = async (fee, studentId) => {
    try {
      await apiFetch(`/fees/${fee.fee_id}/pay`, { method: 'PATCH' });
      showToast('Fee marked as paid!', 'success');
      const from = user?.first_name || 'Admin';
      send(studentId, from, `💳 Your ${fee.fee_type || 'fee'} ₹${fee.amount || ''} marked PAID by ${from}. No further action needed.`, 'fee');
      load();
    } catch {
      showToast('Failed', 'error');
    }
  };

  const byStudent = {};
  (fees || []).forEach((f) => {
    (byStudent[f.student_id] ||= []).push(f);
  });

  return (
    <div className="stats-card">
      <div className="stats-card-header"><h3>Fee Status Tracking</h3></div>
      <div className="stats-card-body" style={{ padding: 24 }}>
        <div className="metrics-grid" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 20 }}>
          <div className="metric-card">
            <div className="label">OVERDUE ACCOUNTS</div>
            <div className="value">{summary.overdue || 0}</div>
          </div>
          <div className="metric-card">
            <div className="label">COMPLIANCE RATE</div>
            <div className="value">{summary.compliance_rate || '0%'}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
          <button onClick={() => setAddTarget({})} style={{ padding: '9px 18px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
            + Add Fee Record
          </button>
          <button onClick={() => setBulkOpen(true)} style={{ padding: '9px 18px', background: 'linear-gradient(135deg,#0ea5e9,#0284c7)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
            📅 New Semester Fees
          </button>
          <button onClick={load} style={{ padding: '9px 14px', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
            ↻ Refresh
          </button>
        </div>

        {fees === undefined ? null : fees.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: 40 }}>💳</div>
            <div style={{ fontWeight: 600, marginTop: 8 }}>No fee records</div>
            <p style={{ fontSize: 13, color: '#94a3b8' }}>Use buttons above to add fees.</p>
          </div>
        ) : (
          Object.entries(byStudent).map(([sid, sfees]) => (
            <StudentFeeGroup
              key={sid}
              studentId={sid}
              fees={sfees}
              student={students[sid] || { name: 'Student ' + sid, email: '' }}
              onPay={pay}
              onAddFee={(studentId) => setAddTarget({ studentId })}
              onEditFee={setEditTarget}
            />
          ))
        )}
      </div>
      <AddFeeModal target={addTarget} onClose={() => setAddTarget(null)} onAdded={load} />
      <BulkSemFeeModal open={bulkOpen} onClose={() => setBulkOpen(false)} onAdded={load} />
      <EditFeeModal fee={editTarget} onClose={() => setEditTarget(null)} onSaved={load} />
    </div>
  );
}
