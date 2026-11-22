/**
 * topicCompletionsSlice.test.js — the nested byCourse[section][topicId]
 * keying and the two-step preview/commit split (drag the slider ->
 * previewSet; click Save -> setTopicCompletion) are the real logic here.
 */
import { describe, it, expect } from 'vitest';
import reducer, { previewSet } from './topicCompletionsSlice';
import { fetchTopicCompletionsForCourse, setTopicCompletion } from './topicCompletionsThunks';

describe('topicCompletionsSlice', () => {
  it('fetchTopicCompletionsForCourse seeds the whole byCourse bucket for that course', () => {
    const action = {
      type: fetchTopicCompletionsForCourse.fulfilled.type,
      meta: { arg: { courseId: 'c1', sections: ['A', 'B'] } },
      payload: { A: { t1: 40 }, B: { t1: 80 } },
    };
    const state = reducer(undefined, action);
    expect(state.byCourse.c1).toEqual({ A: { t1: 40 }, B: { t1: 80 } });
  });

  it('previewSet updates the slider value locally without needing a prior fetch', () => {
    const state = reducer(undefined, previewSet({ courseId: 'c1', section: 'A', topicId: 't1', progress: 55 }));
    expect(state.byCourse.c1.A.t1).toBe(55);
  });

  it('setTopicCompletion.fulfilled commits the server-confirmed value, same shape as previewSet', () => {
    let state = reducer(undefined, previewSet({ courseId: 'c1', section: 'A', topicId: 't1', progress: 55 }));
    state = reducer(state, {
      type: setTopicCompletion.fulfilled.type,
      payload: { courseId: 'c1', section: 'A', topicId: 't1', progress: 55 },
    });
    expect(state.byCourse.c1.A.t1).toBe(55);
  });

  it('a commit for one topic does not disturb another topic already set in the same section', () => {
    let state = reducer(undefined, previewSet({ courseId: 'c1', section: 'A', topicId: 't1', progress: 20 }));
    state = reducer(state, {
      type: setTopicCompletion.fulfilled.type,
      payload: { courseId: 'c1', section: 'A', topicId: 't2', progress: 90 },
    });
    expect(state.byCourse.c1.A).toEqual({ t1: 20, t2: 90 });
  });
});
