/**
 * billingSlice.test.js — the one real logic here: replying to a support
 * thread commits the server's own updated thread (with the new message
 * appended) into the SAME byThreadId slot fetchSupportThread uses, so the
 * modal's next render shows the reply without a second round-trip.
 */
import { describe, it, expect } from 'vitest';
import reducer from './billingSlice';
import { fetchSupportThread, replySupportThread } from './billingThunks';

describe('billingSlice — support thread cache', () => {
  it('fetchSupportThread seeds byThreadId for that thread only', () => {
    const state = reducer(undefined, {
      type: fetchSupportThread.fulfilled.type,
      meta: { arg: 't1' },
      payload: { thread_id: 't1', messages: [{ content: 'hi' }] },
    });
    expect(state.byThreadId.t1.messages).toEqual([{ content: 'hi' }]);
  });

  it('replySupportThread.fulfilled overwrites that same thread with the server-returned state', () => {
    let state = reducer(undefined, {
      type: fetchSupportThread.fulfilled.type,
      meta: { arg: 't1' },
      payload: { thread_id: 't1', messages: [{ content: 'hi' }] },
    });
    state = reducer(state, {
      type: replySupportThread.fulfilled.type,
      meta: { arg: { threadId: 't1', content: 'reply' } },
      payload: { thread_id: 't1', messages: [{ content: 'hi' }, { content: 'reply' }] },
    });
    expect(state.byThreadId.t1.messages).toHaveLength(2);
  });
});
