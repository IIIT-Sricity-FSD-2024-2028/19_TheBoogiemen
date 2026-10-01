import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { api, toErrorPayload } from '../../services/apiClient';
import { SESSION_END_ACTIONS } from '../auth/authSlice';

/**
 * Notifications for the signed-in user (GET /api/notifications/me). The
 * backend derives them from real records, so this slice only caches the list
 * and the read state. Shared by the top-bar bell on every portal.
 */

export const fetchNotifications = createAsyncThunk('notifications/fetch', async (_arg, { rejectWithValue }) => {
  try {
    return await api.get('/notifications/me');
  } catch (err) {
    return rejectWithValue(toErrorPayload(err));
  }
});

export const markNotificationsRead = createAsyncThunk('notifications/markRead', async (ids, { rejectWithValue }) => {
  try {
    await api.post('/notifications/read', { ids });
    return ids;
  } catch (err) {
    return rejectWithValue(toErrorPayload(err));
  }
});

const initialState = { items: [], status: 'idle', error: null };

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        if (state.status === 'idle') state.status = 'loading';
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.error = null;
        state.items = Array.isArray(action.payload?.data) ? action.payload.data : [];
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Optimistic: mark read immediately, the request only persists it.
      .addCase(markNotificationsRead.pending, (state, action) => {
        const ids = new Set(action.meta.arg);
        state.items.forEach((n) => {
          if (ids.has(n.id)) n.read = true;
        });
      })
      .addMatcher((action) => SESSION_END_ACTIONS.includes(action.type), () => initialState);
  },
});

export const selectNotifications = (state) => state.notifications;
export const selectUnreadCount = (state) => state.notifications.items.filter((n) => !n.read).length;

export default notificationsSlice.reducer;
