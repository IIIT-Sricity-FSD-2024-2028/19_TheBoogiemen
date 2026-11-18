/**
 * useAuth — REDUX_MIGRATION_PLAN.md Phase 4: moved out of context/AuthContext.jsx
 * now that nothing needs the Context-Provider shape anymore (that facade's
 * AuthProvider was already an inert pass-through since Phase 1). Same hook
 * name, same returned shape `{ user, login, logout }`, so every call site
 * only needed its import path updated, not its usage.
 */
import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { loginUser, logoutUser, ROLE_HOME } from './authThunks';

export { ROLE_HOME };

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
