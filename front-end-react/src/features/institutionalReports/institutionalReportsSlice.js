/**
 * institutionalReportsSlice.js — two independent plain reads (no params,
 * no mutations). `atRisk` defaults to `null` (not `[]`) to distinguish
 * "not loaded yet" from "loaded, zero at-risk students" — the page itself
 * already relies on exactly that distinction (`atRisk === undefined ?
 * null : atRisk.length === 0 ? <healthy message> : ...`).
 */
import { createSlice } from '@reduxjs/toolkit';
import { fetchAtRisk, fetchOverview } from './institutionalReportsThunks';

const initialState = {
  atRisk: null,
  atRiskStatus: 'idle',
  overview: null, // the `summary` object, or null before the first load
  overviewStatus: 'idle',
  error: null,
};

const institutionalReportsSlice = createSlice({
  name: 'institutionalReports',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAtRisk.pending, (state) => {
        state.atRiskStatus = 'loading';
      })
      .addCase(fetchAtRisk.fulfilled, (state, action) => {
        state.atRiskStatus = 'succeeded';
        state.atRisk = action.payload;
      })
      .addCase(fetchAtRisk.rejected, (state, action) => {
        state.atRiskStatus = 'failed';
        state.atRisk = [];
        state.error = action.error.message;
      })
      .addCase(fetchOverview.pending, (state) => {
        state.overviewStatus = 'loading';
      })
      .addCase(fetchOverview.fulfilled, (state, action) => {
        state.overviewStatus = 'succeeded';
        state.overview = action.payload.summary;
      })
      .addCase(fetchOverview.rejected, (state, action) => {
        state.overviewStatus = 'failed';
        state.overview = null;
        state.error = action.error.message;
      });
  },
});

export default institutionalReportsSlice.reducer;
