/**
 * Redux middleware: apiErrorMiddleware
 *
 * Makes sure a failed write is never silent. When a create/update/delete
 * request fails (reported as `api/requestFailed` with a non-GET method) with a
 * permission, server or network error, a toast explains what happened.
 *
 * Failed page loads are not toasted: the section itself shows an error state
 * with a retry button. 400 validation errors are not toasted either: the form
 * shows them next to the fields. 401 is handled by tokenAuthMiddleware.
 */

import { addToast } from '../features/ui/uiSlice';
import { apiRequestFailed } from '../app/apiActions';

function titleFor(status) {
  if (status === 0) return 'Server unreachable';
  if (status === 403) return 'Not allowed';
  if (status === 404) return 'Not found';
  if (status === 429) return 'Too many requests';
  return 'Something went wrong';
}

export const apiErrorMiddleware = (store) => (next) => (action) => {
  const result = next(action);

  if (apiRequestFailed.match(action)) {
    const { status = 0, message, method = 'GET' } = action.payload || {};
    const isWrite = method !== 'GET';
    const shouldToast = isWrite && (status === 0 || status === 403 || status === 404 || status === 429 || status >= 500);
    if (shouldToast) {
      store.dispatch(addToast({ type: 'error', title: titleFor(status), message }));
    }
  }
  return result;
};
