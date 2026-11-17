import { createSlice } from '@reduxjs/toolkit';
import { fetchMyMeetings, fetchMeetingDirectory } from './meetingsThunks';

const initialState = {
  items: null, // null = not loaded yet, matching both section pages' own useState(null)
  directory: null, // the create-modal's counterpart list, refetched each time it opens
};

const meetingsSlice = createSlice({
  name: 'meetings',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyMeetings.fulfilled, (state, action) => {
        state.items = action.payload;
      })
      .addCase(fetchMyMeetings.rejected, (state) => {
        state.items = [];
      })
      .addCase(fetchMeetingDirectory.pending, (state) => {
        state.directory = null;
      })
      .addCase(fetchMeetingDirectory.fulfilled, (state, action) => {
        state.directory = action.payload;
      })
      .addCase(fetchMeetingDirectory.rejected, (state) => {
        state.directory = [];
      });
  },
});

export default meetingsSlice.reducer;
