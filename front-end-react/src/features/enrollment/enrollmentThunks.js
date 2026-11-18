import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiFetch } from '../../api/client';

/**
 * CourseManagement.jsx's EnrollStudentModal only — a one-off mutation with
 * no list anywhere in the app reading enrollment records directly, so no
 * slice/reducer case, just the thunk for dispatch + error handling.
 */
export const enrollStudent = createAsyncThunk('enrollment/create', (payload) =>
  apiFetch('/enrollment', { method: 'POST', body: JSON.stringify(payload) }),
);
