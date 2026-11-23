import { createSlice } from '@reduxjs/toolkit';
import { fetchTimetable, validateTimetable } from './timetableManagementThunks';

const initialState = {
  data: null, // { grid, slots } for the current section filter
  validationReport: null,
};

const timetableManagementSlice = createSlice({
  name: 'timetableManagement',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTimetable.fulfilled, (state, action) => {
        state.data = action.payload;
      })
      .addCase(validateTimetable.fulfilled, (state, action) => {
        state.validationReport = action.payload;
      });
  },
});

export default timetableManagementSlice.reducer;
