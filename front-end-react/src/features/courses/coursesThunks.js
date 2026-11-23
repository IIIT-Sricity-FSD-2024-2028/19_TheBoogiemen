import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiFetch } from '../../api/client';

/** The college-wide course list — read-only reference data (REDUX_MIGRATION_PLAN.md §2/§6 Phase 3). */
export const fetchCourses = createAsyncThunk('courses/fetch', () => apiFetch('/courses'));

// Both mutations below (CourseManagement.jsx) don't splice into state —
// the component refetches the whole list afterward, same as the
// pre-Redux page's own onCreated/onSaved -> load() pattern.
export const createCourse = createAsyncThunk('courses/create', (payload) =>
  apiFetch('/courses', { method: 'POST', body: JSON.stringify(payload) }),
);

export const updateCourseSections = createAsyncThunk('courses/updateSections', ({ courseId, sections }) =>
  apiFetch(`/courses/${courseId}/sections`, { method: 'PUT', body: JSON.stringify({ sections }) }),
);
