import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiFetch } from '../../api/client';

/**
 * Admin's timetable-authoring domain — genuinely separate from
 * features/timetable/ (the read-only grid student/faculty Timetable.jsx
 * renders): this one is filtered by section, combines a validation report,
 * and has real CRUD (slot create/update/delete, publish, auto-generate).
 * Every endpoint here returns a flat, unwrapped shape (checked against
 * admin/common.controller.ts directly — no {success,data} envelope
 * anywhere in this group), so thunks pass the response straight through.
 */
// Section letters repeat every semester (every term has its own "Section
// A"/"B"/"C"), so `section` alone doesn't identify one cohort's timetable —
// `semester` is what actually disambiguates which one this is. Optional on
// the backend for callers that don't have one, but this admin-authoring
// surface always does, so it's always sent here.
export const fetchTimetable = createAsyncThunk('timetableManagement/fetch', ({ section, semester }) =>
  apiFetch(`/timetable?section=${section}&status=all${semester ? `&semester=${semester}` : ''}`),
);

export const validateTimetable = createAsyncThunk('timetableManagement/validate', ({ section, semester }) =>
  apiFetch('/timetable/validate', { method: 'POST', body: JSON.stringify({ section, semester }) }),
);

// Doesn't splice into state — the component always calls fetchTimetable()
// (and re-validates) again after a successful save, same as the pre-Redux
// page's own fetchTimetable() call after handleSaveSlot/handleDeleteSlot/
// handlePublish/handleGenerate. The slot-save response is also read
// directly for its own conflict-retry flow (res.success/res.hasConflicts),
// so the component needs the resolved thunk value either way.
export const saveTimetableSlot = createAsyncThunk('timetableManagement/saveSlot', (payload) =>
  apiFetch('/timetable/slot', { method: 'POST', body: JSON.stringify(payload) }),
);

export const deleteTimetableSlot = createAsyncThunk('timetableManagement/deleteSlot', (slotId) =>
  apiFetch(`/timetable/slot/${slotId}`, { method: 'DELETE' }),
);

export const publishTimetable = createAsyncThunk('timetableManagement/publish', ({ section, semester, force }) =>
  apiFetch('/timetable/publish', { method: 'POST', body: JSON.stringify({ section, semester, force }) }),
);

export const generateTimetable = createAsyncThunk('timetableManagement/generate', (payload) =>
  apiFetch('/timetable/generate', { method: 'POST', body: JSON.stringify(payload) }),
);
