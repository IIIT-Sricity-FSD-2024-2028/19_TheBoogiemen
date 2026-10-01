import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { X } from 'lucide-react';
import { removeToast } from '../../features/ui/uiSlice';

function Toast({ toast }) {
  const dispatch = useDispatch();
  useEffect(() => {
    // Errors stay longer than confirmations so they can be read.
    const timer = setTimeout(() => dispatch(removeToast(toast.id)), toast.type === 'error' ? 9000 : 5000);
    return () => clearTimeout(timer);
  }, [dispatch, toast.id, toast.type]);

  return (
    <div className={`sp-toast is-${toast.type}`} role={toast.type === 'error' ? 'alert' : 'status'}>
      <div style={{ flex: 1 }}>
        <div className="sp-toast-title">{toast.title}</div>
        {toast.message && <div className="sp-toast-msg">{toast.message}</div>}
      </div>
      <button type="button" className="sp-link-btn" aria-label="Dismiss" onClick={() => dispatch(removeToast(toast.id))}>
        <X size={16} />
      </button>
    </div>
  );
}

/** Global toast stack, fed by the ui slice (middleware and components push to it). */
export default function Toasts() {
  const toasts = useSelector((state) => state.ui.toasts);
  if (toasts.length === 0) return null;
  return (
    <div className="sp-toasts" aria-live="polite">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} />
      ))}
    </div>
  );
}
