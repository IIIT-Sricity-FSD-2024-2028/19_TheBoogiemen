/**
 * Modal — the `.modal-backdrop`/`.modal-window`/`.modal-header` chrome every
 * legacy modal repeated by hand (openModal/closeModal + copy-pasted
 * markup). One component instead of six near-identical copies.
 */

export default function Modal({ open, onClose, title, maxWidth, children }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" style={{ display: 'flex' }}>
      <div className="modal-window" style={maxWidth ? { maxWidth } : undefined}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="close-modal" onClick={onClose} type="button">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
