import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiFetch } from '../../api/client';

export const fetchTodayRoster = createAsyncThunk('markAttendance/fetchTodayRoster', ({ courseId, section }) => {
  const query = section ? `?section=${encodeURIComponent(section)}` : '';
  return apiFetch(`/faculty/attendance/today/${courseId}${query}`);
});

export const submitAttendance = createAsyncThunk('markAttendance/submit', ({ courseId, section, date, records }) =>
  apiFetch('/faculty/attendance', {
    method: 'POST',
    body: JSON.stringify({ course_id: courseId, ...(section ? { section } : {}), date, records }),
  }),
);
