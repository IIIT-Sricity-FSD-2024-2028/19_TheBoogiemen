import { createSlice } from '@reduxjs/toolkit';
import { fetchFacultyStudents } from './facultyStudentsThunks';

const initialState = {
  items: null, // null = not loaded yet
  status: 'idle',
};

const facultyStudentsSlice = createSlice({
  name: 'facultyStudents',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchFacultyStudents.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchFacultyStudents.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchFacultyStudents.rejected, (state) => {
        state.status = 'failed';
        state.items = [];
      });
  },
});

export default facultyStudentsSlice.reducer;
