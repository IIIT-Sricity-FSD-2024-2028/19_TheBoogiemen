import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation } from '../../hooks/useMutation';
import AuthLayout from './AuthLayout';
import PasswordField, { PASSWORD_POLICY, POLICY_TEXT } from './PasswordField';

/** POST /api/auth/reset-password with the single-use token from the link. */
export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [submitted, setSubmitted] = useState(false);
  const [reset, { loading, error }] = useMutation();

  const errors = {
    password: !form.password ? 'Choose a new password.' : !PASSWORD_POLICY.test(form.password) ? POLICY_TEXT : null,
    confirm: form.confirm !== form.password ? 'Passwords do not match.' : null,
  };

  const submit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    if (errors.password || errors.confirm) return;
    const res = await reset('post', '/auth/reset-password', { token, new_password: form.password });
    if (res.ok) navigate('/login?reset=1', { replace: true });
  };

  if (!token) {
    return (
      <AuthLayout title="Reset password">
        <h1>Reset link missing</h1>
        <div className="sp-alert is-error" role="alert" style={{ marginBottom: 14 }}>This page needs the link from your password reset request.</div>
        <Link to="/forgot-password">Request a new link</Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Set a new password">
      <h1>Set a new password</h1>
      {error && (
        <div className="sp-alert is-error" role="alert" style={{ marginBottom: 14 }}>
          {error.message} {error.status === 400 && <Link to="/forgot-password">Request a new link</Link>}
        </div>
      )}
      <form className="sp-form" onSubmit={submit} noValidate>
        <PasswordField id="rp-new" name="new-password" label="New password" autoComplete="new-password" autoFocus
          value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
          error={submitted ? errors.password : null} hint={POLICY_TEXT} />
        <PasswordField id="rp-confirm" name="confirm-password" label="Confirm new password" autoComplete="new-password"
          value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })}
          error={submitted ? errors.confirm : null} />
        <button type="submit" className="sp-btn is-block" disabled={loading}>{loading ? 'Saving...' : 'Set password'}</button>
      </form>
    </AuthLayout>
  );
}
