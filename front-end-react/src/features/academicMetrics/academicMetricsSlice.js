/**
 * academicMetricsSlice.js — keyed by requestId stale-guard rather than a
 * filter-key map: unlike classPerformance's byCourse (several courses'
 * data all worth keeping around at once), there's only ever one "current
 * filter" view on screen here, so the simpler shape is the stale-response
 * guard from attendanceRegisterSlice/markAttendanceSlice, not a byKey map.
 */
import { createSlice } from '@reduxjs/toolkit';
import { fetchAcademicMetrics } from './academicMetricsThunks';

const initialState = {
  data: undefined, // undefined = not loaded yet
  status: 'idle',
  currentRequestId: undefined,
};

const academicMetricsSlice = createSlice({
  name: 'academicMetrics',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAcademicMetrics.pending, (state, action) => {
        state.status = 'loading';
        state.currentRequestId = action.meta.requestId;
        state.data = undefined;
      })
      .addCase(fetchAcademicMetrics.fulfilled, (state, action) => {
        if (action.meta.requestId !== state.currentRequestId) return; // superseded
        state.status = 'succeeded';
        state.data = action.payload;
      })
      .addCase(fetchAcademicMetrics.rejected, (state, action) => {
        if (action.meta.requestId !== state.currentRequestId) return; // superseded
        state.status = 'failed';
        state.data = null;
      });
  },
});

export default academicMetricsSlice.reducer;
