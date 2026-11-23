import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiFetch } from '../../api/client';

/** Shared by Dashboard.jsx's ActionRequired (counting pending BTP
 *  submissions) and StudentOverview.jsx's AssignBTPModal (creating one). */
export const fetchResearch = createAsyncThunk('research/fetch', () => apiFetch('/research'));

export const createResearch = createAsyncThunk('research/create', (payload) =>
  apiFetch('/research', { method: 'POST', body: JSON.stringify(payload) }),
);

// Used by both ResearchPanel.jsx's student upload flow and its faculty
// progress-update flow. No reducer case — both callers refetch the whole
// list afterward (ResearchPanel's own load()), same as the pre-Redux code.
export const updateResearchProgress = createAsyncThunk('research/updateProgress', ({ projectId, payload }) =>
  apiFetch(`/research/${projectId}/progress`, { method: 'PATCH', body: JSON.stringify(payload) }),
);
