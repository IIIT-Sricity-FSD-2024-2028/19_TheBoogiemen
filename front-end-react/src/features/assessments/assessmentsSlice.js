/**
 * assessmentsSlice.js — deliberately does NOT splice create/update/delete/
 * updateOutcomes' own responses into `items`. GET /assessments enriches
 * each row with course_code/course_name/has_marks via a join
 * (admin/common.controller.ts's list handler); the mutation endpoints
 * return the raw record without that join. Splicing the raw response
 * would silently drop those fields from the just-mutated row until the
 * next real reload — checked directly against the backend, not assumed.
 * The pre-Redux page already knew this: every one of its mutation
 * handlers called `load()` (a full refetch) afterward, never patched
 * state from the mutation's own response. Same here — the component
 * dispatches fetchAssessments(facultyId) again after each mutation
 * succeeds.
 */
import { createSlice } from '@reduxjs/toolkit';
import { fetchAssessments } from './assessmentsThunks';

const initialState = {
  items: undefined, // undefined = not loaded yet
  status: 'idle',
};

const assessmentsSlice = createSlice({
  name: 'assessments',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAssessments.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchAssessments.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchAssessments.rejected, (state) => {
        state.status = 'failed';
        state.items = [];
      });
  },
});

export default assessmentsSlice.reducer;
