import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiFetch } from '../../api/client';

export const fetchProgramOutcomes = createAsyncThunk('programOutcomes/fetch', () => apiFetch('/program-outcomes'));

export const createProgramOutcome = createAsyncThunk('programOutcomes/create', ({ code, description }) =>
  apiFetch('/program-outcomes', { method: 'POST', body: JSON.stringify({ code, description }) }),
);

export const deleteProgramOutcome = createAsyncThunk('programOutcomes/delete', async (poId) => {
  await apiFetch(`/program-outcomes/${poId}`, { method: 'DELETE' });
  return poId;
});
