import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiFetch } from '../../api/client';

export const fetchResourceBookings = createAsyncThunk('resourceBookings/fetch', () => apiFetch('/resource-bookings'));

export const createResourceBooking = createAsyncThunk('resourceBookings/create', (payload) =>
  apiFetch('/resource-booking', { method: 'POST', body: JSON.stringify(payload) }),
);

// Approving/rejecting also flips the booked resource's own status
// server-side, so the component refetches both resourceBookings AND
// resources afterward rather than this slice trying to splice either —
// same "complex server-side cascade, don't guess" reasoning as
// attendanceRequestsSlice's grant action.
export const decideResourceBooking = createAsyncThunk('resourceBookings/decide', ({ id, status }) =>
  apiFetch(`/resource-booking/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
);
