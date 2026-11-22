/**
 * notificationsSlice.js — REDUX_MIGRATION_PLAN.md §5/§6 Phase 2.
 *
 * Plain reducers, no thunks: every action here is synchronous and local
 * (not a server call), exactly matching the pre-Redux context's own
 * send/broadcast/markRead — those were never async either. `Date.now()`/
 * `toLocaleString()` timestamping happens in the FACADE (the action
 * creator's caller), not in a reducer, so the reducer stays a pure function
 * of (state, already-built entry) — see context/NotificationsContext.jsx.
 */
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  personal: [],
  broadcasts: [],
  toast: null,
};

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    personalReceived(state, action) {
      state.personal = [action.payload, ...state.personal].slice(0, 200);
    },
    broadcastReceived(state, action) {
      state.broadcasts = [action.payload, ...state.broadcasts].slice(0, 500);
    },
    personalMarkedRead(state, action) {
      const uid = action.payload;
      state.personal.forEach((n) => {
        if (n.to === uid) n.read = true;
      });
    },
    personalCleared(state) {
      state.personal = [];
    },
    toastShown(state, action) {
      state.toast = action.payload;
    },
    toastCleared(state) {
      state.toast = null;
    },
    // Cross-tab sync (another tab wrote to localStorage) — a full replace,
    // same as the pre-Redux context's setPersonal/setBroadcasts inside its
    // `storage` event listener. Dispatched from store/index.js, not here.
    personalSynced(state, action) {
      state.personal = action.payload;
    },
    broadcastsSynced(state, action) {
      state.broadcasts = action.payload;
    },
  },
});

export const {
  personalReceived,
  broadcastReceived,
  personalMarkedRead,
  personalCleared,
  toastShown,
  toastCleared,
  personalSynced,
  broadcastsSynced,
} = notificationsSlice.actions;

export default notificationsSlice.reducer;
