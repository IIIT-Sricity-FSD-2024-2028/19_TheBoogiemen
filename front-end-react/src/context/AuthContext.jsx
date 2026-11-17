/**
 * AuthContext — REDUX_MIGRATION_PLAN.md Phase 1 facade.
 *
 * `useAuth()` now reads/writes the Redux `authSlice` (features/auth) —
 * same hook name, same returned shape `{ user, login, logout }` — so all 23
 * call sites across the app are UNCHANGED. `ROLE_HOME` is re-exported from
 * authThunks.js (Login.jsx imports it from here directly).
 *
 * `AuthProvider` is now an inert pass-through: it exists only so App.jsx's
 * existing `<AuthProvider>` wrapper doesn't need to change in this phase.
 * It's deleted in Phase 4, once nothing else in the tree still imports it.
 */
import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { loginUser, logoutUser, ROLE_HOME } from '../features/auth/authThunks';

export { ROLE_HOME };

export function AuthProvider({ children }) {
  return children;
}

export function useAuth() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);

  const login = useCallback(
    async (email, password) => {
      const action = await dispatch(loginUser({ email, password }));
      if (loginUser.rejected.match(action)) {
        throw new Error(action.error.message);
      }
      return action.payload.redirectTo;
    },
    [dispatch],
  );

  const logout = useCallback(async () => {
    await dispatch(logoutUser());
  }, [dispatch]);

  return { user, login, logout };
}
