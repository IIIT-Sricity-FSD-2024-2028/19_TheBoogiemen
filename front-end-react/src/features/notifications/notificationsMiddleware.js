/**
 * notificationsMiddleware.js — REDUX_MIGRATION_PLAN.md §5: the write-through
 * half of what the pre-Redux context did with two `useEffect`s keyed on
 * `[personal]`/`[broadcasts]`. Writing back identical content on a
 * cross-tab sync action (personalSynced/broadcastsSynced) is harmless —
 * same content, same key — so this doesn't special-case those action types.
 */
import { KEY, BKEY } from './notificationsStorage';

export const notificationsPersistenceMiddleware = (store) => (next) => (action) => {
  const result = next(action);
  if (typeof action.type === 'string' && action.type.startsWith('notifications/')) {
    const { personal, broadcasts } = store.getState().notifications;
    localStorage.setItem(KEY, JSON.stringify(personal));
    localStorage.setItem(BKEY, JSON.stringify(broadcasts));
  }
  return result;
};
