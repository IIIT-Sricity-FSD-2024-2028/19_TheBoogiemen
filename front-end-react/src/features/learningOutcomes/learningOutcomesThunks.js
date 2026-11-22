import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiFetch } from '../../api/client';

/** GET /learning-outcomes?course_id= — always scoped to one course, never
 *  fetched unscoped (see outcomes.controller.ts). */
export const fetchLearningOutcomes = createAsyncThunk('learningOutcomes/fetch', (courseId) =>
  apiFetch(`/learning-outcomes?course_id=${courseId}`),
);

/**
 * create/delete/po-mapping — added once a real consumer (Dashboard.jsx's
 * CourseOutcomesModal) needed more than the read-only fetch Dev 3's pass
 * built. All three backend endpoints return the raw record directly (no
 * {success,data} wrapper) — checked against outcomes.service.ts rather
 * than assumed, same discipline as every other thunk in this migration.
 */
export const createLearningOutcome = createAsyncThunk('learningOutcomes/create', ({ courseId, code, description }) =>
  apiFetch('/learning-outcomes', { method: 'POST', body: JSON.stringify({ course_id: courseId, code, description }) }),
);

export const deleteLearningOutcome = createAsyncThunk('learningOutcomes/delete', async ({ loId, courseId }) => {
  await apiFetch(`/learning-outcomes/${loId}`, { method: 'DELETE' });
  return { loId, courseId };
});

export const setLearningOutcomePoMapping = createAsyncThunk(
  'learningOutcomes/setPoMapping',
  ({ loId, courseId, poMapping }) =>
    apiFetch(`/learning-outcomes/${loId}/po-mapping`, { method: 'PUT', body: JSON.stringify({ po_mapping: poMapping }) }).then(
      (lo) => ({ courseId, lo }),
    ),
);
