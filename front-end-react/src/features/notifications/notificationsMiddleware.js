import { KEY, BKEY, readPersonal, readBroadcasts, syncFromStorage, setToast, hideToast } from './notificationsSlice';

// Toast changes and syncs coming from another tab don't need to be written back.
const SKIP = [setToast.type, hideToast.type, syncFromStorage.type];

export const notificationsPersistenceMiddleware = (store) => (next) => (action) => {
  const result = next(action);
  if (action.type.startsWith('notifications/') && !SKIP.includes(action.type)) {
    const { personal, broadcasts } = store.getState().notifications;
    localStorage.setItem(KEY, JSON.stringify(personal));
    localStorage.setItem(BKEY, JSON.stringify(broadcasts));
  }
  return result;
};

// The storage event only fires in the other tabs, so this never re-applies our own writes.
export function listenForOtherTabs(store) {
  if (typeof window === 'undefined') return () => {};
  const onStorage = (e) => {
    if (!e || !e.key) return;
    if (e.key === KEY) store.dispatch(syncFromStorage({ personal: readPersonal() }));
    else if (e.key === BKEY) store.dispatch(syncFromStorage({ broadcasts: readBroadcasts() }));
  };
  window.addEventListener('storage', onStorage);
  return () => window.removeEventListener('storage', onStorage);
}
