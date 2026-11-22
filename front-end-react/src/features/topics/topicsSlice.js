import { createSlice } from '@reduxjs/toolkit';
import { fetchTopics } from './topicsThunks';

const initialState = {
  byCourse: {}, // courseId -> { items, status }
};

const topicsSlice = createSlice({
  name: 'topics',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTopics.pending, (state, action) => {
        const courseId = action.meta.arg;
        state.byCourse[courseId] = { items: state.byCourse[courseId]?.items ?? null, status: 'loading' };
      })
      .addCase(fetchTopics.fulfilled, (state, action) => {
        const courseId = action.meta.arg;
        state.byCourse[courseId] = { items: action.payload, status: 'succeeded' };
      })
      .addCase(fetchTopics.rejected, (state, action) => {
        const courseId = action.meta.arg;
        state.byCourse[courseId] = { items: [], status: 'failed' };
      });
  },
});

export default topicsSlice.reducer;
