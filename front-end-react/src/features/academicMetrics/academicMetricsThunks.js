import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiFetch } from '../../api/client';

/**
 * GET /metrics/academic, filterable by course_id and/or semester —
 * REDUX_MIGRATION_PLAN.md §7's filter-keyed shape, same reasoning as
 * classPerformanceSlice's byCourse: a plain useState slot shows the
 * PREVIOUS filter's data mislabeled as the new one if the dropdown
 * changes again before the first fetch resolves. Keyed by the combined
 * "courseId|semester" filter pair, not just courseId, since either one
 * can change independently.
 */
export const fetchAcademicMetrics = createAsyncThunk('academicMetrics/fetch', ({ courseId, semester }) => {
  const params = new URLSearchParams();
  if (courseId) params.set('course_id', courseId);
  if (semester) params.set('semester', semester);
  const qs = params.toString();
  return apiFetch(`/metrics/academic${qs ? '?' + qs : ''}`);
});
