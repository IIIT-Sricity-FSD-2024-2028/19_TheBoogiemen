import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiFetch } from '../../api/client';

/**
 * Combines two endpoints exactly as the pre-Redux page's own Promise.all
 * did — including the asymmetric error handling: a failed /outcomes fetch
 * degrades to `outcomes: null` (the page already renders "no CO data" for
 * null), while a failed /class-performance fetch fails the whole thunk,
 * since there's nothing meaningful to show without it.
 */
export const fetchClassPerformanceForCourse = createAsyncThunk(
  'classPerformance/fetchForCourse',
  async (courseId) => {
    const [performance, outcomes] = await Promise.all([
      apiFetch(`/faculty/me/class-performance?course_id=${courseId}`),
      apiFetch(`/faculty/me/outcomes?course_id=${courseId}`).catch(() => null),
    ]);
    return { performance, outcomes };
  },
);
