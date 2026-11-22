/**
 * markAttendanceSlice.test.js — same requestId stale-response guard as
 * attendanceRegisterSlice: changing the course/section dropdown fires a
 * new "today's roster" fetch before the previous one resolves, and
 * nothing cancelled the old one pre-Redux either.
 */
import { describe, it, expect } from 'vitest';
import reducer from './markAttendanceSlice';
import { fetchTodayRoster } from './markAttendanceThunks';

function pendingAction(requestId) {
  return { type: fetchTodayRoster.pending.type, meta: { requestId } };
}
function fulfilledAction(requestId, payload) {
  return { type: fetchTodayRoster.fulfilled.type, meta: { requestId }, payload };
}

describe('markAttendanceSlice — stale response guard', () => {
  it('an older, slower roster response is ignored once a newer fetch has started', () => {
    let state = undefined;
    state = reducer(state, pendingAction('req-1')); // course A
    state = reducer(state, pendingAction('req-2')); // switched to course B before A resolved
    state = reducer(state, fulfilledAction('req-1', { students: [{ user_id: 'stale' }] }));
    expect(state.students).toBeNull(); // req-1's roster never applied
    expect(state.status).toBe('loading'); // still waiting on req-2

    state = reducer(state, fulfilledAction('req-2', { students: [{ user_id: 'fresh' }] }));
    expect(state.students).toEqual([{ user_id: 'fresh' }]);
    expect(state.status).toBe('succeeded');
  });

  it('a holiday response sets holiday and empties students', () => {
    let state = undefined;
    state = reducer(state, pendingAction('req-1'));
    state = reducer(state, fulfilledAction('req-1', { holiday: true, label: 'Diwali' }));
    expect(state.holiday).toEqual({ holiday: true, label: 'Diwali' });
    expect(state.students).toEqual([]);
  });
});
