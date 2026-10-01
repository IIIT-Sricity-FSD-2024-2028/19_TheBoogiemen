import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

// Mirrors PASSWORD_POLICY in back-end/src/common/dto/app.dto.ts. The backend
// enforces it; this copy only gives immediate feedback.
export const PASSWORD_POLICY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
export const POLICY_TEXT =
  'At least 8 characters, with an uppercase letter, a lowercase letter, a number and a special character (@$!%*?&).';

/**
 * Password input with a show/hide toggle. `autoComplete` must be
 * "current-password" on sign-in and "new-password" when setting one, which is
 * what lets iCloud Keychain / Touch ID and other password managers fill or save it.
 */
export default function PasswordField({ id, label, value, onChange, autoComplete, error, hint, name, autoFocus }) {
  const [visible, setVisible] = useState(false);
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className="sp-field">
      <label htmlFor={id}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          id={id}
          name={name || id}
          type={visible ? 'text' : 'password'}
          className="sp-input"
          style={{ paddingRight: 42 }}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          value={value}
          onChange={onChange}
          aria-invalid={!!error}
          aria-describedby={describedBy}
        />
        <button
          type="button"
          className="sp-link-btn"
          style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--sp-muted)' }}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-controls={id}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
      {error ? (
        <p id={`${id}-error`} className="sp-field-error">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="sp-hint">{hint}</p>
      ) : null}
    </div>
  );
}
