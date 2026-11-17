/**
 * academicMetricsSlice.test.js — the stale-response guard is the one
 * piece of real logic: switching the course/semester filter fires a new
 * fetch before the previous one resolves, same race shape as
 * attendanceRegisterSlice/markAttendanceSlice.
 */
import { describe, it, expect } from 'vitest';
import reducer from './academicMetricsSlice';
import { fetchAcademicMetrics } from './academicMetricsThunks';

function pendingAction(requestId) {
  return { type: fetchAcademicMetrics.pending.type, meta: { requestId } };
}
function fulfilledAction(requestId, payload) {
  return { type: fetchAcademicMetrics.fulfilled.type, meta: { requestId }, payload };
}

describe('academicMetricsSlice — stale response guard', () => {
  it('an older, slower filter response is ignored once a newer filter request has started', () => {
    let state = undefined;
    state = reducer(state, pendingAction('req-1')); // "All Courses"
    state = reducer(state, pendingAction('req-2')); // switched to a specific course before req-1 resolved
    state = reducer(state, fulfilledAction('req-1', { students: { total: 999 } }));
    expect(state.data).toBeUndefined(); // req-1's data never applied
    expect(state.status).toBe('loading'); // still waiting on req-2

    state = reducer(state, fulfilledAction('req-2', { students: { total: 5 } }));
    expect(state.data).toEqual({ students: { total: 5 } });
    expect(state.status).toBe('succeeded');
  });
});
