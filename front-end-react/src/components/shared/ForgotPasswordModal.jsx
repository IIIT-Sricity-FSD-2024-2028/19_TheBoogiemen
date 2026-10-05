/**
 * ForgotPasswordModal — ported from legacy fixes.js
 * (`showForgotPassword`/`sendForgotPasswordCode`/`verifyForgotCode`/
 * `submitNewPassword`). A demo flow: the "verification code" is generated
 * client-side and shown on screen rather than emailed — exactly as the
 * legacy markup's own comment states ("in production this would be
 * emailed"). Not changed here; porting it to a real email flow is a
 * product decision, not a migration one.
 */

import { useState } from 'react';
import { apiFetch } from '../../api/client';
import { useNotifications } from '../../context/NotificationsContext';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordModal({ open, onClose }) {
  const { showToast } = useNotifications();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState(null);
  const [codeInput, setCodeInput] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confPass, setConfPass] = useState('');

  if (!open) return null;

  const reset = () => {
    setStep(1);
    setEmail('');
    setCode(null);
    setCodeInput('');
    setNewPass('');
    setConfPass('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const sendCode = () => {
    if (!email || !EMAIL_RE.test(email)) {
      showToast('Enter a valid email address', 'warning');
      return;
    }
    setCode(Math.floor(100000 + Math.random() * 900000).toString());
    setStep(2);
    showToast('Verification code generated (shown below for demo)', 'success');
  };

  const verifyCode = () => {
    if (codeInput.trim() !== code) {
      showToast('Invalid verification code', 'error');
      return;
    }
    setStep(3);
  };

  const submitNewPassword = async () => {
    if (!newPass || newPass.length < 6) {
      showToast('Password must be at least 6 characters', 'warning');
      return;
    }
    if (newPass !== confPass) {
      showToast('Passwords do not match', 'warning');
      return;
    }
    try {
      await apiFetch('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email, new_password: newPass }),
      });
      showToast('Password reset successfully! Please log in. ✅', 'success');
      handleClose();
    } catch {
      showToast('Reset failed. Please try again.', 'error');
    }
  };

  return (
    <div className="modal-backdrop" style={{ display: 'flex' }}>
      <div className="modal-window" style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <h2>🔑 Reset Password</h2>
          <button className="close-modal" onClick={handleClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="modal-body">
          {step === 1 && (
            <div>
              <p style={{ fontSize: 14, color: '#64748b', marginBottom: 16 }}>
                Enter your registered email address to receive a verification code.
              </p>
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@institution.in"
                />
              </div>
              <button onClick={sendCode} className="submit-btn" style={{ width: '100%' }}>
                Send Verification Code
              </button>
            </div>
          )}

          {step === 2 && (
            <div>
              <p style={{ fontSize: 14, color: '#64748b', marginBottom: 8 }}>
                Your verification code (demo — in production this would be emailed):
              </p>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: '#6366f1',
                  letterSpacing: 6,
                  textAlign: 'center',
                  padding: 16,
                  background: '#eff6ff',
                  borderRadius: 8,
                  marginBottom: 16,
                }}
              >
                {code}
              </div>
              <div className="form-group">
                <label>Enter Code</label>
                <input
                  type="text"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  style={{ textAlign: 'center', letterSpacing: 4 }}
                />
              </div>
              <button onClick={verifyCode} className="submit-btn" style={{ width: '100%' }}>
                Verify Code
              </button>
            </div>
          )}

          {step === 3 && (
            <div>
              <p style={{ fontSize: 14, color: '#16a34a', fontWeight: 600, marginBottom: 16 }}>
                ✅ Identity verified! Set your new password.
              </p>
              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  placeholder="Minimum 6 characters"
                  minLength={6}
                />
              </div>
              <div className="form-group">
                <label>Confirm Password</label>
                <input
                  type="password"
                  value={confPass}
                  onChange={(e) => setConfPass(e.target.value)}
                  placeholder="Re-enter new password"
                />
              </div>
              <button
                onClick={submitNewPassword}
                className="submit-btn"
                style={{ width: '100%', background: 'linear-gradient(135deg,#16a34a,#15803d)' }}
              >
                Reset Password
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
