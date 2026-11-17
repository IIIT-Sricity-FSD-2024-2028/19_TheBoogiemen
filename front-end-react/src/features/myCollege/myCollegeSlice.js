import { createSlice } from '@reduxjs/toolkit';
import { fetchMyCollege } from './myCollegeThunks';

const initialState = {
  data: undefined, // undefined = not loaded, null = failed
};

const myCollegeSlice = createSlice({
  name: 'myCollege',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyCollege.fulfilled, (state, action) => {
        state.data = action.payload;
      })
      .addCase(fetchMyCollege.rejected, (state) => {
        state.data = null;
      });
  },
});

export default myCollegeSlice.reducer;
