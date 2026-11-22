import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiFetch } from '../../api/client';

export const fetchTopics = createAsyncThunk('topics/fetch', (courseId) => apiFetch(`/topics?course_id=${courseId}`));

export const createTopic = createAsyncThunk('topics/create', ({ courseId, title }) =>
  apiFetch('/topics', { method: 'POST', body: JSON.stringify({ course_id: courseId, title }) }),
);

// create/delete don't splice state directly — removeTopic() cascades to
// delete that topic's completion rows server-side too, and guessing at
// that here risks drifting from the backend's own cleanup. The component
// refetches (dispatches fetchTopics(courseId) again) after either
// succeeds, same as the pre-Redux page's own load()-after-mutate.
export const deleteTopic = createAsyncThunk('topics/delete', async (topicId) => {
  await apiFetch(`/topics/${topicId}`, { method: 'DELETE' });
  return topicId;
});
