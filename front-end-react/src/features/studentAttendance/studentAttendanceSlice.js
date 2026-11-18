import { createSlice } from '@reduxjs/toolkit';
import { fetchMyAttendance, fetchAttendanceCalendar } from './studentAttendanceThunks';

const initialState = {
  data: undefined, // undefined = not loaded, null = failed (overview)
  error: null,
  byMonth: {}, // 'YYYY-MM' -> calendar days array, or null while loading
};

const studentAttendanceSlice = createSlice({
  name: 'studentAttendance',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyAttendance.fulfilled, (state, action) => {
        state.data = action.payload;
      })
      .addCase(fetchMyAttendance.rejected, (state, action) => {
        state.error = action.error.message;
      })
      .addCase(fetchAttendanceCalendar.pending, (state, action) => {
        state.byMonth[action.meta.arg] = null;
      })
      .addCase(fetchAttendanceCalendar.fulfilled, (state, action) => {
        state.byMonth[action.meta.arg] = action.payload;
      })
      .addCase(fetchAttendanceCalendar.rejected, (state, action) => {
        state.byMonth[action.meta.arg] = [];
      });
  },
});

export default studentAttendanceSlice.reducer;
