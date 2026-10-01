import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '../../hooks/useMutation';
import AuthLayout from './AuthLayout';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/auth/forgot-password. The response is the same whether or not the
 * email has an account. This project has no mail server, so in development the
 * backend returns the reset link (dev_reset_url) and it is shown here, clearly
 * labelled; in production it would only be emailed.
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [request, { loading, error }] = useMutation();

  const emailError = !email.trim() ? 'Enter your email address.' : !EMAIL.test(email.trim()) ? 'Enter a valid email address.' : null;

  const submit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    if (emailError) return;
    const res = await request('post', '/auth/forgot-password', { email: email.trim() });
    if (res.ok) setResult(res.data);
  };

  return (
    <AuthLayout title="Reset password">
      <h1>Reset your password</h1>
      {result ? (
        <>
          <div className="sp-alert is-success" role="status" style={{ marginBottom: 14 }}>{result.message}</div>
          {result.dev_reset_url && (
            <div className="sp-alert is-info" style={{ display: 'block', marginBottom: 14 }}>
              <strong>Development mode:</strong> no email server is configured, so the link is shown here instead of being emailed.
              <div style={{ marginTop: 8 }}><Link to={result.dev_reset_url}>Open the reset link</Link></div>
            </div>
          )}
          <Link to="/login">Back to sign in</Link>
        </>
      ) : (
        <>
          <p className="sp-muted" style={{ marginTop: 0 }}>Enter your account email and we will issue a link to set a new password. The link works once and expires in 15 minutes.</p>
          {error && <div className="sp-alert is-error" role="alert" style={{ marginBottom: 14 }}>{error.message}</div>}
          <form className="sp-form" onSubmit={submit} noValidate>
            <div className="sp-field">
              <label htmlFor="fp-email">Email</label>
              <input id="fp-email" name="username" type="email" autoComplete="username" autoFocus className="sp-input"
                value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={submitted && !!emailError} />
              {submitted && emailError && <p className="sp-field-error">{emailError}</p>}
            </div>
            <button type="submit" className="sp-btn is-block" disabled={loading}>{loading ? 'Sending...' : 'Send reset link'}</button>
          </form>
          <p style={{ fontSize: 13 }}><Link to="/login">Back to sign in</Link></p>
        </>
      )}
    </AuthLayout>
  );
}
