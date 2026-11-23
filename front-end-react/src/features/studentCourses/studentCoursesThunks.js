import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiFetch } from '../../api/client';

/** GET /students/me/courses — shared by Courses.jsx, Attendance.jsx's
 *  request modal, and Dashboard.jsx's SyllabusTracker. */
export const fetchMyCourses = createAsyncThunk('studentCourses/fetch', () => apiFetch('/students/me/courses'));
