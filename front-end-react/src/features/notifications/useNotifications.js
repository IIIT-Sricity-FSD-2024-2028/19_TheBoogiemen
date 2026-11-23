/**
 * useNotifications — REDUX_MIGRATION_PLAN.md Phase 4: moved out of
 * context/NotificationsContext.jsx now that nothing needs the
 * Context-Provider shape anymore (NotificationsProvider was already an
 * inert pass-through since Phase 2 — persistence and cross-tab sync both
 * live in store/index.js, not in a provider's mount lifecycle). Same hook
 * name, same returned shape, so every call site only needed its import
 * path updated, not its usage.
 *
 * TOAST TIMER NOTE: the pre-Redux provider held its pending-dismiss timer
 * in a `useRef`, safe because the provider mounted exactly once for the
 * whole app. A facade hook has no such guarantee — `useNotifications()` is
 * called from 30+ different components, so a `useRef` here would give each
 * CALLER its own independent timer instead of the one shared timer the
 * original behavior depends on (newest toast cancels any still-pending
 * dismissal, regardless of which component triggered either one). A
 * module-scope variable is the equivalent of the old ref: this module, like
 * any ES module, is evaluated once and shared by every importer — so it's
 * the direct one-for-one replacement, not a new design.
 */
import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { useAuth } from '../auth/useAuth';
import {
  personalReceived,
  broadcastReceived,
  personalMarkedRead,
  personalCleared,
  toastShown,
  toastCleared,
} from './notificationsSlice';
import { visibleToViewer, readBCReadIds, writeBCReadIds } from './notificationsStorage';

let toastTimerId = null;

const timeLabel = () =>
  new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

export function useNotifications() {
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const collegeId = user?.college_id ?? null;

  const toast = useAppSelector((state) => state.notifications.toast);
  const personal = useAppSelector((state) => state.notifications.personal);
  const broadcasts = useAppSelector((state) => state.notifications.broadcasts);

  const showToast = useCallback((msg, type = 'success') => {
    clearTimeout(toastTimerId);
    dispatch(toastShown({ id: Date.now(), msg, type }));
    toastTimerId = setTimeout(() => dispatch(toastCleared()), 3500);
  }, [dispatch]);

  const forUser = useCallback((uid) => personal.filter((n) => n.to === uid), [personal]);

  const getUnreadBC = useCallback(
    (role) => {
      const readIds = readBCReadIds(role);
      return broadcasts.filter(
        (b) =>
          (b.forRole === 'all' || b.forRole === role) &&
          visibleToViewer(b, collegeId) &&
          !readIds.includes(b.id),
      );
    },
    [broadcasts, collegeId],
  );

  const unread = useCallback((uid) => forUser(uid).filter((n) => !n.read).length, [forUser]);

  const send = useCallback(
    (toUserId, fromName, message, type = 'alert') => {
      const ts = Date.now();
      dispatch(
        personalReceived({ id: ts, to: toUserId, from: fromName, message, type, read: false, time: timeLabel(), timestamp: ts }),
      );
    },
    [dispatch],
  );

  const broadcast = useCallback(
    (targetRole, fromName, message, type = 'info') => {
      const ts = Date.now();
      dispatch(
        broadcastReceived({ id: ts, forRole: targetRole, collegeId, from: fromName, message, type, time: timeLabel(), timestamp: ts }),
      );
    },
    [dispatch, collegeId],
  );

  const broadcastAll = useCallback(
    (fromName, message, type = 'info') => broadcast('all', fromName, message, type),
    [broadcast],
  );

  const markRead = useCallback((uid) => dispatch(personalMarkedRead(uid)), [dispatch]);

  // Not Redux state — the "read" marker was never part of React state
  // pre-Redux either, only a direct localStorage write. See
  // notificationsStorage.js's own comment for why that stays as-is.
  const markBCRead = useCallback(
    (role) => {
      const ids = broadcasts
        .filter((b) => (b.forRole === 'all' || b.forRole === role) && visibleToViewer(b, collegeId))
        .map((b) => b.id);
      writeBCReadIds(role, ids);
    },
    [broadcasts, collegeId],
  );

  const clearAll = useCallback(
    (role) => {
      dispatch(personalCleared());
      const ids = broadcasts
        .filter((b) => (b.forRole === 'all' || b.forRole === role) && visibleToViewer(b, collegeId))
        .map((b) => b.id);
      writeBCReadIds(role, ids);
    },
    [dispatch, broadcasts, collegeId],
  );

  return {
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
}
