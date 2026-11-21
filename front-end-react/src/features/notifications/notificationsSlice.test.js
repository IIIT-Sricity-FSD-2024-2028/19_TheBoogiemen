import { describe, it, expect, beforeEach, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import notificationsReducer, {
  loadNotifications,
  send,
  broadcast,
  markRead,
  showToast,
  visibleToViewer,
} from './notificationsSlice';
import { notificationsPersistenceMiddleware, listenForOtherTabs } from './notificationsMiddleware';

function buildStore() {
  return configureStore({
    reducer: { notifications: notificationsReducer },
    preloadedState: { notifications: loadNotifications() },
    middleware: (gdm) => gdm().concat(notificationsPersistenceMiddleware),
  });
}

describe('notificationsSlice', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  it('send writes the personal notification through to localStorage', () => {
    const store = buildStore();
    store.dispatch(send('u1', 'Dr. Rao', 'Marks updated', 'marks'));

    const saved = JSON.parse(localStorage.getItem('bp_notifications'));
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ to: 'u1', from: 'Dr. Rao', message: 'Marks updated', type: 'marks', read: false });
  });

  it('broadcast keeps the sender college and persists it', () => {
    const store = buildStore();
    store.dispatch(broadcast('student', 'c1', 'Admin', 'Holiday tomorrow'));

    const saved = JSON.parse(localStorage.getItem('bp_broadcasts'));
    expect(saved[0]).toMatchObject({ forRole: 'student', collegeId: 'c1', message: 'Holiday tomorrow' });
  });

  it('markRead only touches that user', () => {
    const store = buildStore();
    store.dispatch(send('u1', 'A', 'one'));
    store.dispatch(send('u2', 'A', 'two'));
    store.dispatch(markRead('u1'));

    const byUser = Object.fromEntries(store.getState().notifications.personal.map((n) => [n.to, n.read]));
    expect(byUser).toEqual({ u1: true, u2: false });
  });

  it('drops entries older than 30 days on load', () => {
    const old = Date.now() - 31 * 24 * 60 * 60 * 1000;
    localStorage.setItem('bp_broadcasts', JSON.stringify([{ id: 1, timestamp: old }, { id: 2, timestamp: Date.now() }]));
    expect(buildStore().getState().notifications.broadcasts.map((b) => b.id)).toEqual([2]);
  });

  it('picks up a write from another tab', () => {
    const store = buildStore();
    const stop = listenForOtherTabs(store);
    const other = [{ id: 9, forRole: 'all', collegeId: 'c1', message: 'from the other tab', timestamp: Date.now() }];
    localStorage.setItem('bp_broadcasts', JSON.stringify(other));
    window.dispatchEvent(new StorageEvent('storage', { key: 'bp_broadcasts' }));

    expect(store.getState().notifications.broadcasts).toEqual(other);
    stop();
  });

  it('college scoping: same college or null sees it, another college does not', () => {
    const fromC1 = { collegeId: 'c1' };
    const fromSuperadmin = { collegeId: null };
    expect(visibleToViewer(fromC1, 'c1')).toBe(true);
    expect(visibleToViewer(fromC1, 'c2')).toBe(false);
    expect(visibleToViewer(fromC1, null)).toBe(true);
    expect(visibleToViewer(fromSuperadmin, 'c2')).toBe(true);
  });

  it('toast hides itself after 3.5s and is not saved to localStorage', () => {
    vi.useFakeTimers();
    const store = buildStore();
    store.dispatch(showToast('Saved'));
    expect(store.getState().notifications.toast).toMatchObject({ msg: 'Saved', type: 'success' });
    expect(localStorage.getItem('bp_notifications')).toBeNull();

    vi.advanceTimersByTime(3500);
    expect(store.getState().notifications.toast).toBeNull();
  });
});
