import { createSlice } from '@reduxjs/toolkit';
import { fetchMyProfile } from './studentProfileThunks';

const initialState = {
  data: undefined, // undefined = not loaded, null = failed
};

const studentProfileSlice = createSlice({
  name: 'studentProfile',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyProfile.fulfilled, (state, action) => {
        state.data = action.payload;
      })
      .addCase(fetchMyProfile.rejected, (state) => {
        state.data = null;
      });
  },
});

export default studentProfileSlice.reducer;
