/**
* Login — single, centered credentials form.
*
* Simplified from the legacy two-panel layout (role-picker sidebar + form).
* The server already returns the caller's role on successful login, and
* AuthContext maps role → dashboard via ROLE_HOME — so the role selector was
* purely decorative. Removed per the migration plan.
*
* Parity exceptions (per ground rule #3, logged not smuggled):
*   1. Password client-validation relaxed to non-empty only. Legacy enforced
*      the full policy regex client-side, which would lock out accounts whose
*      passwords were created via POST /users (MinLength(8) only, no policy
*      regex) — e.g. an admin-created `abcdefgh`. The server decides validity.
*   2. Already-authenticated users visiting /login are redirected to their
*      dashboard (legacy state.js did this; the React port didn't until now).
*   3. Demo credentials preserved as a localhost-only quick-fill row (Option B).
*/
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, ROLE_HOME } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationsContext';
import useBodyClass from '../hooks/useBodyClass';
import ForgotPasswordModal from '../components/shared/ForgotPasswordModal';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Dev-only demo credentials — kept for quick testing of all five roles.
// DELETE BEFORE THIS APP IS DEPLOYED ANYWHERE REAL.
const DEMO_LOGINS = {
  student: { email: 'student@example.com', password: 'Student@123' },
  faculty: { email: 'faculty@example.com', password: 'Faculty@123' },
  head: { email: 'head@example.com', password: 'Head@123' },
  superadmin: { email: 'super@example.com', password: 'Super@123' },
  spoc: { email: 'spoc@example.com', password: 'Spoc@123' },
};
const IS_LOCAL_DEV = ['localhost', '127.0.0.1', ''].includes(window.location.hostname);

export default function Login() {
  useBodyClass('login-body');
  const { user, login } = useAuth();
  const { showToast } = useNotifications();
  const navigate = useNavigate();

  const [email, setEmail] = useState(IS_LOCAL_DEV ? DEMO_LOGINS.student.email : '');
  const [password, setPassword] = useState(IS_LOCAL_DEV ? DEMO_LOGINS.student.password : '');
  const [submitting, setSubmitting] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  // Parity exception #2: redirect already-authenticated users away from /login.
  useEffect(() => {
    if (user) {
      navigate(ROLE_HOME[user.role] || '/student', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail) return showToast('Email is required', 'error');
    if (!EMAIL_RE.test(trimmedEmail)) return showToast('Please enter a valid email address', 'error');
    // Parity exception #1: non-empty only. The server decides whether the
    // credentials are valid; the legacy client-side policy regex would lock
    // out accounts created via POST /users (MinLength(8), no policy regex).
    if (!trimmedPassword) return showToast('Password is required', 'error');

    setSubmitting(true);
    try {
      const destination = await login(trimmedEmail, trimmedPassword);
      navigate(destination);
    } catch (err) {
      showToast(err.message || 'Login failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Link to="/" className="back-home-link">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Back to Home
      </Link>

      <div className="brand-header">
        <div className="logo">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
            <path d="M6 12v5c3 3 9 3 12 0v-5" />
          </svg>
        </div>
        <h1>BarelyPassing</h1>
      </div>

      <div className="brand-subtext">
        <p className="primary-sub">Academic Progress &amp; Outcome Tracking System</p>
        <p className="secondary-sub">Strategic outcome-based monitoring for educational institutions</p>
      </div>

      <div className="login-card">
        <div className="right-panel">
          <div className="form-header">
            <div className="form-icon">
              {/* Generic lock icon — no longer per-role (the legacy icon never
                  actually changed per role either; this is now intentionally static). */}
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div className="form-title">
              <h2>Welcome Back</h2>
              <p>Sign in to continue to your dashboard</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="input-group">
              <label className="label-premium">Email Address</label>
              <div className="input-icon-wrapper">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@institution.edu"
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <div className="label-row">
                <label className="label-premium">Password</label>
                <a href="#" className="forgot-link" onClick={(e) => { e.preventDefault(); setForgotOpen(true); }}>
                  Forgot password?
                </a>
              </div>
              <div className="input-icon-wrapper">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>

            <div className="checkbox-group">
              <input type="checkbox" id="remember" />
              <label htmlFor="remember">Remember me for 30 days</label>
            </div>

            <button type="submit" className="submit-btn" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          {IS_LOCAL_DEV && (
            <div style={{
              margin: '18px 0 0',
              padding: '10px 12px',
              border: '1px dashed #cbd5e1',
              borderRadius: 8,
              background: '#f8fafc',
            }}>
              <div style={{
                fontSize: 10,
                fontWeight: 700,
                color: '#94a3b8',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                marginBottom: 8,
                textAlign: 'center',
              }}>
                Dev quick-fill
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
                {Object.keys(DEMO_LOGINS).map((roleKey) => (
                  <button
                    key={roleKey}
                    type="button"
                    onClick={() => {
                      setEmail(DEMO_LOGINS[roleKey].email);
                      setPassword(DEMO_LOGINS[roleKey].password);
                    }}
                    style={{
                      padding: '5px 10px',
                      fontSize: 11,
                      fontWeight: 600,
                      border: '1px solid #e2e8f0',
                      borderRadius: 6,
                      background: '#fff',
                      cursor: 'pointer',
                      color: '#475569',
                    }}
                  >
                    {roleKey}
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="terms">By signing in, you agree to our Terms of Service and Privacy Policy</p>
        </div>
      </div>

      <div className="footer-contact">
        Need help? Contact <a href="mailto:barely.passing@iiits.in">barely.passing@iiits.in</a>
      </div>

      <ForgotPasswordModal open={forgotOpen} onClose={() => setForgotOpen(false)} />
    </>
  );
}