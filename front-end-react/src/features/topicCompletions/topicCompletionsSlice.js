import { createSlice } from '@reduxjs/toolkit';
import { fetchTopicCompletionsForCourse, setTopicCompletion } from './topicCompletionsThunks';

const initialState = {
  byCourse: {}, // courseId -> { [section]: { [topicId]: progress } }
};

const topicCompletionsSlice = createSlice({
  name: 'topicCompletions',
  initialState,
  reducers: {
    // Synchronous, local-only slider-drag feedback — the committed value
    // only lands once setTopicCompletion's own thunk resolves (onSave).
    // Same two-step shape the pre-Redux page's own onProgressChange (local
    // useState) / onSave (PATCH) split already had.
    previewSet(state, action) {
      const { courseId, section, topicId, progress } = action.payload;
      state.byCourse[courseId] ??= {};
      state.byCourse[courseId][section] ??= {};
      state.byCourse[courseId][section][topicId] = progress;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTopicCompletionsForCourse.fulfilled, (state, action) => {
        state.byCourse[action.meta.arg.courseId] = action.payload;
      })
      .addCase(setTopicCompletion.fulfilled, (state, action) => {
        const { courseId, section, topicId, progress } = action.payload;
        state.byCourse[courseId] ??= {};
        state.byCourse[courseId][section] ??= {};
        state.byCourse[courseId][section][topicId] = progress;
      });
  },
});

export const { previewSet } = topicCompletionsSlice.actions;
export default topicCompletionsSlice.reducer;
