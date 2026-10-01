import React, { useState } from 'react';
import { Copy, KeyRound } from 'lucide-react';
import Modal from '../../shared/ui/Modal';

/** Copy text to the clipboard; resolves to true when it worked. */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Shows a temporary password exactly once. The server returns it only in the
 * create / reset response and never stores it in plain text, so closing this
 * dialog loses it for good.
 */
export default function TempPasswordDialog({ title, person, password, onClose }) {
  const [copied, setCopied] = useState(null);

  const copy = async () => {
    setCopied((await copyText(password)) ? 'ok' : 'failed');
  };

  return (
    <Modal
      title={title}
      onClose={onClose}
      width={520}
      footer={<button type="button" className="sp-btn" onClick={onClose}>I have saved it</button>}
    >
      <div className="sp-form">
        {person && (
          <dl className="sp-details">
            <div><dt>Name</dt><dd>{person.name}</dd></div>
            <div><dt>Email</dt><dd>{person.email}</dd></div>
            <div><dt>ID</dt><dd>{person.display_id || 'Not assigned'}</dd></div>
          </dl>
        )}
        <div>
          <p className="sp-muted" style={{ margin: '0 0 6px', fontSize: 13 }}>Temporary password</p>
          <div className="cl-secret">
            <KeyRound size={18} aria-hidden="true" />
            <code>{password}</code>
            <button type="button" className="sp-btn is-secondary is-small" onClick={copy} style={{ marginLeft: 'auto' }}>
              <Copy size={14} /> Copy
            </button>
          </div>
          <p role="status" aria-live="polite" className="sp-hint" style={{ margin: '6px 0 0' }}>
            {copied === 'ok' ? 'Copied to the clipboard.' : copied === 'failed' ? 'Could not copy automatically. Select the password and copy it manually.' : ''}
          </p>
        </div>
        <div className="sp-alert is-warning" role="note">
          <span>
            This password is shown only once and cannot be viewed again. Share it with the person securely. They must set
            their own password the first time they sign in.
          </span>
        </div>
      </div>
    </Modal>
  );
}
