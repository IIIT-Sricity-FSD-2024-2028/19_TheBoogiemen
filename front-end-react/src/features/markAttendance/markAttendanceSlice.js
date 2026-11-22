/**
 * markAttendanceSlice.js — the "today's roster for this course+section"
 * fetch, with the same requestId stale-response guard as
 * attendanceRegisterSlice (same shape of risk: changing the course
 * dropdown fires a new fetch before the previous one resolves — nothing
 * cancelled it pre-Redux either). `submitAttendance` isn't cached here at
 * all: its response (`records`, used once for the "kept as Excused"
 * toast) is read directly off the resolved thunk action in the component,
 * same as holidaysSlice's create() — no long-lived state needed for a
 * one-shot POST whose result is consumed immediately and then discarded.
 */
import { createSlice } from '@reduxjs/toolkit';
import { fetchTodayRoster } from './markAttendanceThunks';

const initialState = {
  students: null, // null = nothing loaded yet, matching the pre-Redux page's own sentinel
  holiday: null,
  status: 'idle',
  currentRequestId: undefined,
};

const markAttendanceSlice = createSlice({
  name: 'markAttendance',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTodayRoster.pending, (state, action) => {
        state.status = 'loading';
        state.currentRequestId = action.meta.requestId;
        state.students = null;
        state.holiday = null;
      })
      .addCase(fetchTodayRoster.fulfilled, (state, action) => {
        if (action.meta.requestId !== state.currentRequestId) return; // superseded
        state.status = 'succeeded';
        if (action.payload.holiday) {
          state.holiday = action.payload;
          state.students = [];
        } else {
          state.students = action.payload.students || [];
        }
      })
      .addCase(fetchTodayRoster.rejected, (state, action) => {
        if (action.meta.requestId !== state.currentRequestId) return; // superseded
        state.status = 'failed';
        state.students = [];
      });
  },
});

export default markAttendanceSlice.reducer;
