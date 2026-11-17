import { createSlice } from '@reduxjs/toolkit';
import { fetchAllLeaves } from './adminLeaveThunks';

const initialState = {
  items: undefined, // undefined = not loaded yet
  status: 'idle',
};

const adminLeaveSlice = createSlice({
  name: 'adminLeave',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllLeaves.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchAllLeaves.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchAllLeaves.rejected, (state) => {
        state.status = 'failed';
        state.items = [];
      });
  },
});

export default adminLeaveSlice.reducer;
