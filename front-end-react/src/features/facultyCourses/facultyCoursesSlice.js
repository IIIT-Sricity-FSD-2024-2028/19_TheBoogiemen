import { createSlice } from '@reduxjs/toolkit';
import { fetchFacultyCourses } from './facultyCoursesThunks';

const initialState = {
  items: null, // null = not loaded yet (matches both pre-Redux pages' own useState(null))
  status: 'idle',
};

const facultyCoursesSlice = createSlice({
  name: 'facultyCourses',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchFacultyCourses.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchFacultyCourses.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchFacultyCourses.rejected, (state) => {
        state.status = 'failed';
        state.items = [];
      });
  },
});

export default facultyCoursesSlice.reducer;
