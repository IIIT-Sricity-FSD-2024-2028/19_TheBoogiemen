import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiFetch } from '../../api/client';

/** Shared by MarkAttendance.jsx's AttendanceRequests and Dashboard.jsx's
 *  ActionRequired (counting grantable requests). */
export const fetchAttendanceRequests = createAsyncThunk('attendanceRequests/fetch', () => apiFetch('/attendance-requests'));

export const grantAttendanceRequest = createAsyncThunk('attendanceRequests/grant', async (requestId) => {
  await apiFetch(`/attendance-request/${requestId}/mark`, { method: 'PATCH' });
  return requestId;
});

// Admin/head's own approve/reject decision — a different route
// (/attendance-request/:id, not /:id/mark) from faculty's grant above.
// Used by AttendanceOverride.jsx's AttendanceRequests. No reducer case;
// the component refetches the list afterward, same as the pre-Redux code.
export const decideAttendanceRequest = createAsyncThunk('attendanceRequests/decide', ({ requestId, status }) =>
  apiFetch(`/attendance-request/${requestId}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
);
