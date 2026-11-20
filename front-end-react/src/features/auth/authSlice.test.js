/**
 * authSlice.test.js — the one piece of this phase with real logic (not
 * just fetch-wrapping): error-message extraction, the localStorage
 * write-through, and the role→redirect mapping. Exercised against a real
 * configureStore, not a hand-rolled reducer call, so the thunk's side
 * effects (fetch, localStorage) are covered too.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import { loginUser, logoutUser } from './authThunks';
import { getUser } from '../../api/client';

// Mirrors store/index.js's own preloadedState wiring — the slice's default
// has no user (see authSlice.js's comment); hydration from localStorage is
// this integration's job, done fresh each time, same as the real store.
function buildStore() {
  return configureStore({
    reducer: { auth: authReducer },
    preloadedState: { auth: { user: getUser(), status: 'idle', error: null } },
  });
}

describe('authSlice', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('the slice itself defaults to no user', () => {
    const store = configureStore({ reducer: { auth: authReducer } });
    expect(store.getState().auth.user).toBeNull();
  });

  it('store/index.js\'s hydration pattern picks up whatever user localStorage already has (no async gap on refresh)', () => {
    localStorage.setItem('bp_user', JSON.stringify({ user_id: 'u1', role: 'student' }));
    const store = buildStore();
    expect(store.getState().auth.user).toEqual({ user_id: 'u1', role: 'student' });
  });

  it('login stores the user + expiry and resolves the right role-based redirect', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ user: { user_id: 'u2', role: 'faculty' }, expires_at: 123456 }),
    });
    const store = buildStore();
    const action = await store.dispatch(loginUser({ email: 'f@example.com', password: 'x' }));

    expect(loginUser.fulfilled.match(action)).toBe(true);
    expect(action.payload.redirectTo).toBe('/faculty');
    expect(store.getState().auth.user).toEqual({ user_id: 'u2', role: 'faculty' });
    expect(JSON.parse(localStorage.getItem('bp_user'))).toEqual({ user_id: 'u2', role: 'faculty' });
    expect(localStorage.getItem('bp_expires_at')).toBe('123456');
  });

  it('login failure surfaces the server message and writes nothing to localStorage', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'Invalid email or password' }),
    });
    const store = buildStore();
    const action = await store.dispatch(loginUser({ email: 'x@example.com', password: 'wrong' }));

    expect(loginUser.rejected.match(action)).toBe(true);
    expect(action.error.message).toBe('Invalid email or password');
    expect(store.getState().auth.status).toBe('failed');
    expect(localStorage.getItem('bp_user')).toBeNull();
  });

  it('an unknown role falls back to /student, matching the pre-Redux ROLE_HOME lookup', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ user: { user_id: 'u3', role: 'mystery-role' } }),
    });
    const store = buildStore();
    const action = await store.dispatch(loginUser({ email: 'm@example.com', password: 'x' }));
    expect(action.payload.redirectTo).toBe('/student');
  });

  it('logout clears the user from state even if the server call fails', async () => {
    localStorage.setItem('bp_user', JSON.stringify({ user_id: 'u1', role: 'student' }));
    localStorage.setItem('bp_expires_at', '999');
    global.fetch = vi.fn().mockRejectedValue(new Error('network down'));
    const store = configureStore({
      reducer: { auth: authReducer },
      preloadedState: { auth: { user: { user_id: 'u1', role: 'student' }, status: 'idle', error: null } },
    });

    await store.dispatch(logoutUser());

    expect(store.getState().auth.user).toBeNull();
    expect(localStorage.getItem('bp_user')).toBeNull();
    expect(localStorage.getItem('bp_expires_at')).toBeNull();
  });
});
