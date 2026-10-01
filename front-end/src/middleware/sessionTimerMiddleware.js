/**
 * Redux middleware: sessionTimerMiddleware
 *
 * 1. Ends the session exactly when it expires. The backend reports
 *    `expires_at` on login and on GET /auth/me; a timer is scheduled for that
 *    moment, and a one-minute warning toast shortly before.
 * 2. Keeps browser tabs in step. Signing in or out in one tab writes a small
 *    event to localStorage (never the credential); other tabs receive a
 *    `storage` event and either reload the session or sign out too.
 */

import { fetchSession, loginThunk, logoutThunk, sessionExpired, signedOutElsewhere } from '../features/auth/authSlice';
import { addToast } from '../features/ui/uiSlice';

const EVENT_KEY = 'bp_session_event';
const WARNING_MS = 60 * 1000;
const MAX_TIMEOUT = 2 ** 31 - 1; // setTimeout limit (~24.8 days)

export const sessionTimerMiddleware = (store) => {
  let expiryTimer = null;
  let warningTimer = null;

  const clearTimers = () => {
    clearTimeout(expiryTimer);
    clearTimeout(warningTimer);
  };

  const schedule = (expiresAt) => {
    clearTimers();
    if (!expiresAt) return;
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) {
      store.dispatch(sessionExpired());
      return;
    }
    if (remaining > WARNING_MS) {
      warningTimer = setTimeout(() => {
        store.dispatch(addToast({ type: 'warning', title: 'Session ending soon', message: 'You will be signed out in about a minute. Save your work.' }));
      }, Math.min(remaining - WARNING_MS, MAX_TIMEOUT));
    }
    expiryTimer = setTimeout(() => {
      if (store.getState().auth.status !== 'authenticated') return;
      store.dispatch(sessionExpired());
      store.dispatch(addToast({ type: 'warning', title: 'Session expired', message: 'Please sign in again to continue.' }));
    }, Math.min(remaining, MAX_TIMEOUT));
  };

  const broadcast = (type) => {
    try {
      localStorage.setItem(EVENT_KEY, JSON.stringify({ type, at: Date.now() }));
    } catch {
      // Storage unavailable (private mode): tabs simply are not synced.
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (event) => {
      if (event.key !== EVENT_KEY || !event.newValue) return;
      let message;
      try {
        message = JSON.parse(event.newValue);
      } catch {
        return;
      }
      if (message.type === 'logout') store.dispatch(signedOutElsewhere());
      if (message.type === 'login') store.dispatch(fetchSession());
    });
  }

  return (next) => (action) => {
    const result = next(action);

    if (fetchSession.fulfilled.match(action) || loginThunk.fulfilled.match(action)) {
      schedule(action.payload?.expires_at);
    }
    if (loginThunk.fulfilled.match(action)) broadcast('login');
    if (logoutThunk.pending.match(action)) broadcast('logout');
    if (logoutThunk.pending.match(action) || sessionExpired.match(action) || signedOutElsewhere.match(action)) {
      clearTimers();
    }
    return result;
  };
};
