import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiFetch } from '../../api/client';

/**
 * GET/POST /leave — the FACULTY side only (FacultyLeavePanel in
 * LeavePanel.jsx). The admin-side approval view (AdminLeaveManagement, same
 * file) hits the same URL but is a different track's file-ownership —
 * left on its pre-Redux useState deliberately, not migrated here.
 */
export const fetchFacultyLeaves = createAsyncThunk('facultyLeave/fetch', () => apiFetch('/leave'));

export const applyForLeave = createAsyncThunk('facultyLeave/apply', (payload) =>
  apiFetch('/leave', { method: 'POST', body: JSON.stringify(payload) }),
);
