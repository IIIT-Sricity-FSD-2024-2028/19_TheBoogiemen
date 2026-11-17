import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiFetch } from '../../api/client';

/**
 * Combines the three fetches MarksEntryModal needs for one assessment,
 * same Promise.all the pre-Redux modal's own useEffect did. Keyed by
 * assessment_id (action.meta.arg) — the modal always closes after a
 * successful submit and refetches fresh on next open, so there's no
 * long-lived cache to keep in sync, unlike classPerformance's byCourse.
 */
export const fetchMarksEntryData = createAsyncThunk('marksEntry/fetch', async (assessment) => {
  const [students, submissions, existingMarks] = await Promise.all([
    apiFetch('/faculty/me/students'),
    assessment.exam_mode === 'online' ? apiFetch('/submissions').catch(() => []) : Promise.resolve([]),
    apiFetch(`/marks?assessment_id=${assessment.assessment_id}`).catch(() => []),
  ]);
  return { students, submissions, existingMarks: existingMarks || [] };
});

export const createMark = createAsyncThunk('marksEntry/createMark', (payload) =>
  apiFetch('/marks', { method: 'POST', body: JSON.stringify(payload) }),
);

export const correctMark = createAsyncThunk('marksEntry/correctMark', ({ entryId, marksObtained, feedbackText }) =>
  apiFetch(`/marks/${entryId}`, { method: 'PATCH', body: JSON.stringify({ marks_obtained: marksObtained, feedback_text: feedbackText }) }),
);
