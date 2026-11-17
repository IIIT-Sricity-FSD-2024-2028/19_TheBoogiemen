import { createSlice } from '@reduxjs/toolkit';
import {
  fetchColleges,
  fetchRevenue,
  fetchSupportThreads,
  fetchSupportThread,
  replySupportThread,
} from './billingThunks';

const initialState = {
  colleges: undefined, // undefined = not loaded yet
  revenue: undefined, // undefined = not loaded, null = failed
  supportThreads: undefined,
  byThreadId: {}, // threadId -> thread with messages
};

const billingSlice = createSlice({
  name: 'billing',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchColleges.fulfilled, (state, action) => {
        state.colleges = action.payload;
      })
      .addCase(fetchColleges.rejected, (state) => {
        state.colleges = [];
      })
      .addCase(fetchRevenue.fulfilled, (state, action) => {
        state.revenue = action.payload;
      })
      .addCase(fetchRevenue.rejected, (state) => {
        state.revenue = null;
      })
      .addCase(fetchSupportThreads.fulfilled, (state, action) => {
        state.supportThreads = action.payload;
      })
      .addCase(fetchSupportThread.fulfilled, (state, action) => {
        state.byThreadId[action.meta.arg] = action.payload;
      })
      .addCase(replySupportThread.fulfilled, (state, action) => {
        state.byThreadId[action.meta.arg.threadId] = action.payload;
      });
  },
});

export default billingSlice.reducer;
