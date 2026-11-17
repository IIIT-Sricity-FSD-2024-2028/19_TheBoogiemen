import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiFetch } from '../../api/client';

/** GET /discussions enriches each post with a computed reply_count the
 *  raw record doesn't carry — create/reply don't splice into state for
 *  this reason, same as assessmentsSlice; the component refetches the
 *  list afterward instead. */
export const fetchDiscussions = createAsyncThunk('discussions/fetch', () => apiFetch('/discussions'));

export const fetchDiscussionThread = createAsyncThunk('discussions/fetchThread', (postId) =>
  apiFetch(`/discussions/${postId}`),
);

export const createDiscussion = createAsyncThunk('discussions/create', (payload) =>
  apiFetch('/discussions', { method: 'POST', body: JSON.stringify(payload) }),
);

export const postReply = createAsyncThunk('discussions/postReply', ({ postId, content }) =>
  apiFetch(`/discussions/${postId}/replies`, { method: 'POST', body: JSON.stringify({ content }) }),
);
