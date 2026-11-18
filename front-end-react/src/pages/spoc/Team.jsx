/**
* Team — ported from spoc.html's team-view + the admin-roster half of
* loadSubscriptionAndAdmins() + the hireAdminModal/submitHireAdmin flow.
*
* `role` is never sent to the server — the legacy comment on this exact
* call explains why: the backend stamps 'admin' + this SPOC's own
* college_id itself (ROLE_GRANTS in common/dto/user.dto.ts), so a form
* field here would be decoration.
*
* Redux migration (Dev 5): myCollegeSlice (shared with Subscription.jsx)
* for the admin roster; hiring reuses usersThunks.createUser, the same
* POST /users admin/UserManagement.jsx's AddUserModal already uses.
*/
import { useEffect, useState } from 'react';
import { useNotifications } from '../../features/notifications/useNotifications';
import Modal from '../../components/shared/Modal';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchMyCollege } from '../../features/myCollege/myCollegeThunks';
import { createUser } from '../../features/users/usersThunks';

function HireAdminModal({ open, onClose, onHired }) {
  const dispatch = useAppDispatch();
  const { showToast } = useNotifications();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFirstName('');
    setLastName('');
    setEmail('');
    setPassword('');
  }, [open]);

  const submit = async (e) => {
    e.preventDefault();

    // Client-side validation: catch short passwords before they hit the
    // backend's @MinLength(8) constraint, which would return a 400 that
    // the catch block below surfaces as a generic error toast.
    if (password.length < 8) {
      showToast('Password must be at least 8 characters', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      await dispatch(createUser({ role: 'admin', first_name: firstName.trim(), last_name: lastName.trim(), email: email.trim(), password })).unwrap();
      onClose();
      onHired();
    } catch (e2) {
      showToast('Could not add admin: ' + e2.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Hire an Admin">
      <form onSubmit={submit}>
        <div className="modal-body">
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 16 }}>
            They'll be able to manage faculty and students for your college — the same role that runs day-to-day academic operations today.
          </p>
          <div className="form-row">
            <div className="form-group">
              <label>First Name</label>
              <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Last Name</label>
              <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label>Email <span style={{ color: '#ef4444' }}>*</span></label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@yourcollege.edu" />
          </div>
          <div className="form-group">
            <label>Initial Password <span style={{ color: '#ef4444' }}>*</span></label>
            <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 8 characters" />
          </div>
        </div>
        <div className="modal-footer">
          <button type="submit" className="submit-btn" style={{ flex: 1 }} disabled={submitting}>
            {submitting ? 'Adding…' : '+ Add Admin'}
          </button>
          <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}

export default function Team() {
  const dispatch = useAppDispatch();
  const college = useAppSelector((state) => state.myCollege.data);
  const [hireOpen, setHireOpen] = useState(false);
  const admins = college === undefined ? undefined : college?.admins || [];

  const load = () => dispatch(fetchMyCollege());

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="stats-card">
      <div className="stats-card-header">
        <div>
          <h3>Admins</h3>
          <p>Accounts you've provisioned — they in turn manage faculty and students</p>
        </div>
        <button className="page-action-btn" onClick={() => setHireOpen(true)}>+ Hire Admin</button>
      </div>
      <div className="stats-card-body" style={{ padding: '6px 20px' }}>
        {admins === undefined ? null : admins.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '24px 12px' }}>
            No admins hired yet. Click "+ Hire Admin" to add your first one.
          </p>
        ) : (
          admins.map((a) => {
            const name = `${a.first_name || ''} ${a.last_name || ''}`.trim() || a.username || 'Admin';
            return (
              <div key={a.user_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 4px', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--accent-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                  {(name.charAt(0) || 'A').toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>{name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{a.email}</div>
                </div>
              </div>
            );
          })
        )}
      </div>
      <HireAdminModal open={hireOpen} onClose={() => setHireOpen(false)} onHired={load} />
    </div>
  );
}
