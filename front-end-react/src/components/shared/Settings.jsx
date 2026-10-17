/**
 * Settings — ported from legacy fixes.js renderSettings()/changePassword().
 * One component, reused by every dashboard (student today; faculty/admin/
 * spoc/superadmin reuse it unchanged in later phases) — it reads the
 * signed-in user from AuthContext instead of a different copy per page.
 */

import { useState } from 'react';
import { apiFetch } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationsContext';

const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export default function Settings() {
  const { user } = useAuth();
  const { showToast } = useNotifications();
  const [current, setCurrent] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirm, setConfirm] = useState('');

  if (!user) return null;

  const changePassword = async () => {
    if (!current || !newPass) return showToast('Fill in your current and new password', 'warning');
    if (newPass !== confirm) return showToast('New passwords do not match', 'warning');
    if (newPass === current) return showToast('New password must be different from your current one', 'warning');
    if (!PASSWORD_RE.test(newPass)) {
      return showToast('Password needs 8+ characters with an uppercase, lowercase, number and special character', 'warning');
    }
    try {
      await apiFetch('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ current_password: current, new_password: newPass }),
      });
      showToast('Password updated! Use it the next time you sign in.', 'success');
      setCurrent('');
      setNewPass('');
      setConfirm('');
    } catch (e) {
      // A wrong current password returns 400, so it surfaces here as a
      // message instead of being swallowed by the global 401 handler.
      showToast(e.message || 'Failed to change password', 'error');
    }
  };

  return (
    <div className="stats-card">
      <div className="stats-card-header">
        <h3>Account Settings</h3>
      </div>
      <div className="stats-card-body" style={{ padding: 24 }}>
        <div style={{ marginBottom: 24, padding: 20, background: '#f8fafc', borderRadius: 8 }}>
          <h4 style={{ margin: '0 0 12px', fontSize: 14, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>Profile</h4>
          <p style={{ margin: '4px 0' }}><strong>Name:</strong> {user.first_name || ''} {user.last_name || user.username}</p>
          <p style={{ margin: '4px 0' }}><strong>Email:</strong> {user.email}</p>
          <p style={{ margin: '4px 0' }}><strong>Role:</strong> {user.role}</p>
          <p style={{ margin: '4px 0' }}><strong>ID:</strong> {user.user_id}</p>
        </div>
        <div style={{ padding: 20, background: '#f8fafc', borderRadius: 8 }}>
          <h4 style={{ margin: '0 0 16px', fontSize: 14, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>Change Password</h4>
          <input
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            placeholder="Current password"
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, marginBottom: 10, boxSizing: 'border-box', fontSize: 14 }}
          />
          <input
            type="password"
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
            placeholder="New password"
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, marginBottom: 6, boxSizing: 'border-box', fontSize: 14 }}
          />
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm new password"
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 6, marginBottom: 8, boxSizing: 'border-box', fontSize: 14 }}
          />
          <p style={{ margin: '0 0 14px', fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>
            Must be at least 8 characters and include an uppercase letter, a lowercase letter, a number and a
            special character (@$!%*?&amp;) — the same rule the sign-in page enforces.
          </p>
          <button
            onClick={changePassword}
            style={{ width: '100%', padding: 12, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
          >
            Update Password
          </button>
        </div>
      </div>
    </div>
  );
}
