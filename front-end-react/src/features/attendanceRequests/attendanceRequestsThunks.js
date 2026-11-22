import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiFetch } from '../../api/client';

/** Shared by MarkAttendance.jsx's AttendanceRequests and Dashboard.jsx's
 *  ActionRequired (counting grantable requests). */
export const fetchAttendanceRequests = createAsyncThunk('attendanceRequests/fetch', () => apiFetch('/attendance-requests'));

export const grantAttendanceRequest = createAsyncThunk('attendanceRequests/grant', async (requestId) => {
  await apiFetch(`/attendance-request/${requestId}/mark`, { method: 'PATCH' });
  return requestId;
});
