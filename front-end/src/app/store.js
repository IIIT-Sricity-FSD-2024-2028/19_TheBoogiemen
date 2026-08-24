import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import tenantReducer from '../features/tenant/tenantSlice';
import subscriptionReducer from '../features/subscription/subscriptionSlice';
import hierarchyReducer from '../features/hierarchy/hierarchySlice';
import academicReducer from '../features/academic/academicSlice';
import uiReducer from '../features/ui/uiSlice';

import { tokenAuthMiddleware } from '../middleware/tokenAuthMiddleware';
import { quotaCheckerMiddleware } from '../middleware/quotaCheckerMiddleware';
import { auditLoggerMiddleware } from '../middleware/auditLoggerMiddleware';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    tenant: tenantReducer,
    subscription: subscriptionReducer,
    hierarchy: hierarchyReducer,
    academic: academicReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }).concat(
      tokenAuthMiddleware,
      quotaCheckerMiddleware,
      auditLoggerMiddleware
    ),
});
