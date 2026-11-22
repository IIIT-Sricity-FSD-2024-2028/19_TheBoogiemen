import { createSlice } from '@reduxjs/toolkit';
import { fetchFacultyLeaves } from './facultyLeaveThunks';

const initialState = {
  items: undefined, // undefined = not loaded yet
  status: 'idle',
};

const facultyLeaveSlice = createSlice({
  name: 'facultyLeave',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchFacultyLeaves.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchFacultyLeaves.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchFacultyLeaves.rejected, (state) => {
        state.status = 'failed';
        state.items = [];
      });
  },
});

export default facultyLeaveSlice.reducer;
