import { createSlice } from '@reduxjs/toolkit';
import { fetchFees } from './feesThunks';

const initialState = {
  fees: undefined, // undefined = not loaded yet
  summary: { overdue: 0, compliance_rate: '0%' },
  status: 'idle',
};

const feesSlice = createSlice({
  name: 'fees',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchFees.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchFees.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.fees = action.payload.fees || [];
        state.summary = action.payload.summary || { overdue: 0, compliance_rate: '0%' };
      })
      .addCase(fetchFees.rejected, (state) => {
        state.status = 'failed';
        state.fees = [];
      });
  },
});

export default feesSlice.reducer;
