import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiFetch } from '../../api/client';

/**
 * The meetings domain: one list endpoint (role-scoped server-side to
 * "mine"), a directory lookup for the create modal, and a long tail of
 * PATCH actions (accept/deny/propose/reschedule/complete/cancel) that
 * every consumer already treats the same way — fire the mutation, then
 * call the same onRefresh() + onClose() pair. None of those mutations get
 * a reducer case here; every one of Faculty/StudentMeetingsSection's six
 * modals already refetches fetchMyMeetings() after a successful action,
 * so splicing would just be duplicated bookkeeping for no behavior change.
 */
export const fetchMyMeetings = createAsyncThunk('meetings/fetchMine', async () => {
  const res = await apiFetch('/meetings/my');
  return Array.isArray(res) ? res : res?.data || [];
});

/** role: the CALLER's own role — 'student' fetches the faculty directory
 *  to pick FROM, anyone else fetches the student directory. */
export const fetchMeetingDirectory = createAsyncThunk('meetings/fetchDirectory', async (role) => {
  const endpoint = role === 'student' ? '/meetings/faculty-list' : '/meetings/student-list';
  const res = await apiFetch(endpoint);
  const list = Array.isArray(res) ? res : res?.data || [];
  return list.map((c) => ({
    id: c.user_id || c.id,
    name: c.name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.username || 'User',
    department: c.department || '',
  }));
});

export const createMeeting = createAsyncThunk('meetings/create', (payload) =>
  apiFetch('/meetings', { method: 'POST', body: JSON.stringify(payload) }),
);

export const acceptMeeting = createAsyncThunk('meetings/accept', ({ meetingId, payload }) =>
  apiFetch(`/meetings/${meetingId}/accept`, { method: 'PATCH', body: JSON.stringify(payload) }),
);

export const denyMeeting = createAsyncThunk('meetings/deny', ({ meetingId, reason }) =>
  apiFetch(`/meetings/${meetingId}/deny`, { method: 'PATCH', body: JSON.stringify({ reason }) }),
);

export const requestReschedule = createAsyncThunk('meetings/requestReschedule', ({ meetingId, payload }) =>
  apiFetch(`/meetings/${meetingId}/request-reschedule`, { method: 'PATCH', body: JSON.stringify(payload) }),
);

export const askReschedule = createAsyncThunk('meetings/askReschedule', ({ meetingId, payload }) =>
  apiFetch(`/meetings/${meetingId}/ask-reschedule`, { method: 'PATCH', body: JSON.stringify(payload) }),
);

export const acceptRescheduleProposal = createAsyncThunk('meetings/acceptRescheduleProposal', (meetingId) =>
  apiFetch(`/meetings/${meetingId}/accept-reschedule`, { method: 'PATCH' }),
);

export const declineRescheduleProposal = createAsyncThunk('meetings/declineRescheduleProposal', (meetingId) =>
  apiFetch(`/meetings/${meetingId}/decline-reschedule`, { method: 'PATCH' }),
);

export const handleStudentReschedule = createAsyncThunk('meetings/handleStudentReschedule', ({ meetingId, payload }) =>
  apiFetch(`/meetings/${meetingId}/handle-student-reschedule`, { method: 'PATCH', body: JSON.stringify(payload) }),
);

export const directReschedule = createAsyncThunk('meetings/directReschedule', ({ meetingId, payload }) =>
  apiFetch(`/meetings/${meetingId}/reschedule`, { method: 'PATCH', body: JSON.stringify(payload) }),
);

export const completeMeeting = createAsyncThunk('meetings/complete', ({ meetingId, payload }) =>
  apiFetch(`/meetings/${meetingId}/complete`, { method: 'PATCH', body: JSON.stringify(payload) }),
);

export const cancelMeeting = createAsyncThunk('meetings/cancel', ({ meetingId, reason }) =>
  apiFetch(`/meetings/${meetingId}/cancel`, { method: 'PATCH', body: JSON.stringify({ reason }) }),
);
