/**
 * learningOutcomesSlice.js — REDUX_MIGRATION_PLAN.md §2 names this as part
 * of Dev 3's domain ownership, but no Dev-3-owned file currently fetches
 * `/learning-outcomes` (its real callers — AssessmentMapping.jsx,
 * faculty/Dashboard.jsx's OutcomesModal — belong to Dev 4's track). Built
 * here as infrastructure only, same situation Dev 1's createFetchThunk.js
 * was in until a later phase consumed it, ready for whichever page's
 * migration needs it next.
 *
 * Keyed by courseId, same reasoning as classPerformanceSlice's byCourse —
 * this endpoint is always scoped to one course, never fetched unscoped.
 */
import { createSlice } from '@reduxjs/toolkit';
import { fetchLearningOutcomes } from './learningOutcomesThunks';

const initialState = {
  byCourse: {}, // courseId -> LearningOutcome[]
  status: 'idle',
  error: null,
};

const learningOutcomesSlice = createSlice({
  name: 'learningOutcomes',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchLearningOutcomes.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchLearningOutcomes.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.byCourse[action.meta.arg] = action.payload;
      })
      .addCase(fetchLearningOutcomes.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      });
  },
});

export default learningOutcomesSlice.reducer;
