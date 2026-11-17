import { createSlice } from '@reduxjs/toolkit';
import { fetchMyThread, sendSupportMessage } from './supportThreadThunks';

const initialState = {
  messages: undefined, // undefined = not loaded yet
};

const supportThreadSlice = createSlice({
  name: 'supportThread',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyThread.fulfilled, (state, action) => {
        state.messages = action.payload;
      })
      .addCase(fetchMyThread.rejected, (state) => {
        state.messages = [];
      })
      .addCase(sendSupportMessage.fulfilled, (state, action) => {
        state.messages = action.payload;
      });
  },
});

export default supportThreadSlice.reducer;
