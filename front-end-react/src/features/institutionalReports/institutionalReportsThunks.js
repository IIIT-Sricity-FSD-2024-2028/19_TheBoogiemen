import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiFetch } from '../../api/client';

export const fetchAtRisk = createAsyncThunk('institutionalReports/fetchAtRisk', () => apiFetch('/reports/at-risk'));

// Returns the whole { summary } envelope — institutionalReportsSlice stores
// summary directly, same as the pre-Redux page's own `.then(data => setOverview(data.summary))`.
export const fetchOverview = createAsyncThunk('institutionalReports/fetchOverview', () => apiFetch('/reports/overview'));
