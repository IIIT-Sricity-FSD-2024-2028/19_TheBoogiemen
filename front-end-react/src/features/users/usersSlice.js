import { createSlice } from '@reduxjs/toolkit';
import { fetchAllUsers, createUser, updateUserProfile, updateUserRole, deleteUser } from './usersThunks';

const initialState = {
  items: [],
  status: 'idle',
  error: null,
};

function replaceById(items, updated) {
  const idx = items.findIndex((u) => u.user_id === updated.user_id);
  if (idx !== -1) items[idx] = updated;
}

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllUsers.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchAllUsers.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchAllUsers.rejected, (state, action) => {
        state.status = 'failed';
        state.items = [];
        state.error = action.error.message;
      })
      .addCase(createUser.fulfilled, (state, action) => {
        state.items.push(action.payload.data);
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        replaceById(state.items, action.payload.data);
      })
      .addCase(updateUserRole.fulfilled, (state, action) => {
        replaceById(state.items, action.payload.data);
      })
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.items = state.items.filter((u) => u.user_id !== action.payload);
      });
    // bulkOnboardUsers has no case here — its result (created/skipped/
    // per-row results) is read directly off the resolved thunk in
    // BulkOnboardModal, never stored; the component refetches the user
    // list separately after a successful upload.
  },
});

export default usersSlice.reducer;
