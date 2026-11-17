import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiFetch } from '../../api/client';

/**
 * GET /faculty/me/courses — promoted out of features/classPerformance/
 * (where it was built privately for ClassPerformance.jsx alone) once a
 * second real consumer appeared in this same pass, MarkAttendance.jsx's
 * course dropdown. Same situation coursesSlice (Dev 3) was already in when
 * AssessmentMapping.jsx picked it up — a shared domain promoted the moment
 * a second owned file actually needs it, not speculatively beforehand.
 */
export const fetchFacultyCourses = createAsyncThunk('facultyCourses/fetch', () => apiFetch('/faculty/me/courses'));
