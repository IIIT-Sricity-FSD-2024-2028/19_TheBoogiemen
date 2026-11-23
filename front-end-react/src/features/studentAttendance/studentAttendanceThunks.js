import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiFetch } from '../../api/client';

export const fetchMyAttendance = createAsyncThunk('studentAttendance/fetch', () => apiFetch('/students/me/attendance'));

export const fetchAttendanceCalendar = createAsyncThunk('studentAttendance/fetchCalendar', (month) =>
  apiFetch(`/students/me/attendance-calendar?month=${month}`),
);

// Doesn't splice a response into state — the component reads
// action.payload.data.requests.length directly off the resolved thunk for
// its own toast/broadcast message, then just closes the modal (no list
// here needs refreshing afterward).
export const createAttendanceRequest = createAsyncThunk('studentAttendance/createRequest', (payload) =>
  apiFetch('/attendance-request', { method: 'POST', body: JSON.stringify(payload) }),
);
