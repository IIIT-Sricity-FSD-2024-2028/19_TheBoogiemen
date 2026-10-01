import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { KeyRound } from 'lucide-react';
import AuthLayout from '../auth/AuthLayout';
import ChangePasswordForm from './ChangePasswordForm';
import { profileUpdated } from '../auth/authSlice';

/**
 * Shown instead of the portal while the account still has the temporary
 * password it was created with (must_change_password from /auth/me). The
 * server clears the flag on a successful change.
 */
export default function ForcePasswordChange({ onSignOut }) {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  return (
    <AuthLayout
      title="Set your password"
      aside={
        <div>
          <h2>Welcome to {user?.college?.name || 'BarelyPassing'}.</h2>
          <p style={{ opacity: 0.85 }}>Your account was created with a temporary password. Choose your own password to continue.</p>
        </div>
      }
    >
      <div className="sp-eyebrow" style={{ marginBottom: 10 }}><KeyRound size={14} aria-hidden="true" /> First sign-in</div>
      <h1>Set your password</h1>
      <p className="sp-muted" style={{ marginTop: 0 }}>Signed in as {user?.email}. Enter the temporary password you were given, then a new one.</p>
      <ChangePasswordForm email={user?.email} submitLabel="Set password and continue" onChanged={() => dispatch(profileUpdated({ must_change_password: false }))} />
      <button type="button" className="sp-btn is-secondary" style={{ marginTop: 12 }} onClick={onSignOut}>Sign out</button>
    </AuthLayout>
  );
}
