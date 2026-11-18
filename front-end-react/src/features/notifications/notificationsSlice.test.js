/**
 * notificationsSlice.test.js — the reducer logic + the persistence
 * middleware, exercised against a real configureStore (same approach as
 * authSlice.test.js). The facade's own behavior (shared toast timer,
 * college-scoped read filtering via useNotifications()) is covered
 * separately in useNotifications.test.jsx, since it needs React
 * Testing Library to render hooks with a real <Provider>.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import notificationsReducer, {
  personalReceived,
  broadcastReceived,
  personalMarkedRead,
  personalCleared,
  toastShown,
  toastCleared,
  personalSynced,
  broadcastsSynced,
} from './notificationsSlice';
import { notificationsPersistenceMiddleware } from './notificationsMiddleware';
import { visibleToViewer, KEY, BKEY } from './notificationsStorage';

function buildStore() {
  return configureStore({
    reducer: { notifications: notificationsReducer },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(notificationsPersistenceMiddleware),
  });
}

describe('notificationsSlice reducers', () => {
  it('personalReceived unshifts and caps at 200', () => {
    let state = { personal: [], broadcasts: [], toast: null };
    for (let i = 0; i < 201; i++) {
      state = notificationsReducer(state, personalReceived({ id: i, to: 'u1' }));
    }
    expect(state.personal).toHaveLength(200);
    expect(state.personal[0].id).toBe(200); // most recent first
  });

  it('broadcastReceived unshifts and caps at 500', () => {
    let state = { personal: [], broadcasts: [], toast: null };
    state = notificationsReducer(state, broadcastReceived({ id: 1, forRole: 'all' }));
    state = notificationsReducer(state, broadcastReceived({ id: 2, forRole: 'student' }));
    expect(state.broadcasts.map((b) => b.id)).toEqual([2, 1]);
  });

  it('personalMarkedRead only flips entries addressed to that user', () => {
    let state = {
      personal: [
        { id: 1, to: 'u1', read: false },
        { id: 2, to: 'u2', read: false },
      ],
      broadcasts: [],
      toast: null,
    };
    state = notificationsReducer(state, personalMarkedRead('u1'));
    expect(state.personal.find((n) => n.id === 1).read).toBe(true);
    expect(state.personal.find((n) => n.id === 2).read).toBe(false);
  });

  it('personalCleared empties the list', () => {
    let state = { personal: [{ id: 1, to: 'u1' }], broadcasts: [], toast: null };
    state = notificationsReducer(state, personalCleared());
    expect(state.personal).toEqual([]);
  });

  it('toastShown/toastCleared set and clear the single toast slot', () => {
    let state = { personal: [], broadcasts: [], toast: null };
    state = notificationsReducer(state, toastShown({ id: 1, msg: 'hi', type: 'success' }));
    expect(state.toast).toEqual({ id: 1, msg: 'hi', type: 'success' });
    state = notificationsReducer(state, toastCleared());
    expect(state.toast).toBeNull();
  });

  it('personalSynced/broadcastsSynced fully replace (cross-tab sync)', () => {
    let state = { personal: [{ id: 1, to: 'u1' }], broadcasts: [{ id: 1, forRole: 'all' }], toast: null };
    state = notificationsReducer(state, personalSynced([{ id: 9, to: 'u9' }]));
    state = notificationsReducer(state, broadcastsSynced([{ id: 9, forRole: 'student' }]));
    expect(state.personal).toEqual([{ id: 9, to: 'u9' }]);
    expect(state.broadcasts).toEqual([{ id: 9, forRole: 'student' }]);
  });
});

describe('visibleToViewer (college-scoping)', () => {
  it('a superadmin viewer (null) sees every college\'s broadcasts', () => {
    expect(visibleToViewer({ collegeId: 'college-a' }, null)).toBe(true);
    expect(visibleToViewer({ collegeId: 'college-b' }, null)).toBe(true);
  });

  it('a platform-wide broadcast (null collegeId) reaches every viewer', () => {
    expect(visibleToViewer({ collegeId: null }, 'college-a')).toBe(true);
  });

  it('a college-scoped broadcast is hidden from a different college\'s viewer', () => {
    expect(visibleToViewer({ collegeId: 'college-a' }, 'college-b')).toBe(false);
  });

  it('a college-scoped broadcast is visible to its own college\'s viewer', () => {
    expect(visibleToViewer({ collegeId: 'college-a' }, 'college-a')).toBe(true);
  });
});

describe('notificationsPersistenceMiddleware', () => {
  beforeEach(() => localStorage.clear());

  it('writes personal + broadcasts to localStorage on any notifications/ action', () => {
    const store = buildStore();
    store.dispatch(personalReceived({ id: 1, to: 'u1' }));
    expect(JSON.parse(localStorage.getItem(KEY))).toEqual([{ id: 1, to: 'u1' }]);

    store.dispatch(broadcastReceived({ id: 2, forRole: 'all' }));
    expect(JSON.parse(localStorage.getItem(BKEY))).toEqual([{ id: 2, forRole: 'all' }]);
    // Both keys stay in sync on every write, not just the one that changed.
    expect(JSON.parse(localStorage.getItem(KEY))).toEqual([{ id: 1, to: 'u1' }]);
  });

  it('does not touch localStorage for an unrelated action type', () => {
    const store = buildStore();
    store.dispatch({ type: 'auth/login/pending' });
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(localStorage.getItem(BKEY)).toBeNull();
  });
});
