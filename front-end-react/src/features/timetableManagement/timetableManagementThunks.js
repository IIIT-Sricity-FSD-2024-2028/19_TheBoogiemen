import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiFetch } from '../../api/client';

/**
 * Admin's timetable-authoring domain — genuinely separate from
 * features/timetable/ (the read-only grid student/faculty Timetable.jsx
 * renders): this one is filtered by semester, combines a validation report,
 * and has real CRUD (slot create/update/delete, publish, auto-generate).
 * Every endpoint here returns a flat, unwrapped shape (checked against
 * admin/common.controller.ts directly — no {success,data} envelope
 * anywhere in this group), so thunks pass the response straight through.
 *
 * Deliberately NOT filtered by `section`: a course's sections are its own
 * concern (course_sections — a course can have Section A taught by one
 * faculty member and Section B by another, and different branches' courses
 * don't share one global "Section A/B/C"), not a single page-wide filter.
 * `semester` is the real cohort key here (section letters repeat every
 * term — see resolveSlotSemester's own comment on the backend).
 */
export const fetchTimetable = createAsyncThunk('timetableManagement/fetch', ({ semester }) =>
  apiFetch(`/timetable?status=all${semester ? `&semester=${semester}` : ''}`),
);

export const validateTimetable = createAsyncThunk('timetableManagement/validate', ({ semester }) =>
  apiFetch('/timetable/validate', { method: 'POST', body: JSON.stringify({ semester }) }),
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

export const publishTimetable = createAsyncThunk('timetableManagement/publish', ({ semester, force }) =>
  apiFetch('/timetable/publish', { method: 'POST', body: JSON.stringify({ semester, force }) }),
);

export const generateTimetable = createAsyncThunk('timetableManagement/generate', (payload) =>
  apiFetch('/timetable/generate', { method: 'POST', body: JSON.stringify(payload) }),
);
