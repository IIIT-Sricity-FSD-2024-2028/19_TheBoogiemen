import { createSlice } from '@reduxjs/toolkit';
import { fetchLicensedModules } from './licensedModulesThunks';

const initialState = {
  modules: null, // null = not loaded yet / lookup failed — Sidebar treats that as "show everything"
};

const licensedModulesSlice = createSlice({
  name: 'licensedModules',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchLicensedModules.fulfilled, (state, action) => {
        state.modules = action.payload;
      })
      .addCase(fetchLicensedModules.rejected, (state) => {
        state.modules = null;
      });
  },
});

export default licensedModulesSlice.reducer;
