import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiFetch } from '../../api/client';

export const fetchHolidays = createAsyncThunk('holidays/fetch', () => apiFetch('/holidays'));

export const createHoliday = createAsyncThunk('holidays/create', ({ date, label }) =>
  apiFetch('/holidays', { method: 'POST', body: JSON.stringify({ date, label }) }),
);

export const deleteHoliday = createAsyncThunk('holidays/delete', async (holidayId) => {
  await apiFetch(`/holidays/${holidayId}`, { method: 'DELETE' });
  return holidayId;
});
