/**
 * NotificationBell — ported from legacy fixes.js `window.Notifications`
 * (`injectBell`/`renderPanel`/`updateBell`). Takes `onNavigate` as a prop
 * instead of calling the legacy global `switchView()` directly — the
 * dashboard that mounts this bell owns its own view-switching state and
 * decides what "navigate to this notification's view" means.
 */

import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationsContext';

// viewId values match the actual view ids each dashboard settles on (kept
// consistent across actors on purpose, same as legacy's shared
// view-section ids e.g. "leave-management-view" on every page that has
// one) — not every actor has every view (e.g. only students have
// 'attendance'), so a click for a type that actor can't receive anyway is
// a non-issue rather than something worth a per-actor map.
const TYPE_META = {
  meeting: { icon: '📅', bg: '#eff6ff', border: '#bfdbfe', color: '#1e40af', label: 'Meeting', viewId: 'dashboard' },
  event: { icon: '🎉', bg: '#faf5ff', border: '#e9d5ff', color: '#7c3aed', label: 'Event', viewId: 'event-scheduler' },
  alert: { icon: '⚠️', bg: '#fef2f2', border: '#fecaca', color: '#dc2626', label: 'Alert', viewId: 'dashboard' },
  info: { icon: '💡', bg: '#f0fdf4', border: '#bbf7d0', color: '#15803d', label: 'Info', viewId: 'research' },
  fee: { icon: '💳', bg: '#fff7ed', border: '#fed7aa', color: '#c2410c', label: 'Fee', viewId: 'fee-compliance' },
  marks: { icon: '📊', bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8', label: 'Marks', viewId: 'attendance' },
  leave: { icon: '🗓️', bg: '#f0fdf4', border: '#bbf7d0', color: '#166534', label: 'Leave', viewId: 'leave' },
  default: { icon: '🔔', bg: '#f8fafc', border: '#e2e8f0', color: '#475569', label: 'Notice', viewId: 'dashboard' },
};

const getMeta = (type) => TYPE_META[type] || TYPE_META.default;

export default function NotificationBell({ onNavigate }) {
  const { user } = useAuth();
  const { forUser, getUnreadBC, unread, markRead, markBCRead, clearAll } = useNotifications();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const unreadCount = unread(user.user_id) + getUnreadBC(user.role).length;

  const togglePanel = () => {
    if (!open) {
      // Opening the panel is what marks everything in it read — matches
      // legacy renderPanel()'s behavior exactly.
      markRead(user.user_id);
      markBCRead(user.role);
    }
    setOpen((o) => !o);
  };

  const bcItems = getUnreadBC(user.role).map((b) => ({ ...b, isBroadcast: true }));
  const personal = forUser(user.user_id);
  const notifs = [...bcItems, ...personal];

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: 'auto', flexShrink: 0 }}>
      <button
        onClick={togglePanel}
        title="Notifications"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '8px 10px',
          borderRadius: 10,
          position: 'relative',
          color: unreadCount > 0 ? '#6366f1' : '#94a3b8',
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 2,
              right: 2,
              background: 'linear-gradient(135deg,#ef4444,#dc2626)',
              color: '#fff',
              fontSize: 10,
              fontWeight: 800,
              minWidth: 18,
              height: 18,
              borderRadius: 9,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              border: '2px solid #fff',
            }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 48,
            right: 0,
            width: 360,
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 16,
            boxShadow: '0 12px 40px rgba(0,0,0,.15)',
            zIndex: 9999,
            maxHeight: 480,
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              padding: '14px 16px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              position: 'sticky',
              top: 0,
              background: '#fff',
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
              🔔 Notifications
              {notifs.length > 0 && (
                <span
                  style={{
                    fontSize: 11,
                    background: '#6366f1',
                    color: '#fff',
                    padding: '2px 7px',
                    borderRadius: 10,
                    marginLeft: 4,
                  }}
                >
                  {notifs.length}
                </span>
              )}
            </div>
            <button
              onClick={() => clearAll(user.role)}
              style={{ fontSize: 11, color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
            >
              Clear all
            </button>
          </div>

          {notifs.length === 0 ? (
            <div style={{ padding: '40px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>You're all caught up!</div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>No new notifications</div>
            </div>
          ) : (
            notifs.map((n) => {
              const m = getMeta(n.type);
              const navView = n.viewId || m.viewId;
              return (
                <div
                  key={n.id}
                  onClick={() => {
                    onNavigate?.(navView);
                    setOpen(false);
                  }}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #f8fafc',
                    display: 'flex',
                    gap: 12,
                    alignItems: 'flex-start',
                    background: n.isBroadcast ? '#fafafa' : '#fff',
                    cursor: 'pointer',
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: m.bg,
                      border: `1px solid ${m.border}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 16,
                      flexShrink: 0,
                    }}
                  >
                    {m.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', lineHeight: 1.4 }}>{n.message}</div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, background: m.bg, color: m.color, fontWeight: 700 }}>
                        {m.label}
                      </span>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>
                        {n.from} &middot; {n.time}
                      </span>
                      {n.isBroadcast && (
                        <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, background: '#eff6ff', color: '#1d4ed8', fontWeight: 600 }}>
                          Broadcast
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
