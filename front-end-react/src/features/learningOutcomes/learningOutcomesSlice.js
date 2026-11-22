/**
 * learningOutcomesSlice.js — built read-only in Dev 3's pass (no consumer
 * yet at the time); now extended with create/delete/po-mapping since
 * Dashboard.jsx's CourseOutcomesModal (Dev 4's track) is the first real
 * consumer and needs more than a read. AssessmentMapping.jsx's
 * OutcomesModal only ever needed the read half, unchanged.
 *
 * Keyed by courseId, same reasoning as classPerformanceSlice's byCourse —
 * this endpoint is always scoped to one course, never fetched unscoped.
 */
import { createSlice } from '@reduxjs/toolkit';
import {
  fetchLearningOutcomes,
  createLearningOutcome,
  deleteLearningOutcome,
  setLearningOutcomePoMapping,
} from './learningOutcomesThunks';

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
      })
      .addCase(createLearningOutcome.fulfilled, (state, action) => {
        const courseId = action.meta.arg.courseId;
        (state.byCourse[courseId] ??= []).push(action.payload);
      })
      .addCase(deleteLearningOutcome.fulfilled, (state, action) => {
        const { loId, courseId } = action.payload;
        if (state.byCourse[courseId]) {
          state.byCourse[courseId] = state.byCourse[courseId].filter((lo) => lo.lo_id !== loId);
        }
      })
      .addCase(setLearningOutcomePoMapping.fulfilled, (state, action) => {
        const { courseId, lo } = action.payload;
        const list = state.byCourse[courseId];
        if (list) {
          const idx = list.findIndex((x) => x.lo_id === lo.lo_id);
          if (idx !== -1) list[idx] = lo;
        }
      });
  },
});

export default learningOutcomesSlice.reducer;
