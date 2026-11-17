import { createSlice } from '@reduxjs/toolkit';
import { fetchResearch, createResearch } from './researchThunks';

const initialState = {
  items: undefined, // undefined = not loaded yet
  status: 'idle',
};

const researchSlice = createSlice({
  name: 'research',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchResearch.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchResearch.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchResearch.rejected, (state) => {
        state.status = 'failed';
        state.items = [];
      })
      .addCase(createResearch.fulfilled, (state, action) => {
        // POST /research wraps its response ({ success, data }), unlike
        // holidays/programOutcomes which return the raw record directly —
        // checked against the backend rather than assumed.
        if (Array.isArray(state.items)) state.items.push(action.payload.data);
      });
  },
});

export default researchSlice.reducer;
