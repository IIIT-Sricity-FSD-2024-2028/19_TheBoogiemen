/**
 * Redux middleware: activityLoggerMiddleware
 *
 * Records the signed-in user's successful actions (leave applied, reply
 * posted, profile updated...) as they pass through the store, so dashboards
 * can show a "Recent activity" list. The backend keeps the authoritative audit
 * trail (AuditLoggerMiddleware); this list is only for the user's own session
 * and is cleared on sign-out.
 */

import { mutationSucceeded } from '../app/apiActions';
import { activityRecorded } from '../features/ui/uiSlice';

export const activityLoggerMiddleware = (store) => (next) => (action) => {
  const result = next(action);
  if (mutationSucceeded.match(action) && action.payload?.label) {
    store.dispatch(activityRecorded({ label: action.payload.label, at: new Date().toISOString() }));
  }
  return result;
};
