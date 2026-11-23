import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiFetch } from '../../api/client';

/** GET /billing/colleges/me — shared by spoc/Subscription.jsx (the plan
 *  section) and spoc/Team.jsx (the admins roster), both reading the same
 *  college record; promoted into one slice rather than two private fetches. */
export const fetchMyCollege = createAsyncThunk('myCollege/fetch', () =>
  apiFetch('/billing/colleges/me').then((res) => res?.data),
);
