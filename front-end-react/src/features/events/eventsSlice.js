/**
 * eventsSlice.js — plain CRUD, splicing each mutation's own response
 * directly into `items`. GET /events returns the raw db.events rows with
 * no join/enrichment (checked against admin/common.controller.ts), and
 * POST/PUT return that same raw shape wrapped as { success, data } — so,
 * unlike assessmentsSlice, there's nothing a refetch would learn that the
 * mutation response doesn't already have.
 */
import { createSlice } from '@reduxjs/toolkit';
import { fetchEvents, createEvent, updateEvent, deleteEvent } from './eventsThunks';

const initialState = {
  items: undefined, // undefined = not loaded yet
  status: 'idle',
};

const eventsSlice = createSlice({
  name: 'events',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchEvents.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchEvents.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchEvents.rejected, (state) => {
        state.status = 'failed';
        state.items = [];
      })
      .addCase(createEvent.fulfilled, (state, action) => {
        if (Array.isArray(state.items)) state.items.push(action.payload.data);
      })
      .addCase(updateEvent.fulfilled, (state, action) => {
        if (Array.isArray(state.items)) {
          const idx = state.items.findIndex((e) => e.event_id === action.payload.data.event_id);
          if (idx !== -1) state.items[idx] = action.payload.data;
        }
      })
      .addCase(deleteEvent.fulfilled, (state, action) => {
        if (Array.isArray(state.items)) state.items = state.items.filter((e) => e.event_id !== action.payload);
      });
  },
});

export default eventsSlice.reducer;
