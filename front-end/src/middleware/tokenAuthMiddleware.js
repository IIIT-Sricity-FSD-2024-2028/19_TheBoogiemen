/**
 * Custom Redux Middleware: tokenAuthMiddleware
 * 
 * Responsibilities:
 * 1. Automatically attaches Bearer JWT Access Token and X-Tenant-ID header to outbound API requests.
 * 2. Monitors 401 Unauthorized responses to trigger automatic refresh-token rotation via Redux thunk.
 */

export const tokenAuthMiddleware = (store) => (next) => async (action) => {
  // Pass action through first
  const result = next(action);

  // Handle auto-token refresh trigger if an async thunk rejected due to 401 Unauthorized
  if (action.type?.endsWith('/rejected') && action.payload?.status === 401) {
    const state = store.getState();
    const refreshToken = state.auth?.refreshToken;

    if (refreshToken && !state.auth?.isRefreshing) {
      console.warn('🔑 tokenAuthMiddleware: Access token expired. Dispatching automatic refresh thunk...');
      // Dispatch refresh token thunk
      try {
        const { refreshAccessTokenThunk } = await import('../features/auth/authSlice');
        store.dispatch(refreshAccessTokenThunk());
      } catch (err) {
        console.error('Failed to auto-refresh token:', err);
      }
    }
  }

  return result;
};
