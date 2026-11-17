import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiFetch } from '../../api/client';

/** GET /fees returns { summary, fees } together — the summary
 *  (overdue count, compliance rate) is server-computed across every fee,
 *  so every mutation below is followed by a refetch rather than a splice:
 *  patching just the one changed record would leave `summary` stale. */
export const fetchFees = createAsyncThunk('fees/fetch', () => apiFetch('/fees'));

export const payFee = createAsyncThunk('fees/pay', (feeId) => apiFetch(`/fees/${feeId}/pay`, { method: 'PATCH' }));

export const createFee = createAsyncThunk('fees/create', (payload) =>
  apiFetch('/fees', { method: 'POST', body: JSON.stringify(payload) }),
);

export const updateFee = createAsyncThunk('fees/update', ({ id, payload }) =>
  apiFetch(`/fees/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
);
