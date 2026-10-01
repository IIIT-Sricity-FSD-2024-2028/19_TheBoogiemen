import { useCallback, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { api } from '../services/apiClient';
import { apiRequestFailed } from '../app/apiActions';

/**
 * Custom hook for data that only one view needs (kept in local state, not Redux).
 *
 * Returns { data, status, error, reload } where status is
 * 'loading' | 'succeeded' | 'failed'. Failures keep their HTTP status and are
 * also dispatched as `api/requestFailed`, so tokenAuthMiddleware can end the
 * session on a 401.
 *
 * The AbortController in the effect cleanup cancels the request when the view
 * unmounts or `path` changes, so a late response never updates stale state.
 * Pass a falsy path to skip the request until the caller is ready.
 */
export function useApiResource(path) {
  const dispatch = useDispatch();
  const [state, setState] = useState({ data: null, status: 'loading', error: null });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!path) return undefined; // caller not ready yet (e.g. waiting for an id)
    const controller = new AbortController();
    setState((prev) => ({ ...prev, status: 'loading', error: null }));

    api
      .get(path, { signal: controller.signal })
      .then((data) => setState({ data, status: 'succeeded', error: null }))
      .catch((err) => {
        if (err.name === 'AbortError') return;
        const error = { message: err.message, status: err.status ?? 0 };
        setState({ data: null, status: 'failed', error });
        dispatch(apiRequestFailed({ ...error, path, method: 'GET' }));
      });

    return () => controller.abort();
  }, [path, reloadKey, dispatch]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  return { ...state, reload };
}
