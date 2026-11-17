import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiFetch } from '../../api/client';

/** SPOC's own support thread — exactly one per college, no thread id in
 *  the URL. spoc/Support.jsx polls fetchMyThread on an interval while
 *  mounted; the thunk itself is plain, the polling lives in the component. */
export const fetchMyThread = createAsyncThunk('supportThread/fetch', () =>
  apiFetch('/billing/support/thread').then((res) => res?.data?.messages || []),
);

export const sendSupportMessage = createAsyncThunk('supportThread/send', (content) =>
  apiFetch('/billing/support/messages', { method: 'POST', body: JSON.stringify({ content }) }).then(
    (res) => res.data.messages,
  ),
);
