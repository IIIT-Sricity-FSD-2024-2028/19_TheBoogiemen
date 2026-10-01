import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/**
 * Accessible dialog: focus moves into it, Escape and the backdrop close it,
 * and focus returns to the element that opened it.
 */
export default function Modal({ title, onClose, children, footer, width }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const previous = document.activeElement;
    const first = dialogRef.current?.querySelector('input, select, textarea, button:not([aria-label="Close"])');
    (first || dialogRef.current)?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="sp-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sp-modal" role="dialog" aria-modal="true" aria-label={title} ref={dialogRef} tabIndex={-1} style={width ? { width: `min(${width}px, 100%)` } : undefined}>
        <div className="sp-modal-head">
          <h2 className="sp-card-title" style={{ fontSize: 16 }}>{title}</h2>
          <button type="button" className="sp-icon-btn" aria-label="Close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="sp-modal-body">{children}</div>
        {footer && <div className="sp-modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

/** Confirmation for destructive actions. */
export function ConfirmDialog({ title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger, busy, onConfirm, onCancel }) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      width={440}
      footer={
        <>
          <button type="button" className="sp-btn is-secondary" onClick={onCancel} disabled={busy}>{cancelLabel}</button>
          <button type="button" className={`sp-btn${danger ? ' is-danger' : ''}`} onClick={onConfirm} disabled={busy}>
            {busy ? 'Working...' : confirmLabel}
          </button>
        </>
      }
    >
      <p style={{ margin: 0 }}>{message}</p>
    </Modal>
  );
}
