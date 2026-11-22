/**
 * coursesSlice.js — REDUX_MIGRATION_PLAN.md §2: "courses (read-only
 * reference)". Plain list + status/error, the simplest shape in the plan —
 * no mutations, no per-param keying needed (unlike classPerformance's
 * byCourse — this endpoint takes no params at all).
 */
import { createSlice } from '@reduxjs/toolkit';
import { fetchCourses } from './coursesThunks';

const initialState = {
  items: [],
  status: 'idle',
  error: null,
};

const coursesSlice = createSlice({
  name: 'courses',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCourses.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchCourses.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchCourses.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      });
  },
});

export default coursesSlice.reducer;
