/**
 * UserManagement — ported from legacy fixes.js renderUsersTable() +
 * submitAddUser() + openEditUser()/submitEditUser() + deleteUser()
 * (super-user.html's addUserModal/editUserModal).
 */

import { useEffect, useState } from 'react';
import { apiFetch } from '../../api/client';
import { useNotifications } from '../../context/NotificationsContext';
import Modal from '../../components/shared/Modal';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function AddUserModal({ open, onClose, onCreated }) {
  const { showToast, send } = useNotifications();
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFirstName('');
    setEmail('');
    setPassword('');
    setRole('');
  }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    if (!firstName.trim()) return showToast('First name is required', 'warning');
    if (!EMAIL_RE.test(email.trim())) return showToast('Enter a valid email address', 'warning');
    if (!password || password.length < 8) return showToast('Password must be at least 8 characters', 'warning');
    if (!role) return showToast('Please select a role', 'warning');

    setSubmitting(true);
    try {
      await apiFetch('/users', { method: 'POST', body: JSON.stringify({ first_name: firstName.trim(), email: email.trim(), password, role }) });
      showToast('User created! They can now log in.', 'success');
      onClose();
      onCreated();
      // Welcome notification, sent once we can look up the new user's id.
      setTimeout(async () => {
        try {
          const users = await apiFetch('/admin/users');
          const nu = users.find((u) => u.email === email.trim());
          if (nu) send(nu.user_id, 'Admin', `👋 Welcome to BarelyPassing! Your account (${role}) is ready.`, 'info');
        } catch {
          // Best-effort — the account is already created either way.
        }
      }, 500);
    } catch (e2) {
      showToast('Failed: ' + e2.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add New User">
      <form onSubmit={submit}>
        <div className="modal-body">
          <div className="form-group">
            <label>First Name</label>
            <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 6 characters" />
          </div>
          <div className="form-group">
            <label>Role</label>
            <select required value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="">Select role</option>
              <option value="student">Student</option>
              <option value="faculty">Faculty</option>
            </select>
          </div>
        </div>
        <div className="modal-footer">
          <button type="submit" className="submit-btn" style={{ flex: 1 }} disabled={submitting}>
            {submitting ? 'Creating…' : 'Create User'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function EditUserModal({ user, onClose, onSaved }) {
  const { showToast } = useNotifications();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('student');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    setUsername(user.username);
    setEmail(user.email);
    setRole(user.role);
  }, [user]);

  const submit = async () => {
    setSubmitting(true);
    try {
      // Profile fields and role are separate calls — the server rejects a
      // `role` key on the profile route so a routine edit can never carry a
      // privilege change, and the role endpoint applies its own ceiling.
      await apiFetch(`/users/${user.user_id}`, { method: 'PUT', body: JSON.stringify({ username, email }) });
      if (role && role !== user.role) {
        await apiFetch(`/users/${user.user_id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) });
      }
      showToast('User updated!', 'success');
      onClose();
      onSaved();
    } catch (e) {
      showToast('Failed: ' + e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={!!user} onClose={onClose} title="Edit User">
      <div className="modal-body">
        <div className="form-group">
          <label>Username</label>
          <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Full name" />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" />
        </div>
        <div className="form-group">
          <label>Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="student">Student</option>
            <option value="faculty">Faculty</option>
          </select>
        </div>
      </div>
      <div className="modal-footer">
        <button className="submit-btn" style={{ flex: 1 }} onClick={submit} disabled={submitting}>
          {submitting ? 'Saving…' : 'Save Changes'}
        </button>
        <button className="btn-cancel" onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  );
}

export default function UserManagement() {
  const { showToast } = useNotifications();
  const [users, setUsers] = useState(undefined);
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const load = () => apiFetch('/admin/users').then(setUsers).catch(() => setUsers([]));
  useEffect(() => {
    load();
  }, []);

  const remove = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await apiFetch(`/users/${id}`, { method: 'DELETE' });
      showToast('User deleted!', 'success');
      load();
    } catch (e) {
      showToast('Failed: ' + e.message, 'error');
    }
  };

  return (
    <div className="stats-card">
      <div className="stats-card-header">
        <div>
          <h3>System User Management</h3>
          <p>Manage all institutional users.</p>
        </div>
        <button className="page-action-btn" onClick={() => setAddOpen(true)}>+ Add User</button>
      </div>
      <div className="stats-card-body">
        {users === undefined ? (
          <div style={{ textAlign: 'center', color: '#64748b', padding: 20 }}>Loading...</div>
        ) : (
          <table className="crud-table">
            <thead>
              <tr><th>Username</th><th>Email</th><th>Role</th><th style={{ textAlign: 'right' }}>Actions</th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.user_id}>
                  <td>{u.username}</td>
                  <td>{u.email}</td>
                  <td><span style={{ fontSize: 11, padding: '3px 8px', background: '#e2e8f0', borderRadius: 4, textTransform: 'uppercase' }}>{u.role}</span></td>
                  <td style={{ textAlign: 'right' }}>
                    <button onClick={() => setEditTarget(u)} style={{ padding: '4px 8px', marginRight: 4, background: '#e2e8f0', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Edit</button>
                    <button onClick={() => remove(u.user_id)} style={{ padding: '4px 8px', background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <AddUserModal open={addOpen} onClose={() => setAddOpen(false)} onCreated={load} />
      <EditUserModal user={editTarget} onClose={() => setEditTarget(null)} onSaved={load} />
    </div>
  );
}
