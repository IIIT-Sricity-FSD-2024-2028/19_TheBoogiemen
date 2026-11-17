/**
 * holidaysSlice.js — REDUX_MIGRATION_PLAN.md §6 Phase 3 (admin CRUD bucket).
 *
 * create/delete update `items` directly from the thunk's own payload
 * instead of the pre-Redux page's "mutate then refetch the whole list"
 * pattern — safe because HolidaysService.create() already returns the
 * complete new record (see its own backend comment), so there's nothing a
 * refetch would learn that the response doesn't already have. The backend's
 * list() returns holidays sorted by date; the insert re-sorts to match, so
 * a newly-added holiday lands in the same position a refetch would've put
 * it, not just appended wherever.
 */
import { createSlice } from '@reduxjs/toolkit';
import { fetchHolidays, createHoliday, deleteHoliday } from './holidaysThunks';

const initialState = {
  items: [],
  status: 'idle',
  error: null,
};

const byDate = (a, b) => a.date.localeCompare(b.date);

const holidaysSlice = createSlice({
  name: 'holidays',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchHolidays.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchHolidays.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchHolidays.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
      .addCase(createHoliday.fulfilled, (state, action) => {
        state.items = [...state.items, action.payload].sort(byDate);
      })
      .addCase(deleteHoliday.fulfilled, (state, action) => {
        state.items = state.items.filter((h) => h.holiday_id !== action.payload);
      });
  },
});

export default holidaysSlice.reducer;
