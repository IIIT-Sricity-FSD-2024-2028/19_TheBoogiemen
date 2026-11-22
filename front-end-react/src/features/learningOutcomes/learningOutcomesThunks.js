import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiFetch } from '../../api/client';

/** GET /learning-outcomes?course_id= — always scoped to one course, never
 *  fetched unscoped (see outcomes.controller.ts). */
export const fetchLearningOutcomes = createAsyncThunk('learningOutcomes/fetch', (courseId) =>
  apiFetch(`/learning-outcomes?course_id=${courseId}`),
);
