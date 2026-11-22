import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiFetch } from '../../api/client';

const ENDPOINT_BY_ROLE = {
  student: '/student-timetable',
  faculty: '/faculty/me/timetable',
};

/** One component (Timetable.jsx) renders both roles via a `role` prop —
 *  the thunk mirrors that, keyed by role in the slice below. */
export const fetchTimetable = createAsyncThunk('timetable/fetch', (role) => apiFetch(ENDPOINT_BY_ROLE[role]));
