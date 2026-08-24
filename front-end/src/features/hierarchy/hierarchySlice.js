import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export const fetchHierarchyThunk = createAsyncThunk('hierarchy/fetch', async (tenantId, { rejectWithValue }) => {
  try {
    const res = await fetch(`/api/platform/hierarchy?tenant_id=${tenantId || 't1'}`, {
      headers: { 'x-tenant-id': tenantId || 't1' },
    });
    return await res.json();
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

const initialState = {
  departments: [],
  hierarchy: {
    director_super_admin: [],
    department_heads: [],
    faculty_mentors: [],
    students: [],
    parents: [],
  },
  tenantMetrics: null,
  loading: false,
  error: null,
};

const hierarchySlice = createSlice({
  name: 'hierarchy',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchHierarchyThunk.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchHierarchyThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.departments = action.payload.departments || [];
        state.hierarchy = action.payload.hierarchy || state.hierarchy;
        state.tenantMetrics = action.payload.tenant || null;
      })
      .addCase(fetchHierarchyThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default hierarchySlice.reducer;
