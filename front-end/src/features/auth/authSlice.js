import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api, toErrorPayload } from '../../services/apiClient';

/**
 * Authentication state — the single source of truth for "who is signed in".
 *
 * The credential is the httpOnly `bp_session` cookie, which JavaScript cannot
 * read. Nothing about the user is kept in localStorage: on every page load
 * `fetchSession` asks the server (GET /api/auth/me), so an expired or revoked
 * session is detected immediately instead of showing a stale dashboard.
 *
 * status: 'checking'      — waiting for /auth/me on page load
 *         'authenticated' — user is known
 *         'anonymous'     — no valid session
 */

export const fetchSession = createAsyncThunk('auth/fetchSession', async (_arg, { rejectWithValue }) => {
  try {
    return await api.get('/auth/me');
  } catch (err) {
    return rejectWithValue(toErrorPayload(err));
  }
});

export const loginThunk = createAsyncThunk('auth/login', async ({ email, password, portal }, { rejectWithValue }) => {
  try {
    const body = { email: email.trim(), password };
    if (portal) body.portal = portal;
    return await api.post('/auth/login', body);
  } catch (err) {
    const payload = toErrorPayload(err);
    // 401 from the login endpoint means wrong credentials, not an expired session.
    if (payload.status === 401) payload.message = 'Incorrect email or password.';
    if (payload.status === 429) payload.message = 'Too many sign-in attempts. Please wait a minute and try again.';
    return rejectWithValue(payload);
  }
});

// Clears the cookie on the server. Local state is cleared in the reducer whether
// or not the request succeeds, so signing out always works.
export const logoutThunk = createAsyncThunk('auth/logout', async () => {
  try {
    await api.post('/auth/logout');
  } catch {
    // The cookie also expires on its own; nothing else to recover.
  }
});

const initialState = {
  status: 'checking',
  user: null,
  expiresAt: null,
  loginStatus: 'idle',
  loginError: null,
  // Why the last session ended: null | 'expired' | 'signed-out'
  endReason: null,
  // Set when /auth/me failed for a reason other than "not signed in".
  bootError: null,
};

function endSession(state, reason) {
  state.status = 'anonymous';
  state.user = null;
  state.expiresAt = null;
  state.endReason = reason;
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Dispatched by tokenAuthMiddleware (401) and sessionTimerMiddleware (expiry).
    sessionExpired: (state) => {
      if (state.status === 'authenticated') endSession(state, 'expired');
    },
    // Another browser tab signed out.
    signedOutElsewhere: (state) => {
      if (state.status === 'authenticated') endSession(state, 'signed-out');
    },
    profileUpdated: (state, action) => {
      if (state.user) state.user = { ...state.user, ...action.payload };
    },
    clearLoginError: (state) => {
      state.loginError = null;
    },
    clearEndReason: (state) => {
      state.endReason = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSession.fulfilled, (state, action) => {
        state.status = 'authenticated';
        state.user = action.payload.user;
        state.expiresAt = action.payload.expires_at ?? null;
      })
      .addCase(fetchSession.rejected, (state, action) => {
        state.status = 'anonymous';
        state.user = null;
        // A network/server failure on load is not "signed out": keep the error so
        // the app can say the server is unreachable instead of showing a login form.
        state.bootError = action.payload?.status === 401 ? null : action.payload;
      })
      .addCase(loginThunk.pending, (state) => {
        state.loginStatus = 'loading';
        state.loginError = null;
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.loginStatus = 'idle';
        state.status = 'authenticated';
        state.user = action.payload.user;
        state.expiresAt = action.payload.expires_at ?? null;
        state.endReason = null;
        state.bootError = null;
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.loginStatus = 'idle';
        state.loginError = action.payload?.message || 'Sign-in failed.';
      })
      .addCase(logoutThunk.pending, (state) => {
        endSession(state, 'signed-out');
      });
  },
});

export const { sessionExpired, signedOutElsewhere, profileUpdated, clearLoginError, clearEndReason } = authSlice.actions;

/** Actions after which all per-user cached data must be discarded. */
export const SESSION_END_ACTIONS = [sessionExpired.type, signedOutElsewhere.type, logoutThunk.pending.type];

export const selectAuth = (state) => state.auth;
export const selectCurrentUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => state.auth.status === 'authenticated';

export default authSlice.reducer;
