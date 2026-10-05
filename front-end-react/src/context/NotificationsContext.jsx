/**
 * NotificationsContext — toasts, the notification bell's data, and the
 * localStorage-backed broadcast/personal notification log.
 *
 * Ported from legacy fixes.js's `window.Notifications` IIFE and
 * `showToast()`. Still backed by the same localStorage keys (so data a user
 * already has from the legacy app keeps working), just exposed through
 * context + a hook instead of a global.
 */

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const KEY = 'bp_notifications';
const BKEY = 'bp_broadcasts';
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

function readJSON(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function notExpired(entry) {
  return !entry.timestamp || Date.now() - entry.timestamp < THIRTY_DAYS;
}

const NotificationsContext = createContext(null);

export function NotificationsProvider({ children }) {
  const [personal, setPersonal] = useState(() => readJSON(KEY, []).filter(notExpired));
  const [broadcasts, setBroadcasts] = useState(() => readJSON(BKEY, []).filter(notExpired));
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(personal));
  }, [personal]);

  useEffect(() => {
    localStorage.setItem(BKEY, JSON.stringify(broadcasts));
  }, [broadcasts]);

  const showToast = useCallback((msg, type = 'success') => {
    clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  const forUser = useCallback((uid) => personal.filter((n) => n.to === uid), [personal]);

  const getUnreadBC = useCallback(
    (role) => {
      const readIds = readJSON(`bp_bc_read_${role}`, []);
      return broadcasts.filter(
        (b) => (b.forRole === 'all' || b.forRole === role) && !readIds.includes(b.id),
      );
    },
    [broadcasts],
  );

  const unread = useCallback((uid) => forUser(uid).filter((n) => !n.read).length, [forUser]);

  const timeLabel = () =>
    new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  const send = useCallback((toUserId, fromName, message, type = 'alert') => {
    const ts = Date.now();
    setPersonal((all) =>
      [{ id: ts, to: toUserId, from: fromName, message, type, read: false, time: timeLabel(), timestamp: ts }, ...all].slice(0, 200),
    );
  }, []);

  const broadcast = useCallback((targetRole, fromName, message, type = 'info') => {
    const ts = Date.now();
    setBroadcasts((bc) =>
      [{ id: ts, forRole: targetRole, from: fromName, message, type, time: timeLabel(), timestamp: ts }, ...bc].slice(0, 500),
    );
  }, []);

  const broadcastAll = useCallback((fromName, message, type = 'info') => broadcast('all', fromName, message, type), [broadcast]);

  const markRead = useCallback((uid) => {
    setPersonal((all) => all.map((n) => (n.to === uid ? { ...n, read: true } : n)));
  }, []);

  const markBCRead = useCallback(
    (role) => {
      const ids = broadcasts.filter((b) => b.forRole === 'all' || b.forRole === role).map((b) => b.id);
      localStorage.setItem(`bp_bc_read_${role}`, JSON.stringify(ids));
    },
    [broadcasts],
  );

  const clearAll = useCallback(
    (role) => {
      setPersonal([]);
      const ids = broadcasts.filter((b) => b.forRole === 'all' || b.forRole === role).map((b) => b.id);
      localStorage.setItem(`bp_bc_read_${role}`, JSON.stringify(ids));
    },
    [broadcasts],
  );

  const value = {
    toast,
    showToast,
    forUser,
    getUnreadBC,
    unread,
    send,
    broadcast,
    broadcastAll,
    markRead,
    markBCRead,
    clearAll,
  };

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
}
