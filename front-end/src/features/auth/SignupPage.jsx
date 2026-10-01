import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '../../hooks/useMutation';
import AuthLayout from './AuthLayout';
import PasswordField, { PASSWORD_POLICY, POLICY_TEXT } from './PasswordField';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMPTY = { first_name: '', last_name: '', email: '', branch: '', batch: '', section: '', password: '', confirm: '' };

function validate(f) {
  const e = {};
  if (!f.first_name.trim()) e.first_name = 'Enter your first name.';
  if (!f.email.trim()) e.email = 'Enter your email address.';
  else if (!EMAIL.test(f.email.trim())) e.email = 'Enter a valid email address.';
  if (f.batch && !/^\d{4}-\d{4}$/.test(f.batch.trim())) e.batch = 'Use the format 2024-2028.';
  if (!f.password) e.password = 'Choose a password.';
  else if (!PASSWORD_POLICY.test(f.password)) e.password = POLICY_TEXT;
  if (f.confirm !== f.password) e.confirm = 'Passwords do not match.';
  return e;
}

/**
 * Student self-registration (POST /api/auth/signup). Faculty and staff
 * accounts are created by the institute, as the backend enforces.
 */
export default function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [submitted, setSubmitted] = useState(false);
  const [signup, { loading, error }] = useMutation();

  const errors = validate(form);
  const show = (k) => submitted && errors[k];
  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length) return;
    const body = {
      role: 'student',
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim(),
      password: form.password,
    };
    ['branch', 'batch', 'section'].forEach((k) => {
      if (form[k].trim()) body[k] = form[k].trim();
    });
    const result = await signup('post', '/auth/signup', body, { label: 'Created account' });
    if (result.ok) navigate('/login?registered=1', { replace: true });
  };

  const field = (id, label, key, props = {}) => (
    <div className="sp-field">
      <label htmlFor={id}>{label}</label>
      <input id={id} name={key} className="sp-input" value={form[key]} onChange={update(key)}
        aria-invalid={!!show(key)} aria-describedby={show(key) ? `${id}-error` : undefined} {...props} />
      {show(key) && <p id={`${id}-error`} className="sp-field-error">{errors[key]}</p>}
    </div>
  );

  return (
    <AuthLayout title="Create student account">
      <h1>Create a student account</h1>
      <p className="sp-muted" style={{ marginTop: 0 }}>Faculty and staff accounts are created by your institute.</p>
      {error && <div className="sp-alert is-error" role="alert" style={{ marginBottom: 14 }}>{error.message}</div>}
      <form className="sp-form" onSubmit={submit} noValidate>
        <div className="sp-form-row">
          {field('su-first', 'First name', 'first_name', { autoComplete: 'given-name', autoFocus: true })}
          {field('su-last', 'Last name', 'last_name', { autoComplete: 'family-name' })}
        </div>
        {field('su-email', 'Email', 'email', { type: 'email', autoComplete: 'username', inputMode: 'email' })}
        <div className="sp-form-row">
          {field('su-branch', 'Branch (optional)', 'branch', { placeholder: 'CSE' })}
          {field('su-batch', 'Batch (optional)', 'batch', { placeholder: '2024-2028' })}
          {field('su-section', 'Section (optional)', 'section', { placeholder: 'A', maxLength: 3 })}
        </div>
        <PasswordField id="su-password" name="new-password" label="Password" autoComplete="new-password"
          value={form.password} onChange={update('password')} error={show('password')} hint={POLICY_TEXT} />
        <PasswordField id="su-confirm" name="confirm-password" label="Confirm password" autoComplete="new-password"
          value={form.confirm} onChange={update('confirm')} error={show('confirm')} />
        <button type="submit" className="sp-btn is-block" disabled={loading}>{loading ? 'Creating account...' : 'Create account'}</button>
      </form>
      <p className="sp-muted" style={{ fontSize: 13 }}>Already have an account? <Link to="/login">Sign in</Link></p>
    </AuthLayout>
  );
}
