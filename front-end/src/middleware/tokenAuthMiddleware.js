/**
 * Redux middleware: tokenAuthMiddleware
 *
 * The backend authenticates with an httpOnly `bp_session` cookie and has no
 * refresh endpoint, so an HTTP 401 on any API call means the session is over.
 * This middleware watches every failed request — rejected async thunks and
 * `api/requestFailed` from hooks — and ends the session in one place instead
 * of every component handling 401 itself.
 *
 * Not treated as "session expired":
 *   - a failed login (401 there means wrong password)
 *   - the page-load session check (401 there just means "not signed in")
 *
 * It calls next(action) first and returns its result unchanged, so
 * `dispatch(thunk())` still returns the thunk's promise.
 */

import { fetchSession, loginThunk, sessionExpired } from '../features/auth/authSlice';
import { addToast } from '../features/ui/uiSlice';
import { apiRequestFailed } from '../app/apiActions';

const IGNORED = new Set([loginThunk.rejected.type, fetchSession.rejected.type]);

export const tokenAuthMiddleware = (store) => (next) => (action) => {
  const result = next(action);

  const isApiFailure =
    apiRequestFailed.match(action) ||
    (typeof action.type === 'string' && action.type.endsWith('/rejected'));

  if (isApiFailure && action.payload?.status === 401 && !IGNORED.has(action.type)) {
    if (store.getState().auth.status === 'authenticated') {
      store.dispatch(sessionExpired());
      store.dispatch(
        addToast({ type: 'warning', title: 'Session expired', message: 'Please sign in again to continue.' })
      );
    }
  }
  return result;
};
