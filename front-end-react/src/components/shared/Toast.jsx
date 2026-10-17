/**
 * Toast — ported from legacy fixes.js `showToast()`. One toast at a time,
 * replaced (not stacked) by the next call, auto-dismissed after 3.5s.
 * Mounted once at the app root so it's visible from any page.
 */

import { useNotifications } from '../../context/NotificationsContext';

const COLORS = {
  error: '#ef4444',
  warning: '#f59e0b',
  success: '#16a34a',
};

export default function Toast() {
  const { toast } = useNotifications();
  if (!toast) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        padding: '12px 20px',
        borderRadius: 8,
        fontSize: 14,
        fontWeight: 600,
        color: '#fff',
        background: COLORS[toast.type] || COLORS.success,
        boxShadow: '0 4px 20px rgba(0,0,0,.25)',
      }}
    >
      {toast.msg}
    </div>
  );
}
