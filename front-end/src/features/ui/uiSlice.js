import { createSlice } from '@reduxjs/toolkit';
import { SESSION_END_ACTIONS } from '../auth/authSlice';

/**
 * App-wide UI state: toasts and the signed-in user's recent activity.
 * Page-local UI state (open modals, filters, form values) stays in components.
 */

const initialState = {
  toasts: [],
  recentActivity: [],
};

let toastSeq = 0;

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    addToast: {
      reducer: (state, action) => {
        state.toasts.push(action.payload);
        if (state.toasts.length > 4) state.toasts.shift();
      },
      prepare: ({ type = 'info', title, message }) => ({
        payload: { id: `t${Date.now()}_${toastSeq++}`, type, title, message },
      }),
    },
    removeToast: (state, action) => {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
    activityRecorded: (state, action) => {
      state.recentActivity.unshift(action.payload);
      state.recentActivity = state.recentActivity.slice(0, 20);
    },
  },
  extraReducers: (builder) => {
    builder.addMatcher(
      (action) => SESSION_END_ACTIONS.includes(action.type),
      (state) => {
        state.recentActivity = [];
      }
    );
  },
});

export const { addToast, removeToast, activityRecorded } = uiSlice.actions;
export default uiSlice.reducer;
