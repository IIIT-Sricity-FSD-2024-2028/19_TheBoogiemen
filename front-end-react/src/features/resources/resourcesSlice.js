/**
 * resourcesSlice.js — splices create/updateStatus responses directly into
 * `items`, same reasoning as eventsSlice: GET /resources returns the raw
 * db.resources rows with no join, and the mutation endpoints return that
 * same shape wrapped as { success, data }.
 */
import { createSlice } from '@reduxjs/toolkit';
import { fetchResources, createResource, updateResourceStatus } from './resourcesThunks';

const initialState = {
  items: undefined, // undefined = not loaded yet
  status: 'idle',
};

const resourcesSlice = createSlice({
  name: 'resources',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchResources.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchResources.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchResources.rejected, (state) => {
        state.status = 'failed';
        state.items = [];
      })
      .addCase(createResource.fulfilled, (state, action) => {
        if (Array.isArray(state.items)) state.items.push(action.payload.data);
      })
      .addCase(updateResourceStatus.fulfilled, (state, action) => {
        if (Array.isArray(state.items)) {
          const idx = state.items.findIndex((r) => r.resource_id === action.payload.data.resource_id);
          if (idx !== -1) state.items[idx] = action.payload.data;
        }
      });
  },
});

export default resourcesSlice.reducer;
