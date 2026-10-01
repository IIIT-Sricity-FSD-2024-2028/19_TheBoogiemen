import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { api, toErrorPayload } from '../services/apiClient';
import { SESSION_END_ACTIONS } from '../features/auth/authSlice';

/**
 * Builds a slice holding server data that several views of one portal share.
 *
 *   const { reducer, thunks, selectResource } = createResourceSlice('student', {
 *     profile: '/students/me',
 *     courses: '/students/me/courses',
 *   });
 *
 * Each resource is { data, status: 'idle'|'loading'|'succeeded'|'failed', error },
 * so views can tell loading, failure (with HTTP status) and a genuinely empty
 * response apart. A thunk is skipped while its data is loaded or in flight
 * (StrictMode double effects, several views mounting) unless called with
 * { force: true }. Everything resets when the session ends, so the next user
 * never sees the previous user's data.
 */
export function createResourceSlice(name, resources) {
  const keys = Object.keys(resources);
  const emptyResource = () => ({ data: null, status: 'idle', error: null });
  const initialState = Object.fromEntries(keys.map((key) => [key, emptyResource()]));

  const thunks = Object.fromEntries(
    keys.map((key) => [
      key,
      createAsyncThunk(
        `${name}/fetch${key[0].toUpperCase()}${key.slice(1)}`,
        async (_options, { rejectWithValue, signal }) => {
          try {
            return await api.get(resources[key], { signal });
          } catch (err) {
            return rejectWithValue(toErrorPayload(err));
          }
        },
        {
          condition: (options, { getState }) => {
            const { status } = getState()[name][key];
            if (options?.force) return status !== 'loading';
            return status === 'idle' || status === 'failed';
          },
        }
      ),
    ])
  );

  const slice = createSlice({
    name,
    initialState,
    reducers: {
      // Replace cached data after a successful write, without refetching.
      setResourceData: (state, action) => {
        const { key, data } = action.payload;
        state[key] = { data, status: 'succeeded', error: null };
      },
    },
    extraReducers: (builder) => {
      keys.forEach((key) => {
        const thunk = thunks[key];
        builder
          .addCase(thunk.pending, (state) => {
            state[key].status = 'loading';
            state[key].error = null;
          })
          .addCase(thunk.fulfilled, (state, action) => {
            state[key].status = 'succeeded';
            state[key].data = action.payload;
          })
          .addCase(thunk.rejected, (state, action) => {
            state[key].status = 'failed';
            state[key].error = action.payload || { message: action.error?.message || 'Request failed', status: 0 };
          });
      });
      builder.addMatcher((action) => SESSION_END_ACTIONS.includes(action.type), () => initialState);
    },
  });

  return {
    reducer: slice.reducer,
    thunks,
    actions: slice.actions,
    selectResource: (key) => (state) => state[name][key],
  };
}
