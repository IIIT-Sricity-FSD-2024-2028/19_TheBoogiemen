import { createSlice } from '@reduxjs/toolkit';
import { fetchMyOutcomes } from './studentOutcomesThunks';

const initialState = {
  report: undefined, // undefined = not loaded, null = failed
  error: null,
};

const studentOutcomesSlice = createSlice({
  name: 'studentOutcomes',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyOutcomes.fulfilled, (state, action) => {
        state.report = action.payload;
      })
      .addCase(fetchMyOutcomes.rejected, (state, action) => {
        state.error = action.error.message;
      });
  },
});

export default studentOutcomesSlice.reducer;
