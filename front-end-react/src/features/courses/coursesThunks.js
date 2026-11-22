import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiFetch } from '../../api/client';

/** The college-wide course list — read-only reference data (REDUX_MIGRATION_PLAN.md §2/§6 Phase 3). */
export const fetchCourses = createAsyncThunk('courses/fetch', () => apiFetch('/courses'));
