import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiFetch } from '../../api/client';

/**
 * GET /admin/users — built minimal (read-only) in Dev 4's pass for
 * Dashboard.jsx/StudentOverview.jsx; now extended with the full CRUD
 * UserManagement.jsx needs. GET /admin/users and every mutation below
 * return the same sanitizeUser() shape (checked against
 * admin/common.controller.ts directly) — unlike assessmentsSlice, there's
 * no extra join on the list endpoint, so splicing each mutation's own
 * response into `items` is safe here.
 */
export const fetchAllUsers = createAsyncThunk('users/fetchAll', () => apiFetch('/admin/users'));

export const createUser = createAsyncThunk('users/create', (payload) =>
  apiFetch('/users', { method: 'POST', body: JSON.stringify(payload) }),
);

export const updateUserProfile = createAsyncThunk('users/updateProfile', ({ id, payload }) =>
  apiFetch(`/users/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
);

export const updateUserRole = createAsyncThunk('users/updateRole', ({ id, role }) =>
  apiFetch(`/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
);

export const deleteUser = createAsyncThunk('users/delete', async (id) => {
  await apiFetch(`/users/${id}`, { method: 'DELETE' });
  return id;
});

/**
 * The app's one multipart thunk — body is a FormData, not JSON.stringify,
 * since it carries the uploaded CSV file itself (REDUX_MIGRATION_PLAN.md
 * §4's worked example).
 */
export const bulkOnboardUsers = createAsyncThunk('users/bulkOnboard', ({ role, file }) => {
  const formData = new FormData();
  formData.append('file', file);
  return apiFetch(`/users/bulk-onboard?role=${role}`, { method: 'POST', body: formData });
});
