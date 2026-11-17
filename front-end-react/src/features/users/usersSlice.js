import { createSlice } from '@reduxjs/toolkit';
import { fetchAllUsers } from './usersThunks';

const initialState = {
  items: [],
  status: 'idle',
  error: null,
};

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllUsers.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchAllUsers.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchAllUsers.rejected, (state, action) => {
        state.status = 'failed';
        state.items = [];
        state.error = action.error.message;
      });
  },
});

export default usersSlice.reducer;
