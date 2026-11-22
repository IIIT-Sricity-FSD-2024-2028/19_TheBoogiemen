/**
 * classPerformanceSlice.js — REDUX_MIGRATION_PLAN.md §7's own worked
 * example. `byCourse[courseId]` rather than one flat `performance`/
 * `outcomes` pair: a plain useState slot shows the PREVIOUS course's data
 * mislabeled as the new one if the dropdown changes again before the first
 * fetch resolves (nothing cancelled it) — keying by courseId makes a
 * superseded response land in a slot nobody is reading anymore instead of
 * overwriting the current one. `action.meta.arg` is the courseId
 * createAsyncThunk was dispatched with — no need to thread it through the
 * payload separately (same technique as learningOutcomesSlice's byCourse).
 */
import { createSlice } from '@reduxjs/toolkit';
import { fetchFacultyCourses, fetchClassPerformanceForCourse } from './classPerformanceThunks';

const initialState = {
  courses: null,
  coursesStatus: 'idle',
  byCourse: {}, // courseId -> { performance, outcomes, status, error }
};

const classPerformanceSlice = createSlice({
  name: 'classPerformance',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchFacultyCourses.pending, (state) => {
        state.coursesStatus = 'loading';
      })
      .addCase(fetchFacultyCourses.fulfilled, (state, action) => {
        state.coursesStatus = 'succeeded';
        state.courses = action.payload;
      })
      .addCase(fetchFacultyCourses.rejected, (state) => {
        state.coursesStatus = 'failed';
        state.courses = [];
      })
      .addCase(fetchClassPerformanceForCourse.pending, (state, action) => {
        const courseId = action.meta.arg;
        state.byCourse[courseId] = { performance: null, outcomes: null, status: 'loading', error: null };
      })
      .addCase(fetchClassPerformanceForCourse.fulfilled, (state, action) => {
        const courseId = action.meta.arg;
        state.byCourse[courseId] = {
          performance: action.payload.performance,
          outcomes: action.payload.outcomes,
          status: 'succeeded',
          error: null,
        };
      })
      .addCase(fetchClassPerformanceForCourse.rejected, (state, action) => {
        const courseId = action.meta.arg;
        state.byCourse[courseId] = { performance: null, outcomes: null, status: 'failed', error: action.error.message };
      });
  },
});

export default classPerformanceSlice.reducer;
