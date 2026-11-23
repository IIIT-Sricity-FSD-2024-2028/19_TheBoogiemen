/**
 * useNotifications.test.jsx — the facade itself, rendered against a
 * real store (not the reducer in isolation — see notificationsSlice.test.js
 * for that). Covers the two things that only exist at this layer:
 *  1. College-scoped broadcast read/write end to end through useAuth() +
 *     useNotifications() together, the same way a real component uses both.
 *  2. The shared module-scope toast timer — the one piece of behavior that
 *     breaks if someone "simplifies" it back into a useRef per the comment
 *     in useNotifications.js.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { renderHook, act } from '@testing-library/react';
import authReducer from '../auth/authSlice';
import notificationsReducer from './notificationsSlice';
import { useAuth } from '../auth/useAuth';
import { useNotifications } from './useNotifications';

function buildStore(user) {
  return configureStore({
    reducer: { auth: authReducer, notifications: notificationsReducer },
    preloadedState: {
      auth: { user, status: 'idle', error: null },
      notifications: { personal: [], broadcasts: [], toast: null },
    },
  });
}

function renderBoth(store) {
  const wrapper = ({ children }) => <Provider store={store}>{children}</Provider>;
  return renderHook(() => ({ auth: useAuth(), notifications: useNotifications() }), { wrapper });
}

describe('useNotifications() facade — college scoping', () => {
  it('a broadcast sent by a College A admin never appears to a College B viewer', () => {
    const storeA = buildStore({ user_id: 'admin-a', role: 'admin', college_id: 'college-a' });
    const { result: senderA } = renderBoth(storeA);
    act(() => senderA.current.notifications.broadcast('student', 'Admin A', 'College A announcement', 'info'));

    // Same broadcasts a shared browser origin would physically hold (one
    // localStorage, any logged-in college) — handed directly to a different
    // college's viewer rather than round-tripping through localStorage,
    // which the persistence middleware already has its own coverage for.
    const storeB = configureStore({
      reducer: { auth: authReducer, notifications: notificationsReducer },
      preloadedState: {
        auth: { user: { user_id: 'student-b', role: 'student', college_id: 'college-b' }, status: 'idle', error: null },
        notifications: storeA.getState().notifications,
      },
    });
    const { result: viewerB } = renderBoth(storeB);
    expect(viewerB.current.notifications.getUnreadBC('student')).toHaveLength(0);
  });

  it('the same broadcast IS visible to a viewer in the sender\'s own college', () => {
    const store = buildStore({ user_id: 'admin-a', role: 'admin', college_id: 'college-a' });
    const { result } = renderBoth(store);
    act(() => result.current.notifications.broadcast('student', 'Admin A', 'Hello', 'info'));

    const storeViewer = configureStore({
      reducer: { auth: authReducer, notifications: notificationsReducer },
      preloadedState: {
        auth: { user: { user_id: 'student-a', role: 'student', college_id: 'college-a' }, status: 'idle', error: null },
        notifications: store.getState().notifications,
      },
    });
    const { result: viewer } = renderBoth(storeViewer);
    expect(viewer.current.notifications.getUnreadBC('student')).toHaveLength(1);
  });

  it('a superadmin (null college) sees a broadcast from any college', () => {
    const sent = { id: 1, forRole: 'all', collegeId: 'college-a', from: 'x', message: 'm', type: 'info' };
    const store = configureStore({
      reducer: { auth: authReducer, notifications: notificationsReducer },
      preloadedState: {
        auth: { user: { user_id: 'super1', role: 'superadmin', college_id: null }, status: 'idle', error: null },
        notifications: { personal: [], broadcasts: [sent], toast: null },
      },
    });
    const { result } = renderBoth(store);
    expect(result.current.notifications.getUnreadBC('superadmin')).toHaveLength(1);
  });
});

describe('useNotifications() facade — shared toast timer', () => {
  beforeEach(() => vi.useFakeTimers());

  it('a second showToast() from a DIFFERENT hook instance cancels the first one\'s dismissal, not just its own', () => {
    const store = buildStore({ user_id: 'u1', role: 'student', college_id: 'c1' });
    const wrapper = ({ children }) => <Provider store={store}>{children}</Provider>;
    const { result: hookA } = renderHook(() => useNotifications(), { wrapper });
    const { result: hookB } = renderHook(() => useNotifications(), { wrapper });

    act(() => hookA.current.showToast('first', 'success'));
    act(() => vi.advanceTimersByTime(2000)); // not yet dismissed
    act(() => hookB.current.showToast('second', 'error')); // different hook instance

    // If the timer were per-hook-instance (a useRef bug), hookA's now-stale
    // 3500ms timer would fire here and clear hookB's still-fresh toast.
    act(() => vi.advanceTimersByTime(1600)); // 3600ms since 'first', 1600ms since 'second'
    expect(store.getState().notifications.toast?.msg).toBe('second');

    act(() => vi.advanceTimersByTime(2000)); // now past 3500ms since 'second' too
    expect(store.getState().notifications.toast).toBeNull();
  });
});
