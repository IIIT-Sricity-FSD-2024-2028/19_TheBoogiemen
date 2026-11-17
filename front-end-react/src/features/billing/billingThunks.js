import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiFetch } from '../../api/client';

/** Superadmin's billing cockpit: every college, revenue, and the
 *  cross-college support inbox. All endpoints wrap { success, data }. */
export const fetchColleges = createAsyncThunk('billing/fetchColleges', () =>
  apiFetch('/billing/colleges').then((res) => res?.data || []),
);

export const fetchRevenue = createAsyncThunk('billing/fetchRevenue', () =>
  apiFetch('/billing/colleges/revenue').then((res) => res?.data),
);

export const fetchSupportThreads = createAsyncThunk('billing/fetchSupportThreads', () =>
  apiFetch('/billing/support/threads').then((res) => res?.data || []),
);

export const fetchSupportThread = createAsyncThunk('billing/fetchSupportThread', (threadId) =>
  apiFetch(`/billing/support/threads/${threadId}`).then((res) => res?.data),
);

export const replySupportThread = createAsyncThunk('billing/replySupportThread', ({ threadId, content }) =>
  apiFetch(`/billing/support/threads/${threadId}/reply`, { method: 'POST', body: JSON.stringify({ content }) }).then(
    (res) => res.data,
  ),
);
