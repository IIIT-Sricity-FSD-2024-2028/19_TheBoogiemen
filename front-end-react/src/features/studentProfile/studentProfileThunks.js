import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiFetch } from '../../api/client';

/** GET /students/me — shared by Profile.jsx and Dashboard.jsx's
 *  SyllabusTracker (reads the student's own default section). */
export const fetchMyProfile = createAsyncThunk('studentProfile/fetch', () => apiFetch('/students/me'));
