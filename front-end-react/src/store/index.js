/**
 * store/index.js — REDUX_MIGRATION_PLAN.md Phase 0.
 *
 * One slice today (auth, Phase 1). Every later phase adds its reducer here
 * and nowhere else — this file is the single place the store's shape is
 * assembled. `configureStore`'s default middleware already includes thunk,
 * so nothing extra is wired for "the thunk pattern" itself.
 */
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import { getUser } from '../api/client';

export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
  // Hydrates from localStorage once, at real app boot — same effect as the
  // pre-Redux AuthContext.jsx's `useState(() => getUser())`, just living
  // here instead of in a component. See authSlice.js's own comment for why
  // this doesn't live in the slice's initialState.
  preloadedState: {
    auth: { user: getUser(), status: 'idle', error: null },
  },
});
