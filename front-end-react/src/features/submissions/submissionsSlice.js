import { createSlice } from '@reduxjs/toolkit';
import { fetchPendingSubmissions } from './submissionsThunks';

const initialState = {
  pending: null, // null = not loaded yet
};

const submissionsSlice = createSlice({
  name: 'submissions',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPendingSubmissions.fulfilled, (state, action) => {
        state.pending = action.payload;
      })
      .addCase(fetchPendingSubmissions.rejected, (state) => {
        state.pending = [];
      });
  },
});

export default submissionsSlice.reducer;
