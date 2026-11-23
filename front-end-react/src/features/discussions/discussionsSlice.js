import { createSlice } from '@reduxjs/toolkit';
import { fetchDiscussions, fetchDiscussionThread } from './discussionsThunks';

const initialState = {
  items: undefined, // undefined = not loaded yet
  byId: {}, // postId -> thread with replies
};

const discussionsSlice = createSlice({
  name: 'discussions',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDiscussions.fulfilled, (state, action) => {
        state.items = action.payload;
      })
      .addCase(fetchDiscussions.rejected, (state) => {
        state.items = [];
      })
      .addCase(fetchDiscussionThread.pending, (state, action) => {
        state.byId[action.meta.arg] = null;
      })
      .addCase(fetchDiscussionThread.fulfilled, (state, action) => {
        state.byId[action.meta.arg] = action.payload;
      });
  },
});

export default discussionsSlice.reducer;
