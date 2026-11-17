/**
 * classPerformanceSlice.test.js — REDUX_MIGRATION_PLAN.md §7's own worked
 * example, now actually built. Covers the two things that matter here:
 * byCourse keying (switching courses never cross-contaminates another
 * course's slot) and the asymmetric error handling the combined thunk
 * ported from the pre-Redux Promise.all (a failed /outcomes degrades to
 * null; a failed /class-performance fails the whole thing).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import reducer from './classPerformanceSlice';
import { fetchClassPerformanceForCourse } from './classPerformanceThunks';

function buildStore() {
  return configureStore({ reducer: { classPerformance: reducer } });
}

describe('classPerformanceSlice — byCourse keying', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('two different courses get two independent slots, neither overwriting the other', async () => {
    global.fetch = vi.fn((url) => {
      if (url.includes('class-performance')) {
        const courseId = new URL(url, 'http://x').searchParams.get('course_id');
        return Promise.resolve({ ok: true, json: async () => ({ course_id: courseId, class_average_percentage: courseId === 'c1' ? 90 : 60 }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({ outcomes: [] }) });
    });
    const store = buildStore();
    await store.dispatch(fetchClassPerformanceForCourse('c1'));
    await store.dispatch(fetchClassPerformanceForCourse('c2'));

    expect(store.getState().classPerformance.byCourse.c1.performance.class_average_percentage).toBe(90);
    expect(store.getState().classPerformance.byCourse.c2.performance.class_average_percentage).toBe(60);
  });

  it('a failed /outcomes fetch degrades to outcomes: null without failing the whole thunk', async () => {
    global.fetch = vi.fn((url) => {
      if (url.includes('class-performance')) {
        return Promise.resolve({ ok: true, json: async () => ({ course_id: 'c1', class_average_percentage: 75 }) });
      }
      return Promise.resolve({ ok: false, json: async () => ({ message: 'outcomes unavailable' }) });
    });
    const store = buildStore();
    const action = await store.dispatch(fetchClassPerformanceForCourse('c1'));

    expect(fetchClassPerformanceForCourse.fulfilled.match(action)).toBe(true);
    expect(store.getState().classPerformance.byCourse.c1.performance.class_average_percentage).toBe(75);
    expect(store.getState().classPerformance.byCourse.c1.outcomes).toBeNull();
  });

  it('a failed /class-performance fetch fails the whole thunk, even if /outcomes would have succeeded', async () => {
    global.fetch = vi.fn((url) => {
      if (url.includes('class-performance')) {
        return Promise.resolve({ ok: false, json: async () => ({ message: 'no such course' }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({ outcomes: [] }) });
    });
    const store = buildStore();
    const action = await store.dispatch(fetchClassPerformanceForCourse('bad-course'));

    expect(fetchClassPerformanceForCourse.rejected.match(action)).toBe(true);
    expect(store.getState().classPerformance.byCourse['bad-course'].status).toBe('failed');
    expect(store.getState().classPerformance.byCourse['bad-course'].error).toBe('no such course');
  });
});
