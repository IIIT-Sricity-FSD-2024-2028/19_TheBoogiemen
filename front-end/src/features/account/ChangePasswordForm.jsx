import React, { useState } from 'react';
import { useMutation } from '../../hooks/useMutation';
import PasswordField, { PASSWORD_POLICY, POLICY_TEXT } from '../auth/PasswordField';

const EMPTY = { current_password: '', new_password: '', confirm_password: '' };

function validate(form) {
  const errors = {};
  if (!form.current_password) errors.current_password = 'Enter your current password.';
  if (!form.new_password) errors.new_password = 'Enter a new password.';
  else if (!PASSWORD_POLICY.test(form.new_password)) errors.new_password = POLICY_TEXT;
  else if (form.new_password === form.current_password) errors.new_password = 'New password must differ from the current one.';
  if (form.confirm_password !== form.new_password) errors.confirm_password = 'Passwords do not match.';
  return errors;
}

/**
 * POST /api/auth/change-password. The backend enforces the same policy; a
 * wrong current password comes back as 400 and is shown here. The hidden
 * username field lets password managers (iCloud Keychain / Touch ID) update
 * the saved entry for this account.
 */
export default function ChangePasswordForm({ email, onChanged, submitLabel = 'Update password' }) {
  const [form, setForm] = useState(EMPTY);
  const [submitted, setSubmitted] = useState(false);
  const [success, setSuccess] = useState(null);
  const [change, { loading, error, reset }] = useMutation();

  const errors = validate(form);
  const show = (field) => submitted && errors[field];
  const update = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setSuccess(null);
    reset();
  };

  const submit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length) return;
    const result = await change('post', '/auth/change-password', {
      current_password: form.current_password,
      new_password: form.new_password,
    }, { label: 'Changed password' });
    if (result.ok) {
      setForm(EMPTY);
      setSubmitted(false);
      setSuccess(result.data?.message || 'Password changed successfully.');
      onChanged?.();
    }
  };

  return (
    <form className="sp-form" onSubmit={submit} noValidate>
      <input type="email" name="username" autoComplete="username" value={email || ''} readOnly hidden />
      {error && <div className="sp-alert is-error" role="alert">{error.message}</div>}
      {success && <div className="sp-alert is-success" role="status">{success}</div>}
      <PasswordField id="cp-current" label="Current password" autoComplete="current-password"
        value={form.current_password} onChange={update('current_password')} error={show('current_password')} />
      <PasswordField id="cp-new" label="New password" autoComplete="new-password"
        value={form.new_password} onChange={update('new_password')} error={show('new_password')}
        hint={!show('new_password') ? POLICY_TEXT : null} />
      <PasswordField id="cp-confirm" label="Confirm new password" autoComplete="new-password"
        value={form.confirm_password} onChange={update('confirm_password')} error={show('confirm_password')} />
      <div className="sp-btn-row">
        <button type="submit" className="sp-btn" disabled={loading}>{loading ? 'Updating...' : submitLabel}</button>
      </div>
    </form>
  );
}
