/**
 * timetableSlice.test.js — the byRole keying is the one piece of real
 * logic worth a direct test: one shared component (Timetable.jsx) renders
 * both 'student' and 'faculty' off the same slice, so a fetch for one role
 * must never clobber the other's already-loaded data.
 */
import { describe, it, expect } from 'vitest';
import reducer from './timetableSlice';
import { fetchTimetable } from './timetableThunks';

function pendingAction(role) {
  return { type: fetchTimetable.pending.type, meta: { arg: role } };
}
function fulfilledAction(role, payload) {
  return { type: fetchTimetable.fulfilled.type, meta: { arg: role }, payload };
}

describe('timetableSlice — byRole keying', () => {
  it('a faculty fetch does not disturb an already-loaded student bucket', () => {
    let state = undefined;
    state = reducer(state, pendingAction('student'));
    state = reducer(state, fulfilledAction('student', { grid: { MON: {} }, days: ['MON'] }));
    expect(state.byRole.student.data).toEqual({ grid: { MON: {} }, days: ['MON'] });

    state = reducer(state, pendingAction('faculty'));
    // student's data must survive a faculty fetch starting
    expect(state.byRole.student.data).toEqual({ grid: { MON: {} }, days: ['MON'] });

    state = reducer(state, fulfilledAction('faculty', { grid: { TUE: {} }, days: ['TUE'] }));
    expect(state.byRole.faculty.data).toEqual({ grid: { TUE: {} }, days: ['TUE'] });
    expect(state.byRole.student.data).toEqual({ grid: { MON: {} }, days: ['MON'] }); // still untouched
  });
});
