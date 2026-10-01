import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import uiReducer from '../features/ui/uiSlice';
import notificationsReducer from '../features/notifications/notificationsSlice';
import studentReducer from '../features/student/studentSlice';
import facultyReducer from '../features/faculty/facultySlice';
import hodReducer from '../features/hod/hodSlice';
import directorReducer from '../features/director/directorSlice';
import financeReducer from '../features/finance/financeSlice';
import spocReducer from '../features/spoc/spocSlice';
import supportReducer from '../features/support/supportSlice';

import { tokenAuthMiddleware } from '../middleware/tokenAuthMiddleware';
import { apiErrorMiddleware } from '../middleware/apiErrorMiddleware';
import { sessionTimerMiddleware } from '../middleware/sessionTimerMiddleware';
import { activityLoggerMiddleware } from '../middleware/activityLoggerMiddleware';

/**
 * Global store. Slices hold state that several components share:
 *   auth           who is signed in (from GET /api/auth/me)
 *   ui             theme, toasts, recent activity
 *   notifications  the bell in the top bar
 *   <portal>       server data shared by several views of one portal
 *
 * Middleware chain (runs for every dispatched action, in this order after the
 * Redux Toolkit defaults such as thunk):
 *   tokenAuthMiddleware      401 anywhere -> end session
 *   apiErrorMiddleware       failed writes -> error toast
 *   sessionTimerMiddleware   sign out at expiry, sync tabs
 *   activityLoggerMiddleware record successful actions
 */
export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    notifications: notificationsReducer,
    student: studentReducer,
    faculty: facultyReducer,
    hod: hodReducer,
    director: directorReducer,
    finance: financeReducer,
    spoc: spocReducer,
    support: supportReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(tokenAuthMiddleware, apiErrorMiddleware, sessionTimerMiddleware, activityLoggerMiddleware),
});
