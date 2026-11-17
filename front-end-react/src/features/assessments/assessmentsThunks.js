import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiFetch } from '../../api/client';

export const fetchAssessments = createAsyncThunk('assessments/fetch', (facultyId) =>
  apiFetch(`/assessments?faculty_id=${facultyId}`),
);

export const createAssessment = createAsyncThunk('assessments/create', (payload) =>
  apiFetch('/assessments', { method: 'POST', body: JSON.stringify(payload) }),
);

export const updateAssessment = createAsyncThunk('assessments/update', ({ id, payload }) =>
  apiFetch(`/assessments/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
);

export const deleteAssessment = createAsyncThunk('assessments/delete', async (id) => {
  await apiFetch(`/assessments/${id}`, { method: 'DELETE' });
  return id;
});

export const updateAssessmentOutcomes = createAsyncThunk('assessments/updateOutcomes', ({ id, loIds }) =>
  apiFetch(`/assessments/${id}/outcomes`, { method: 'PUT', body: JSON.stringify({ lo_ids: loIds }) }),
);
