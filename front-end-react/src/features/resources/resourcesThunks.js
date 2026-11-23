import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiFetch } from '../../api/client';

export const fetchResources = createAsyncThunk('resources/fetch', () => apiFetch('/resources'));

export const createResource = createAsyncThunk('resources/create', (payload) =>
  apiFetch('/resources', { method: 'POST', body: JSON.stringify(payload) }),
);

export const updateResourceStatus = createAsyncThunk('resources/updateStatus', ({ id, status }) =>
  apiFetch(`/resources/${id}`, { method: 'PUT', body: JSON.stringify({ status }) }),
);
