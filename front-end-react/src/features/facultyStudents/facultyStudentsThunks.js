import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiFetch } from '../../api/client';

/**
 * GET /faculty/me/students — shared by MarksEntryModal (AssessmentMapping.jsx),
 * Dashboard.jsx's Metrics/Intervention, and StudentOverview.jsx (including
 * its AssignBTPModal). Always a flat, no-param fetch; each consumer
 * filters/merges the same raw list differently, same as before.
 */
export const fetchFacultyStudents = createAsyncThunk('facultyStudents/fetch', () => apiFetch('/faculty/me/students'));
