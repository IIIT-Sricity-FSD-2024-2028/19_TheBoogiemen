/**
 * Custom Redux Middleware: quotaCheckerMiddleware
 * 
 * Responsibilities:
 * 1. Monitors token usage and API rate meters across Redux state updates.
 * 2. Triggers UI warnings when an institute approaches 80% or 95% of its monthly token quota.
 */

import { addNotification } from '../features/ui/uiSlice';

export const quotaCheckerMiddleware = (store) => (next) => (action) => {
  const result = next(action);

  // Check token consumption after subscription or tenant meter updates
  if (action.type?.startsWith('tenant/') || action.type?.startsWith('subscription/')) {
    const state = store.getState();
    const activeTenant = state.tenant?.activeTenant;

    if (activeTenant && activeTenant.monthly_token_quota > 0) {
      const percentage = Math.round((activeTenant.used_tokens / activeTenant.monthly_token_quota) * 100);

      if (percentage >= 95 && !state.ui?.quotaAlert95Shown) {
        store.dispatch(
          addNotification({
            id: `quota-95-${Date.now()}`,
            type: 'danger',
            title: 'Critical Token Quota Alert (95%)',
            message: `${activeTenant.name} has consumed ${percentage}% of monthly token quota (${activeTenant.used_tokens}/${activeTenant.monthly_token_quota}). Please upgrade your tier!`,
          })
        );
      } else if (percentage >= 80 && !state.ui?.quotaAlert80Shown) {
        store.dispatch(
          addNotification({
            id: `quota-80-${Date.now()}`,
            type: 'warning',
            title: 'Token Quota Warning (80%)',
            message: `${activeTenant.name} has consumed ${percentage}% of monthly token allotment.`,
          })
        );
      }
    }
  }

  return result;
};
