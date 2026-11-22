/**
 * attendanceRegisterSlice.js — five independent filters (course, section,
 * date range, status), refetched on every change. Unlike classPerformance's
 * single `courseId` (cheaply keyed as byCourse[courseId] — see that
 * slice's own comment and REDUX_MIGRATION_PLAN.md §7), caching every
 * combination of five filters isn't worth it: nobody re-selects the exact
 * same five-filter combo for the cache to pay off, and the real risk is
 * just a slow, now-superseded request overwriting the current filters'
 * data when it finally resolves.
 *
 * Fixed with RTK's own documented pattern for this: track the latest
 * dispatched thunk's `requestId` and only apply a request's fulfilled/
 * rejected action if it's still the most recent one. The pre-Redux page
 * had this exact race (nothing cancelled an in-flight fetch when the
 * filters changed again before it resolved) — this closes a real,
 * previously-unguarded bug, not just a hypothetical one.
 */
import { createSlice } from '@reduxjs/toolkit';
import { fetchAttendanceRegister } from './attendanceRegisterThunks';

const initialState = {
  records: null,
  summary: null,
  status: 'idle',
  error: null,
  currentRequestId: undefined,
};

const attendanceRegisterSlice = createSlice({
  name: 'attendanceRegister',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAttendanceRegister.pending, (state, action) => {
        state.status = 'loading';
        state.currentRequestId = action.meta.requestId;
      })
      .addCase(fetchAttendanceRegister.fulfilled, (state, action) => {
        if (action.meta.requestId !== state.currentRequestId) return; // superseded
        state.status = 'succeeded';
        state.records = action.payload.records;
        state.summary = action.payload.summary;
      })
      .addCase(fetchAttendanceRegister.rejected, (state, action) => {
        if (action.meta.requestId !== state.currentRequestId) return; // superseded
        state.status = 'failed';
        state.error = action.error.message;
      });
  },
});

export default attendanceRegisterSlice.reducer;
