import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { clearEndReason, clearLoginError, loginThunk, selectAuth } from './authSlice';
import { homeForRole, portalForRole } from '../../app/roleRoutes';
import AuthLayout from './AuthLayout';
import PasswordField from './PasswordField';
import RolePicker from './RolePicker';
import { ALL_PORTALS, portalByKey } from './roles';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Only follow ?next= to a path inside the portal this role may use. */
function safeNext(next, role) {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return null;
  const portal = portalForRole(role);
  return portal && (next === portal.path || next.startsWith(`${portal.path}/`)) ? next : null;
}

/**
 * Sign-in for every role. The backend decides the role from the account, so
 * there is no role picker. The form is a plain <form> with name/autocomplete
 * attributes so the browser's password manager (iCloud Keychain with Touch ID
 * on a Mac) can offer, fill and save credentials. Nothing is pre-filled.
 */
export default function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { status, user, loginStatus, loginError, endReason } = useSelector(selectAuth);
  // Preselect from ?role=, or from the portal the user was trying to open (?next=/faculty/...).
  const nextPortal = (params.get('next') || '').split('/')[1];
  const initialPortal = [params.get('role'), nextPortal].find((k) => ALL_PORTALS.some((p) => p.key === k)) || 'student';
  const [portal, setPortal] = useState(initialPortal);
  const [form, setForm] = useState({ email: '', password: '' });
  const selected = portalByKey(portal);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => () => {
    dispatch(clearLoginError());
  }, [dispatch]);

  if (status === 'authenticated' && user) {
    return <Navigate to={safeNext(params.get('next'), user.role) || homeForRole(user.role)} replace />;
  }

  const errors = {
    email: !form.email.trim() ? 'Enter your email address.' : !EMAIL.test(form.email.trim()) ? 'Enter a valid email address.' : null,
    password: !form.password ? 'Enter your password.' : null,
  };

  const update = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (loginError) dispatch(clearLoginError());
  };

  const submit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    if (errors.email || errors.password) return;
    dispatch(clearEndReason());
    const result = await dispatch(loginThunk({ ...form, portal }));
    if (loginThunk.fulfilled.match(result)) {
      const role = result.payload.user.role;
      navigate(safeNext(params.get('next'), role) || homeForRole(role), { replace: true });
    }
  };

  return (
    <AuthLayout
      title={`${selected.label} sign in`}
      aside={<RolePicker value={portal} onChange={(key) => { setPortal(key); dispatch(clearLoginError()); }} />}
    >
      <RolePicker variant="chips" value={portal} onChange={(key) => { setPortal(key); dispatch(clearLoginError()); }} />
      <div className="sp-eyebrow" style={{ marginBottom: 10 }}>{selected.label} portal</div>
      <h1>Sign in</h1>
      <p className="sp-muted" style={{ marginTop: 0 }}>{selected.description}. Use the email and password issued by your institute.</p>

      {endReason === 'expired' && <div className="sp-alert is-warning" role="status" style={{ marginBottom: 14 }}>Your session expired. Please sign in again.</div>}
      {endReason === 'signed-out' && <div className="sp-alert is-info" role="status" style={{ marginBottom: 14 }}>You have been signed out.</div>}
      {params.get('reset') === '1' && <div className="sp-alert is-success" role="status" style={{ marginBottom: 14 }}>Password updated. Sign in with your new password.</div>}
      {params.get('registered') === '1' && <div className="sp-alert is-success" role="status" style={{ marginBottom: 14 }}>Account created. You can sign in now.</div>}
      {loginError && <div className="sp-alert is-error" role="alert" style={{ marginBottom: 14 }}>{loginError}</div>}

      <form className="sp-form" onSubmit={submit} noValidate method="post" action="/login">
        <div className="sp-field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="username"
            type="email"
            inputMode="email"
            autoComplete="username"
            autoFocus
            className="sp-input"
            value={form.email}
            onChange={update('email')}
            aria-invalid={submitted && !!errors.email}
            aria-describedby={submitted && errors.email ? 'email-error' : undefined}
          />
          {submitted && errors.email && <p id="email-error" className="sp-field-error">{errors.email}</p>}
        </div>
        <PasswordField
          id="password"
          name="password"
          label="Password"
          autoComplete="current-password"
          value={form.password}
          onChange={update('password')}
          error={submitted ? errors.password : null}
        />
        <div className="sp-auth-links">
          <Link to="/forgot-password">Forgot password?</Link>
        </div>
        <button type="submit" className="sp-btn is-block" disabled={loginStatus === 'loading'}>
          {loginStatus === 'loading' ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      <div className="sp-menu-sep" style={{ margin: '20px 0' }} />
      <p className="sp-muted" style={{ margin: 0, fontSize: 13 }}>
        New student? <Link to="/signup">Create an account</Link>
        <br />
        Registering an institute? <Link to="/onboarding">Onboard your institute</Link>
      </p>
    </AuthLayout>
  );
}
