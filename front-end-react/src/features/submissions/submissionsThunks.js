import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiFetch } from '../../api/client';

/**
 * Combines the same two fetches the pre-Redux page's own load() did —
 * GET /assessments unscoped (the backend filters to "my enrolled courses"
 * server-side for a student actor, so no query param is needed or
 * correct here, unlike Dev 4's facultyCourses-scoped fetchAssessments
 * thunk, which always appends ?faculty_id=) and GET /submissions (also
 * student-scoped server-side) — then derives the same "online assessments
 * with no submission yet" list the original computed inline.
 */
export const fetchPendingSubmissions = createAsyncThunk('submissions/fetchPending', async () => {
  const [assessments, submissions] = await Promise.all([
    apiFetch('/assessments'),
    apiFetch('/submissions').catch(() => []),
  ]);
  const online = assessments.filter((a) => a.exam_mode === 'online');
  return online.filter((a) => !submissions.find((s) => s.assessment_id === a.assessment_id));
});

// Doesn't splice a result into state — the component always calls
// fetchPendingSubmissions() again after a successful submit, same as the
// pre-Redux modal's own onSubmitted -> load() pattern.
export const createSubmission = createAsyncThunk('submissions/create', (payload) =>
  apiFetch('/submissions', { method: 'POST', body: JSON.stringify(payload) }),
);
