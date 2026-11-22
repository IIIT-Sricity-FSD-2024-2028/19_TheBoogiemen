/**
 * NotificationsContext — REDUX_MIGRATION_PLAN.md Phase 2 facade.
 *
 * useNotifications() keeps the exact same API as before, but the data now
 * lives in the notifications slice (features/notifications). localStorage
 * write-through and cross-tab sync are handled by the middleware there.
 *
 * Broadcasts are still stamped with the sender's college_id and filtered by
 * the viewer's college_id — that's now read from the auth slice here, so
 * none of the call sites change. NotificationsProvider is a pass-through
 * until Phase 4 removes it from App.jsx.
 */
import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  readJSON,
  visibleToViewer,
  send as sendAction,
  broadcast as broadcastAction,
  markRead as markReadAction,
  clearPersonal,
  showToast as showToastAction,
} from '../features/notifications/notificationsSlice';

export function NotificationsProvider({ children }) {
  return children;
}

export function useNotifications() {
  const dispatch = useAppDispatch();
  const collegeId = useAppSelector((state) => state.auth.user?.college_id ?? null);
  const personal = useAppSelector((state) => state.notifications.personal);
  const broadcasts = useAppSelector((state) => state.notifications.broadcasts);
  const toast = useAppSelector((state) => state.notifications.toast);

  const showToast = useCallback((msg, type) => dispatch(showToastAction(msg, type)), [dispatch]);

  const forUser = useCallback((uid) => personal.filter((n) => n.to === uid), [personal]);

  const unread = useCallback((uid) => forUser(uid).filter((n) => !n.read).length, [forUser]);

  const visibleIds = useCallback(
    (role) =>
      broadcasts
        .filter((b) => (b.forRole === 'all' || b.forRole === role) && visibleToViewer(b, collegeId))
        .map((b) => b.id),
    [broadcasts, collegeId],
  );

  const getUnreadBC = useCallback(
    (role) => {
      const readIds = readJSON(`bp_bc_read_${role}`, []);
      return broadcasts.filter(
        (b) => (b.forRole === 'all' || b.forRole === role) && visibleToViewer(b, collegeId) && !readIds.includes(b.id),
      );
    },
    [broadcasts, collegeId],
  );

  const send = useCallback(
    (toUserId, fromName, message, type) => dispatch(sendAction(toUserId, fromName, message, type)),
    [dispatch],
  );

  const broadcast = useCallback(
    (targetRole, fromName, message, type) => dispatch(broadcastAction(targetRole, collegeId, fromName, message, type)),
    [dispatch, collegeId],
  );

  const broadcastAll = useCallback((fromName, message, type) => broadcast('all', fromName, message, type), [broadcast]);

  const markRead = useCallback((uid) => dispatch(markReadAction(uid)), [dispatch]);

  const markBCRead = useCallback(
    (role) => localStorage.setItem(`bp_bc_read_${role}`, JSON.stringify(visibleIds(role))),
    [visibleIds],
  );

  const clearAll = useCallback(
    (role) => {
      dispatch(clearPersonal());
      markBCRead(role);
    },
    [dispatch, markBCRead],
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
