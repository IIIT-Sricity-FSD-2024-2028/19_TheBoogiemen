import { createSlice } from '@reduxjs/toolkit';
import { fetchResourceBookings } from './resourceBookingsThunks';

const initialState = {
  items: undefined, // undefined = not loaded yet
  status: 'idle',
};

const resourceBookingsSlice = createSlice({
  name: 'resourceBookings',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchResourceBookings.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchResourceBookings.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchResourceBookings.rejected, (state) => {
        state.status = 'failed';
        state.items = [];
      });
  },
});

export default resourceBookingsSlice.reducer;
