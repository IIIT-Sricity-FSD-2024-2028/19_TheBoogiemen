import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiFetch } from '../../api/client';

/** Shared by Dashboard.jsx's ActionRequired (counting pending BTP
 *  submissions) and StudentOverview.jsx's AssignBTPModal (creating one). */
export const fetchResearch = createAsyncThunk('research/fetch', () => apiFetch('/research'));

export const createResearch = createAsyncThunk('research/create', (payload) =>
  apiFetch('/research', { method: 'POST', body: JSON.stringify(payload) }),
);
