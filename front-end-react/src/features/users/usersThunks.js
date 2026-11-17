import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiFetch } from '../../api/client';

/**
 * GET /admin/users — kept deliberately minimal (read-only) for now. Built
 * here because Dashboard.jsx/StudentOverview.jsx (Dev 4's files) both need
 * it, even though the eventual CRUD home for this domain is
 * admin/UserManagement.jsx (a later track) — whoever migrates that page
 * extends this same slice with create/update/delete rather than building
 * a second one, same "promote when a real second file needs it" pattern
 * facultyCoursesSlice/coursesSlice already established.
 */
export const fetchAllUsers = createAsyncThunk('users/fetchAll', () => apiFetch('/admin/users'));
