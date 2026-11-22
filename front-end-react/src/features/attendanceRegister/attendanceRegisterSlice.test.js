/**
 * attendanceRegisterSlice.test.js — the stale-response guard is the one
 * piece of real logic here (see the slice's own comment for why keying by
 * param, the classPerformance approach, doesn't fit five independent
 * filters). Exercised directly against the reducer with hand-built
 * actions carrying the same `meta.requestId` shape createAsyncThunk uses,
 * since the race is inherently about which of two requests' responses
 * lands last — not reproducible by just awaiting a real thunk in order.
 */
import { describe, it, expect } from 'vitest';
import reducer from './attendanceRegisterSlice';
import { fetchAttendanceRegister } from './attendanceRegisterThunks';

function pendingAction(requestId) {
  return { type: fetchAttendanceRegister.pending.type, meta: { requestId } };
}
function fulfilledAction(requestId, payload) {
  return { type: fetchAttendanceRegister.fulfilled.type, meta: { requestId }, payload };
}

describe('attendanceRegisterSlice — stale response guard', () => {
  it('an older, slower request\'s response is ignored once a newer request has started', () => {
    let state = undefined;
    state = reducer(state, pendingAction('req-1'));
    state = reducer(state, pendingAction('req-2')); // user changed filters again before req-1 resolved
    // req-1 finally resolves, AFTER req-2 already became "current"
    state = reducer(state, fulfilledAction('req-1', { records: [{ log_id: 'stale' }], summary: { total: 1 } }));
    expect(state.records).toBeNull(); // req-1's data never applied
    expect(state.status).toBe('loading'); // still waiting on req-2

    // req-2 resolves — this one should apply
    state = reducer(state, fulfilledAction('req-2', { records: [{ log_id: 'fresh' }], summary: { total: 2 } }));
    expect(state.records).toEqual([{ log_id: 'fresh' }]);
    expect(state.status).toBe('succeeded');
  });

  it('a single in-order request applies normally', () => {
    let state = undefined;
    state = reducer(state, pendingAction('only-req'));
    state = reducer(state, fulfilledAction('only-req', { records: [], summary: { total: 0 } }));
    expect(state.status).toBe('succeeded');
    expect(state.summary).toEqual({ total: 0 });
  });
});
