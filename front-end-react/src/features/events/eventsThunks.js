import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiFetch } from '../../api/client';

export const fetchEvents = createAsyncThunk('events/fetch', () => apiFetch('/events'));

export const createEvent = createAsyncThunk('events/create', (payload) =>
  apiFetch('/events', { method: 'POST', body: JSON.stringify(payload) }),
);

export const updateEvent = createAsyncThunk('events/update', ({ id, payload }) =>
  apiFetch(`/events/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
);

export const deleteEvent = createAsyncThunk('events/delete', async (id) => {
  await apiFetch(`/events/${id}`, { method: 'DELETE' });
  return id;
});
