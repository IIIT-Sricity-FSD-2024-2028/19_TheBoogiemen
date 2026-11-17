/**
 * timetableSlice.js — keyed by role ('student' | 'faculty'), same
 * byCourse-style keying as classPerformance/learningOutcomes, here because
 * one shared component (Timetable.jsx) renders both roles. Also read
 * directly by Dashboard.jsx's Metrics (faculty's own weekly slot count),
 * which previously ran its own independent fetch of the same endpoint —
 * this dedupes that into one fetch, read by both.
 */
import { createSlice } from '@reduxjs/toolkit';
import { fetchTimetable } from './timetableThunks';

const initialState = {
  byRole: {}, // role -> { data, status, error }
};

const timetableSlice = createSlice({
  name: 'timetable',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTimetable.pending, (state, action) => {
        const role = action.meta.arg;
        state.byRole[role] = { data: state.byRole[role]?.data ?? undefined, status: 'loading', error: null };
      })
      .addCase(fetchTimetable.fulfilled, (state, action) => {
        const role = action.meta.arg;
        state.byRole[role] = { data: action.payload, status: 'succeeded', error: null };
      })
      .addCase(fetchTimetable.rejected, (state, action) => {
        const role = action.meta.arg;
        state.byRole[role] = { data: undefined, status: 'failed', error: action.error.message };
      });
  },
});

export default timetableSlice.reducer;
