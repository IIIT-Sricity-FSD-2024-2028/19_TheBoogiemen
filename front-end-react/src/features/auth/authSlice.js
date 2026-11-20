/**
 * authSlice.js — REDUX_MIGRATION_PLAN.md Phase 1. State shape: { user,
 * status, error }.
 *
 * The slice's own default has no user — reading localStorage is a side
 * effect, and baking it into a module-level `initialState` object means
 * it's computed exactly once, whenever this module first happens to load.
 * In the real app that's at page-load time (fine — localStorage is already
 * populated before any JS runs), but it's wrong for anything that imports
 * this module more than once per "session" (tests, HMR). The real app's
 * hydration from localStorage happens once, correctly, in store/index.js's
 * `preloadedState` — same `getUser()` helper, called where it's actually
 * safe to call it fresh. See authSlice.test.js for why this split matters.
 */
import { createSlice } from '@reduxjs/toolkit';
import { loginUser, logoutUser } from './authThunks';

const initialState = {
  user: null,
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload.user;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.status = 'idle';
        state.user = null;
        state.error = null;
      });
  },
});

export default authSlice.reducer;
