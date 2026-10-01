import { createAction } from '@reduxjs/toolkit';

/**
 * Dispatched whenever a request made outside createAsyncThunk fails
 * (useApiResource loads and useMutation writes), so every API failure passes
 * through the Redux middleware chain.
 * Payload: { status, message, path, method }.
 */
export const apiRequestFailed = createAction('api/requestFailed');

/**
 * Dispatched after a successful write made with useMutation.
 * Payload: { label, method, path }. activityLoggerMiddleware records it.
 */
export const mutationSucceeded = createAction('api/mutationSucceeded');
