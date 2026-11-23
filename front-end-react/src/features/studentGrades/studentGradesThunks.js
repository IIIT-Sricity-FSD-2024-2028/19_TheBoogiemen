import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiFetch } from '../../api/client';

/** Combines the same three fetches Grades.jsx's own useEffect did — all
 *  three are raw (unwrapped) per students.controller.ts. Shared with
 *  Dashboard.jsx's PredictedGradeBox, which only reads `.grades.predictedGrade`
 *  but gets the same cached result instead of a second round-trip. */
export const fetchMyGrades = createAsyncThunk('studentGrades/fetch', async () => {
  const [grades, marks, trend] = await Promise.all([
    apiFetch('/students/me/grades'),
    apiFetch('/students/me/marks'),
    apiFetch('/students/me/grade-trend').catch(() => []),
  ]);
  return { grades, marks, trend };
});
