import { createSlice } from '@reduxjs/toolkit';
import { fetchMySyllabusProgress } from './studentSyllabusThunks';

const initialState = {
  progress: undefined, // undefined = not loaded yet
  error: null,
};

const studentSyllabusSlice = createSlice({
  name: 'studentSyllabus',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMySyllabusProgress.fulfilled, (state, action) => {
        state.progress = action.payload;
      })
      .addCase(fetchMySyllabusProgress.rejected, (state, action) => {
        state.error = action.error.message;
      });
  },
});

export default studentSyllabusSlice.reducer;
