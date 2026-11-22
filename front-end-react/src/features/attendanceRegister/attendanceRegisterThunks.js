import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiFetch } from '../../api/client';

export const fetchAttendanceRegister = createAsyncThunk(
  'attendanceRegister/fetch',
  ({ courseId, section, dateFrom, dateTo, status }) => {
    const params = new URLSearchParams();
    if (courseId) params.set('course_id', courseId);
    if (section) params.set('section', section);
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);
    if (status) params.set('status', status);
    return apiFetch(`/attendance-register?${params.toString()}`);
  },
);
