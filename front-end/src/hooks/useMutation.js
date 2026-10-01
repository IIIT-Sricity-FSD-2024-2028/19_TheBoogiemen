import { useCallback, useState } from 'react';
import { useDispatch } from 'react-redux';
import { api } from '../services/apiClient';
import { apiRequestFailed, mutationSucceeded } from '../app/apiActions';

/**
 * Runs a create/update/delete request with consistent state and reporting.
 *
 *   const [submit, { status, error }] = useMutation();
 *   const result = await submit('post', '/leave', body, { label: 'Applied for leave' });
 *   if (result.ok) ...
 *
 * Success dispatches `api/mutationSucceeded` (recorded by
 * activityLoggerMiddleware); failure dispatches `api/requestFailed` (401 ends
 * the session via tokenAuthMiddleware, 403/5xx/network show a toast via
 * apiErrorMiddleware). The error message is also returned so the form can show
 * it inline. Never throws.
 */
export function useMutation() {
  const dispatch = useDispatch();
  const [state, setState] = useState({ status: 'idle', error: null });

  const run = useCallback(
    async (method, path, body, { label } = {}) => {
      setState({ status: 'loading', error: null });
      try {
        const data = method === 'delete' ? await api.delete(path) : await api[method](path, body);
        setState({ status: 'succeeded', error: null });
        dispatch(mutationSucceeded({ label, method: method.toUpperCase(), path }));
        return { ok: true, data };
      } catch (err) {
        const error = { message: err.message, status: err.status ?? 0 };
        setState({ status: 'failed', error });
        dispatch(apiRequestFailed({ ...error, path, method: method.toUpperCase() }));
        return { ok: false, error };
      }
    },
    [dispatch]
  );

  const reset = useCallback(() => setState({ status: 'idle', error: null }), []);
  return [run, { ...state, loading: state.status === 'loading', reset }];
}
