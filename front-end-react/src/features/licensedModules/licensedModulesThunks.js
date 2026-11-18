import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiFetch } from '../../api/client';

/** GET /billing/colleges/me/modules — every role's DashboardShell, to hide
 *  a nav item for a module the college never licensed. Deliberately a
 *  separate, smaller domain from myCollegeSlice (Dev 5's, spoc-only full
 *  record with admins+plan): this one is read by every actor, not just spoc. */
export const fetchLicensedModules = createAsyncThunk('licensedModules/fetch', () =>
  apiFetch('/billing/colleges/me/modules').then((res) => res?.data?.modules || null),
);
