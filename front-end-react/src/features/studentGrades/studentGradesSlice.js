import { createSlice } from '@reduxjs/toolkit';
import { fetchMyGrades } from './studentGradesThunks';

const initialState = {
  grades: undefined, // undefined = not loaded yet
  marks: undefined,
  trend: undefined,
  error: null,
};

const studentGradesSlice = createSlice({
  name: 'studentGrades',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyGrades.fulfilled, (state, action) => {
        state.grades = action.payload.grades;
        state.marks = action.payload.marks;
        state.trend = action.payload.trend;
      })
      .addCase(fetchMyGrades.rejected, (state, action) => {
        state.error = action.error.message;
      });
  },
});

export default studentGradesSlice.reducer;
