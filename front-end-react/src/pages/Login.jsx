/**
 * Login — ported from legacy front-end/login.html + script.js
 * (handleLogin/selectRole/fillDemoCredentials).
 *
 * One known, deliberately-unfixed quirk carried over from the legacy page:
 * the form header's icon never actually changes per selected role in the
 * original either (only the title/subtitle/placeholders do) — ground rule
 * #3 in the migration plan says log quirks like this rather than quietly
 * "fixing" them during a structural port.
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationsContext';
import useBodyClass from '../hooks/useBodyClass';
import ForgotPasswordModal from '../components/shared/ForgotPasswordModal';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const ROLES = [
  {
    id: 'student',
    title: 'Student Login',
    subtitle: 'Access your academic progress and course materials',
    emailPlaceholder: 'student@iiits.in',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
        <path d="M6 12v5c3 3 9 3 12 0v-5" />
      </svg>
    ),
  },
  {
    id: 'faculty',
    title: 'Faculty Login',
    subtitle: 'Manage courses, grades, and student assessments',
    emailPlaceholder: 'faculty@iiits.in',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    id: 'head',
    title: 'Academic Head Login',
    subtitle: 'Oversee institutional performance and user management',
    emailPlaceholder: 'head@iiits.in',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
        <path d="M9 22v-4h6v4" />
        <path d="M8 6h.01" /><path d="M16 6h.01" /><path d="M12 6h.01" />
        <path d="M12 10h.01" /><path d="M12 14h.01" /><path d="M16 10h.01" />
        <path d="M16 14h.01" /><path d="M8 10h.01" /><path d="M8 14h.01" />
      </svg>
    ),
  },
  {
    id: 'superadmin',
    title: 'Super Admin Login',
    subtitle: 'Full system access and administrative control',
    emailPlaceholder: 'admin@iiits.in',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    id: 'spoc',
    title: 'Institution Partner Sign In',
    subtitle: "Manage your college's subscription and reach our team",
    emailPlaceholder: 'spoc@yourcollege.edu',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </svg>
    ),
  },
];

// Dev-only demo credentials — picking a role fills in that actor's seeded
// login. Gated on localhost, same as legacy script.js's DEMO_LOGINS block.
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
  const { login } = useAuth();
  const { showToast } = useNotifications();
  const navigate = useNavigate();

  const [roleId, setRoleId] = useState('student');
  const [email, setEmail] = useState(IS_LOCAL_DEV ? DEMO_LOGINS.student.email : '');
  const [password, setPassword] = useState(IS_LOCAL_DEV ? DEMO_LOGINS.student.password : '');
  const [submitting, setSubmitting] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  const role = ROLES.find((r) => r.id === roleId);

  const selectRole = (id) => {
    setRoleId(id);
    if (IS_LOCAL_DEV && DEMO_LOGINS[id]) {
      setEmail(DEMO_LOGINS[id].email);
      setPassword(DEMO_LOGINS[id].password);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail) return showToast('Email is required', 'error');
    if (!EMAIL_RE.test(trimmedEmail)) return showToast('Please enter a valid email address', 'error');
    if (!trimmedPassword) return showToast('Password is required', 'error');
    if (!PASSWORD_RE.test(trimmedPassword)) {
      return showToast(
        'Password must be at least 8 characters with 1 uppercase, 1 lowercase, 1 number, and 1 special character',
        'error',
      );
    }

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
        <div className="left-panel">
          <h2>Welcome Back</h2>
          <p className="select-text">Select your role to continue</p>
          <div className="roles-container">
            {ROLES.map((r) => (
              <div
                key={r.id}
                className={`role-option ${roleId === r.id ? 'active' : ''}`}
                onClick={() => selectRole(r.id)}
              >
                <div className="role-icon">{r.icon}</div>
                <div className="role-details">
                  <h3>{r.id === 'head' ? 'Academic Head' : r.id === 'superadmin' ? 'Super Admin' : r.id === 'spoc' ? 'Institution Partner' : r.id.charAt(0).toUpperCase() + r.id.slice(1)}</h3>
                  <p>{r.subtitle}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="right-panel">
          <div className="form-header">
            <div className="form-icon">
              {/* Static per legacy markup — see the file header note. */}
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c3 3 9 3 12 0v-5" />
              </svg>
            </div>
            <div className="form-title">
              <h2>{role.title}</h2>
              <p>{role.subtitle}</p>
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
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={role.emailPlaceholder} required />
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
                  placeholder="Min 8 chars: 1 uppercase, 1 lowercase, 1 number, 1 special"
                  required
                  minLength={6}
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
            <p
              style={{
                margin: '14px 0 0',
                padding: '8px 10px',
                border: '1px dashed #cbd5e1',
                borderRadius: 8,
                background: '#f8fafc',
                color: '#475569',
                fontSize: 12,
                textAlign: 'center',
                fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace',
              }}
            >
              DEV &middot; {DEMO_LOGINS[roleId]?.email} &middot; {DEMO_LOGINS[roleId]?.password}
            </p>
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
