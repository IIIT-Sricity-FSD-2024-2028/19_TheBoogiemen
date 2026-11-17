/**
 * store/index.js — REDUX_MIGRATION_PLAN.md Phase 0, extended in Phase 2.
 *
 * Every phase adds its reducer here and nowhere else — this file is the
 * single place the store's shape is assembled. `configureStore`'s default
 * middleware already includes thunk, so nothing extra is wired for "the
 * thunk pattern" itself; the notifications persistence middleware below is
 * the one addition, and it's there because write-through-to-localStorage
 * isn't something a thunk or a reducer should be doing.
 */
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import notificationsReducer, { personalSynced, broadcastsSynced } from '../features/notifications/notificationsSlice';
import { notificationsPersistenceMiddleware } from '../features/notifications/notificationsMiddleware';
import { KEY, BKEY, readJSON, notExpired } from '../features/notifications/notificationsStorage';
import coursesReducer from '../features/courses/coursesSlice';
import holidaysReducer from '../features/holidays/holidaysSlice';
import programOutcomesReducer from '../features/programOutcomes/programOutcomesSlice';
import learningOutcomesReducer from '../features/learningOutcomes/learningOutcomesSlice';
import institutionalReportsReducer from '../features/institutionalReports/institutionalReportsSlice';
import attendanceRegisterReducer from '../features/attendanceRegister/attendanceRegisterSlice';
import classPerformanceReducer from '../features/classPerformance/classPerformanceSlice';
import { getUser } from '../api/client';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    notifications: notificationsReducer,
    courses: coursesReducer,
    holidays: holidaysReducer,
    programOutcomes: programOutcomesReducer,
    learningOutcomes: learningOutcomesReducer,
    institutionalReports: institutionalReportsReducer,
    attendanceRegister: attendanceRegisterReducer,
    classPerformance: classPerformanceReducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(notificationsPersistenceMiddleware),
  // Hydrates from localStorage once, at real app boot — same effect as the
  // pre-Redux AuthContext.jsx's `useState(() => getUser())` and
  // NotificationsContext.jsx's two `useState(() => readJSON(...))` calls,
  // just living here instead of in a component. See authSlice.js's own
  // comment for why none of this lives in a slice's own initialState.
  preloadedState: {
    auth: { user: getUser(), status: 'idle', error: null },
    notifications: {
      personal: readJSON(KEY, []).filter(notExpired),
      broadcasts: readJSON(BKEY, []).filter(notExpired),
      toast: null,
    },
  },
});

/**
 * Cross-tab sync — REDUX_MIGRATION_PLAN.md §5: direct translation of the
 * pre-Redux context's own `useEffect` `storage` listener, just registered
 * once here instead of once per NotificationsProvider mount (which, since
 * the provider only ever mounts once anyway, is the same thing in practice —
 * but living at the store level means it works even once NotificationsProvider
 * is deleted in Phase 4). The `storage` event only fires in OTHER tabs than
 * the one that wrote, so a local dispatch's own persistence write (via the
 * middleware above) never loops back through here.
 */
window.addEventListener('storage', (e) => {
  if (!e || !e.key) return;
  if (e.key === KEY) {
    store.dispatch(personalSynced(readJSON(KEY, []).filter(notExpired)));
  } else if (e.key === BKEY) {
    store.dispatch(broadcastsSynced(readJSON(BKEY, []).filter(notExpired)));
  }
});
