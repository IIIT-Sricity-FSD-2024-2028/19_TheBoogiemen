/**
 * marksEntrySlice.js — keyed by assessment_id. createMark/correctMark have
 * no reducer cases at all: the modal always closes and the parent list
 * refetches on a successful submit (same as today), and reopening the
 * modal always dispatches fetchMarksEntryData fresh — nothing reads
 * byAssessment after a mark mutation before that fresh fetch happens, so
 * there's no state here worth patching.
 */
import { createSlice } from '@reduxjs/toolkit';
import { fetchMarksEntryData } from './marksEntryThunks';

const initialState = {
  byAssessment: {}, // assessmentId -> { students, submissions, existingMarks, status }
};

const marksEntrySlice = createSlice({
  name: 'marksEntry',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMarksEntryData.pending, (state, action) => {
        const id = action.meta.arg.assessment_id;
        state.byAssessment[id] = { students: null, submissions: [], existingMarks: [], status: 'loading' };
      })
      .addCase(fetchMarksEntryData.fulfilled, (state, action) => {
        const id = action.meta.arg.assessment_id;
        state.byAssessment[id] = { ...action.payload, status: 'succeeded' };
      })
      .addCase(fetchMarksEntryData.rejected, (state, action) => {
        const id = action.meta.arg.assessment_id;
        state.byAssessment[id] = { students: [], submissions: [], existingMarks: [], status: 'failed' };
      });
  },
});

export default marksEntrySlice.reducer;
