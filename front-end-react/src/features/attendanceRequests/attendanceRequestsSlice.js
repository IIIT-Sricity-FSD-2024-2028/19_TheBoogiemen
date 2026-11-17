/**
 * attendanceRequestsSlice.js — grant doesn't optimistically patch state;
 * the component refetches afterward (dispatches fetchAttendanceRequests()
 * again), same as the pre-Redux page's own grant() -> load() pattern. Kept
 * that way deliberately: markAttendanceRequest's backend side has real
 * ownership-gate logic (a faculty can only grant a request for a student
 * they actually teach) and returns no record shape worth assuming here.
 */
import { createSlice } from '@reduxjs/toolkit';
import { fetchAttendanceRequests } from './attendanceRequestsThunks';

const initialState = {
  items: undefined, // undefined = not loaded yet (matches the pre-Redux page's own sentinel)
  status: 'idle',
};

const attendanceRequestsSlice = createSlice({
  name: 'attendanceRequests',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAttendanceRequests.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchAttendanceRequests.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchAttendanceRequests.rejected, (state) => {
        state.status = 'failed';
        state.items = [];
      });
  },
});

export default attendanceRequestsSlice.reducer;
