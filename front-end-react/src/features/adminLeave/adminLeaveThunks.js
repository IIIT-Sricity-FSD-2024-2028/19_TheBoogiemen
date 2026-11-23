import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiFetch } from '../../api/client';

/**
 * GET /leave — same URL as features/facultyLeave/ (Dev 4's track), but a
 * SEPARATE slice on purpose: the backend role-scopes the response
 * differently (admin/head sees every leave in the college; faculty sees
 * only their own), and this view's shape of use — approve/reject,
 * no "apply" flow — doesn't overlap with facultyLeaveSlice's.
 */
export const fetchAllLeaves = createAsyncThunk('adminLeave/fetch', () => apiFetch('/leave'));

// decideLeave triggers a real server-side side effect beyond the leave
// record itself (attendance-sync for any class sessions the leave span
// covers — see common/leave-attendance.sync.ts), so the component
// refetches afterward rather than this slice splicing the PATCH response.
export const decideLeave = createAsyncThunk('adminLeave/decide', ({ leaveId, status }) =>
  apiFetch(`/leave/${leaveId}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
);
