import { createSlice } from '@reduxjs/toolkit';
import { fetchMyCourses } from './studentCoursesThunks';

const initialState = {
  items: null, // null = not loaded yet, matching every pre-Redux consumer's own sentinel
  status: 'idle',
};

const studentCoursesSlice = createSlice({
  name: 'studentCourses',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyCourses.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchMyCourses.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchMyCourses.rejected, (state) => {
        state.status = 'failed';
        state.items = [];
      });
  },
});

export default studentCoursesSlice.reducer;
