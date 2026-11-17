/**
 * programOutcomesSlice.js — same CRUD shape as holidaysSlice. create/delete
 * update `items` from the thunk's own response (createProgramOutcome()
 * already returns the full new record) rather than refetching. Unlike
 * holidays, the backend applies no sort order here, so a plain append
 * matches what a refetch would show exactly (insertion order).
 */
import { createSlice } from '@reduxjs/toolkit';
import { fetchProgramOutcomes, createProgramOutcome, deleteProgramOutcome } from './programOutcomesThunks';

const initialState = {
  items: [],
  status: 'idle',
  error: null,
};

const programOutcomesSlice = createSlice({
  name: 'programOutcomes',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProgramOutcomes.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchProgramOutcomes.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchProgramOutcomes.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
      .addCase(createProgramOutcome.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })
      .addCase(deleteProgramOutcome.fulfilled, (state, action) => {
        state.items = state.items.filter((po) => po.po_id !== action.payload);
      });
  },
});

export default programOutcomesSlice.reducer;
